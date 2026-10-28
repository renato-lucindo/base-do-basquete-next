import { describe, expect, it } from "vitest";
import {
  registrationRemovalSchema,
  removalContextSchema,
  removalResultSchema,
} from "./removal-contract";
const id = (n: number) =>
  `f9500000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const command = {
  commandId: id(1),
  registrationId: id(2),
  disputeId: id(3),
  expectedVersion: 1,
};
const registration = {
  id: id(2),
  disputeId: id(3),
  teamId: id(4),
  name: "Lobos B",
  teamName: "Lobos",
  version: 1,
};

describe("remoção contextual sem dependências", () => {
  it("exige intenção versionada e não aceita elegibilidade calculada pelo cliente", () => {
    expect(registrationRemovalSchema.parse(command)).toEqual(command);
    for (const patch of [
      { expectedVersion: 0 },
      { expectedVersion: -1 },
      { expectedVersion: 1.5 },
      { expectedVersion: 2147483648 },
      { expectedVersion: "1" },
      { commandId: "inválido" },
      { registrationId: null },
      { disputeId: id(3) + "extra" },
      { canRemove: true },
      { blockers: [] },
      { actorId: id(5) },
    ])
      expect(
        registrationRemovalSchema.safeParse({ ...command, ...patch }).success,
      ).toBe(false);
    expect(
      registrationRemovalSchema.safeParse({
        ...command,
        expectedVersion: 2147483647,
      }).success,
    ).toBe(true);
  });
  it("fecha estados e distingue impedimento, disponibilidade e remoção confirmada", () => {
    expect(
      removalContextSchema.parse({
        state: "available",
        registration,
        blockers: [],
      }),
    ).toEqual({ state: "available", registration, blockers: [] });
    expect(
      removalContextSchema.safeParse({
        state: "available",
        registration,
        blockers: ["roster"],
      }).success,
    ).toBe(false);
    expect(
      removalContextSchema.safeParse({
        state: "blocked",
        registration,
        blockers: [],
      }).success,
    ).toBe(false);
    expect(
      removalContextSchema.safeParse({
        state: "blocked",
        registration,
        blockers: ["roster", "text_review"],
      }).success,
    ).toBe(true);
    expect(
      removalContextSchema.safeParse({
        state: "blocked",
        registration,
        blockers: ["future_unknown_table"],
      }).success,
    ).toBe(false);
    expect(
      removalContextSchema.safeParse({
        state: "blocked",
        registration,
        blockers: ["roster", "roster"],
      }).success,
    ).toBe(false);
    expect(
      removalContextSchema.safeParse({
        state: "available",
        registration: { ...registration, birthDate: "1990-01-01" },
        blockers: [],
      }).success,
    ).toBe(false);
    const removed = {
      state: "removed",
      id: id(2),
      disputeId: id(3),
      deletedVersion: 1,
    };
    expect(removalResultSchema.parse(removed)).toEqual(removed);
    expect(removalContextSchema.parse(removed)).toEqual(removed);
    expect(
      removalResultSchema.safeParse({ ...removed, registration }).success,
    ).toBe(false);
    expect(
      removalResultSchema.safeParse({ ...removed, deletedVersion: 0 }).success,
    ).toBe(false);
  });
});
