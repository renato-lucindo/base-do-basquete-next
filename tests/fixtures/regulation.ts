import type { RegulationState } from "../../src/regulation/persistence-contract";
export const regulationId = (n: number) =>
  `f2200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function regulationFixture(): RegulationState {
  const id = regulationId,
    A = id(1),
    B = id(2),
    did = id(90);
  return {
    disputeId: did,
    version: 1,
    savedAt: "2026-10-24T20:00:00Z",
    contextFingerprint: "a".repeat(64),
    definition: {
      registrationIds: [A, B],
      occurrenceRules: { wo: null },
      groupPhases: [
        {
          phaseId: id(10),
          name: "Fase regular",
          rules: {
            format: "round_robin",
            points: { win: 2, loss: 1 },
            tieBreakers: [],
          },
          groups: [
            {
              id: id(11),
              name: "Grupo único",
              registrationIds: [A, B],
              gameIds: [id(100)],
            },
          ],
        },
      ],
      knockoutPhases: [],
      series: [],
    },
    context: {
      registrationIds: [A, B],
      games: [
        {
          id: id(100),
          version: 2,
          disputeId: did,
          homeRegistrationId: A,
          awayRegistrationId: B,
        },
      ],
      publishedGames: [
        {
          gameId: id(100),
          publicationVersion: 1,
          disputeId: did,
          homeRegistrationId: A,
          awayRegistrationId: B,
          homePoints: 80,
          awayPoints: 70,
          status: "played",
          pointsSource: { kind: "sheet", version: 1 },
        },
      ],
      occurrences: [],
      withdrawals: [],
    },
    history: [
      {
        version: 1,
        savedAt: "2026-10-24T20:00:00Z",
        actorId: id(500),
        reason: "Regra anterior",
      },
    ],
    hasMore: false,
  };
}
