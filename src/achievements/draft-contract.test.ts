import { expect, it } from "vitest";
import {
  saveAchievementDraftSchema,
  achievementDraftStateSchema,
  achievementDraftAckSchema,
} from "./draft-contract";
const did = "f9200000-0000-4000-8000-000000000003",
  fp = "a".repeat(64);
it("envio fechado normaliza IDs e título sem aceitar ator, elegibilidade ou confirmação", () => {
  const command = {
    commandId: did.toUpperCase(),
    expectedVersion: 0,
    expectedContextFingerprint: fp,
    source: null,
    draft: { disputeId: did.toUpperCase(), placements: [], honors: [] },
  };
  expect(saveAchievementDraftSchema.parse(command).draft.disputeId).toBe(did);
  for (const injected of [
    { actorId: did },
    { confirmed: true },
    { contextSnapshot: {} },
    { eligibleAthletes: [] },
  ])
    expect(
      saveAchievementDraftSchema.safeParse({ ...command, ...injected }).success,
    ).toBe(false);
  for (const value of [
    null,
    {},
    { ...command, expectedVersion: 2147483647 },
    { ...command, commandId: "bad" },
  ])
    expect(saveAchievementDraftSchema.safeParse(value).success).toBe(false);
});
it("retomada distingue ausência de rascunho e fonte alterada; ACK correlacionado não é publicação", () => {
  const state = {
    disputeId: did,
    version: 0,
    draft: null,
    source: null,
    contextFingerprint: fp,
    savedContextFingerprint: null,
    savedAt: null,
    needsReview: false,
    history: [],
    hasMore: false,
  };
  expect(achievementDraftStateSchema.safeParse(state).success).toBe(true);
  expect(
    achievementDraftStateSchema.safeParse({ ...state, needsReview: true })
      .success,
  ).toBe(false);
  expect(
    achievementDraftStateSchema.safeParse({ ...state, hasMore: true }).success,
  ).toBe(false);
  const saved = {
    ...state,
    version: 1,
    draft: { disputeId: did, placements: [], honors: [] },
    savedAt: "2026-10-25T12:00:00Z",
    savedContextFingerprint: fp,
  };
  expect(achievementDraftStateSchema.safeParse(saved).success).toBe(true);
  expect(
    achievementDraftStateSchema.safeParse({
      ...saved,
      contextFingerprint: "b".repeat(64),
    }).success,
  ).toBe(false);
  expect(
    achievementDraftStateSchema.safeParse({
      ...saved,
      contextFingerprint: "b".repeat(64),
      needsReview: true,
    }).success,
  ).toBe(true);
  const ack = {
    commandId: did,
    disputeId: did,
    version: 1,
    savedAt: saved.savedAt,
    contextFingerprint: fp,
  };
  expect(achievementDraftAckSchema.safeParse(ack).success).toBe(true);
  expect(
    achievementDraftAckSchema.safeParse({ ...ack, published: true }).success,
  ).toBe(false);
});
