import { expect, it } from "vitest";
import { publishedSheet } from "../../tests/fixtures/published-game";
import { gameRows, gameLeaders, gameTotals } from "./game-view";
it("não transforma participação desconhecida em zero e não antecipa desqualificação", () => {
  const r = publishedSheet();
  r.details = {
    periods: Array.from({ length: 4 }, (_, i) => ({
      players: r.facts.players.map((p) => ({
        side: p.side,
        jersey: p.jersey,
        played: i === 0 ? true : null,
        points: 0,
        two: 0,
        three: 0,
        free: 0,
        fouls: 0,
        technical: 0,
        unsportsmanlike: 0,
        status: "eligible" as const,
      })),
      teams: {
        home: { points: 0, freeMade: 0, freeTaken: 0, fouls: 0 },
        away: { points: 0, freeMade: 0, freeTaken: 0, fouls: 0 },
      },
    })),
    fouls: [],
  };
  expect(
    gameRows(r, "home", 2).every((p) => p.played === null && p.points === null),
  ).toBe(true);
  expect(gameRows(r, "home", 1).every((p) => p.played && p.points === 0)).toBe(
    true,
  );
  r.facts.players[0].status = "GD";
  expect(gameRows(r, "home", 1)[0].status).toBe("eligible");
  expect(gameRows(r, "home", "all")[0].status).toBe("GD");
});
it("destaca todos os máximos positivos independentemente da titularidade e exclui totais", () => {
  const r = publishedSheet(),
    rows = gameRows(r, "home", "all");
  rows[0].points = 6;
  rows[1].points = 6;
  rows[2].points = 0;
  expect(gameLeaders(rows)).toMatchObject({ points: 6, three: 0, free: 0 });
  expect(gameTotals(r, "home", "all").points).toBe(2);
  expect(rows.at(-1)?.jersey).toBe("00");
});
