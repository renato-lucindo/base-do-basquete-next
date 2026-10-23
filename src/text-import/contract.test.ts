import { expect, it } from "vitest";
import {
  saveTextReviewSchema,
  textReviewSnapshotSchema,
  confirmTextRowSchema,
} from "./contract";
const id = (n: number) =>
  `d0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const review = {
  id: id(1),
  disputeId: id(2),
  mode: "rosters",
  text: "Equipe: Lobos\n7 - Ana",
  rows: [
    {
      id: id(3),
      kind: "team",
      line: 1,
      source: "Equipe: Lobos",
      name: "Lobos",
      selected: true,
      resolution: null,
    },
    {
      id: id(4),
      kind: "athlete",
      line: 2,
      source: "7 - Ana",
      name: "Ana",
      selected: true,
      teamRowId: id(3),
      jersey: "7",
      person: null,
      rosterId: id(5),
    },
  ],
};
it("saves unresolved drafts but rejects forged status, parents, IDs and source lines", () => {
  const cmd = { commandId: id(6), expectedVersion: 0, review };
  expect(saveTextReviewSchema.safeParse(cmd).success).toBe(true);
  for (const rows of [
    [{ ...review.rows[0], applied: true }, review.rows[1]],
    [review.rows[0], { ...review.rows[1], teamRowId: id(99) }],
    [review.rows[0], { ...review.rows[1], id: id(3) }],
    [review.rows[0], { ...review.rows[1], source: "source changed" }],
    [review.rows[0], { ...review.rows[1], line: 1 }],
  ])
    expect(
      saveTextReviewSchema.safeParse({ ...cmd, review: { ...review, rows } })
        .success,
    ).toBe(false);
  expect(
    saveTextReviewSchema.safeParse({
      ...cmd,
      review: { ...review, results: [] },
    }).success,
  ).toBe(false);
  expect(
    saveTextReviewSchema.safeParse({ ...cmd, expectedVersion: -1 }).success,
  ).toBe(false);
});
it("distinguishes server results from decisions and confirms only a selected saved row", () => {
  const saved = {
    ...review,
    version: 1,
    savedAt: "2026-10-23T17:00:00Z",
    results: [],
  };
  expect(textReviewSnapshotSchema.safeParse(saved).success).toBe(true);
  expect(
    textReviewSnapshotSchema.safeParse({
      ...saved,
      results: [{ rowId: id(90), entityId: id(5), entityVersion: 1 }],
    }).success,
  ).toBe(false);
  const cmd = {
    commandId: id(7),
    reviewId: id(1),
    rowId: id(3),
    expectedVersion: 1,
  };
  expect(confirmTextRowSchema.safeParse(cmd).success).toBe(true);
  expect(
    confirmTextRowSchema.safeParse({ ...cmd, expectedVersion: 0 }).success,
  ).toBe(false);
  expect(confirmTextRowSchema.safeParse({ ...cmd, sex: "male" }).success).toBe(
    false,
  );
});
