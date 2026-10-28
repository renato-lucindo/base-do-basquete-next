import { z } from "zod";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  revision = z.number().int().min(0).max(2147483647),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  ids = z
    .array(uuid)
    .min(1)
    .max(1000)
    .refine((v) => new Set(v).size === v.length, "Não repita a identidade."),
  title = z
    .string()
    .trim()
    .min(2)
    .max(80)
    .refine(
      (v) => !/[\u0000-\u001f\u007f\uD800-\uDFFF]/u.test(v),
      "Título contém caracteres inválidos.",
    );
export const placementSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("group"), phaseId: uuid, groupId: uuid }).strict(),
  z
    .object({
      kind: z.literal("series"),
      finalSeriesId: uuid,
      bronzeSeriesId: uuid.nullable(),
    })
    .strict()
    .refine(
      (s) => s.finalSeriesId !== s.bronzeSeriesId,
      "Escolha confrontos distintos para final e bronze.",
    ),
]);
export const placementGroupsSchema = z
  .array(
    z
      .object({
        position: z.number().int().min(1).max(1000),
        registrationIds: ids,
      })
      .strict(),
  )
  .max(1000)
  .refine((v) => {
    const registrations = v.flatMap((p) => p.registrationIds);
    return (
      registrations.length <= 1000 &&
      new Set(registrations).size === registrations.length &&
      new Set(v.map((p) => p.position)).size === v.length
    );
  }, "Use um grupo por posição, sem repetir a inscrição.");
export const placementSuggestionRequestSchema = z
  .object({
    disputeId: uuid,
    expectedRegulationVersion: revision,
    expectedContextFingerprint: fingerprint,
    source: placementSourceSchema.nullable(),
  })
  .strict();
export const placementSuggestionSchema = z
  .object({
    algorithmVersion: z.literal("placement-suggestion-v1"),
    status: z.literal("suggestion"),
    requiresConfirmation: z.literal(true),
    disputeId: uuid,
    regulationVersion: revision,
    contextFingerprint: fingerprint,
    source: placementSourceSchema.nullable(),
    ready: z.boolean(),
    needs: z
      .enum([
        "source_required",
        "regulation_required",
        "source_missing",
        "context_changed",
        "group_results",
        "group_tie",
        "series_pending",
        "series_conflict",
        "podium_conflict",
      ])
      .nullable(),
    placements: placementGroupsSchema,
  })
  .strict()
  .refine(
    (s) =>
      s.ready === (s.needs === null) &&
      (!s.ready ||
        (s.source !== null &&
          s.regulationVersion > 0 &&
          s.placements.length > 0)),
    "Sugestão inconsistente.",
  );
export const achievementDraftSchema = z
  .object({
    disputeId: uuid,
    placements: placementGroupsSchema,
    honors: z
      .array(z.object({ id: uuid, title, personIds: ids }).strict())
      .max(1000),
  })
  .strict()
  .refine(
    (d) =>
      new Set(d.honors.map((h) => h.id)).size === d.honors.length &&
      d.honors.reduce((n, h) => n + h.personIds.length, 0) <= 10000,
    "Confira IDs de honrarias únicos e o limite de destinatários.",
  );
export type AchievementDraft = z.infer<typeof achievementDraftSchema>;
export type PlacementSource = z.infer<typeof placementSourceSchema>;
export type PlacementSuggestion = z.infer<typeof placementSuggestionSchema>;
