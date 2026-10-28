import { expect, it } from "vitest";
import { transferId as id } from "../../tests/fixtures/transfers";
import { transferResultSchema } from "./transfer-contract";

it("valida ACK mínimo e fechado sem aceitar uma reabertura sobre o mesmo vínculo", () => {
  const ack = {
    commandId: id(1),
    disputeId: id(2),
    personId: id(3),
    sourceEntryId: id(4),
    sourceVersion: 2,
    newEntryId: id(5),
    newEntryVersion: 1,
    destinationRegistrationId: id(6),
    effectiveAt: "2026-10-25T06:00:00.123456Z",
    kind: "transfer",
  };
  expect(transferResultSchema.parse(ack)).toEqual(ack);
  expect(
    transferResultSchema.safeParse({ ...ack, kind: "return" }).success,
  ).toBe(true);
  for (const invalid of [
    null,
    {},
    { ...ack, actorId: id(7) },
    { ...ack, reason: "privado" },
    { ...ack, newEntryVersion: 2 },
    { ...ack, sourceVersion: 0 },
    { ...ack, newEntryId: ack.sourceEntryId },
    { ...ack, effectiveAt: "ontem" },
    { ...ack, kind: "move" },
  ])
    expect(transferResultSchema.safeParse(invalid).success).toBe(false);
  for (const key of Object.keys(ack)) {
    const missing: Record<string, unknown> = { ...ack };
    delete missing[key];
    expect(transferResultSchema.safeParse(missing).success, key).toBe(false);
  }
});
