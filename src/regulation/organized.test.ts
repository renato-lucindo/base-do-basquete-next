import { it, expect } from "vitest";
import { previewOrganizedCompetition, type OrganizedInput } from "./organized";
const id = (n: number) =>
  `f1900000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  C = id(3),
  D = id(4),
  disputeId = id(90);
const group = (groupId: string, position: number) => ({
  kind: "group_rank" as const,
  phaseId: id(10),
  groupId,
  position,
});
const winner = (seriesId: string) => ({
  kind: "series_winner" as const,
  seriesId,
});
const scheduled = (n: number, h: string, a: string) => ({
  id: id(n),
  version: 1,
  disputeId,
  homeRegistrationId: h,
  awayRegistrationId: a,
});
const played = (n: number, h: string, a: string) => ({
  gameId: id(n),
  publicationVersion: 1,
  disputeId,
  homeRegistrationId: h,
  awayRegistrationId: a,
  homePoints: 80,
  awayPoints: 70,
  status: "played" as const,
  pointsSource: { kind: "sheet" as const, version: 1 },
});
function base(): OrganizedInput {
  return {
    context: {
      disputeId,
      regulationVersion: 5,
      registrationIds: [A, B, C, D],
      rules: {
        wo: { winnerLeaguePoints: 2, loserLeaguePoints: 1, score: null },
      },
      games: [
        scheduled(101, A, B),
        scheduled(102, C, D),
        scheduled(104, A, D),
        scheduled(105, C, B),
      ],
      publishedGames: [played(101, A, B), played(102, C, D), played(105, C, B)],
      occurrences: [
        {
          id: id(201),
          version: 1,
          gameId: id(104),
          gameVersion: 1,
          publicationVersion: 0,
          reason: "W.O. registrado conforme regulamento",
          effect: { kind: "wo", winnerRegistrationId: A },
        },
      ],
      withdrawals: [],
    },
    groupPhases: [
      {
        phaseId: id(10),
        rules: {
          format: "round_robin",
          points: { win: 2, loss: 1 },
          tieBreakers: ["point_difference"],
        },
        groups: [
          { id: id(11), registrationIds: [A, B], gameIds: [id(101)] },
          { id: id(12), registrationIds: [C, D], gameIds: [id(102)] },
        ],
      },
    ],
    series: [
      {
        id: id(20),
        phaseId: id(30),
        format: "single",
        home: group(id(11), 1),
        away: group(id(12), 2),
        games: [{ slot: 1, gameId: id(104) }],
      },
      {
        id: id(21),
        phaseId: id(30),
        format: "single",
        home: group(id(12), 1),
        away: group(id(11), 2),
        games: [{ slot: 1, gameId: id(105) }],
      },
      {
        id: id(22),
        phaseId: id(31),
        format: "single",
        home: winner(id(20)),
        away: winner(id(21)),
        games: [],
      },
    ],
  };
}
it("combines group results, an administrative semifinal and a played semifinal without fabricated athlete facts", () => {
  const s = base(),
    before = structuredClone(s),
    result = previewOrganizedCompetition(s);
  expect(result).toMatchObject({ status: "preview", regulationVersion: 5 });
  expect(result.series[0]).toMatchObject({
    status: "complete",
    result: {
      winnerRegistrationId: A,
      playedGames: 0,
      awardedGames: 1,
      totals: null,
    },
  });
  expect(result.series[2]).toMatchObject({
    status: "ready",
    home: { registrationId: A },
    away: { registrationId: C },
  });
  expect(result.groupPhases[0].groups[0].standings.rows[0]).toMatchObject({
    registrationId: A,
    playedGames: 1,
    awardedGames: 0,
  });
  expect(result.lineage.find((g) => g.gameId === id(104))).toMatchObject({
    publicationVersion: 0,
    occurrenceVersion: 1,
  });
  expect(s).toEqual(before);
});
it("feeds a group WO to standings without assigning 0 to an unknown competitive score", () => {
  const s = base();
  s.context.publishedGames = s.context.publishedGames.filter(
    (g) => g.gameId !== id(101),
  );
  s.context.occurrences.push({
    ...s.context.occurrences[0],
    id: id(202),
    gameId: id(101),
    effect: { kind: "wo", winnerRegistrationId: A },
  });
  const result = previewOrganizedCompetition(s);
  expect(result.groupPhases[0].groups[0].standings.rows[0]).toMatchObject({
    registrationId: A,
    leaguePoints: 2,
    playedGames: 0,
    awardedGames: 1,
    pointsFor: null,
    scoreGamesCovered: 0,
  });
  expect(result.series[2].home.registrationId).toBe(A);
});
it("keeps postponed/interrupted games pending and counts cancellations as explicit exclusions, not results", () => {
  for (const kind of ["postponed", "interrupted", "cancelled"] as const) {
    const s = base();
    s.context.occurrences.push({
      ...s.context.occurrences[0],
      id: id(202),
      gameId: id(101),
      publicationVersion: 1,
      effect: { kind },
    });
    const result = previewOrganizedCompetition(s),
      g = result.groupPhases[0].groups[0];
    expect(g.standings.status).toBe("empty");
    expect(g.pendingGameIds).toEqual(kind === "cancelled" ? [] : [id(101)]);
    expect(g.excludedGameIds).toEqual(kind === "cancelled" ? [id(101)] : []);
    expect(result.series[0].home.registrationId).toBeNull();
    expect(result.games.find((g) => g.gameId === id(101))?.publication).toEqual(
      played(101, A, B),
    );
  }
});
it("preserves prior results under keep-results and blocks advancement after explicit withdrawal exclusion", () => {
  const s = base();
  s.context.withdrawals = [
    {
      id: id(300),
      version: 1,
      registrationId: A,
      reason: "Desistência após jogos anteriores",
      policy: "keep_results",
      previousGameIds: [id(101), id(104)],
    },
  ];
  expect(previewOrganizedCompetition(s).series[2].home.registrationId).toBe(A);
  s.context.withdrawals[0].policy = "exclude_results";
  const result = previewOrganizedCompetition(s);
  expect(result.groupPhases[0].groups[0].standings.status).toBe("empty");
  expect(result.series[2].home.registrationId).toBeNull();
  expect(result.games[0].publication).toEqual(played(101, A, B));
});
it("reports a qualifier correction conflicting with existing opponents instead of replacing them", () => {
  const s = base();
  const p = s.context.publishedGames[0];
  p.publicationVersion = 2;
  p.homePoints = 60;
  p.awayPoints = 80;
  const snapshot = structuredClone(s),
    result = previewOrganizedCompetition(s);
  expect(result.series[0]).toMatchObject({
    status: "conflict",
    home: { registrationId: B },
    result: null,
    conflicts: [{ code: "opponents_changed", gameIds: [id(104)] }],
  });
  expect(result.series[2].home.registrationId).toBeNull();
  expect(s).toEqual(snapshot);
});
it("requires declared score coverage for two-leg series and blocks downstream winner/loser entries", () => {
  const s = base();
  s.series[0].format = "two_leg";
  s.context.games.push(scheduled(106, D, A));
  s.context.publishedGames.push(played(106, D, A));
  s.series[0].games.push({ slot: 2, gameId: id(106) });
  expect(previewOrganizedCompetition(s).series[0]).toMatchObject({
    status: "pending",
    result: { needs: "score_or_decision", totals: null },
  });
  expect(
    previewOrganizedCompetition(s).series[2].home.registrationId,
  ).toBeNull();
});
it("blocks a series with an unresolved published result even if two other outcomes suggest a winner", () => {
  const s = base();
  s.series[0].format = "best_of_3";
  s.context.games.push(scheduled(106, A, D), scheduled(107, A, D));
  s.context.publishedGames.push(played(107, A, D));
  s.context.occurrences.push({
    ...s.context.occurrences[0],
    id: id(202),
    gameId: id(106),
  });
  s.series[0].games.push(
    { slot: 2, gameId: id(106) },
    { slot: 3, gameId: id(107) },
  );
  s.context.withdrawals = [
    {
      id: id(300),
      version: 1,
      registrationId: A,
      reason: "Revisão dos jogos anteriores",
      policy: "keep_results",
      previousGameIds: [id(101), id(104), id(106)],
    },
  ];
  const result = previewOrganizedCompetition(s);
  expect(result.series[0]).toMatchObject({
    status: "conflict",
    result: null,
    conflicts: [{ code: "unresolved_results", gameIds: [id(107)] }],
  });
  expect(result.series[2].home.registrationId).toBeNull();
});
it("rejects missing/reused/foreign assignments, duplicate slots and cyclic references", () => {
  for (const mutate of [
    (s: OrganizedInput) => {
      s.series[0].games[0].gameId = id(999);
    },
    (s: OrganizedInput) => {
      s.series[0].games[0].gameId = id(101);
    },
    (s: OrganizedInput) => {
      s.series[0].games.push(s.series[0].games[0]);
    },
    (s: OrganizedInput) => {
      s.series[0].home = winner(id(22));
    },
    (s: OrganizedInput) => {
      s.groupPhases[0].groups[0].registrationIds[0] = id(999);
    },
    (s: OrganizedInput) => {
      s.groupPhases[0].groups[0].gameIds = [id(102)];
      s.groupPhases[0].groups[1].gameIds = [];
    },
  ]) {
    const s = base();
    mutate(s);
    expect(() => previewOrganizedCompetition(s)).toThrow();
  }
});

it("blocks a corrected occurrence and dependent final instead of silently counting the previous WO", () => {
  const s = base();
  s.context.games.find((g) => g.id === id(104))!.version = 2;
  const p = previewOrganizedCompetition(s);
  expect(p.series.find((n) => n.id === id(20))).toMatchObject({
    status: "conflict",
    result: null,
  });
  expect(p.series.find((n) => n.id === id(22))).toMatchObject({
    status: "pending",
    home: { status: "pending", registrationId: null },
  });
  expect(p.games.find((g) => g.gameId === id(104))).toMatchObject({
    state: "conflict",
    outcome: null,
  });
});
