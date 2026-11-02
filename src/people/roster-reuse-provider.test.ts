import { expect, it, vi } from "vitest";
import { SupabaseRosterReuse } from "./roster-reuse-provider";

const id = (n: number) =>
  `a7400000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const config = { url: "https://db.example.test", key: "fixture-key" };
const source = {
  id: id(1),
  disputeId: id(2),
  teamId: id(3),
  seasonId: id(4),
  championshipId: id(5),
  name: "Equipe de origem",
  category: "Sub-15",
  gender: "masculino",
  year: 2026,
  division: null,
  version: 1,
};
const target = { ...source, id: id(6), disputeId: id(7), name: "Equipe atual" };
const candidate = {
  sourceEntryId: id(8),
  sourceVersion: 1,
  person: { id: id(9), name: "Atleta", nickname: null },
  jersey: "00",
  eligibility: "eligible",
};
const context = {
  source,
  target,
  contextFingerprint: "a".repeat(64),
  targetRoster: [],
  candidates: [candidate],
};
const command = {
  commandId: id(10),
  sourceRegistrationId: source.id,
  targetRegistrationId: target.id,
  expectedContextFingerprint: context.contextFingerprint,
  items: [
    {
      sourceEntryId: candidate.sourceEntryId,
      sourceVersion: 1,
      newEntryId: id(11),
      jersey: "00",
    },
  ],
  confirmed: true,
};
const receipt = {
  commandId: command.commandId,
  sourceRegistrationId: source.id,
  targetRegistrationId: target.id,
  items: [
    {
      sourceEntryId: candidate.sourceEntryId,
      personId: candidate.person.id,
      newEntryId: id(11),
      version: 1,
    },
  ],
};

it("acessa exclusivamente RPCs fixas e manda JWT privado, origem e destino", async () => {
  const send = vi.fn(async (url: string) =>
    Response.json(
      url.endsWith("list_roster_reuse_sources")
        ? {
            items: [
              { ...source, athleteCount: 1, savedAt: "2026-10-29T12:00:00Z" },
            ],
            hasMore: false,
          }
        : url.endsWith("get_roster_reuse_context")
          ? context
          : receipt,
    ),
  );
  const service = new SupabaseRosterReuse(config, send);
  expect((await service.sources("jwt", target.id, 0)).items).toHaveLength(1);
  expect(await service.context("jwt", source.id, target.id)).toEqual(context);
  expect(await service.apply("jwt", command)).toEqual(receipt);
  expect(send.mock.calls).toHaveLength(3);
  expect(send).toHaveBeenNthCalledWith(
    1,
    `${config.url}/rest/v1/rpc/list_roster_reuse_sources`,
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer jwt",
        apikey: config.key,
      }),
      body: JSON.stringify({
        p_target_registration_id: target.id,
        p_offset: 0,
      }),
    }),
  );
  expect(send).toHaveBeenNthCalledWith(
    2,
    `${config.url}/rest/v1/rpc/get_roster_reuse_context`,
    expect.objectContaining({
      body: JSON.stringify({
        p_source_registration_id: source.id,
        p_target_registration_id: target.id,
      }),
    }),
  );
  expect(send).toHaveBeenNthCalledWith(
    3,
    `${config.url}/rest/v1/rpc/apply_roster_reuse`,
    expect.objectContaining({ body: JSON.stringify({ p_command: command }) }),
  );
});

it("recusa respostas contraditórias, recibo adulterado e entrada inválida", async () => {
  const send = vi.fn(async () => Response.json(receipt));
  const db = new SupabaseRosterReuse(config, send);
  await expect(
    db.apply("jwt", { ...command, confirmed: false }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(db.sources("jwt", target.id, -1)).rejects.toMatchObject({
    status: 400,
  });
  await expect(db.context("jwt", "inválido", target.id)).rejects.toMatchObject({
    status: 400,
  });
  expect(send).not.toHaveBeenCalled();
  for (const field of [
    "commandId",
    "targetRegistrationId",
    "sourceRegistrationId",
  ] as const) {
    await expect(
      new SupabaseRosterReuse(config, async () =>
        Response.json({
          ...receipt,
          [field]: id(50),
        }),
      ).apply("jwt", command),
    ).rejects.toMatchObject({ status: 503 });
  }
  await expect(
    new SupabaseRosterReuse(config, async () =>
      Response.json({
        ...receipt,
        items: [{ ...receipt.items[0], newEntryId: id(50) }],
      }),
    ).apply("jwt", command),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    new SupabaseRosterReuse(config, async () =>
      Response.json({
        ...context,
        source: { ...source, id: id(50) },
      }),
    ).context("jwt", source.id, target.id),
  ).rejects.toMatchObject({ status: 503 });
});

it("separa sessão expirada, conflito, falha transitória e erro de permissão", async () => {
  for (const [code, expected] of [
    [401, 401],
    [403, 403],
    [409, 409],
    [413, 413],
    [502, 503],
  ] as const) {
    const db = new SupabaseRosterReuse(config, async () =>
      Response.json({ message: "reuse_context_conflict" }, { status: code }),
    );
    await expect(db.apply("jwt", command)).rejects.toMatchObject({
      status: expected,
    });
  }
  const db = new SupabaseRosterReuse(config, async () => {
    throw Error("network secret");
  });
  await expect(db.apply("jwt", command)).rejects.toMatchObject({ status: 503 });
});
