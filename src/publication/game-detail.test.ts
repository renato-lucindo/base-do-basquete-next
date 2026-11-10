import { expect, it } from "vitest";
import { publicGameSchema } from "./contract";
import { publishedSheet } from "../../tests/fixtures/published-game";

it("aceita detalhe optativo sem alterar a projeção histórica e rejeita campos privados", () => {
  const base = publishedSheet();
  const details = {
    periods: Array.from({ length: 4 }, (_, i) => ({
      players: base.facts.players.map((p) => ({
        side: p.side,
        jersey: p.jersey,
        played: i === 0 || (p.points > 0 && i === 3) ? true : null,
        points: i === 3 ? p.points : 0,
        two: i === 3 ? p.two : 0,
        three: 0,
        free: 0,
        fouls: 0,
        technical: 0,
        unsportsmanlike: 0,
        status: "eligible",
      })),
      teams: {
        home: { points: i === 3 ? 2 : 0, freeMade: 0, freeTaken: 0, fouls: 0 },
        away: { points: 0, freeMade: 0, freeTaken: 0, fouls: 0 },
      },
    })),
    fouls: [],
  };
  expect(publicGameSchema.safeParse({ ...base, details }).success).toBe(true);
  expect(publicGameSchema.safeParse(base).success).toBe(true);
  const wrong = structuredClone(details);
  wrong.periods[2].teams.home.points = 9;
  expect(publicGameSchema.safeParse({ ...base, details: wrong }).success).toBe(
    false,
  );
  expect(
    publicGameSchema.safeParse({
      ...base,
      details: { ...details, document: { reason: "private" } },
    }).success,
  ).toBe(false);
});
