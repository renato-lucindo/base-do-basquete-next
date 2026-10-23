import { z } from "zod";

export const TEXT_LIMIT = 20000;
export const LINE_LIMIT = 500;
export const ROW_LIMIT = 200;
export const textModeSchema = z.enum(["teams", "rosters"]);
const version = z.number().int().min(0).max(2147483646);
const positiveVersion = version.min(1);
const common = {
  id: z.uuid(),
  line: z.number().int().min(1).max(LINE_LIMIT),
  source: z.string().max(TEXT_LIMIT),
  name: z.string().max(120),
  selected: z.boolean(),
};
const teamResolutionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("newTeam"),
      teamId: z.uuid(),
      registrationId: z.uuid(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("existingTeam"),
      teamId: z.uuid(),
      teamVersion: positiveVersion,
      registrationId: z.uuid(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("registration"),
      registrationId: z.uuid(),
      version: positiveVersion,
    })
    .strict(),
]);
const personResolutionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("new"),
      personId: z.uuid(),
      confirmHomonym: z.boolean(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("existing"),
      personId: z.uuid(),
      version: positiveVersion,
    })
    .strict(),
]);
export const textRowSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...common,
      kind: z.literal("team"),
      resolution: teamResolutionSchema.nullable(),
    })
    .strict(),
  z
    .object({
      ...common,
      kind: z.literal("athlete"),
      teamRowId: z.uuid().nullable(),
      jersey: z.string().max(8),
      person: personResolutionSchema.nullable(),
      rosterId: z.uuid(),
    })
    .strict(),
]);
export type TextRow = z.infer<typeof textRowSchema>;
export type TextMode = z.infer<typeof textModeSchema>;
export const sourceLines = (text: string) => text.split(/\r\n|\r|\n/u);
const reviewBaseSchema = z
  .object({
    id: z.uuid(),
    disputeId: z.uuid(),
    mode: textModeSchema,
    text: z.string().max(TEXT_LIMIT),
    rows: z.array(textRowSchema).max(ROW_LIMIT),
  })
  .strict();
function validReview(review: z.infer<typeof reviewBaseSchema>) {
  const lines = sourceLines(review.text);
  if (
    lines.length > LINE_LIMIT ||
    new Set(review.rows.map((r) => r.id)).size !== review.rows.length ||
    new Set(review.rows.map((r) => r.line)).size !== review.rows.length
  )
    return false;
  const nonempty = lines.flatMap((line, index) =>
    line.trim() ? [index + 1] : [],
  );
  if (nonempty.length !== review.rows.length) return false;
  return review.rows.every(
    (row) =>
      lines[row.line - 1] === row.source &&
      row.source.trim().length > 0 &&
      (review.mode !== "teams" || row.kind === "team") &&
      (row.kind !== "athlete" ||
        row.teamRowId === null ||
        review.rows.some((r) => r.id === row.teamRowId && r.kind === "team")),
  );
}
export const textReviewSchema = reviewBaseSchema.refine(validReview, {
  message: "Revise as linhas e o texto de origem.",
});
export const textRowResultSchema = z
  .object({
    rowId: z.uuid(),
    entityId: z.uuid(),
    entityVersion: positiveVersion,
  })
  .strict();
export type TextRowResult = z.infer<typeof textRowResultSchema>;
export const textReviewSnapshotSchema = reviewBaseSchema
  .extend({
    version: positiveVersion,
    savedAt: z.iso.datetime({ offset: true }),
    results: z.array(textRowResultSchema).max(ROW_LIMIT),
  })
  .refine(validReview)
  .refine(
    (review) =>
      new Set(review.results.map((r) => r.rowId)).size ===
        review.results.length &&
      review.results.every((result) => {
        const row = review.rows.find((r) => r.id === result.rowId);
        if (!row) return false;
        return row.kind === "athlete"
          ? row.rosterId === result.entityId
          : row.resolution?.registrationId === result.entityId;
      }),
  );
export const saveTextReviewSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: version,
    review: textReviewSchema,
  })
  .strict();
export const confirmTextRowSchema = z
  .object({
    commandId: z.uuid(),
    reviewId: z.uuid(),
    rowId: z.uuid(),
    expectedVersion: positiveVersion,
  })
  .strict();
export const confirmTextResultSchema = z
  .object({
    id: z.uuid(),
    version: positiveVersion,
    result: textRowResultSchema,
  })
  .strict();
export const textReviewListingSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            disputeId: z.uuid(),
            mode: textModeSchema,
            version: positiveVersion,
            savedAt: z.iso.datetime({ offset: true }),
            totalRows: z.number().int().min(0).max(ROW_LIMIT),
            confirmedRows: z.number().int().min(0).max(ROW_LIMIT),
          })
          .strict(),
      )
      .max(20),
    hasMore: z.boolean(),
  })
  .strict();
export type TextReview = z.infer<typeof textReviewSchema>;
export type TextReviewSnapshot = z.infer<typeof textReviewSnapshotSchema>;
export type SaveTextReview = z.infer<typeof saveTextReviewSchema>;
export type ConfirmTextRow = z.infer<typeof confirmTextRowSchema>;
