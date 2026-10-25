import { regulationFixture, regulationId as id } from "./regulation.ts";
import type { AchievementContext } from "../../src/achievements/context-contract";
import type { AchievementWorkspace } from "../../src/achievements/view-contract";
import type { PublicAchievements } from "../../src/achievements/publication-contract";
export function achievementBackendFixture() {
  const state = regulationFixture(),
    request = {
      disputeId: state.disputeId,
      expectedRegulationVersion: state.version,
      expectedContextFingerprint: state.contextFingerprint,
      source: { kind: "group" as const, phaseId: id(10), groupId: id(11) },
    },
    fp = "a".repeat(64),
    stamp = "2026-10-25T12:00:00Z";
  const source: AchievementContext = {
    disputeId: state.disputeId,
    scope: {
      championshipId: id(700),
      seasonId: id(701),
      name: "Torneio",
      year: 2026,
      gender: "masculino",
      category: "Adulto",
      division: null,
    },
    regulation: { ...state, history: [], hasMore: false },
    registrations: state.context.registrationIds.map((rid, n) => ({
      id: rid,
      disputeId: state.disputeId,
      teamId: id(800 + n),
      name: `Equipe ${n + 1}`,
      version: 1,
    })),
    eligibleAthletes: [{ personId: id(500), version: 1 }],
    contextFingerprint: fp,
  };
  const draft = {
    commandId: id(600),
    expectedVersion: 0,
    expectedContextFingerprint: fp,
    source: request.source,
    draft: {
      disputeId: state.disputeId,
      placements: [{ position: 1, registrationIds: [id(1)] }],
      honors: [{ id: id(602), title: "MVP", personIds: [id(500)] }],
    },
  };
  const confirmation = {
    commandId: id(601),
    disputeId: state.disputeId,
    expectedDraftVersion: 1,
    expectedPublicationVersion: 0,
    expectedContextFingerprint: fp,
    reason: "",
    acknowledgeImpact: true as const,
  };
  const workspace: AchievementWorkspace = {
    disputeId: source.disputeId,
    scope: source.scope,
    contextFingerprint: fp,
    regulationVersion: state.version,
    registrations: source.registrations,
    sourceOptions: {
      groups: [
        {
          phaseId: id(10),
          groupId: id(11),
          phaseName: "Primeira fase",
          name: "Grupo A",
        },
      ],
      series: [],
    },
    selectedPeople: [],
    draft: {
      disputeId: source.disputeId,
      version: 0,
      draft: null,
      source: null,
      contextFingerprint: fp,
      savedContextFingerprint: null,
      savedAt: null,
      needsReview: false,
      history: [],
      hasMore: false,
    },
    publication: {
      disputeId: source.disputeId,
      version: 0,
      draftVersion: 0,
      confirmedDraftVersion: null,
      contextFingerprint: fp,
      confirmedContextFingerprint: null,
      sourceChanged: false,
      draftChanged: false,
      history: [],
      hasMore: false,
    },
  };
  const publicValue: PublicAchievements = {
    disputeId: source.disputeId,
    version: 1,
    confirmedAt: stamp,
    context: source.scope,
    placements: [
      {
        position: 1,
        registrations: [
          { registrationId: id(1), teamId: id(800), name: "Equipe 1" },
        ],
      },
    ],
    honors: [
      {
        id: id(602),
        title: "MVP",
        athletes: [
          {
            personId: id(500),
            name: "Atleta",
            nickname: null,
            publicBirthYear: null,
          },
        ],
      },
    ],
  };
  return {
    source,
    workspace,
    draft,
    confirmation,
    publicValue,
    fp,
    stamp,
    request,
    id,
  };
}
