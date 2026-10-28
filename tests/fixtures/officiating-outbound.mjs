import assert from "node:assert/strict";
import { Response } from "miniflare";

export function officiatingOutbound(gameId) {
  const savedAt = "2026-10-28T13:00:00Z";
  const uid = (n) => `fd700000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const team = {
    id: uid(4),
    name: "Fixture club",
    abbreviation: null,
    version: 1,
    savedAt,
  };
  const home = {
    id: uid(5),
    disputeId: uid(3),
    teamId: team.id,
    name: "A",
    team,
    version: 1,
    savedAt,
  };
  const away = { ...home, id: uid(6), name: "B" };
  const empty = () => ({
    referee: null,
    umpire1: null,
    umpire2: null,
    scorer: null,
    timer: null,
    shotClock: null,
  });
  let game = {
    id: gameId,
    disputeId: uid(3),
    homeRegistrationId: home.id,
    awayRegistrationId: away.id,
    date: null,
    time: null,
    venue: null,
    number: null,
    version: 1,
    savedAt,
    state: "scheduled",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
    home,
    away,
  };
  let officiating = empty();
  const receipts = new Map();
  return async (request) => {
    const path = new URL(request.url).pathname;
    if (
      !["list_game_officials", "get_game_editor", "save_game_editor"].some(
        (name) => path === `/rest/v1/rpc/${name}`,
      )
    )
      return null;
    assert.equal(request.headers.get("authorization"), "Bearer fixture-access");
    const args = await request.json();
    if (path.endsWith("list_game_officials")) {
      assert.deepEqual(args, { p_query: "João", p_offset: 20 });
      return Response.json({
        items: [{ id: uid(50), name: "João" }],
        hasMore: false,
      });
    }
    if (path.endsWith("get_game_editor"))
      return Response.json(args.p_id === gameId ? { game, officiating } : null);
    const c = args.p_command;
    if (receipts.has(c.commandId))
      return Response.json(receipts.get(c.commandId));
    const result = { id: c.game.id, version: c.expectedVersion + 1 };
    game = { ...game, ...c.game, version: result.version };
    officiating = c.officiating;
    receipts.set(c.commandId, result);
    return Response.json(result);
  };
}
