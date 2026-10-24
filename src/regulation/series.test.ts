import { it, expect } from "vitest";
import { resolveSeries } from "./series";
const id = (n: number) =>
  `f1300000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  D = id(3);
function played(slot: number, homeWon: boolean, reverse = false) {
  return {
    slot,
    game: {
      gameId: id(100 + slot),
      publicationVersion: 1,
      disputeId: D,
      homeRegistrationId: reverse ? B : A,
      awayRegistrationId: reverse ? A : B,
      homePoints: homeWon !== reverse ? 80 : 70,
      awayPoints: homeWon !== reverse ? 70 : 80,
      status: "played",
      pointsSource: { kind: "sheet", version: 1 },
    },
  };
}
const series = (format: string, games: ReturnType<typeof played>[]) => ({
  disputeId: D,
  homeRegistrationId: A,
  awayRegistrationId: B,
  format,
  games,
});
it("keeps a single game pending without a fictitious score and resolves its published winner", () => {
  expect(resolveSeries(series("single", []))).toMatchObject({
    status: "pending",
    winnerRegistrationId: null,
    totals: null,
    nextSlot: 1,
  });
  expect(
    resolveSeries(series("single", [played(1, false, true)])),
  ).toMatchObject({
    status: "complete",
    winnerRegistrationId: B,
    homeWins: 0,
    awayWins: 1,
    nextSlot: null,
  });
});
it("resolves best of three, five and seven by victories with alternating venue", () => {
  for (const [format, results, wins] of [
    ["best_of_3", [true, true], 2],
    ["best_of_5", [true, false, true, true], 3],
    ["best_of_7", [false, true, false, true, true, true], 4],
  ] as const) {
    const games = results.map((win, i) => played(i + 1, win, i % 2 === 1));
    expect(resolveSeries(series(format, [...games].reverse()))).toMatchObject({
      status: "complete",
      winnerRegistrationId: A,
      homeWins: wins,
      awayWins: results.length - wins,
      nextSlot: null,
    });
  }
});
it("does not choose a winner just for leading an incomplete series", () => {
  expect(
    resolveSeries(series("best_of_7", [played(1, true), played(2, true)])),
  ).toMatchObject({
    status: "pending",
    winnerRegistrationId: null,
    homeWins: 2,
    nextSlot: 3,
  });
});
it("requires a missing earlier slot to be reconciled before deciding", () => {
  expect(
    resolveSeries(series("best_of_3", [played(1, true), played(3, true)])),
  ).toMatchObject({
    status: "pending",
    winnerRegistrationId: null,
    nextSlot: 2,
  });
  expect(
    resolveSeries(
      series("best_of_3", [played(3, true), played(1, true), played(2, false)]),
    ),
  ).toMatchObject({
    status: "complete",
    winnerRegistrationId: A,
    homeWins: 2,
    awayWins: 1,
  });
});
it("aggregates both legs by the series identities and leaves an aggregate tie unresolved", () => {
  const first = played(1, true),
    second = played(2, false, true);
  expect(resolveSeries(series("two_leg", [first]))).toMatchObject({
    status: "pending",
    winnerRegistrationId: null,
    nextSlot: 2,
  });
  expect(resolveSeries(series("two_leg", [second, first]))).toMatchObject({
    status: "tied",
    winnerRegistrationId: null,
    needs: "decision",
    totals: { homePoints: 150, awayPoints: 150 },
  });
  const changed = { ...second, game: { ...second.game, homePoints: 81 } };
  expect(resolveSeries(series("two_leg", [first, changed]))).toMatchObject({
    status: "complete",
    winnerRegistrationId: B,
    totals: { homePoints: 150, awayPoints: 151 },
  });
});
it("rejects a published extra game after a best-of series was already decided", () => {
  expect(() =>
    resolveSeries(
      series("best_of_3", [played(1, true), played(2, true), played(3, false)]),
    ),
  ).toThrow();
});
it("rejects duplicate slots, duplicate game versions and foreign or administrative facts", () => {
  const valid = played(1, true);
  for (const input of [
    series("best_of_9", []),
    series("single", [played(2, true)]),
    series("two_leg", [valid, valid]),
    series("two_leg", [
      valid,
      { ...played(2, false), game: { ...valid.game, publicationVersion: 2 } },
    ]),
    series("single", [
      { ...valid, game: { ...valid.game, awayRegistrationId: id(4) } },
    ]),
    series("single", [{ ...valid, game: { ...valid.game, disputeId: id(9) } }]),
    series("single", [
      { ...valid, game: { ...valid.game, status: "forfeit" } },
    ]),
    { ...series("single", [valid]), homeRegistrationId: B },
    { ...series("single", []), formula: "winnerByName()" },
  ])
    expect(() => resolveSeries(input)).toThrow();
});
it("preserves explicit slot order and publication lineage without modifying input", () => {
  const input = series("best_of_3", [played(2, false, true), played(1, true)]),
    before = structuredClone(input),
    result = resolveSeries(input);
  expect(input).toEqual(before);
  expect(
    result.lineage.map((g) => [g.slot, g.gameId, g.publicationVersion]),
  ).toEqual([
    [1, id(101), 1],
    [2, id(102), 1],
  ]);
});
