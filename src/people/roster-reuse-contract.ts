import { z } from "zod";
import { rosterEntrySchema } from "./roster-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase());
const version = z.number().int().min(1).max(2147483646);
export const REUSE_LIMIT = 200;
export const reuseEligibilitySchema = z.enum([
  "eligible",
  "gender_mismatch",
  "registered_elsewhere",
  "transfer_required",
]);
const registration = z
  .object({
    id: uuid,
    disputeId: uuid,
    teamId: uuid,
    seasonId: uuid,
    championshipId: uuid,
    name: z.string().min(1).max(120),
    category: z.string().min(1).max(80),
    gender: z.enum(["masculino", "feminino"]),
    year: z.number().int().min(1).max(9999),
    division: z.string().max(80).nullable(),
    version,
  })
  .strict();
export const rosterReuseSourcesSchema = z
  .object({
    items: z
      .array(
        registration.extend({
          athleteCount: z.number().int().min(1).max(2147483647),
          savedAt: z.iso.datetime({ offset: true }),
        }),
      )
      .max(20),
    hasMore: z.boolean(),
  })
  .strict();
const targetEntry = z
  .object({
    id: uuid,
    personId: uuid,
    jersey: rosterEntrySchema.shape.jersey,
    version,
  })
  .strict();
export const reuseContextSchema = z
  .object({
    target: registration,
    source: registration,
    contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    targetRoster: z.array(targetEntry).max(2000),
    candidates: z
      .array(
        z
          .object({
            sourceEntryId: uuid,
            sourceVersion: version,
            person: z
              .object({
                id: uuid,
                name: z.string().min(1).max(120),
                nickname: z.string().max(120).nullable(),
              })
              .strict(),
            jersey: rosterEntrySchema.shape.jersey,
            eligibility: reuseEligibilitySchema,
          })
          .strict(),
      )
      .max(2000),
  })
  .strict()
  .superRefine((c, ctx) => {
    const unique = (a: string[]) => new Set(a).size === a.length;
    const sourceIds = new Set(c.candidates.map((r) => r.sourceEntryId));
    if (
      c.source.id === c.target.id ||
      c.source.disputeId === c.target.disputeId ||
      (["teamId", "seasonId", "championshipId"] as const).some(
        (k) => c.source[k] !== c.target[k],
      ) ||
      !unique(c.candidates.map((r) => r.sourceEntryId)) ||
      !unique(c.candidates.map((r) => r.person.id)) ||
      !unique(c.targetRoster.map((r) => r.id)) ||
      !unique(c.targetRoster.map((r) => r.personId)) ||
      !unique(
        c.targetRoster.flatMap((r) => (r.jersey === null ? [] : [r.jersey])),
      ) ||
      c.targetRoster.some((r) => sourceIds.has(r.id))
    )
      ctx.addIssue({
        code: "custom",
        message: "Origem ou destino do elenco inconsistente.",
      });
  });
export type ReuseContext = z.infer<typeof reuseContextSchema>;
export const reuseSelectionSchema = z
  .array(
    z
      .object({
        sourceEntryId: uuid,
        selected: z.boolean(),
        jersey: z.string().max(20).nullable(),
      })
      .strict(),
  )
  .max(2000)
  .refine((a) => new Set(a.map((r) => r.sourceEntryId)).size === a.length);
export const applyRosterReuseSchema = z
  .object({
    commandId: uuid,
    sourceRegistrationId: uuid,
    targetRegistrationId: uuid,
    expectedContextFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    items: z
      .array(
        z
          .object({
            sourceEntryId: uuid,
            sourceVersion: version,
            newEntryId: uuid,
            jersey: rosterEntrySchema.shape.jersey,
          })
          .strict(),
      )
      .min(1)
      .max(REUSE_LIMIT),
    confirmed: z.literal(true),
  })
  .strict()
  .refine(
    (c) =>
      c.sourceRegistrationId !== c.targetRegistrationId &&
      new Set(c.items.map((r) => r.sourceEntryId)).size === c.items.length &&
      new Set(c.items.map((r) => r.newEntryId)).size === c.items.length &&
      c.items.every(
        (r) => !c.items.some((s) => s.sourceEntryId === r.newEntryId),
      ),
  );
export type ApplyRosterReuse = z.infer<typeof applyRosterReuseSchema>;
