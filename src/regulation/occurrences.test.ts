import { it, expect } from "vitest";
import {
  previewOccurrences,
  type OccurrencesInput,
  type GameOccurrence,
} from "./occurrences";
const id = (n: number) =>
  `f1600000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const A = id(1),
  B = id(2),
  C = id(3),
  disputeId = id(90);
const fixtureGame = (n = 100, awayRegistrationId = B) => ({
  id: id(n),
  version: 3,
  disputeId,
  homeRegistrationId: A,
  awayRegistrationId,
});
const played = () => ({
  gameId: id(100),
  publicationVersion: 2,
  disputeId,
  homeRegistrationId: A,
  awayRegistrationId: B,
  homePoints: 78,
  awayPoints: 70,
  status: "played" as const,
  pointsSource: { kind: "pdf" as const, version: 4 },
});
const occurrence = (effect: GameOccurrence["effect"]): GameOccurrence => ({
  id: id(200),
  version: 1,
  gameId: id(100),
  gameVersion: 3,
  publicationVersion: 0,
  reason: "Decisão registrada para conferência",
  effect,
});
function base(): OccurrencesInput {
  return {
    disputeId,
    regulationVersion: 7,
    registrationIds: [A, B, C],
    rules: { wo: null },
    games: [fixtureGame()],
    publishedGames: [],
    occurrences: [],
    withdrawals: [],
  };
}
const wo = { winnerLeaguePoints: 2, loserLeaguePoints: -1, score: null };
const first = (s: OccurrencesInput) => previewOccurrences(s).games[0];
it("requires an explicit WO rule and keeps the administrative award separate from a played fact", () => {
  const s = base();
  s.occurrences = [occurrence({ kind: "wo", winnerRegistrationId: B })];
  expect(first(s)).toMatchObject({
    state: "conflict",
    needs: "occurrence_review",
    outcome: null,
  });
  s.rules.wo = wo;
  const result = first(s);
  expect(result).toMatchObject({
    state: "awarded",
    publication: null,
    outcome: {
      kind: "awarded",
      award: {
        kind: "wo",
        winnerRegistrationId: B,
        homeLeaguePoints: -1,
        awayLeaguePoints: 2,
        score: null,
      },
    },
  });
  expect(JSON.stringify(result)).not.toMatch(
    /players|participants|minutes|playedGames/,
  );
});
it("orients an explicitly configured WO score without inventing individual statistics", () => {
  const s = base();
  s.rules.wo = { ...wo, score: { winner: 20, loser: 0 } };
  s.occurrences = [occurrence({ kind: "wo", winnerRegistrationId: B })];
  expect(first(s).outcome).toMatchObject({
    award: { score: { homePoints: 0, awayPoints: 20 } },
  });
});
it("keeps postponement and interruption pending and cancellation excluded while retaining original publications", () => {
  for (const [kind, state] of [
    ["postponed", "pending"],
    ["interrupted", "pending"],
    ["cancelled", "excluded"],
  ] as const) {
    const s = base();
    s.publishedGames = [played()];
    s.occurrences = [{ ...occurrence({ kind }), publicationVersion: 2 }];
    expect(first(s)).toMatchObject({
      gameId: id(100),
      state,
      publication: played(),
      outcome: null,
    });
    expect(s.publishedGames).toEqual([played()]);
  }
});
it("applies an administrative award or exclusion only with an explicit effect and reason", () => {
  const s = base();
  s.publishedGames = [played()];
  s.occurrences = [
    {
      ...occurrence({
        kind: "administrative",
        decision: {
          kind: "award",
          winnerRegistrationId: B,
          homeLeaguePoints: 0,
          awayLeaguePoints: 4,
          score: null,
        },
      }),
      publicationVersion: 2,
    },
  ];
  expect(first(s)).toMatchObject({
    state: "awarded",
    publication: played(),
    outcome: {
      kind: "awarded",
      award: {
        kind: "administrative",
        winnerRegistrationId: B,
        homeLeaguePoints: 0,
        awayLeaguePoints: 4,
        score: null,
      },
    },
  });
  s.occurrences[0].effect = {
    kind: "administrative",
    decision: { kind: "exclude" },
  };
  expect(first(s)).toMatchObject({
    state: "excluded",
    publication: played(),
    outcome: null,
  });
});
it("handles both withdrawal policies using explicit prior games without an automatic future WO", () => {
  for (const policy of ["keep_results", "exclude_results"] as const) {
    const s = base();
    s.publishedGames = [played()];
    s.games.push(fixtureGame(101, C));
    s.withdrawals = [
      {
        id: id(300),
        version: 1,
        registrationId: A,
        reason: "Equipe desistiu da disputa",
        policy,
        previousGameIds: [id(100)],
      },
    ];
    const result = previewOccurrences(s);
    expect(result.games[0]).toMatchObject({
      state: policy === "keep_results" ? "played" : "excluded",
      publication: played(),
    });
    expect(result.games[1]).toMatchObject({
      state: "pending",
      outcome: null,
      needs: "withdrawal_decision",
    });
    s.rules.wo = wo;
    s.occurrences.push({
      ...occurrence({ kind: "wo", winnerRegistrationId: C }),
      gameId: id(101),
    });
    expect(previewOccurrences(s).games[1].state).toBe("awarded");
  }
});
it("requires review for a published game outside a withdrawal's explicit prior results", () => {
  const s = base();
  s.publishedGames = [played()];
  s.withdrawals = [
    {
      id: id(300),
      version: 1,
      registrationId: A,
      reason: "Revisar partidas após desistência",
      policy: "keep_results",
      previousGameIds: [],
    },
  ];
  expect(first(s)).toMatchObject({
    state: "conflict",
    needs: "withdrawal_review",
    outcome: null,
    publication: played(),
  });
});
it("does not depend on withdrawal ordering when one prior-results policy excludes the game", () => {
  const s = base();
  s.publishedGames = [played()];
  s.withdrawals = [
    {
      id: id(300),
      version: 1,
      registrationId: A,
      reason: "Desistência A registrada",
      policy: "keep_results",
      previousGameIds: [id(100)],
    },
    {
      id: id(301),
      version: 2,
      registrationId: B,
      reason: "Desistência B registrada",
      policy: "exclude_results",
      previousGameIds: [id(100)],
    },
  ];
  const result = previewOccurrences(s);
  expect(result.games[0]).toMatchObject({
    state: "excluded",
    outcome: null,
    publication: played(),
  });
  expect(
    previewOccurrences({ ...s, withdrawals: [...s.withdrawals].reverse() }),
  ).toEqual(result);
});
it("rejects future game/publication versions, foreign winners, missing targets and repeated current decisions", () => {
  const s = base();
  s.rules.wo = wo;
  const command = occurrence({ kind: "wo", winnerRegistrationId: B });
  for (const value of [
    { ...s, occurrences: [{ ...command, gameVersion: 4 }] },
    { ...s, occurrences: [{ ...command, publicationVersion: 1 }] },
    { ...s, occurrences: [{ ...command, gameId: id(999) }] },
    { ...s, occurrences: [{ ...command, reason: " " }] },
    { ...s, occurrences: [command, { ...command, id: id(201), version: 2 }] },
    {
      ...s,
      occurrences: [
        { ...command, effect: { kind: "wo", winnerRegistrationId: C } },
      ],
    },
    { ...s, games: [fixtureGame(), fixtureGame()] },
    {
      ...s,
      publishedGames: [played(), { ...played(), publicationVersion: 3 }],
    },
    { ...s, games: [{ ...fixtureGame(), disputeId: id(999) }] },
  ])
    expect(() => previewOccurrences(value)).toThrow();
});
it("rejects foreign or result-less prior games, duplicate withdrawals and formulas or athlete stats in decisions", () => {
  const s = base(),
    withdrawal = {
      id: id(300),
      version: 1,
      registrationId: C,
      reason: "Desistência registrada",
      policy: "exclude_results",
      previousGameIds: [id(100)],
    };
  for (const value of [
    { ...s, withdrawals: [withdrawal] },
    { ...s, withdrawals: [{ ...withdrawal, registrationId: A }] },
    { ...s, withdrawals: [{ ...withdrawal, previousGameIds: [id(999)] }] },
    {
      ...s,
      withdrawals: [
        { ...withdrawal, previousGameIds: [] },
        { ...withdrawal, previousGameIds: [], id: id(301) },
      ],
    },
    { ...s, rules: { wo: { ...wo, formula: "points()" } } },
    {
      ...s,
      occurrences: [{ ...occurrence({ kind: "cancelled" }), participants: [] }],
    },
    { ...s, rules: { wo: { ...wo, score: { winner: 0, loser: 20 } } } },
  ])
    expect(() => previewOccurrences(value)).toThrow();
});
it("rejects an administrative score contradicting its declared winner", () => {
  const s = base();
  s.occurrences = [
    occurrence({
      kind: "administrative",
      decision: {
        kind: "award",
        winnerRegistrationId: B,
        homeLeaguePoints: 2,
        awayLeaguePoints: 0,
        score: { homePoints: 20, awayPoints: 0 },
      },
    }),
  ];
  expect(() => previewOccurrences(s)).toThrow();
});
it("preserves a normal published fact and exposes versions without mutating the input", () => {
  const s = base();
  s.publishedGames = [played()];
  const before = structuredClone(s),
    result = previewOccurrences(s);
  expect(result).toMatchObject({
    status: "preview",
    regulationVersion: 7,
    disputeId,
    games: [
      {
        state: "played",
        publication: played(),
        outcome: { kind: "played", publication: played() },
      },
    ],
  });
  expect(result.lineage).toContainEqual({
    gameId: id(100),
    gameVersion: 3,
    publicationVersion: 2,
    occurrenceVersion: 0,
    withdrawalVersions: [],
  });
  expect(s).toEqual(before);
});

it("turns a source revision after a decision into review conflict without applying the obsolete award", () => {
  const s = base();
  s.rules.wo = wo;
  s.publishedGames = [played()];
  s.occurrences = [
    {
      ...occurrence({ kind: "wo", winnerRegistrationId: B }),
      publicationVersion: 2,
      gameVersion: 2,
    },
  ];
  expect(first(s)).toMatchObject({
    state: "conflict",
    needs: "occurrence_review",
    outcome: null,
    publication: played(),
  });
  s.occurrences[0].gameVersion = 3;
  s.occurrences[0].publicationVersion = 1;
  expect(first(s)).toMatchObject({
    state: "conflict",
    needs: "occurrence_review",
    outcome: null,
  });
});
it("keeps review pending when a later regulation removes a WO rule", () => {
  const s = base();
  s.occurrences = [occurrence({ kind: "wo", winnerRegistrationId: B })];
  expect(first(s)).toMatchObject({
    state: "conflict",
    needs: "occurrence_review",
    outcome: null,
  });
});
it("preserves the original winner identity after opponents change and blocks its obsolete effect", () => {
  const s = base();
  s.rules.wo = wo;
  s.games[0].version = 4;
  s.games[0].awayRegistrationId = C;
  s.occurrences = [occurrence({ kind: "wo", winnerRegistrationId: B })];
  expect(first(s)).toMatchObject({
    state: "conflict",
    outcome: null,
    occurrence: { effect: { winnerRegistrationId: B } },
  });
});
