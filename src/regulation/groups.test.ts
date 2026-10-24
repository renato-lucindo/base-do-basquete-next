import { it, expect } from "vitest";
import { calculateGroupPhase } from "./groups";
const id = (n: number) =>
  `f1400000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  C = id(3),
  D = id(4),
  scope = id(90),
  phaseId = id(91),
  rules = {
    format: "round_robin",
    points: { win: 2, loss: 1 },
    tieBreakers: ["point_difference"],
  };
const game = (n: number, h: string, a: string, hp: number, ap: number) => ({
  gameId: id(n),
  publicationVersion: 1,
  disputeId: scope,
  homeRegistrationId: h,
  awayRegistrationId: a,
  homePoints: hp,
  awayPoints: ap,
  status: "played",
  pointsSource: { kind: "sheet", version: 1 },
});
const base = () => ({
  disputeId: scope,
  phaseId,
  rules,
  groups: [
    { id: id(10), registrationIds: [A, B], gameIds: [id(101)] },
    { id: id(11), registrationIds: [C, D], gameIds: [id(102)] },
  ],
  publishedGames: [game(101, A, B, 9, 8), game(102, C, D, 40, 50)],
});
it("classifies only explicit assignments in their groups and ignores unrelated direct games", () => {
  const input = base();
  input.publishedGames.push(game(103, id(5), id(6), 9, 8));
  const result = calculateGroupPhase(input);
  expect(
    result.groups.map((g) =>
      g.standings.rows.map((r) => [r.registrationId, r.games, r.position]),
    ),
  ).toEqual([
    [
      [A, 1, 1],
      [B, 1, 2],
    ],
    [
      [D, 1, 1],
      [C, 1, 2],
    ],
  ]);
  expect(result.groups.every((g) => g.unpublishedGameIds.length === 0)).toBe(
    true,
  );
  expect(
    calculateGroupPhase({
      ...input,
      groups: [...input.groups].reverse(),
      publishedGames: [...input.publishedGames].reverse(),
    }),
  ).toEqual(result);
});
it("keeps assigned games without a publication pending instead of inventing score facts", () => {
  const input = base();
  input.publishedGames = [];
  const result = calculateGroupPhase(input);
  expect(result.status).toBe("empty");
  expect(result.groups[0].unpublishedGameIds).toEqual([id(101)]);
  expect(result.groups[0].standings.lineage).toEqual([]);
  expect(
    result.groups[0].standings.rows.every(
      (r) => r.position === null && r.games === 0,
    ),
  ).toBe(true);
  expect(calculateGroupPhase({ ...input, groups: [] })).toMatchObject({
    status: "empty",
    groups: [],
  });
});
it("rejects assignment of a game whose opponents are outside its group", () => {
  const input = base();
  input.groups[0].gameIds = [id(102)];
  input.groups[1].gameIds = [];
  expect(() => calculateGroupPhase(input)).toThrow();
});
it("rejects repeated groups, registrations, game assignments and source versions", () => {
  const input = base();
  for (const value of [
    { ...input, groups: [input.groups[0], input.groups[0]] },
    {
      ...input,
      groups: [
        input.groups[0],
        { ...input.groups[1], registrationIds: [A, C, D] },
      ],
    },
    {
      ...input,
      groups: [input.groups[0], { ...input.groups[1], gameIds: [id(101)] }],
    },
    {
      ...input,
      publishedGames: [
        ...input.publishedGames,
        { ...input.publishedGames[0], publicationVersion: 2 },
      ],
    },
    { ...input, formula: "rankByName()" },
  ])
    expect(() => calculateGroupPhase(value)).toThrow();
});
it("rejects a foreign dispute even if the offending fact was not assigned", () => {
  const input = base();
  input.publishedGames.push({ ...game(104, A, B, 2, 0), disputeId: id(99) });
  expect(() => calculateGroupPhase(input)).toThrow();
});
