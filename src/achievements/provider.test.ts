import { expect, it, vi } from "vitest";
import { SupabaseAchievements } from "./provider";
import { achievementBackendFixture } from "../../tests/fixtures/achievement-backend";
const config = { url: "https://db.example.test", key: "fixture-publishable" };
it("workspace/candidatos são contextualizados e UUIDs normalizados", async () => {
  const f = achievementBackendFixture(),
    send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async (url) =>
        Response.json(
          url.endsWith("get_achievement_workspace")
            ? f.workspace
            : { disputeId: f.source.disputeId, items: [], hasMore: false },
        ),
    ),
    db = new SupabaseAchievements(config, send);
  expect(
    (await db.getWorkspace("fixture-jwt", f.source.disputeId.toUpperCase()))
      .disputeId,
  ).toBe(f.source.disputeId);
  await db.getCandidates("fixture-jwt", f.source.disputeId, "Atleta", 20);
  expect(JSON.parse(send.mock.calls[1][1]?.body as string)).toMatchObject({
    p_offset: 20,
    p_query: "Atleta",
  });
});
it("sugestão é calculada no backend a partir da fonte real, sem DTO do cliente", async () => {
  const f = achievementBackendFixture(),
    send = vi.fn(async () => Response.json(f.source)),
    db = new SupabaseAchievements(config, send);
  const result = await db.preview("fixture-jwt", {
    disputeId: f.source.disputeId,
    expectedContextFingerprint: f.fp,
    source: f.request.source,
  });
  expect(result.suggestion).toMatchObject({
    ready: true,
    requiresConfirmation: true,
    placements: [
      { position: 1, registrationIds: [f.id(1)] },
      { position: 2, registrationIds: [f.id(2)] },
    ],
  });
  expect(send).toHaveBeenCalledTimes(1);
  await expect(
    db.preview("fixture-jwt", {
      disputeId: f.source.disputeId,
      expectedContextFingerprint: "b".repeat(64),
      source: f.request.source,
    }),
  ).rejects.toMatchObject({ status: 409 });
});
it("salvar/confirmar não fazem GET prévio e correlacionam ACK com o comando congelado", async () => {
  const f = achievementBackendFixture(),
    send = vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("save_achievement_draft")
          ? {
              commandId: f.draft.commandId,
              disputeId: f.source.disputeId,
              version: 1,
              savedAt: f.stamp,
              contextFingerprint: f.fp,
            }
          : {
              commandId: f.confirmation.commandId,
              disputeId: f.source.disputeId,
              version: 1,
              draftVersion: 1,
              confirmedAt: f.stamp,
            },
      ),
    ),
    db = new SupabaseAchievements(config, send);
  await db.save("fixture-jwt", f.draft);
  await db.confirm("fixture-jwt", f.confirmation);
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    `${config.url}/rest/v1/rpc/save_achievement_draft`,
    `${config.url}/rest/v1/rpc/confirm_achievements`,
  ]);
});
it("ACK de versão/identidade/fingerprint divergente é recusado", async () => {
  const f = achievementBackendFixture();
  for (const patch of [
    { commandId: f.id(999) },
    { disputeId: f.id(999) },
    { version: 2 },
    { contextFingerprint: "b".repeat(64) },
  ]) {
    const db = new SupabaseAchievements(config, async () =>
      Response.json({
        commandId: f.draft.commandId,
        disputeId: f.source.disputeId,
        version: 1,
        savedAt: f.stamp,
        contextFingerprint: f.fp,
        ...patch,
      }),
    );
    await expect(db.save("fixture-jwt", f.draft)).rejects.toMatchObject({
      status: 503,
    });
  }
  const db = new SupabaseAchievements(config, async () =>
    Response.json({
      commandId: f.confirmation.commandId,
      disputeId: f.source.disputeId,
      version: 1,
      draftVersion: 2,
      confirmedAt: f.stamp,
    }),
  );
  await expect(db.confirm("fixture-jwt", f.confirmation)).rejects.toMatchObject(
    { status: 503 },
  );
});
it("histórico de rascunho elimina fatos internos e preserva IDs/inscrições da ocasião", async () => {
  const f = achievementBackendFixture(),
    db = new SupabaseAchievements(config, async () =>
      Response.json({
        disputeId: f.source.disputeId,
        version: 1,
        draft: f.draft.draft,
        source: f.draft.source,
        contextSnapshot: f.source,
        contextFingerprint: f.fp,
        actorId: f.id(900),
        savedAt: f.stamp,
      }),
    );
  const version = await db.getDraftVersion(
    "fixture-jwt",
    f.source.disputeId,
    1,
  );
  expect(version).not.toHaveProperty("contextSnapshot");
  expect(version.registrations).toEqual(f.source.registrations);
  expect(version.draft.honors).toEqual(f.draft.draft.honors);
});
it("leitura pública usa somente publishable key e recusa correlação errada", async () => {
  const f = achievementBackendFixture(),
    send = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () => Response.json(f.publicValue),
    ),
    db = new SupabaseAchievements(config, send);
  expect(await db.getPublic(f.source.disputeId)).toEqual(f.publicValue);
  expect(new Headers(send.mock.calls[0][1]?.headers).has("authorization")).toBe(
    false,
  );
  expect(
    await new SupabaseAchievements(config, async () =>
      Response.json(null),
    ).getPublic(f.source.disputeId),
  ).toBeNull();
  await expect(db.getPublic(f.id(999))).rejects.toMatchObject({ status: 503 });
});
it("argumentos inválidos são recusados antes da rede", async () => {
  const f = achievementBackendFixture(),
    send = vi.fn(),
    db = new SupabaseAchievements(config, send);
  for (const job of [
    () => db.getWorkspace("fixture-jwt", "bad"),
    () => db.getWorkspace("fixture-jwt", f.source.disputeId, -1),
    () =>
      db.getCandidates("fixture-jwt", f.source.disputeId, "x".repeat(121), 0),
    () => db.getCandidates("fixture-jwt", f.source.disputeId, "", 100001),
    () => db.save("fixture-jwt", { ...f.draft, actorId: f.id(900) }),
    () =>
      db.confirm("fixture-jwt", {
        ...f.confirmation,
        acknowledgeImpact: false,
      }),
    () => db.getDraftVersion("fixture-jwt", f.source.disputeId, 0),
  ])
    await expect(job()).rejects.toMatchObject({ status: 400 });
  expect(send).not.toHaveBeenCalled();
});
it.each([401, 403, 409, 400, 413, 500])(
  "falha %s não expõe mensagem interna do banco",
  async (status) => {
    const f = achievementBackendFixture(),
      db = new SupabaseAchievements(config, async () =>
        Response.json(
          { message: "fixture-private-provider-value" },
          { status },
        ),
      );
    const err = await db
      .getWorkspace("fixture-jwt", f.source.disputeId)
      .catch((e) => e);
    expect(err.status).toBe(status === 500 ? 503 : status);
    expect(err.message).not.toContain("fixture-private");
  },
);
it("resposta malformada/grande, fonte de outra disputa e falha de transporte são indisponibilidade", async () => {
  const f = achievementBackendFixture();
  for (const send of [
    async () => Response.json({ ...f.source, disputeId: f.id(999) }),
    async () => new Response("bad json"),
    async () =>
      new Response("{}", { headers: { "content-length": "33554433" } }),
    async () => {
      throw Error("fixture-private-provider-value");
    },
  ])
    await expect(
      new SupabaseAchievements(config, send).preview("fixture-jwt", {
        disputeId: f.source.disputeId,
        expectedContextFingerprint: f.fp,
        source: null,
      }),
    ).rejects.toMatchObject({ status: 503 });
});
