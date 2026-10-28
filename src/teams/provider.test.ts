import { describe, expect, it, vi } from "vitest";
import { SupabaseTeams } from "./provider";
const id = "30000000-0000-4000-8000-000000000001";
describe("operações de equipes no servidor", () => {
  it("envia JWT só ao provedor e fixa recurso/contexto no RPC", async () => {
    const send = vi.fn(async () =>
      Response.json({ items: [], hasMore: false }),
    );
    const db = new SupabaseTeams(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
    expect(await db.registrations("fixture-jwt", id, "Lobos", 20)).toEqual({
      items: [],
      hasMore: false,
    });
    expect(send).toHaveBeenCalledWith(
      "https://db.example.test/rest/v1/rpc/list_registrations",
      expect.objectContaining({
        body: JSON.stringify({
          p_dispute_id: id,
          p_query: "Lobos",
          p_offset: 20,
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer fixture-jwt",
        }),
      }),
    );
  });
  it("sanitiza conflito, recusa corpo inválido e distingue ausência/revogação", async () => {
    for (const [status, body, expected] of [
      [
        409,
        { message: "idempotency_conflict", details: "private" },
        "idempotency_conflict",
      ],
      [409, { message: "sql" }, "version_conflict"],
      [403, {}, "not_authorized"],
      [200, null, "context_not_found"],
      [200, { private: true }, "access_unavailable"],
    ] as const) {
      const db = new SupabaseTeams(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json(body, { status }),
      );
      await expect(db.getTeam("fixture", id)).rejects.toMatchObject({
        code: expected,
      });
    }
  });
});

const removalCommand = {
  commandId: id,
  registrationId: id,
  disputeId: id,
  expectedVersion: 1,
};
const available = {
  state: "available",
  registration: {
    id,
    disputeId: id,
    teamId: id,
    name: "Lobos",
    teamName: "Clube",
    version: 1,
  },
  blockers: [],
};
const removed = { state: "removed", id, disputeId: id, deletedVersion: 1 };
describe("adapter de remoção de inscrição", () => {
  it("usa RPCs fixas, JWT só no servidor e correlação de contexto/intenção", async () => {
    const send = vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("get_registration_removal_context") ? available : removed,
      ),
    );
    const db = new SupabaseTeams(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
    expect(await db.removalContext("fixture-jwt", id, id)).toEqual(available);
    expect(await db.removeRegistration("fixture-jwt", removalCommand)).toEqual(
      removed,
    );
    expect(send).toHaveBeenNthCalledWith(
      1,
      "https://db.example.test/rest/v1/rpc/get_registration_removal_context",
      expect.objectContaining({
        body: JSON.stringify({ p_registration_id: id, p_dispute_id: id }),
        headers: expect.objectContaining({
          Authorization: "Bearer fixture-jwt",
        }),
      }),
    );
    expect(send).toHaveBeenNthCalledWith(
      2,
      "https://db.example.test/rest/v1/rpc/remove_registration",
      expect.objectContaining({
        body: JSON.stringify({ p_command: removalCommand }),
      }),
    );
  });
  it("recusa identidades/contextos trocados, versão de ACK divergente e dados privados", async () => {
    const other = id.replace(/1$/, "2");
    for (const body of [
      { ...available, registration: { ...available.registration, id: other } },
      {
        ...available,
        registration: { ...available.registration, disputeId: other },
      },
      { ...available, actorId: other },
      null,
    ]) {
      const db = new SupabaseTeams(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json(body),
      );
      await expect(db.removalContext("fixture", id, id)).rejects.toMatchObject({
        code: "access_unavailable",
      });
    }
    for (const body of [
      { ...removed, id: other },
      { ...removed, disputeId: other },
      { ...removed, deletedVersion: 2 },
    ]) {
      const db = new SupabaseTeams(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json(body),
      );
      await expect(
        db.removeRegistration("fixture", removalCommand),
      ).rejects.toMatchObject({ code: "access_unavailable" });
    }
  });
  it("distingue impedimento, remoção anterior, conflito, ausência e sessão sem copiar SQL", async () => {
    for (const [status, message, code] of [
      [409, "registration_in_use", "registration_in_use"],
      [409, "registration_removed", "registration_removed"],
      [409, "idempotency_conflict", "idempotency_conflict"],
      [409, "version_conflict", "version_conflict"],
      [404, "registration_not_found", "context_not_found"],
      [404, "could not find function", "access_unavailable"],
      [401, "private auth detail", "invalid_session"],
      [403, "private authorization", "not_authorized"],
    ] as const) {
      const db = new SupabaseTeams(
        { url: "https://db.example.test", key: "fixture" },
        async () =>
          Response.json(
            { message, details: "private SQL / fixture-jwt" },
            { status },
          ),
      );
      const error = await db
        .removeRegistration("fixture-jwt", removalCommand)
        .catch((error: unknown) => error);
      expect(error).toMatchObject({ code });
      expect((error as Error).message).not.toContain("private SQL");
      expect((error as Error).message).not.toContain("fixture-jwt");
    }
  });
  it("cancela leitura de resposta acima do limite pequeno do DTO", async () => {
    let pulls = 0,
      cancelled = false;
    const stream = new ReadableStream({
      pull(controller) {
        pulls++;
        if (pulls > 4) controller.error(new Error("too many pulls"));
        else controller.enqueue(new Uint8Array(8192).fill(32));
      },
      cancel() {
        cancelled = true;
      },
    });
    const db = new SupabaseTeams(
      { url: "https://db.example.test", key: "fixture" },
      async () => new Response(stream),
    );
    await expect(db.removalContext("fixture", id, id)).rejects.toMatchObject({
      code: "access_unavailable",
    });
    expect(pulls).toBeLessThanOrEqual(3);
    expect(cancelled).toBe(true);
  });
});
