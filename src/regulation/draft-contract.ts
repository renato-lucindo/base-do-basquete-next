import { z } from "zod";
import { regulationDefinitionSchema } from "./persistence-contract";
import { entrantReferenceSchema } from "./crossings";
/** Object order differs between PostgreSQL JSONB, DTOs and local editing. */
export function definitionKey(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item !== null && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
}
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  refId = z.union([uuid, z.literal("")]),
  revision = z.number().int().min(0).max(2147483646),
  number = z
    .number()
    .int()
    .min(-1000000)
    .max(2147483647)
    .nullable()
    .transform((n) => n ?? NaN),
  label = z.string().max(100),
  stamp = z.iso.datetime({ offset: true });
const draftRef = z.discriminatedUnion("kind", [
  entrantReferenceSchema.options[0].extend({ registrationId: refId }),
  entrantReferenceSchema.options[1].extend({ phaseId: refId, groupId: refId }),
  entrantReferenceSchema.options[2].extend({ seriesId: refId }),
  entrantReferenceSchema.options[3].extend({ seriesId: refId }),
]);
const shape = regulationDefinitionSchema.shape;
// Deliberately omit cross-reference/completeness refinements, retaining a closed,
// bounded rendering shape. A draft is never accepted by official/public writers.
export const draftDefinitionSchema = z
  .object({
    ...shape,
    customReason: z.string().max(2000).optional(),
    tieNotes: shape.tieNotes
      .unwrap()
      .element.extend({ comment: z.string().max(2000) })
      .array()
      .max(1000)
      .optional(),
    occurrenceRules: z
      .object({
        wo: z
          .object({
            winnerLeaguePoints: number,
            loserLeaguePoints: number,
            score: z
              .object({ winner: number, loser: number })
              .strict()
              .nullable(),
          })
          .strict()
          .nullable(),
      })
      .strict(),
    groupPhases: shape.groupPhases.element
      .extend({
        name: label,
        rules: z
          .object({
            ...shape.groupPhases.element.shape.rules.shape,
            points: z.object({ win: number, loss: number }).strict(),
          })
          .strict(),
        groups: shape.groupPhases.element.shape.groups.element
          .extend({ name: label })
          .array()
          .max(1000),
      })
      .array()
      .max(64),
    knockoutPhases: shape.knockoutPhases.element
      .extend({ name: label })
      .array()
      .max(64),
    series: shape.series.element
      .extend({ name: label, home: draftRef, away: draftRef })
      .array()
      .max(256),
  })
  .strict();
export const draftDocumentSchema = z
  .object({ definition: draftDefinitionSchema })
  .strict()
  .refine(
    (d) => new TextEncoder().encode(JSON.stringify(d)).length <= 1048576,
    "Rascunho excede o limite.",
  );
export const regulationDraftSchema = z
  .object({
    disputeId: uuid,
    version: revision.min(1),
    baseRegulationVersion: revision,
    document: draftDocumentSchema,
    savedAt: stamp,
    actorId: uuid,
  })
  .strict();
export const saveRegulationDraftSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    expectedVersion: revision,
    baseRegulationVersion: revision,
    document: draftDocumentSchema,
  })
  .strict()
  .refine(
    (c) => new TextEncoder().encode(JSON.stringify(c)).length <= 1048576,
    "Rascunho excede o limite.",
  );
export const regulationDraftResultSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    version: revision.min(1),
    baseRegulationVersion: revision,
    savedAt: stamp,
  })
  .strict();
export type SaveRegulationDraft = z.infer<typeof saveRegulationDraftSchema>;
export type RegulationDraft = z.infer<typeof regulationDraftSchema>;
