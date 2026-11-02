import { describe, it, expect, vi } from "vitest";
import { SupabaseGames } from "./provider";
const id = "d1000000-0000-4000-8000-000000000001";
const gameSnapshot = () => {
  const savedAt = "2026-10-23T19:00:00Z";
  const team = {
    id: crypto.randomUUID(),
    name: "Equipe de teste",
    abbreviation: null,
    version: 1,
    savedAt,
  };
  const registration = () => ({
    id: crypto.randomUUID(),
    disputeId: id,
    teamId: team.id,
    name: "Inscrição de teste",
    team,
    version: 1,
    savedAt,
  });
  const home = registration();
  const away = registration();
  return {
    id,
    disputeId: id,
    homeRegistrationId: home.id,
    awayRegistrationId: away.id,
    date: null,
    time: null,
    venue: null,
    number: null,
    version: 1,
    savedAt,
    state: "finished",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
    home,
    away,
  };
};
describe("fixed game server operations", () => {
  it.each([
    {},
    { startAt: null, endAt: null },
    { startAt: "2026-10-23T19:00", endAt: "2026-10-23T20:32" },
  ])(
    "reads games with legacy or additive actual clock metadata: %j",
    async (clocks) => {
      const game = { ...gameSnapshot(), ...clocks };
      const db = new SupabaseGames(
        { url: "https://db.example.test", key: "fixture" },
        async (url) =>
          Response.json(
            url.endsWith("/list_games")
              ? { items: [game], hasMore: false }
              : game,
          ),
      );
      expect(await db.list("fixture-jwt", id, "", 0)).toEqual({
        items: [game],
        hasMore: false,
      });
      expect(await db.get("fixture-jwt", id)).toEqual(game);
    },
  );
  it.each([
    { startAt: "2026-02-30T19:00" },
    { endAt: "2026-10-23T24:00" },
    { startAt: 123 },
    { startAt: "2026-10-23T19:00Z" },
    { privateField: "unexpected" },
  ])(
    "rejects malformed read metadata and unrelated fields: %j",
    async (extra) => {
      const game = { ...gameSnapshot(), ...extra };
      const db = new SupabaseGames(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json({ items: [game], hasMore: false }),
      );
      await expect(db.list("fixture-jwt", id, "", 0)).rejects.toMatchObject({
        code: "access_unavailable",
      });
    },
  );
  it("lists bounded reusable venues through an administrative RPC", async () => {
    const send = vi.fn(async () =>
      Response.json({ items: [{ name: "Ginásio Azul" }], hasMore: false }),
    );
    const db = new SupabaseGames(
      { url: "https://db.example.test", key: "fixture" },
      send,
    );
    expect(await db.listVenues("fixture-jwt", "azul", 20)).toEqual({
      items: [{ name: "Ginásio Azul" }],
      hasMore: false,
    });
    expect(send).toHaveBeenCalledWith(
      "https://db.example.test/rest/v1/rpc/list_game_venues",
      expect.objectContaining({
        body: JSON.stringify({ p_query: "azul", p_offset: 20 }),
        headers: expect.objectContaining({
          Authorization: "Bearer fixture-jwt",
        }),
      }),
    );
    for (const items of [
      [{ name: "" }],
      Array(21).fill({ name: "Azul" }),
      [{ name: "Azul", private: true }],
    ]) {
      const invalid = new SupabaseGames(
        { url: "https://db.example.test", key: "fixture" },
        async () => Response.json({ items, hasMore: false }),
      );
      await expect(invalid.listVenues("fixture", "", 0)).rejects.toMatchObject({
        code: "access_unavailable",
      });
    }
  });
  it("explains a regulation assignment conflict instead of reporting a stale game", async () => {
    const db = new SupabaseGames(
      { url: "https://db.example.test", key: "fixture" },
      async () =>
        Response.json(
          { message: "regulation_group_opponents_locked" },
          { status: 409 },
        ),
    );
    await expect(db.get("fixture", id)).rejects.toMatchObject({
      status: 409,
      code: "regulation_assignment_conflict",
      message: expect.stringContaining("grupo"),
    });
  });
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
