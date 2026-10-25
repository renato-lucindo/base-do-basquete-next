import { it, expect } from "vitest";
import {
  saveGameOccurrenceSchema,
  gameOccurrenceStateSchema,
  gameOccurrenceVersionSchema,
  gameOccurrenceSaveResultSchema,
} from "./occurrence-contract";
const id = (n: number) =>
  `f3100000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base = () => ({
  commandId: id(1),
  disputeId: id(2),
  gameId: id(3),
  occurrenceId: id(4),
  expectedVersion: 0,
  expectedGameVersion: 2,
  expectedPublicationVersion: 0,
  expectedRegulationVersion: 1,
  expectedContextFingerprint: "a".repeat(64),
  effect: { kind: "wo", winnerRegistrationId: id(5) },
  reason: "Decisão conferida conforme regulamento",
  acknowledgeImpact: false,
});
it("accepts only closed occurrence commands and explicit withdrawal of a previously saved effect", () => {
  for (const effect of [
    { kind: "postponed" },
    { kind: "interrupted" },
    { kind: "cancelled" },
    { kind: "wo", winnerRegistrationId: id(5) },
    { kind: "administrative", decision: { kind: "exclude" } },
    {
      kind: "administrative",
      decision: {
        kind: "award",
        winnerRegistrationId: id(5),
        homeLeaguePoints: 2,
        awayLeaguePoints: -1,
        score: null,
      },
    },
  ]) {
    expect(
      saveGameOccurrenceSchema.parse({ ...base(), effect }).effect,
    ).toEqual(effect);
  }
  expect(
    saveGameOccurrenceSchema.parse({
      ...base(),
      expectedVersion: 1,
      effect: null,
    }).effect,
  ).toBeNull();
  expect(
    saveGameOccurrenceSchema.safeParse({ ...base(), effect: null }).success,
  ).toBe(false);
});
it("rejects authority injection, malformed source revisions, unconfigured WO and invalid administrative scores", () => {
  for (const c of [
    { ...base(), actorId: id(6) },
    { ...base(), points: 20 },
    { ...base(), expectedContextFingerprint: "untrusted" },
    { ...base(), reason: " " },
    { ...base(), expectedVersion: -1 },
    { ...base(), expectedGameVersion: 0 },
    { ...base(), expectedPublicationVersion: -1 },
    { ...base(), expectedRegulationVersion: 0 },
    { ...base(), effect: { kind: "wo", winnerRegistrationId: "" } },
    {
      ...base(),
      effect: {
        kind: "administrative",
        decision: {
          kind: "award",
          winnerRegistrationId: id(5),
          homeLeaguePoints: 2,
          awayLeaguePoints: 1,
          score: { homePoints: 20, awayPoints: 20 },
        },
      },
    },
    { ...base(), effect: { kind: "cancelled", athletePoints: 0 } },
  ])
    expect(saveGameOccurrenceSchema.safeParse(c).success).toBe(false);
  expect(
    saveGameOccurrenceSchema.safeParse({
      ...base(),
      expectedRegulationVersion: 0,
      effect: { kind: "postponed" },
    }).success,
  ).toBe(true);
});
const version = () => ({
  disputeId: id(2),
  gameId: id(3),
  id: id(4),
  version: 1,
  gameVersion: 1,
  publicationVersion: 0,
  regulationVersion: 1,
  contextFingerprint: "b".repeat(64),
  effect: { kind: "postponed" },
  reason: "Adiar para reagendar",
  actorId: id(6),
  savedAt: "2026-10-25T00:00:00Z",
});
it("keeps historical source versions readable and correlates heads and history with the requested game", () => {
  const v = gameOccurrenceVersionSchema.parse(version());
  const s = {
    disputeId: id(2),
    gameId: id(3),
    gameVersion: 3,
    publicationVersion: 2,
    regulationVersion: 4,
    contextFingerprint: "a".repeat(64),
    head: v,
    history: [
      {
        id: v.id,
        version: 1,
        reason: v.reason,
        actorId: v.actorId,
        savedAt: v.savedAt,
        active: true,
      },
    ],
    hasMore: false,
  };
  expect(gameOccurrenceStateSchema.parse(s).head?.gameVersion).toBe(1);
  for (const c of [
    { ...s, head: { ...v, gameId: id(99) } },
    { ...s, head: { ...v, disputeId: id(99) } },
    { ...s, head: { ...v, version: 0 } },
    { ...s, history: Array.from({ length: 21 }, () => s.history[0]) },
  ])
    expect(gameOccurrenceStateSchema.safeParse(c).success).toBe(false);
  expect(
    gameOccurrenceStateSchema.safeParse({ ...s, head: null, history: [] })
      .success,
  ).toBe(true);
});
it("returns a bounded correlated receipt without accepting a projection as authority", () => {
  const ack = {
    commandId: id(1),
    disputeId: id(2),
    gameId: id(3),
    occurrenceId: id(4),
    version: 1,
    savedAt: "2026-10-25T00:00:00Z",
    contextFingerprint: "a".repeat(64),
  };
  expect(gameOccurrenceSaveResultSchema.parse(ack)).toEqual(ack);
  expect(
    gameOccurrenceSaveResultSchema.safeParse({ ...ack, version: 0 }).success,
  ).toBe(false);
  expect(
    gameOccurrenceSaveResultSchema.safeParse({ ...ack, standings: [] }).success,
  ).toBe(false);
});
