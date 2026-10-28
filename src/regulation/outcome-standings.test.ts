import { it, expect } from "vitest";
import { calculateOutcomeStandings } from "./outcome-standings";
import { calculateStandings } from "./standings";
import type { OutcomeGame } from "./outcome";
const id = (n: number) =>
  `f1700000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  C = id(3),
  D = id(4),
  disputeId = id(90);
const rules = {
  format: "round_robin" as const,
  points: { win: 2, loss: 1 },
  tieBreakers: ["point_difference"],
};
const played = (
  n: number,
  h: string,
  a: string,
  hp = 80,
  ap = 70,
): OutcomeGame => ({
  gameId: id(n),
  disputeId,
  homeRegistrationId: h,
  awayRegistrationId: a,
  outcome: {
    kind: "played",
    publication: {
      gameId: id(n),
      disputeId,
      homeRegistrationId: h,
      awayRegistrationId: a,
      homePoints: hp,
      awayPoints: ap,
      publicationVersion: 1,
      status: "played",
      pointsSource: { kind: "sheet", version: 1 },
    },
  },
});
const award = (n: number, h = A, a = B): OutcomeGame => ({
  gameId: id(n),
  disputeId,
  homeRegistrationId: h,
  awayRegistrationId: a,
  outcome: {
    kind: "awarded",
    award: {
      kind: "wo",
      occurrenceId: id(500 + n),
      version: 2,
      winnerRegistrationId: h,
      homeLeaguePoints: 2,
      awayLeaguePoints: -1,
      score: null,
    },
  },
});
const base = (outcomes: OutcomeGame[], registrationIds = [A, B]) => ({
  disputeId,
  registrationIds,
  rules,
  outcomes,
});
it("preserves the normal standings metrics when every outcome is a played publication", () => {
  const outcomes = [played(100, A, B), played(101, B, A)],
    result = calculateOutcomeStandings(base(outcomes));
  const original = calculateStandings({
    disputeId,
    registrationIds: [A, B],
    rules,
    games: outcomes.flatMap((g) =>
      g.outcome.kind === "played" ? [g.outcome.publication] : [],
    ),
  });
  expect(result.rows).toMatchObject(original.rows);
  expect(
    result.rows.every(
      (r) =>
        r.playedGames === 2 &&
        r.awardedGames === 0 &&
        r.scoreGamesCovered === 2,
    ),
  ).toBe(true);
});
it("counts declared league points and victories from an award without manufacturing a score", () => {
  const result = calculateOutcomeStandings(base([award(100)]));
  expect(result.rows).toMatchObject([
    {
      registrationId: A,
      wins: 1,
      losses: 0,
      leaguePoints: 2,
      games: 1,
      playedGames: 0,
      awardedGames: 1,
      scoreGamesCovered: 0,
      pointsFor: null,
      pointsAgainst: null,
      difference: null,
    },
    { registrationId: B, wins: 0, losses: 1, leaguePoints: -1 },
  ]);
  expect(result.lineage).toContainEqual({
    kind: "awarded",
    gameId: id(100),
    occurrenceId: id(600),
    version: 2,
  });
});
it("uses an explicitly supplied administrative score only as competitive score with coverage", () => {
  const g = award(100);
  if (g.outcome.kind === "awarded")
    g.outcome.award.score = { homePoints: 20, awayPoints: 0 };
  expect(calculateOutcomeStandings(base([g])).rows[0]).toMatchObject({
    playedGames: 0,
    awardedGames: 1,
    scoreGamesCovered: 1,
    pointsFor: 20,
    pointsAgainst: 0,
    difference: 20,
  });
});
it("blocks an unknown score criterion instead of silently skipping it and advancing by a later one", () => {
  const first = award(100);
  if (first.outcome.kind === "awarded") {
    first.outcome.award.homeLeaguePoints = 1;
    first.outcome.award.awayLeaguePoints = 1;
  }
  const result = calculateOutcomeStandings({
    ...base([first, played(101, B, C), played(102, A, C)], [A, B, C]),
    rules: {
      ...rules,
      points: { win: 1, loss: 1 },
      tieBreakers: ["points_for", "wins"],
    },
  });
  expect(
    result.rows.map((r) => [r.registrationId, r.position, r.tied]),
  ).toEqual([
    [A, 1, true],
    [B, 1, true],
    [C, 1, true],
  ]);
  expect(result.tieSteps).toMatchObject([
    { criterion: "points_for", blocked: true, registrationIds: [A, B, C] },
  ]);
  expect(result.tieSteps.some((s) => s.criterion === "wins")).toBe(false);
});
it("recalculates direct encounter points among the remaining tied registrations, including awards", () => {
  const direct = award(104, C, B);
  if (direct.outcome.kind === "awarded")
    direct.outcome.award.awayLeaguePoints = 1;
  const result = calculateOutcomeStandings({
    ...base(
      [
        played(100, B, A),
        played(101, A, C),
        played(102, D, A),
        played(103, D, A),
        direct,
        played(105, B, D),
        played(106, C, D),
      ],
      [A, B, C, D],
    ),
    rules: { ...rules, tieBreakers: ["wins", "head_to_head_points"] },
  });
  expect(result.rows.map((r) => [r.registrationId, r.position])).toEqual([
    [D, 1],
    [C, 2],
    [B, 3],
    [A, 4],
  ]);
  expect(result.tieSteps).toContainEqual(
    expect.objectContaining({
      criterion: "head_to_head_points",
      registrationIds: [B, C],
      gameCount: 1,
    }),
  );
});
it("keeps empty results absent and validates scope, one outcome per game, score and closed contracts", () => {
  expect(calculateOutcomeStandings(base([]))).toMatchObject({
    status: "empty",
    rows: [
      { position: null, pointsFor: null },
      { position: null, pointsFor: null },
    ],
  });
  const g = award(100);
  for (const value of [
    base([g, g]),
    { ...base([g]), registrationIds: [A] },
    { ...base([g]), disputeId: id(999) },
    base([
      {
        ...g,
        outcome: {
          kind: "awarded",
          award: {
            ...(g.outcome.kind === "awarded" ? g.outcome.award : {}),
            winnerRegistrationId: C,
          },
        },
      } as unknown as OutcomeGame,
    ]),
    { ...base([g]), rules: { ...rules, formula: "x()" } },
    base([{ ...played(101, A, B), gameId: id(199) }]),
  ])
    expect(() => calculateOutcomeStandings(value)).toThrow();
});
