import { expect, it, vi } from "vitest";
import { SupabaseTransfers } from "./transfer-provider";
import {
  transferFixture,
  transferId as id,
} from "../../tests/fixtures/transfers";

const config = { url: "https://db.example.test", key: "fixture" };
it("deriva contexto e prévia no backend usando apenas RPC fixa e JWT privado", async () => {
  const { command, context } = transferFixture(),
    send = vi.fn(async () => Response.json(context)),
    db = new SupabaseTransfers(config, send);
  const p = await db.preview("fixture-jwt", command);
  expect(p).toMatchObject({
    ready: true,
    personId: context.personId,
    effectiveAt: context.effectiveAt,
  });
  expect(send).toHaveBeenCalledExactlyOnceWith(
    `${config.url}/rest/v1/rpc/get_transfer_context`,
    expect.objectContaining({
      body: JSON.stringify({
        p_source_entry_id: command.sourceEntryId,
        p_destination_registration_id: command.destinationRegistrationId,
      }),
      headers: expect.objectContaining({ Authorization: "Bearer fixture-jwt" }),
    }),
  );
  context.regulation.transfers = null;
  expect(await db.preview("fixture-jwt", command)).toMatchObject({
    ready: false,
    needs: "rule_required",
  });
});
it("recusa fonte incompleta, pessoa trocada e contexto de outra disputa", async () => {
  for (const kind of [
    "source",
    "person",
    "dispute",
    "destination",
    "extra",
  ] as const) {
    const { command, context } = transferFixture();
    const invalid = structuredClone(context);
    if (kind === "source") invalid.memberships.shift();
    if (kind === "person") invalid.personId = id(999);
    if (kind === "dispute") invalid.disputeId = id(999);
    if (kind === "destination") invalid.registrations.pop();
    const db = new SupabaseTransfers(config, async () =>
      Response.json(kind === "extra" ? { ...invalid, private: true } : invalid),
    );
    await expect(
      db.getContext(
        "fixture",
        command.sourceEntryId,
        command.destinationRegistrationId,
      ),
    ).rejects.toMatchObject({ status: 503 });
  }
  const { command, context } = transferFixture(),
    db = new SupabaseTransfers(config, async () => Response.json(context));
  await expect(
    db.preview("fixture", { ...command, disputeId: id(999) }),
  ).rejects.toMatchObject({ status: 400 });
});
it("ACK correlacionado permite replay sem pré-leitura que bloquearia recibo já confirmado", async () => {
  const { command, context } = transferFixture(),
    c = { ...command, acknowledgeImpact: true },
    ack = {
      commandId: c.commandId,
      disputeId: c.disputeId,
      personId: context.personId,
      sourceEntryId: c.sourceEntryId,
      sourceVersion: c.expectedSourceVersion + 1,
      newEntryId: c.newEntryId,
      newEntryVersion: 1,
      destinationRegistrationId: c.destinationRegistrationId,
      effectiveAt: context.effectiveAt,
      kind: "transfer",
    };
  const send = vi.fn(async () => Response.json(ack)),
    db = new SupabaseTransfers(config, send);
  expect(await db.save("fixture", c)).toEqual(ack);
  expect(send).toHaveBeenCalledExactlyOnceWith(
    `${config.url}/rest/v1/rpc/transfer_roster_entry`,
    expect.objectContaining({ body: JSON.stringify({ p_command: c }) }),
  );
  for (const key of [
    "commandId",
    "disputeId",
    "sourceEntryId",
    "newEntryId",
    "destinationRegistrationId",
  ])
    await expect(
      new SupabaseTransfers(config, async () =>
        Response.json({ ...ack, [key]: id(999) }),
      ).save("fixture", c),
    ).rejects.toMatchObject({ status: 503 });
  await expect(
    new SupabaseTransfers(config, async () =>
      Response.json({ ...ack, sourceVersion: 900 }),
    ).save("fixture", c),
  ).rejects.toMatchObject({ status: 503 });
  send.mockClear();
  await expect(db.save("fixture", command)).rejects.toMatchObject({
    status: 400,
  });
  expect(send).not.toHaveBeenCalled();
});
it("não envia comandos inválidos e traduz falhas sem expor SQL", async () => {
  const { command } = transferFixture(),
    send = vi.fn(async () => Response.json(null)),
    db = new SupabaseTransfers(config, send);
  await expect(
    db.getContext("fixture", "invalid", command.destinationRegistrationId),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    db.preview("fixture", { ...command, actorId: id(9) }),
  ).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
  for (const [status, body, code] of [
    [200, null, "context_not_found"],
    [400, { message: "transfer_not_allowed" }, "transfer_not_allowed"],
    [400, { message: "transfer_jersey_conflict" }, "transfer_jersey_conflict"],
    [
      409,
      { message: "transfer_context_conflict" },
      "transfer_context_conflict",
    ],
    [409, { message: "idempotency_conflict" }, "idempotency_conflict"],
    [413, {}, "transfer_context_too_large"],
    [401, {}, "invalid_session"],
    [403, {}, "not_authorized"],
    [500, { message: "SQL" }, "access_unavailable"],
  ] as const) {
    const adapter = new SupabaseTransfers(config, async () =>
      Response.json({ ...body, details: "private SQL" }, { status }),
    );
    // A successful JSON null is tested separately to avoid object spread changing it.
    const tested =
      body === null
        ? new SupabaseTransfers(config, async () => Response.json(null))
        : adapter;
    try {
      await tested.getContext(
        "fixture",
        command.sourceEntryId,
        command.destinationRegistrationId,
      );
      throw Error("expected failure");
    } catch (error) {
      expect(error).toMatchObject({ code });
      expect(String(error)).not.toContain("private SQL");
    }
  }
});
