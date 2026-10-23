import { describe, it, expect, vi } from "vitest";
import { SupabaseGames } from "./provider";
const id = "d1000000-0000-4000-8000-000000000001";
describe("fixed game server operations", () => {
  it("keeps JWT server-side and fixes list context", async () => {
    const send = vi.fn(async () =>
      Response.json({ items: [], hasMore: false }),
    );
    const db = new SupabaseGames(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
    expect(await db.list("fixture-jwt", id, "Team", 20)).toEqual({
      items: [],
      hasMore: false,
    });
    expect(send).toHaveBeenCalledWith(
      "https://db.example.test/rest/v1/rpc/list_games",
      expect.objectContaining({
        body: JSON.stringify({
          p_dispute_id: id,
          p_query: "Team",
          p_offset: 20,
        }),
        headers: expect.objectContaining({
          Authorization: "Bearer fixture-jwt",
        }),
      }),
    );
  });
  it("sanitizes failures and rejects mismatched acknowledgements", async () => {
    for (const [status, body, code] of [
      [
        409,
        { message: "idempotency_conflict", details: "private" },
        "idempotency_conflict",
      ],
      [409, { message: "sql" }, "version_conflict"],
      [403, {}, "not_authorized"],
      [401, {}, "invalid_session"],
      [400, { message: "sql" }, "invalid_input"],
      [200, null, "context_not_found"],
      [200, { private: true }, "access_unavailable"],
    ] as const) {
      const db = new SupabaseGames(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json(body, { status }),
      );
      await expect(db.get("fixture", id)).rejects.toMatchObject({ code });
    }
    const db = new SupabaseGames(
      { url: "https://db.example.test", key: "fixture" },
      async () => Response.json({ id: crypto.randomUUID(), version: 1 }),
    );
    await expect(
      db.save("fixture", {
        commandId: crypto.randomUUID(),
        expectedVersion: 0,
        game: {
          id,
          disputeId: crypto.randomUUID(),
          homeRegistrationId: crypto.randomUUID(),
          awayRegistrationId: crypto.randomUUID(),
          date: null,
          time: null,
          venue: null,
          number: null,
        },
      }),
    ).rejects.toMatchObject({ code: "access_unavailable" });
  });
});
