import { it, expect } from "vitest";
import { resolveOutcomeSeries } from "./outcome-series";
import type { OutcomeGame } from "./outcome";
const id = (n: number) =>
  `f1800000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  disputeId = id(90);
const award = (
  slot: number,
  won = true,
  score: { homePoints: number; awayPoints: number } | null = null,
) => ({
  slot,
  game: {
    gameId: id(100 + slot),
    disputeId,
    homeRegistrationId: A,
    awayRegistrationId: B,
    outcome: {
      kind: "awarded",
      award: {
        kind: "wo",
        occurrenceId: id(200 + slot),
        version: 1,
        winnerRegistrationId: won ? A : B,
        homeLeaguePoints: won ? 2 : 0,
        awayLeaguePoints: won ? 0 : 2,
        score,
      },
    },
  } as OutcomeGame,
});
const base = (format: string, games: ReturnType<typeof award>[]) => ({
  disputeId,
  homeRegistrationId: A,
  awayRegistrationId: B,
  format,
  games,
});
it("resolves a single game and best-of series from declared administrative winners without score facts", () => {
  expect(resolveOutcomeSeries(base("single", [award(1)]))).toMatchObject({
    status: "complete",
    winnerRegistrationId: A,
    totals: null,
    playedGames: 0,
    awardedGames: 1,
  });
  for (const [format, count] of [
    ["best_of_3", 2],
    ["best_of_5", 3],
    ["best_of_7", 4],
  ] as const) {
    const s = resolveOutcomeSeries(
      base(
        format,
        Array.from({ length: count }, (_, i) => award(i + 1)),
      ),
    );
    expect(s).toMatchObject({
      status: "complete",
      winnerRegistrationId: A,
      homeWins: count,
      totals: null,
      playedGames: 0,
      awardedGames: count,
    });
  }
});
it("requires known scores or an explicit reviewed decision before resolving an aggregate", () => {
  const s = resolveOutcomeSeries(
    base("two_leg", [
      award(1, true, { homePoints: 20, awayPoints: 0 }),
      award(2, false),
    ]),
  );
  expect(s).toMatchObject({
    status: "pending",
    winnerRegistrationId: null,
    totals: null,
    needs: "score_or_decision",
    nextSlot: null,
  });
  expect(
    resolveOutcomeSeries(
      base("two_leg", [
        award(1, true, { homePoints: 20, awayPoints: 0 }),
        award(2, false, { homePoints: 0, awayPoints: 20 }),
      ]),
    ),
  ).toMatchObject({
    status: "tied",
    winnerRegistrationId: null,
    needs: "decision",
  });
});
it("does not skip an earlier missing slot or accept games after the deciding victory", () => {
  expect(
    resolveOutcomeSeries(base("best_of_3", [award(1), award(3)])),
  ).toMatchObject({
    status: "pending",
    winnerRegistrationId: null,
    nextSlot: 2,
  });
  expect(() =>
    resolveOutcomeSeries(base("best_of_3", [award(1), award(2), award(3)])),
  ).toThrow();
});
it("retains played-publication and award lineage, orients venue and never fabricates empty totals", () => {
  const g = award(1),
    second = award(2);
  g.game = {
    gameId: id(101),
    disputeId,
    homeRegistrationId: B,
    awayRegistrationId: A,
    outcome: {
      kind: "played",
      publication: {
        gameId: id(101),
        disputeId,
        homeRegistrationId: B,
        awayRegistrationId: A,
        homePoints: 70,
        awayPoints: 80,
        status: "played",
        publicationVersion: 3,
        pointsSource: { kind: "pdf", version: 4 },
      },
    },
  };
  const result = resolveOutcomeSeries(base("best_of_3", [second, g]));
  expect(result).toMatchObject({
    status: "complete",
    winnerRegistrationId: A,
    playedGames: 1,
    awardedGames: 1,
    totals: null,
  });
  expect(result.lineage[0]).toMatchObject({
    kind: "played",
    slot: 1,
    publicationVersion: 3,
    pointsSource: { kind: "pdf", version: 4 },
  });
  expect(result.lineage[1]).toMatchObject({
    kind: "awarded",
    slot: 2,
    occurrenceId: id(202),
    version: 1,
  });
  expect(resolveOutcomeSeries(base("single", []))).toMatchObject({
    status: "pending",
    totals: null,
    winnerRegistrationId: null,
  });
});
it("rejects duplicate slots/games, foreign opponents/dispute and undeclared effects", () => {
  const g = award(1);
  for (const s of [
    base("best_of_3", [g, g]),
    base("single", [award(2)]),
    { ...base("single", [g]), disputeId: id(999) },
    { ...base("single", [g]), homeRegistrationId: id(999) },
    base("single", [
      {
        ...g,
        game: {
          ...g.game,
          outcome: { kind: "cancelled" },
        } as unknown as OutcomeGame,
      },
    ]),
  ])
    expect(() => resolveOutcomeSeries(s)).toThrow();
});
