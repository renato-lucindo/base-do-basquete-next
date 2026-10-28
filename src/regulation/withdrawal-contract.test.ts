import { it, expect } from "vitest";
import {
  saveRegistrationWithdrawalSchema,
  registrationWithdrawalStateSchema,
  registrationWithdrawalVersionSchema,
} from "./withdrawal-contract";
const id = (n: number) =>
  `f3200000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const command = () => ({
  commandId: id(1),
  disputeId: id(2),
  registrationId: id(3),
  withdrawalId: id(4),
  expectedVersion: 0,
  expectedRegulationVersion: 1,
  expectedContextFingerprint: "a".repeat(64),
  policy: "keep_results",
  previousGameIds: [id(8), id(9)],
  reason: "Desistência confirmada após revisão dos jogos",
  acknowledgeImpact: true,
});
it("accepts explicit past-result policies and an audited withdrawal of the decision", () => {
  for (const policy of ["keep_results", "exclude_results"])
    expect(
      saveRegistrationWithdrawalSchema.parse({ ...command(), policy }).policy,
    ).toBe(policy);
  expect(
    saveRegistrationWithdrawalSchema.parse({
      ...command(),
      expectedVersion: 1,
      policy: null,
      previousGameIds: [],
    }).policy,
  ).toBeNull();
  expect(
    saveRegistrationWithdrawalSchema.safeParse({
      ...command(),
      policy: null,
      previousGameIds: [],
    }).success,
  ).toBe(false);
  expect(
    saveRegistrationWithdrawalSchema.safeParse({
      ...command(),
      expectedVersion: 1,
      policy: null,
    }).success,
  ).toBe(false);
});
it("rejects injected authority, repeated references, executable policy and missing source versions", () => {
  for (const c of [
    { ...command(), actorId: id(6) },
    { ...command(), policy: "exclude_some" },
    { ...command(), previousGameIds: [id(8), id(8)] },
    { ...command(), previousGameIds: ["invalid"] },
    { ...command(), expectedVersion: -1 },
    { ...command(), reason: " " },
    { ...command(), expectedContextFingerprint: "none" },
    { ...command(), effect: { kind: "wo" } },
    { ...command(), formula: "points()" },
  ])
    expect(saveRegistrationWithdrawalSchema.safeParse(c).success).toBe(false);
  expect(
    saveRegistrationWithdrawalSchema.safeParse({
      ...command(),
      previousGameIds: [],
      expectedRegulationVersion: 0,
    }).success,
  ).toBe(true);
});
it("correlates a private history with its registration and preserves the reviewed game relation", () => {
  const v = {
    id: id(4),
    registrationId: id(3),
    disputeId: id(2),
    version: 1,
    regulationVersion: 1,
    contextFingerprint: "b".repeat(64),
    policy: "exclude_results",
    previousGameIds: [id(8)],
    reason: "Resultados anteriores revisados",
    actorId: id(6),
    savedAt: "2026-10-25T01:00:00Z",
  };
  const s = {
    registrationId: id(3),
    disputeId: id(2),
    regulationVersion: 2,
    contextFingerprint: "a".repeat(64),
    previousGameIds: [id(8), id(9)],
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
  expect(registrationWithdrawalVersionSchema.parse(v).previousGameIds).toEqual([
    id(8),
  ]);
  expect(registrationWithdrawalStateSchema.parse(s).previousGameIds).toEqual([
    id(8),
    id(9),
  ]);
  expect(
    registrationWithdrawalStateSchema.safeParse({
      ...s,
      head: { ...v, registrationId: id(99) },
    }).success,
  ).toBe(false);
  expect(
    registrationWithdrawalStateSchema.safeParse({
      ...s,
      history: Array.from({ length: 21 }, () => s.history[0]),
    }).success,
  ).toBe(false);
  expect(
    registrationWithdrawalVersionSchema.safeParse({ ...v, policy: null })
      .success,
  ).toBe(false);
});
