import { expect, it } from "vitest";
import {
  officiatingSchema,
  saveGameEditorSchema,
} from "./officiating-contract";

const empty = () => ({
  referee: null,
  umpire1: null,
  umpire2: null,
  scorer: null,
  timer: null,
  shotClock: null,
});
const existing = () => ({ kind: "existing", id: crypto.randomUUID() });
it("accepts optional independent groups and one identity per game", () => {
  expect(officiatingSchema.safeParse(empty()).success).toBe(true);
  expect(
    officiatingSchema.safeParse({
      ...empty(),
      referee: existing(),
      scorer: existing(),
    }).success,
  ).toBe(true);
  expect(
    officiatingSchema.safeParse(
      Object.fromEntries(
        Object.keys(empty()).map((role) => [role, existing()]),
      ),
    ).success,
  ).toBe(true);
  const official = existing();
  expect(
    officiatingSchema.safeParse({
      ...empty(),
      referee: official,
      scorer: official,
    }).success,
  ).toBe(false);
});
it("rejects a gap in either group, unknown roles and malformed identities", () => {
  for (const role of ["umpire1", "umpire2", "timer", "shotClock"])
    expect(
      officiatingSchema.safeParse({ ...empty(), [role]: existing() }).success,
    ).toBe(false);
  expect(
    officiatingSchema.safeParse({ ...empty(), coach: existing() }).success,
  ).toBe(false);
  expect(
    officiatingSchema.safeParse({
      ...empty(),
      referee: { kind: "existing", id: "name" },
    }).success,
  ).toBe(false);
});
it("normalizes new names without equating different identities and requires explicit homonym intent", () => {
  const input = {
    kind: "new",
    id: crypto.randomUUID(),
    name: "  João   Silva  ",
    confirmHomonym: false,
  };
  expect(officiatingSchema.parse({ ...empty(), referee: input })).toMatchObject(
    { referee: { name: "João Silva" } },
  );
  for (const name of ["", "  ", "x".repeat(161), "João\nSilva"])
    expect(
      officiatingSchema.safeParse({ ...empty(), referee: { ...input, name } })
        .success,
    ).toBe(false);
  expect(
    officiatingSchema.safeParse({
      ...empty(),
      referee: { kind: "new", id: input.id, name: "João" },
    }).success,
  ).toBe(false);
  expect(
    officiatingSchema.safeParse({
      ...empty(),
      referee: input,
      scorer: { ...input, id: crypto.randomUUID(), confirmHomonym: true },
    }).success,
  ).toBe(true);
});
it("versions the editor contract without accepting public or derived fields", () => {
  const game = {
    id: crypto.randomUUID(),
    disputeId: crypto.randomUUID(),
    homeRegistrationId: crypto.randomUUID(),
    awayRegistrationId: crypto.randomUUID(),
    date: null,
    time: null,
    venue: null,
    number: null,
  };
  const command = {
    commandId: crypto.randomUUID(),
    expectedVersion: 0,
    game,
    officiating: empty(),
  };
  expect(saveGameEditorSchema.safeParse(command).success).toBe(true);
  expect(
    saveGameEditorSchema.safeParse({ ...command, publish: true }).success,
  ).toBe(false);
  expect(
    saveGameEditorSchema.safeParse({ ...command, officiating: undefined })
      .success,
  ).toBe(false);
});
