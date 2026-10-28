import { z } from "zod";
import { regulationStateSchema } from "../regulation/persistence-contract";
import { publicGameSchema } from "../publication/contract";
import { registrationSchema } from "../teams/contract";
import { publicPersonSchema } from "../people/contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647);
export const achievementContextSchema = z
  .object({
    disputeId: uuid,
    scope: publicGameSchema.shape.context.extend({
      championshipId: uuid,
      seasonId: uuid,
    }),
    regulation: regulationStateSchema,
    registrations: z
      .array(
        registrationSchema.extend({
          id: uuid,
          disputeId: uuid,
          teamId: uuid,
          version,
        }),
      )
      .max(1000),
    eligibleAthletes: z
      .array(z.object({ personId: uuid, version }).strict())
      .max(10000),
    contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict()
  .superRefine((c, ctx) => {
    const ids = new Set(c.registrations.map((r) => r.id)),
      people = c.eligibleAthletes.map((p) => p.personId);
    if (
      c.regulation.disputeId !== c.disputeId ||
      ids.size !== c.registrations.length ||
      new Set(people).size !== people.length ||
      c.registrations.some((r) => r.disputeId !== c.disputeId) ||
      c.regulation.context.registrationIds.length !== ids.size ||
      c.regulation.context.registrationIds.some((id) => !ids.has(id)) ||
      c.regulation.history.length ||
      c.regulation.hasMore
    )
      ctx.addIssue({
        code: "custom",
        message: "Contexto de premiações inconsistente.",
      });
  });
const person = publicPersonSchema.pick({
  name: true,
  nickname: true,
  publicBirthYear: true,
});
export const achievementCandidateListingSchema = z
  .object({
    disputeId: uuid,
    items: z
      .array(
        person
          .extend({
            personId: uuid,
            version,
            registrationIds: z
              .array(uuid)
              .min(1)
              .max(1000)
              .refine((ids) => new Set(ids).size === ids.length),
          })
          .strict(),
      )
      .max(20),
    hasMore: z.boolean(),
  })
  .strict()
  .refine(
    (c) => new Set(c.items.map((p) => p.personId)).size === c.items.length,
    "Não agrupe homônimos nem repita identidades.",
  );
export type AchievementContext = z.infer<typeof achievementContextSchema>;
