import { z } from "zod";
import { validateParsedBoxscore } from "./parser";
import type { ParsedBoxscore, ParsedBoxscorePlayer } from "./types";
const count = z.number().int().nonnegative().max(2147483647),
  signed = z.number().int().min(-2147483648).max(2147483647),
  label = (n: number) =>
    z
      .string()
      .max(n)
      .regex(/^[^\u0000-\u001f\u007f]*$/u);
const shooting = z
  .object({ made: count, attempted: count })
  .strict()
  .refine((s) => s.made <= s.attempted);
const player = z
  .object({
    jerseyNumber: z.string().regex(/^(00|0|[1-9][0-9]?)$/u),
    name: label(240).min(1),
    starter: z.boolean(),
    captain: z.boolean(),
    didNotPlay: z.boolean(),
    secondsPlayed: count,
    fieldGoals: shooting,
    twoPoints: shooting,
    threePoints: shooting,
    freeThrows: shooting,
    offensiveRebounds: count,
    defensiveRebounds: count,
    rebounds: count,
    assists: count,
    turnovers: count,
    steals: count,
    blocks: count,
    foulsCommitted: count,
    foulsReceived: count.nullable(),
    plusMinus: signed.nullable(),
    efficiency: z.number().min(-2147483648).max(2147483647),
    points: count,
  })
  .strict();
const collective = z
  .object({
    pointsFromTurnovers: count,
    pointsInPaint: count,
    pointsInPaintMade: count,
    pointsInPaintAttempted: count,
    secondChancePoints: count,
    fastBreakPoints: count,
    fastBreakPointsFromTurnovers: count,
    benchPoints: count,
    largestLead: count,
    largestScoringRun: count,
    pointsPerPossession: z.number().nonnegative().max(2147483647),
    timeLeadingSeconds: count,
  })
  .strict();
const team = z
  .object({
    name: label(240).min(1),
    abbreviation: label(20),
    score: count,
    periodScores: z.array(count).min(4).max(12).nullable(),
    players: z.array(player).min(1).max(12),
    teamStatistics: collective.optional(),
  })
  .strict();
export const parsedBoxscoreSchema = z
  .object({
    format: z.enum(["FIBA_GENIUS_SPORTS", "BASKETBALL_SITE"]),
    parserVersion: z.enum(["fiba-genius-v2", "basketball-site-v1"]),
    competitionName: label(240).nullable(),
    gameNumber: label(80).nullable(),
    scheduledLocal: z
      .string()
      .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T(?:[01][0-9]|2[0-3]):[0-5][0-9]$/u)
      .refine((s) => z.iso.date().safeParse(s.split("T")[0]).success),
    durationSeconds: count.nullable(),
    venue: label(240),
    teams: z.tuple([team, team]),
    gameStatistics: z
      .object({ leadChanges: count, timesTied: count })
      .strict()
      .optional(),
    warnings: z.array(label(500)).max(20),
  })
  .strict()
  .superRefine((p, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const site = p.format === "BASKETBALL_SITE";
    if (p.parserVersion !== (site ? "basketball-site-v1" : "fiba-genius-v2"))
      fail("Versão do parser incompatível com o formato.");
    if (
      site &&
      (p.teams.some(
        (t) =>
          t.periodScores !== null ||
          t.teamStatistics !== undefined ||
          t.players.some(
            (r) =>
              r.starter ||
              r.captain ||
              r.didNotPlay ||
              r.foulsReceived !== null ||
              r.plusMinus !== null,
          ),
      ) ||
        p.gameStatistics !== undefined)
    )
      fail("O Site não fornece quartos, marcadores ou indicadores coletivos.");
    if (
      !site &&
      (p.teams.some((t) => t.periodScores === null) ||
        p.teams[0].periodScores?.length !== p.teams[1].periodScores?.length)
    )
      fail("Confira os períodos reais do documento FIBA.");
    const result = validateParsedBoxscore(p);
    for (const issue of result.issues) fail(issue.message);
  });
export function sourceMarkers(source: ParsedBoxscore, p: ParsedBoxscorePlayer) {
  const fiba = source.format === "FIBA_GENIUS_SPORTS";
  const facts =
    p.secondsPlayed > 0 ||
    p.fieldGoals.attempted > 0 ||
    p.freeThrows.attempted > 0 ||
    p.rebounds > 0 ||
    p.assists > 0 ||
    p.turnovers > 0 ||
    p.steals > 0 ||
    p.blocks > 0 ||
    p.foulsCommitted > 0 ||
    (p.foulsReceived !== null && p.foulsReceived > 0);
  return {
    starter: fiba ? p.starter : null,
    captain: fiba ? p.captain : null,
    participation:
      fiba && p.didNotPlay
        ? ("did_not_play" as const)
        : facts || (fiba && p.starter)
          ? ("played" as const)
          : ("unknown" as const),
  };
}
export const pdfSourceInputSchema = z
  .object({
    id: z.uuid(),
    disputeId: z.uuid(),
    filename: label(160)
      .min(5)
      .regex(/^[^\\/]+\.pdf$/iu),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    byteSize: z.number().int().min(5).max(10485760),
    pageCount: z.number().int().min(1).max(4),
    parsed: parsedBoxscoreSchema,
  })
  .strict();
export const preparePdfSourceSchema = z
  .object({ commandId: z.uuid(), source: pdfSourceInputSchema })
  .strict();
export const pdfSourceSnapshotSchema = pdfSourceInputSchema
  .extend({
    ready: z.boolean(),
    version: z.number().int().min(1).max(2),
    savedAt: z.iso.datetime({ offset: true }),
  })
  .refine((s) => s.version === (s.ready ? 2 : 1));
export const pdfSourceListingSchema = z
  .object({
    items: z.array(pdfSourceSnapshotSchema).max(20),
    hasMore: z.boolean(),
  })
  .strict();
export const preparePdfResultSchema = z
  .object({
    id: z.uuid(),
    storagePath: z.string().regex(/^sources\/[a-f0-9-]{36}\.pdf$/u),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    byteSize: z.number().int().min(5).max(10485760),
    ready: z.boolean(),
    duplicate: z.boolean(),
  })
  .strict();
export const finishPdfSchema = z
  .object({ commandId: z.uuid(), sourceId: z.uuid() })
  .strict();
export const pdfReviewDocumentSchema = z
  .object({
    disputeId: z.uuid(),
    gameId: z.uuid().nullable(),
    invertSides: z.boolean(),
    mappings: z
      .array(
        z
          .object({
            sourceSide: z.union([z.literal(0), z.literal(1)]),
            sourceIndex: z.number().int().min(0).max(11),
            rosterEntryId: z.uuid().nullable(),
            jersey: z.string().regex(/^(00|0|[1-9][0-9]?)$/u),
          })
          .strict(),
      )
      .max(24),
    notes: z.string().trim().max(500),
  })
  .strict()
  .refine(
    (d) =>
      new Set(d.mappings.map((r) => `${r.sourceSide}:${r.sourceIndex}`))
        .size === d.mappings.length &&
      (d.gameId !== null ||
        d.mappings.every((m) => m.rosterEntryId === null)) &&
      new Set(
        d.mappings.filter((m) => m.rosterEntryId).map((m) => m.rosterEntryId),
      ).size === d.mappings.filter((m) => m.rosterEntryId).length,
  );
export const savePdfReviewSchema = z
  .object({
    commandId: z.uuid(),
    sourceId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(2147483646),
    document: pdfReviewDocumentSchema,
  })
  .strict();
export const pdfReviewSnapshotSchema = z
  .object({
    source: pdfSourceSnapshotSchema,
    document: pdfReviewDocumentSchema,
    version: z.number().int().min(0),
    savedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()
  .refine((s) => (s.version === 0) === (s.savedAt === null));
export type PreparePdfSource = z.infer<typeof preparePdfSourceSchema>;
export type PdfSource = z.infer<typeof pdfSourceSnapshotSchema>;
export type PdfReviewDocument = z.infer<typeof pdfReviewDocumentSchema>;
export type SavePdfReview = z.infer<typeof savePdfReviewSchema>;
export type PdfReviewSnapshot = z.infer<typeof pdfReviewSnapshotSchema>;
