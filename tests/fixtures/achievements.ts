import { regulationFixture, regulationId as id } from "./regulation";
export { regulationId as achievementId } from "./regulation";
export function achievementFixture() {
  const state = regulationFixture();
  return {
    state,
    request: {
      disputeId: state.disputeId,
      expectedRegulationVersion: state.version,
      expectedContextFingerprint: state.contextFingerprint,
      source: { kind: "group" as const, phaseId: id(10), groupId: id(11) },
    },
  };
}
export function podiumFixture() {
  const state = regulationFixture(),
    A = id(1),
    B = id(2),
    C = id(3),
    D = id(4);
  state.definition!.registrationIds = [A, B, C, D];
  state.context.registrationIds = [A, B, C, D];
  state.definition!.groupPhases = [];
  state.definition!.knockoutPhases = [{ id: id(30), name: "Eliminatórias" }];
  const entry = (registrationId: string) => ({
    kind: "registration" as const,
    registrationId,
  });
  state.definition!.series = [
    {
      id: id(20),
      phaseId: id(30),
      name: "Confronto escolhido",
      format: "single",
      home: entry(A),
      away: entry(B),
      games: [{ slot: 1, gameId: id(100) }],
    },
    {
      id: id(21),
      phaseId: id(30),
      name: "Confronto escolhido",
      format: "single",
      home: entry(C),
      away: entry(D),
      games: [{ slot: 1, gameId: id(101) }],
    },
  ];
  state.context.games.push({
    ...state.context.games[0],
    id: id(101),
    homeRegistrationId: C,
    awayRegistrationId: D,
  });
  state.context.publishedGames.push({
    ...state.context.publishedGames[0],
    gameId: id(101),
    homeRegistrationId: C,
    awayRegistrationId: D,
    homePoints: 50,
    awayPoints: 60,
  });
  return {
    state,
    request: {
      disputeId: state.disputeId,
      expectedRegulationVersion: state.version,
      expectedContextFingerprint: state.contextFingerprint,
      source: {
        kind: "series" as const,
        finalSeriesId: id(20),
        bronzeSeriesId: id(21) as string | null,
      },
    },
  };
}
