import { it, expect } from "vitest";
import {
  calculateStandings,
  competitiveFactFromPublication,
} from "./standings";
import { roundRobinRulesSchema } from "./contract";
import {
  publishedSheet,
  publishedSite,
} from "../../tests/fixtures/published-game";
const id = (n: number) =>
  `f1100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const D = id(90),
  A = id(1),
  B = id(2),
  C = id(3),
  X = id(4);
const game = (n: number, h: string, a: string, hp: number, ap: number) => ({
  gameId: id(100 + n),
  publicationVersion: 1,
  disputeId: D,
  homeRegistrationId: h,
  awayRegistrationId: a,
  homePoints: hp,
  awayPoints: ap,
  status: "played" as const,
  pointsSource: { kind: "sheet" as const, version: 1 },
});
const rules = {
  format: "round_robin" as const,
  points: { win: 3, loss: 0 },
  tieBreakers: ["point_difference", "points_for"],
};
const input = (games: ReturnType<typeof game>[], registrationIds = [A, B]) => ({
  disputeId: D,
  registrationIds,
  rules,
  games,
});
it("calculates declared points and separate registrations even for the same global team", () => {
  const published = publishedSheet(undefined, id(30), A, B),
    fact = competitiveFactFromPublication(published);
  const result = calculateStandings({
    ...input([]),
    disputeId: fact.disputeId,
    games: [fact],
  });
  expect(published.game.home.team.id).toBe(published.game.away.team.id);
  expect(result.rows).toMatchObject([
    {
      registrationId: A,
      games: 1,
      wins: 1,
      losses: 0,
      leaguePoints: 3,
      pointsFor: 2,
      pointsAgainst: 0,
      difference: 2,
      position: 1,
      tied: false,
    },
    {
      registrationId: B,
      games: 1,
      wins: 0,
      losses: 1,
      leaguePoints: 0,
      pointsFor: 0,
      pointsAgainst: 2,
      difference: -2,
      position: 2,
      tied: false,
    },
  ]);
  expect(result.status).toBe("provisional");
});
it("obeys the configured order rather than a universal tie rule", () => {
  const games = [
    game(1, A, B, 100, 99),
    game(2, B, C, 60, 50),
    game(3, C, A, 80, 70),
  ];
  const base = input(games, [A, B, C]);
  expect(calculateStandings(base).rows.map((r) => r.registrationId)).toEqual([
    B,
    C,
    A,
  ]);
  expect(
    calculateStandings({
      ...base,
      rules: { ...rules, tieBreakers: ["points_for", "point_difference"] },
    }).rows.map((r) => r.registrationId),
  ).toEqual([A, B, C]);
});
it("calculates direct encounters only among the remaining three tied registrations", () => {
  const games = [
    game(1, A, B, 10, 0),
    game(2, A, C, 10, 0),
    game(3, B, C, 10, 0),
    game(4, X, A, 10, 0),
    game(5, X, A, 10, 0),
    game(6, B, X, 10, 0),
    game(7, X, B, 10, 0),
    game(8, C, X, 10, 0),
    game(9, C, X, 10, 0),
  ];
  const result = calculateStandings({
    ...input(games, [A, B, C, X]),
    rules: {
      format: "round_robin",
      points: { win: 2, loss: 1 },
      tieBreakers: ["head_to_head_points"],
    },
  });
  expect(
    result.rows.map((r) => [r.registrationId, r.leaguePoints, r.position]),
  ).toEqual([
    [X, 9, 1],
    [A, 6, 2],
    [B, 6, 3],
    [C, 6, 4],
  ]);
  expect(result.tieSteps).toContainEqual({
    criterion: "head_to_head_points",
    registrationIds: [A, B, C],
    gameCount: 3,
    values: [
      { registrationId: A, value: 4 },
      { registrationId: B, value: 3 },
      { registrationId: C, value: 2 },
    ],
  });
});
it("keeps an unresolved multi-team tie without awarding places by display order", () => {
  const games = [game(1, A, B, 2, 0), game(2, B, C, 2, 0), game(3, C, A, 2, 0)];
  const result = calculateStandings(input(games, [C, A, B]));
  expect(
    result.rows.map((r) => [r.registrationId, r.position, r.tied]),
  ).toEqual([
    [A, 1, true],
    [B, 1, true],
    [C, 1, true],
  ]);
  expect(result.unresolvedTies).toEqual([[A, B, C]]);
  expect(calculateStandings(input([...games].reverse(), [B, C, A]))).toEqual(
    result,
  );
});
it("recomputes direct criteria for the subgroup left tied by the previous criterion", () => {
  const games = [
    game(1, B, A, 10, 0),
    game(2, A, C, 10, 0),
    game(3, X, A, 10, 0),
    game(4, X, A, 10, 0),
    game(5, C, B, 10, 0),
    game(6, B, X, 10, 0),
    game(7, C, X, 10, 0),
  ];
  const result = calculateStandings({
    ...input(games, [A, B, C, X]),
    rules: {
      format: "round_robin",
      points: { win: 2, loss: 1 },
      tieBreakers: ["wins", "head_to_head_points"],
    },
  });
  expect(result.rows.map((r) => [r.registrationId, r.position])).toEqual([
    [X, 1],
    [C, 2],
    [B, 3],
    [A, 4],
  ]);
  expect(result.tieSteps).toContainEqual({
    criterion: "head_to_head_points",
    registrationIds: [B, C],
    gameCount: 1,
    values: [
      { registrationId: B, value: 1 },
      { registrationId: C, value: 2 },
    ],
  });
});
it("does not invent positions or games for an empty phase", () => {
  const result = calculateStandings(input([]));
  expect(result.status).toBe("empty");
  expect(result.rows.every((r) => r.position === null && r.games === 0)).toBe(
    true,
  );
  expect(result.lineage).toEqual([]);
});
it("keeps an empty or partially configured group without inventing a qualifier", () => {
  expect(calculateStandings(input([], []))).toMatchObject({
    status: "empty",
    rows: [],
    unresolvedTies: [],
  });
  expect(calculateStandings(input([], [A])).rows).toMatchObject([
    { registrationId: A, games: 0, position: null, tied: false },
  ]);
});
it("preserves explicit negative penalties without implicit defaults", () => {
  const result = calculateStandings({
    ...input([game(1, A, B, 2, 0)]),
    rules: {
      format: "round_robin",
      points: { win: 1, loss: -1 },
      tieBreakers: [],
    },
  });
  expect(result.rows.map((r) => r.leaguePoints)).toEqual([1, -1]);
  for (const candidate of [
    { format: "round_robin", tieBreakers: [] },
    { ...rules, formula: "return process.env" },
    { ...rules, tieBreakers: ["unknown"] },
    { ...rules, tieBreakers: ["wins", "wins"] },
    { ...rules, points: { win: 2.5, loss: 1 } },
  ])
    expect(roundRobinRulesSchema.safeParse(candidate).success).toBe(false);
});
it("rejects duplicates, foreign contexts, outsiders and non-final score facts", () => {
  const valid = game(1, A, B, 2, 0);
  for (const bad of [
    input([valid, { ...valid, publicationVersion: 2 }]),
    input([{ ...valid, disputeId: id(91) }]),
    input([{ ...valid, awayRegistrationId: C }]),
    input([{ ...valid, awayRegistrationId: A }]),
    input([{ ...valid, awayPoints: 2 }]),
    input([{ ...valid, homePoints: -1 }]),
    input([{ ...valid, publicationVersion: 0 }]),
    input([{ ...valid, homePoints: 2.5 }]),
    input([valid], [A, A]),
    input(
      [{ ...valid, homeRegistrationId: A.toUpperCase() }],
      [A, A.toUpperCase()],
    ),
  ])
    expect(() => calculateStandings(bad)).toThrow();
  expect(
    calculateStandings(
      input([{ ...valid, homeRegistrationId: A.toUpperCase() }]),
    ).rows[0].registrationId,
  ).toBe(A);
});
it("reads official points from a mixed PDF projection and keeps their actual domain origin", async () => {
  const p = await publishedSite();
  p.facts.teams.home.points++;
  const row = p.facts.players.find((r) => r.side === "home")!;
  row.points++;
  row.free++;
  p.facts.origins.scorePoints = { kind: "sheet", version: 7 };
  const fact = competitiveFactFromPublication(p);
  expect(fact.homePoints).toBe(99);
  expect(fact.awayPoints).toBe(57);
  expect(fact.pointsSource).toEqual({ kind: "sheet", version: 7 });
  expect(() =>
    competitiveFactFromPublication({ rulesVersion: "FIBA_2024", events: [] }),
  ).toThrow();
  expect(() =>
    competitiveFactFromPublication({ ...p, birthDate: "1990-01-01" }),
  ).toThrow();
});
