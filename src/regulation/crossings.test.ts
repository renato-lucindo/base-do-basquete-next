import { it, expect } from "vitest";
import { previewCrossings, type CrossingsInput } from "./crossings";
const id = (n: number) =>
  `f1500000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  C = id(3),
  D = id(4),
  disputeId = id(90);
const registration = (registrationId: string) => ({
  kind: "registration" as const,
  registrationId,
});
const rank = (groupId: string, position: number) => ({
  kind: "group_rank" as const,
  phaseId: id(10),
  groupId,
  position,
});
const winner = (seriesId: string) => ({
  kind: "series_winner" as const,
  seriesId,
});
const loser = (seriesId: string) => ({
  kind: "series_loser" as const,
  seriesId,
});
function game(
  n: number,
  homeRegistrationId: string,
  awayRegistrationId: string,
  homePoints = 80,
  awayPoints = 70,
) {
  return {
    gameId: id(n),
    publicationVersion: 1,
    disputeId,
    homeRegistrationId,
    awayRegistrationId,
    homePoints,
    awayPoints,
    status: "played" as const,
    pointsSource: { kind: "sheet" as const, version: 1 },
  };
}
function base(): CrossingsInput {
  return {
    disputeId,
    regulationVersion: 1,
    registrationIds: [A, B, C, D],
    groupPhases: [
      {
        disputeId,
        phaseId: id(10),
        rules: {
          format: "round_robin",
          points: { win: 2, loss: 1 },
          tieBreakers: [],
        },
        groups: [
          { id: id(11), registrationIds: [A, B], gameIds: [id(101)] },
          { id: id(12), registrationIds: [C, D], gameIds: [id(102)] },
        ],
        publishedGames: [game(101, A, B), game(102, C, D)],
      },
    ],
    series: [
      {
        id: id(20),
        phaseId: id(30),
        format: "single",
        home: rank(id(11), 1),
        away: rank(id(12), 2),
        games: [],
      },
      {
        id: id(21),
        phaseId: id(30),
        format: "single",
        home: rank(id(12), 1),
        away: rank(id(11), 2),
        games: [],
      },
      {
        id: id(22),
        phaseId: id(31),
        format: "single",
        home: winner(id(20)),
        away: winner(id(21)),
        games: [],
      },
      {
        id: id(23),
        phaseId: id(31),
        format: "single",
        home: loser(id(20)),
        away: loser(id(21)),
        games: [],
      },
    ],
  };
}
const node = (s: ReturnType<typeof previewCrossings>, n: number) =>
  s.series.find((x) => x.id === id(n))!;
it("blocks both positions covered by an unresolved tie instead of choosing by UUID", () => {
  const s = base(),
    phase = s.groupPhases[0];
  phase.groups[0].gameIds.push(id(103));
  phase.publishedGames.push(game(103, B, A));
  const result = previewCrossings(s);
  expect(node(result, 20).home).toMatchObject({
    status: "pending",
    registrationId: null,
    needs: "group_tie",
  });
  expect(node(result, 21).away).toMatchObject({
    status: "pending",
    registrationId: null,
    needs: "group_tie",
  });
  expect(node(result, 22).home.registrationId).toBeNull();
});
it("keeps incomplete and empty groups pending even if the current leader is unique", () => {
  const s = base();
  s.groupPhases[0].groups[0].gameIds.push(id(103));
  expect(node(previewCrossings(s), 20).home).toMatchObject({
    registrationId: null,
    needs: "group_results",
  });
  s.groupPhases[0].groups[0].gameIds = [];
  expect(node(previewCrossings(s), 20).home).toMatchObject({
    registrationId: null,
    needs: "group_results",
  });
});
it("resolves groups through semifinals, final and losers independent of array order, retaining versions", () => {
  const s = base();
  s.regulationVersion = 8;
  s.groupPhases[0].publishedGames[0].publicationVersion = 3;
  s.series[0].games = [{ slot: 1, game: game(104, D, A, 70, 90) }];
  s.series[1].games = [{ slot: 1, game: game(105, C, B) }];
  const before = structuredClone(s),
    result = previewCrossings(s);
  expect(result).toMatchObject({
    status: "preview",
    regulationVersion: 8,
    disputeId,
  });
  expect(node(result, 20)).toMatchObject({
    status: "complete",
    result: { winnerRegistrationId: A },
  });
  expect(node(result, 22)).toMatchObject({
    status: "ready",
    home: { registrationId: A },
    away: { registrationId: C },
  });
  expect(node(result, 23)).toMatchObject({
    status: "ready",
    home: { registrationId: D },
    away: { registrationId: B },
  });
  expect(
    result.lineage.find((g) => g.gameId === id(101))?.publicationVersion,
  ).toBe(3);
  s.series[2].games = [{ slot: 1, game: game(106, C, A, 75, 76) }];
  expect(node(previewCrossings(s), 22).result?.winnerRegistrationId).toBe(A);
  expect(
    previewCrossings({ ...before, series: [...before.series].reverse() }),
  ).toEqual(result);
  expect(before.series[2].games).toEqual([]);
});
it("rejects missing targets, foreign registrations, context and out-of-range group positions", () => {
  for (const ref of [
    registration(id(999)),
    rank(id(99), 1),
    rank(id(11), 3),
    { ...rank(id(11), 1), phaseId: id(99) },
    winner(id(99)),
    loser(id(99)),
  ]) {
    const s = base();
    s.series[0].home = ref;
    expect(() => previewCrossings(s)).toThrow();
  }
  const s = base();
  s.groupPhases[0].disputeId = id(999);
  expect(() => previewCrossings(s)).toThrow();
  const foreign = base();
  foreign.groupPhases[0].groups[0].registrationIds[0] = id(999);
  expect(() => previewCrossings(foreign)).toThrow();
});
it("rejects self references and cycles across series phases even without results", () => {
  const self = base();
  self.series[0].home = winner(id(20));
  expect(() => previewCrossings(self)).toThrow(/ciclo/i);
  const loop = base();
  loop.series[0].home = loser(id(22));
  expect(() => previewCrossings(loop)).toThrow(/ciclo/i);
});
it("does not propagate winners or losers of incomplete, gapped or aggregate-tied series", () => {
  const s = base();
  s.series[0].format = "best_of_3";
  s.series[0].games = [{ slot: 1, game: game(104, A, D) }];
  expect(node(previewCrossings(s), 22).home).toMatchObject({
    registrationId: null,
    needs: "series_result",
  });
  s.series[0].games.push({ slot: 3, game: game(105, A, D) });
  expect(node(previewCrossings(s), 23).home.registrationId).toBeNull();
  s.series[0].format = "two_leg";
  s.series[0].games[1] = { slot: 2, game: game(105, D, A) };
  const result = previewCrossings(s);
  expect(node(result, 20).status).toBe("tied");
  expect(node(result, 22).home.registrationId).toBeNull();
  expect(node(result, 23).home.registrationId).toBeNull();
});
it("reports duplicate resolved entrants as a conflict, without manufacturing an opponent", () => {
  const s = base();
  s.series[0].away = registration(A);
  const result = previewCrossings(s);
  expect(node(result, 20)).toMatchObject({
    status: "conflict",
    result: null,
    conflicts: [{ code: "duplicate_entrant" }],
  });
  expect(node(result, 22).home).toMatchObject({
    registrationId: null,
    needs: "upstream_conflict",
  });
});
it("shows the impact of corrected qualifiers without changing already played opponents or facts", () => {
  const s = base();
  s.series[0].games = [{ slot: 1, game: game(104, A, D) }];
  expect(node(previewCrossings(s), 20).status).toBe("complete");
  s.groupPhases[0].publishedGames[0] = {
    ...game(101, A, B, 60, 80),
    publicationVersion: 2,
  };
  const snapshot = structuredClone(s),
    result = previewCrossings(s);
  expect(node(result, 20)).toMatchObject({
    status: "conflict",
    home: { registrationId: B },
    result: null,
    conflicts: [{ code: "opponents_changed", gameIds: [id(104)] }],
  });
  expect(node(result, 22).home.needs).toBe("upstream_conflict");
  expect(s).toEqual(snapshot);
});
it("cannot infer pending entrants from the opponents found in an existing game", () => {
  const s = base();
  s.groupPhases[0].groups[0].gameIds.push(id(103));
  s.series[0].games = [{ slot: 1, game: game(104, A, D) }];
  expect(node(previewCrossings(s), 20)).toMatchObject({
    status: "conflict",
    result: null,
    conflicts: [{ code: "unresolved_entrants", gameIds: [id(104)] }],
  });
});
it("rejects reused assignments, conflicting source versions, duplicates and executable rules", () => {
  const s = base();
  for (const changed of [
    { ...s, series: [...s.series, s.series[0]] },
    { ...s, registrationIds: [...s.registrationIds, A] },
    { ...s, groupPhases: [s.groupPhases[0], s.groupPhases[0]] },
    { ...s, regulationVersion: 0 },
    { ...s, execute: "rank()" },
  ])
    expect(() => previewCrossings(changed)).toThrow();
  s.series[0].games = [{ slot: 1, game: game(101, A, D) }];
  expect(() => previewCrossings(s)).toThrow();
  s.series[0].games = [
    { slot: 1, game: { ...game(104, A, D), disputeId: id(999) } },
  ];
  expect(() => previewCrossings(s)).toThrow();
  const same = base();
  same.groupPhases[0].publishedGames.push({
    ...game(104, A, D),
    publicationVersion: 2,
  });
  same.series[0].games = [{ slot: 1, game: game(104, A, D) }];
  expect(() => previewCrossings(same)).toThrow();
});
