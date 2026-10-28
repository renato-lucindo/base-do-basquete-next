import { expect, it } from "vitest";
import { parseRoster } from "./parse";
import {
  saveTextReviewSchema,
  textReviewSnapshotSchema,
  confirmTextRowSchema,
  readyPlayerSchema,
} from "./contract";
const id = () => crypto.randomUUID();
it("persists unresolved review including metadata but rejects editable success and changed origin", () => {
  const parsed = parseRoster("Equipe: Lobos\nAna");
  const review = {
    id: id(),
    disputeId: id(),
    text: "Equipe: Lobos\nAna",
    target: { kind: "registration", registrationId: id(), version: 1 },
    ...parsed,
  };
  const cmd = { commandId: id(), expectedVersion: 0, review };
  expect(saveTextReviewSchema.safeParse(cmd).success).toBe(true);
  expect(
    saveTextReviewSchema.safeParse({
      ...cmd,
      review: { ...review, results: [] },
    }).success,
  ).toBe(false);
  expect(
    saveTextReviewSchema.safeParse({
      ...cmd,
      review: { ...review, rows: [{ ...review.rows[0], source: "Bia" }] },
    }).success,
  ).toBe(false);
  expect(
    saveTextReviewSchema.safeParse({
      ...cmd,
      review: { ...review, ignoredLines: [] },
    }).success,
  ).toBe(false);
  const snapshot = {
    ...review,
    version: 1,
    savedAt: "2026-10-23T17:00:00Z",
    results: [],
  };
  expect(textReviewSnapshotSchema.safeParse(snapshot).success).toBe(true);
  expect(
    textReviewSnapshotSchema.safeParse({
      ...snapshot,
      results: [{ rowId: id(), entityId: id(), entityVersion: 1 }],
    }).success,
  ).toBe(false);
});
it("requires valid normalized approved values while preserving incomplete editable drafts", () => {
  const data = parseRoster("Ana").rows[0].data;
  expect(readyPlayerSchema.safeParse(data).success).toBe(true);
  for (const patch of [
    { jersey: "100" },
    { federationRegistration: "12345" },
    { birthDate: "2001-02-29" },
    { positions: ["Armador", "Ala", "Pivô"] },
    { name: "" },
    { birthDate: "2000-01-01", birthYear: 1999 },
  ])
    expect(readyPlayerSchema.safeParse({ ...data, ...patch }).success).toBe(
      false,
    );
  const cmd = {
    commandId: id(),
    reviewId: id(),
    rowId: id(),
    expectedVersion: 1,
  };
  expect(confirmTextRowSchema.safeParse(cmd).success).toBe(true);
  expect(confirmTextRowSchema.safeParse({ ...cmd, sex: "male" }).success).toBe(
    false,
  );
});
