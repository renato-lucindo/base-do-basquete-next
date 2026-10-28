import { it, expect } from "vitest";
import { SupabaseGames } from "./provider";
const id = (n: number) =>
  `fd400000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = () => ({
  gameId: id(1),
  gameVersion: 1,
  sides: {
    home: {
      registrationId: id(2),
      roster: [],
      staff: [],
      previous: null,
      lastJerseys: {},
    },
    away: {
      registrationId: id(3),
      roster: [],
      staff: [],
      previous: null,
      lastJerseys: {},
    },
  },
});
it("preparation is a specific bounded authenticated RPC with correlated game and context", async () => {
  const p = new SupabaseGames(
    { url: "https://fixture.supabase.co", key: "fixture-publishable" },
    async (url, init) => {
      expect(url).toBe(
        "https://fixture.supabase.co/rest/v1/rpc/get_game_sheet_preparation",
      );
      expect(JSON.parse(String(init.body))).toEqual({ p_game_id: id(1) });
      expect(new Headers(init.headers).get("authorization")).toBe(
        "Bearer fixture-jwt",
      );
      return Response.json(context());
    },
  );
  expect((await p.getPreparation("fixture-jwt", id(1))).gameId).toBe(id(1));
  for (const body of [
    { ...context(), gameId: id(9) },
    { ...context(), token: "private" },
    null,
  ]) {
    const bad = new SupabaseGames(
      { url: "https://fixture.supabase.co", key: "fixture-publishable" },
      async () => Response.json(body),
    );
    await expect(
      bad.getPreparation("fixture-jwt", id(1)),
    ).rejects.toMatchObject({ status: 503 });
  }
});
