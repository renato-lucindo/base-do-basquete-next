import { z } from "zod";
import { persistedSheetSchema } from "../games/sheet-contract";
import { pdfReviewDocumentSchema } from "../boxscore/source-contract";
import { pdfSupplementSchema } from "./pdf-selection";
import { pdfAuthoritySchema } from "./pdf-authority";
import { publishPdfSchema, publicResultSchema } from "./pdf-contract";
const version = z.number().int().min(1).max(2147483647),
  stamp = z.iso.datetime({ offset: true });
const header = z
  .object({
    version,
    sourceKind: z.enum(["sheet", "pdf"]),
    sourceVersion: version,
    reason: z.string().max(500),
    actorId: z.uuid(),
    publishedAt: stamp,
  })
  .strict();
export const publicationStateSchema = z
  .object({
    gameId: z.uuid(),
    version: z.number().int().min(0).max(2147483647),
    published: publicResultSchema.nullable(),
    history: z.array(header).max(20),
    hasMore: z.boolean(),
    requiresFallback: z.boolean(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (
      (s.version === 0) !== (s.published === null) ||
      (s.published?.version !== undefined &&
        s.published.version !== s.version) ||
      new Set(s.history.map((h) => h.version)).size !== s.history.length ||
      s.history.some((h) => h.version > s.version)
    )
      ctx.addIssue({
        code: "custom",
        message: "Estado de publicação inconsistente.",
      });
  });
const pdfDocument = z
  .object({
    source: publishPdfSchema.shape.source,
    review: pdfReviewDocumentSchema,
    supplement: pdfSupplementSchema,
    authority: pdfAuthoritySchema,
    sheetVersion: version.nullable(),
    manual: z
      .object({ document: persistedSheetSchema, version })
      .strict()
      .nullable(),
    acceptDivergence: z.boolean(),
  })
  .strict();
export const publicationVersionSchema = header
  .extend({
    gameId: z.uuid(),
    snapshot: publicResultSchema,
    document: z.union([persistedSheetSchema, pdfDocument]),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.snapshot.id !== v.gameId ||
      v.snapshot.version !== v.version ||
      v.snapshot.source.kind !== v.sourceKind ||
      v.snapshot.source.version !== v.sourceVersion ||
      (v.sourceKind === "sheet" &&
        !persistedSheetSchema.safeParse(v.document).success) ||
      (v.sourceKind === "pdf" && !pdfDocument.safeParse(v.document).success)
    )
      ctx.addIssue({
        code: "custom",
        message: "Versão publicada inconsistente.",
      });
  });
export const publicationSheetResultSchema = z
  .object({
    requestId: z.uuid(),
    gameId: z.uuid(),
    version,
    sourceVersion: version,
    gameVersion: version,
    publishedAt: stamp,
  })
  .strict();
export const publicationPdfResultSchema = publicationSheetResultSchema
  .extend({ sourceVersion: z.literal(2), reviewVersion: version })
  .strict();
export type PublicationState = z.infer<typeof publicationStateSchema>;
export type PublicationVersion = z.infer<typeof publicationVersionSchema>;
