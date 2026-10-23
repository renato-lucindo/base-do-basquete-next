import { z } from "zod";
export const TEXT_LIMIT = 20000,
  LINE_LIMIT = 500,
  ROW_LIMIT = 200;
export const sourceLines = (text: string) => text.split(/\r\n|\r|\n/u);
export const normalizeName = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/gu, " ");
export const positions = [
  "Armador",
  "Ala Armador",
  "Ala",
  "Ala Pivô",
  "Pivô",
] as const;
export const playerFields = [
  "name",
  "jersey",
  "nickname",
  "birthDate",
  "birthYear",
  "positions",
  "heightCm",
  "weightKg",
  "dominantHand",
  "federationRegistration",
] as const;
export type PlayerField = (typeof playerFields)[number];
const fieldSchema = z.enum(playerFields);
const bounded = z.string().max(TEXT_LIMIT);
export const playerDraftSchema = z
  .object({
    name: bounded,
    jersey: z.string().max(32).nullable(),
    nickname: bounded.nullable(),
    birthDate: z.string().max(32).nullable(),
    birthYear: z.number().int().nullable(),
    positions: z.array(z.string().max(80)).max(20),
    heightCm: z.number().nullable(),
    weightKg: z.number().nullable(),
    dominantHand: z.enum(["right", "left", "both"]),
    federationRegistration: z.string().max(120).nullable(),
  })
  .strict();
export type ImportPlayer = z.infer<typeof playerDraftSchema>;
export const readyPlayerSchema = playerDraftSchema
  .extend({
    name: z.string().trim().min(1).max(120),
    jersey: z
      .string()
      .regex(/^(00|0|[1-9][0-9]?)$/u)
      .nullable(),
    nickname: z.string().max(120).nullable(),
    birthDate: z.iso.date().nullable(),
    birthYear: z.number().int().min(1).max(9999).nullable(),
    positions: z.array(z.enum(positions)).max(2),
    heightCm: z.number().positive().max(1000).nullable(),
    weightKg: z.number().positive().max(1000).nullable(),
    federationRegistration: z
      .string()
      .regex(/^[0-9]{6}$/u)
      .nullable(),
  })
  .refine(
    (p) =>
      !p.birthDate ||
      !p.birthYear ||
      Number(p.birthDate.slice(0, 4)) === p.birthYear,
    { path: ["birthYear"], message: "Ano e data de nascimento divergentes." },
  );
export const issueSchema = z
  .object({
    field: fieldSchema.nullable(),
    token: bounded,
    message: z.string().max(300),
  })
  .strict();
export type ImportIssue = z.infer<typeof issueSchema>;
const version = z.number().int().min(0).max(2147483646);
export const rowDecisionSchema = z.discriminatedUnion("kind", [
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
      version: version.min(1),
      approveChanges: z.boolean(),
    })
    .strict(),
]);
export const textRowSchema = z
  .object({
    id: z.uuid(),
    line: z.number().int().min(1).max(LINE_LIMIT),
    source: bounded,
    data: playerDraftSchema,
    provided: z
      .array(fieldSchema)
      .max(playerFields.length)
      .refine((a) => new Set(a).size === a.length),
    issues: z.array(issueSchema).max(200),
    selected: z.boolean(),
    decision: rowDecisionSchema.nullable(),
    rosterId: z.uuid(),
    rosterVersion: version,
  })
  .strict();
export type TextRow = z.infer<typeof textRowSchema>;
export const ignoredLineSchema = z
  .object({
    line: z.number().int().min(1).max(LINE_LIMIT),
    source: bounded,
    kind: z.enum(["team", "columns"]),
  })
  .strict();
export const parsedRosterSchema = z
  .object({
    teamName: z.string().max(TEXT_LIMIT).nullable(),
    rows: z.array(textRowSchema).max(ROW_LIMIT),
    ignoredLines: z.array(ignoredLineSchema).max(LINE_LIMIT),
    issues: z.array(z.string().max(300)).max(LINE_LIMIT),
  })
  .strict();
export type ParsedRoster = z.infer<typeof parsedRosterSchema>;
export const targetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("registration"),
      registrationId: z.uuid(),
      version: version.min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal("newTeam"),
      teamId: z.uuid(),
      registrationId: z.uuid(),
      teamName: z.string().max(120),
      registrationName: z.string().max(120),
    })
    .strict(),
  z
    .object({
      kind: z.literal("existingTeam"),
      teamId: z.uuid(),
      teamVersion: version.min(1),
      registrationId: z.uuid(),
      registrationName: z.string().max(120),
    })
    .strict(),
]);
const reviewBase = parsedRosterSchema.extend({
  id: z.uuid(),
  disputeId: z.uuid(),
  text: bounded,
  target: targetSchema,
});
function validSource(review: z.infer<typeof reviewBase>) {
  const lines = sourceLines(review.text),
    sources = [...review.rows, ...review.ignoredLines];
  return (
    lines.length <= LINE_LIMIT &&
    new Set(review.rows.map((r) => r.id)).size === review.rows.length &&
    new Set(sources.map((r) => r.line)).size === sources.length &&
    sources.length === lines.filter((s) => s.trim()).length &&
    sources.every(
      (r) => lines[r.line - 1] === r.source && r.source.trim().length > 0,
    )
  );
}
export const textReviewSchema = reviewBase.refine(validSource, {
  message: "Revise as linhas e o texto original.",
});
export const textRowResultSchema = z
  .object({
    rowId: z.uuid(),
    entityId: z.uuid(),
    entityVersion: version.min(1),
  })
  .strict();
export type TextRowResult = z.infer<typeof textRowResultSchema>;
export const textReviewSnapshotSchema = reviewBase
  .extend({
    version: version.min(1),
    savedAt: z.iso.datetime({ offset: true }),
    results: z.array(textRowResultSchema).max(ROW_LIMIT),
  })
  .refine(validSource)
  .refine(
    (r) =>
      new Set(r.results.map((x) => x.rowId)).size === r.results.length &&
      r.results.every((x) =>
        r.rows.some((row) => row.id === x.rowId && row.rosterId === x.entityId),
      ),
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
    expectedVersion: version.min(1),
  })
  .strict();
export const confirmTextResultSchema = z
  .object({
    id: z.uuid(),
    version: version.min(1),
    result: textRowResultSchema,
  })
  .strict();
export type TextReview = z.infer<typeof textReviewSchema>;
export type TextReviewSnapshot = z.infer<typeof textReviewSnapshotSchema>;
export type SaveTextReview = z.infer<typeof saveTextReviewSchema>;
export type ConfirmTextRow = z.infer<typeof confirmTextRowSchema>;
export const textReviewListingSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            disputeId: z.uuid(),
            registrationId: z.uuid().nullable(),
            teamName: z.string().nullable(),
            version: version.min(1),
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
export function emptyImportPlayer(): ImportPlayer {
  return {
    name: "",
    jersey: null,
    nickname: null,
    birthDate: null,
    birthYear: null,
    positions: [],
    heightCm: null,
    weightKg: null,
    dominantHand: "right",
    federationRegistration: null,
  };
}
