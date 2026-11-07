import { expect, it } from "vitest";
import { calculateStandings } from "./standings";
import { calculateOutcomeStandings } from "./outcome-standings";
import { createFibaRules, createDefaultDefinition } from "./defaults";

const id = (n: number) =>
  `f2600000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [A, B, C, D] = [1, 2, 3, 4].map(id);
const disputeId = id(90);
const rules = {
  format: "round_robin",
  points: { win: 2, loss: 1 },
  tieBreakers: [
    "head_to_head_points",
    "head_to_head_difference",
    "head_to_head_for",
    "point_difference",
    "points_for",
  ],
};
// Three-way cycle: equal direct differences; B separates on direct points for.
// Restarting ranks C above D; falling through to the overall difference reverses them.
const games = [
  [A, B, 120, 70],
  [A, C, 120, 70],
  [A, D, 80, 75],
  [B, C, 100, 90],
  [D, B, 100, 90],
  [C, D, 80, 70],
].map(([home, away, homePoints, awayPoints], i) => ({
  gameId: id(100 + i),
  publicationVersion: 1,
  disputeId,
  homeRegistrationId: home,
  awayRegistrationId: away,
  homePoints,
  awayPoints,
  status: "played",
  pointsSource: { kind: "sheet", version: 1 },
}));

it("restarts FIBA criteria after partial separation, preserving the legacy result", () => {
  const input = { disputeId, registrationIds: [A, B, C, D], rules, games };
  expect(calculateStandings(input).rows.map((r) => r.registrationId)).toEqual([
    A,
    B,
    D,
    C,
  ]);
  const result = calculateStandings({
    ...input,
    rules: { ...rules, calculationPolicy: "fiba-2026" },
  });
  expect(result.algorithmVersion).toBe("round-robin-fiba-2026-v1");
  expect(result.rows.map((r) => r.registrationId)).toEqual([A, B, C, D]);
  expect(
    result.tieSteps.some(
      (step) =>
        step.criterion === "head_to_head_points" &&
        step.registrationIds.join() === [C, D].join(),
    ),
  ).toBe(true);
});

it("uses the same FIBA restart for the occurrence-aware projection", () => {
  const result = calculateOutcomeStandings({
    disputeId,
    registrationIds: [A, B, C, D],
    rules: { ...rules, calculationPolicy: "fiba-2026" },
    outcomes: games
      .map((publication) => ({
        ...publication,
        outcome: { kind: "played", publication },
      }))
      .map(({ gameId, homeRegistrationId, awayRegistrationId, outcome }) => ({
        gameId,
        disputeId,
        homeRegistrationId,
        awayRegistrationId,
        outcome,
      })),
  });
  expect(result.algorithmVersion).toBe("outcome-standings-fiba-2026-v1");
  expect(result.rows.map((r) => r.registrationId)).toEqual([A, B, C, D]);
});

it("reproduces the official D.2.2 classification example", () => {
  const official = [
    [A, B, 100, 55],
    [A, C, 90, 85],
    [A, D, 120, 75],
    [B, C, 100, 85],
    [B, D, 75, 80],
    [C, D, 65, 55],
  ].map(([home, away, homePoints, awayPoints], i) => ({
    ...games[i],
    homeRegistrationId: home,
    awayRegistrationId: away,
    homePoints,
    awayPoints,
  }));
  const result = calculateStandings({
    disputeId,
    registrationIds: [A, B, C, D],
    rules: { ...rules, calculationPolicy: "fiba-2026" },
    games: official,
  });
  expect(
    result.rows.map((r) => [r.registrationId, r.leaguePoints, r.position]),
  ).toEqual([
    [A, 6, 1],
    [B, 4, 2],
    [C, 4, 3],
    [D, 4, 4],
  ]);
});

it("leaves complete FIBA ties unresolved without inventing a winner", () => {
  const result = calculateStandings({
    disputeId,
    registrationIds: [A, B],
    rules: { ...rules, calculationPolicy: "fiba-2026" },
    games: [
      { ...games[0], homePoints: 80, awayPoints: 70 },
      { ...games[0], gameId: id(200), homePoints: 70, awayPoints: 80 },
    ],
  });
  expect(result.unresolvedTies).toEqual([[A, B]]);
  expect(result.rows.map((r) => [r.position, r.tied])).toEqual([
    [1, true],
    [1, true],
  ]);
});

it("supplies complete defaults without selecting participants or inventing phases", () => {
  expect(createDefaultDefinition()).toEqual({
    registrationIds: [],
    occurrenceRules: {
      wo: {
        winnerLeaguePoints: 2,
        loserLeaguePoints: 0,
        score: { winner: 20, loser: 0 },
      },
    },
    groupPhases: [],
    knockoutPhases: [],
    series: [],
  });
  expect(createFibaRules()).toEqual({
    ...rules,
    calculationPolicy: "fiba-2026",
    turns: 1,
  });
  expect(createFibaRules(2).turns).toBe(2);
  const changed = createFibaRules();
  changed.points.win = 10;
  changed.tieBreakers.pop();
  expect(createFibaRules().points.win).toBe(2);
  expect(createFibaRules().tieBreakers).toHaveLength(5);
});

it("does not rank unknown-score awards using later criteria after a blocked FIBA step", () => {
  const result = calculateOutcomeStandings({
    disputeId,
    registrationIds: [A, B],
    rules: { ...rules, calculationPolicy: "fiba-2026" },
    outcomes: [A, B].map((winner, i) => ({
      gameId: id(300 + i),
      disputeId,
      homeRegistrationId: A,
      awayRegistrationId: B,
      outcome: {
        kind: "awarded",
        award: {
          kind: "wo",
          occurrenceId: id(400 + i),
          version: 1,
          winnerRegistrationId: winner,
          homeLeaguePoints: i === 0 ? 2 : 0,
          awayLeaguePoints: i === 0 ? 0 : 2,
          score: null,
        },
      },
    })),
  });
  expect(result.unresolvedTies).toEqual([[A, B]]);
  expect(result.tieSteps.map((s) => s.criterion)).toEqual([
    "head_to_head_points",
    "head_to_head_difference",
  ]);
});
