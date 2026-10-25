import { expect, it } from "vitest";
import {
  confirmAchievementsSchema,
  publicAchievementsSchema,
  achievementPublicationStateSchema,
} from "./publication-contract";
const id = "f9200000-0000-4000-8000-000000000003",
  fp = "a".repeat(64),
  stamp = "2026-10-25T12:00:00Z";
const snapshot = {
  disputeId: id,
  version: 1,
  confirmedAt: stamp,
  context: {
    championshipId: id,
    name: "Campeonato",
    seasonId: id,
    year: 2026,
    gender: "masculino",
    category: "Adulto",
    division: null,
  },
  placements: [],
  honors: [],
};
it("confirma somente referência versionada e exige motivo em revisão", () => {
  const c = {
    commandId: id,
    disputeId: id,
    expectedDraftVersion: 1,
    expectedPublicationVersion: 0,
    expectedContextFingerprint: fp,
    reason: "",
    acknowledgeImpact: true,
  };
  expect(confirmAchievementsSchema.safeParse(c).success).toBe(true);
  expect(
    confirmAchievementsSchema.safeParse({ ...c, expectedPublicationVersion: 1 })
      .success,
  ).toBe(false);
  expect(
    confirmAchievementsSchema.safeParse({
      ...c,
      expectedPublicationVersion: 1,
      reason: " Conferido ",
    }).success,
  ).toBe(true);
  for (const fields of [
    { actorId: id },
    { draft: {} },
    { snapshot: {} },
    { source: {} },
    { acknowledgeImpact: false },
  ])
    expect(
      confirmAchievementsSchema.safeParse({ ...c, ...fields }).success,
    ).toBe(false);
});
it("DTO público fechado não entrega motivos, fonte nem cadastro privado", () => {
  expect(publicAchievementsSchema.safeParse(snapshot).success).toBe(true);
  for (const fields of [
    { reason: "Privado" },
    { actorId: id },
    { contextFingerprint: fp },
    { contextSnapshot: {} },
    { source: {} },
  ])
    expect(
      publicAchievementsSchema.safeParse({ ...snapshot, ...fields }).success,
    ).toBe(false);
  const state = {
    disputeId: id,
    version: 1,
    draftVersion: 2,
    confirmedDraftVersion: 1,
    contextFingerprint: fp,
    confirmedContextFingerprint: fp,
    sourceChanged: false,
    draftChanged: true,
    published: snapshot,
    history: [],
    hasMore: false,
  };
  expect(achievementPublicationStateSchema.safeParse(state).success).toBe(true);
  expect(
    achievementPublicationStateSchema.safeParse({
      ...state,
      draftChanged: false,
    }).success,
  ).toBe(false);
  expect(
    achievementPublicationStateSchema.safeParse({
      ...state,
      sourceChanged: true,
    }).success,
  ).toBe(false);
  expect(
    achievementPublicationStateSchema.safeParse({
      ...state,
      contextFingerprint: "b".repeat(64),
      sourceChanged: true,
    }).success,
  ).toBe(true);
});
