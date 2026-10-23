import { z } from "zod";

const label = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .transform((v) => v.replace(/\s+/gu, " "));
export const disputeSchema = z
  .object({
    id: z.uuid(),
    gender: z.enum(["masculino", "feminino"]),
    category: label(80),
    division: z
      .string()
      .trim()
      .max(80)
      .nullable()
      .transform((v) => v?.replace(/\s+/gu, " ") || null),
  })
  .strict();
export const seasonSchema = z
  .object({
    id: z.uuid(),
    year: z.number().int().min(1).max(9999),
    disputes: z.array(disputeSchema).min(1).max(64),
  })
  .strict();
export const competitionSchema = z
  .object({
    id: z.uuid(),
    name: label(120),
    seasons: z.array(seasonSchema).min(1).max(32),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set([value.id]);
    const years = new Set<number>();
    for (const season of value.seasons) {
      if (ids.has(season.id) || years.has(season.year))
        ctx.addIssue({ code: "custom", message: "Temporada repetida." });
      ids.add(season.id);
      years.add(season.year);
      const contexts = new Set<string>();
      for (const dispute of season.disputes) {
        const key = JSON.stringify([
          dispute.gender,
          dispute.category.toLowerCase(),
          dispute.division?.toLowerCase() ?? "",
        ]);
        if (ids.has(dispute.id) || contexts.has(key))
          ctx.addIssue({ code: "custom", message: "Disputa repetida." });
        ids.add(dispute.id);
        contexts.add(key);
      }
    }
  });
export const saveCompetitionSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(2147483646),
    competition: competitionSchema,
  })
  .strict();
export const snapshotSchema = competitionSchema.extend({
  version: z.number().int().positive(),
  savedAt: z.iso.datetime({ offset: true }),
});
export const summarySchema = z
  .object({
    id: z.uuid(),
    name: label(120),
    version: z.number().int().positive(),
    savedAt: z.iso.datetime({ offset: true }),
    contexts: z.array(
      z
        .object({
          year: z.number().int(),
          gender: z.enum(["masculino", "feminino"]),
          category: z.string(),
          division: z.string().nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export const listingSchema = z
  .object({
    items: z.array(summarySchema),
    recents: z.array(summarySchema),
    hasMore: z.boolean(),
  })
  .strict();
export const saveResultSchema = z
  .object({ id: z.uuid(), version: z.number().int().positive() })
  .strict();
export type Competition = z.infer<typeof competitionSchema>;
export type CompetitionSnapshot = z.infer<typeof snapshotSchema>;
export type SaveCompetition = z.infer<typeof saveCompetitionSchema>;
export type CompetitionListing = z.infer<typeof listingSchema>;
