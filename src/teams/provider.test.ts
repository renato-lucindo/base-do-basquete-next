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
