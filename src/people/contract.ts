import { z } from "zod";
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => v?.replace(/\s+/gu, " ") || null);
export const publicPersonSchema = z
  .object({
    id: z.uuid(),
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .transform((v) => v.replace(/\s+/gu, " ")),
    nickname: text(120),
    publicBirthYear: z.number().int().min(1).max(9999).nullable(),
    heightCm: z.number().positive().max(1000).nullable(),
    weightKg: z.number().positive().max(1000).nullable(),
    position: text(80),
    dominantHand: z.enum(["left", "right", "both"]).nullable(),
    originCity: text(120),
    originState: text(80),
    biography: z
      .string()
      .trim()
      .max(4000)
      .nullable()
      .transform((v) => v || null),
  })
  .strict();
export const athleteSchema = z
  .object({
    sex: z.enum(["male", "female"]),
    birthDate: z.iso.date().nullable(),
    federationRegistration: text(120),
  })
  .strict();
export const personSchema = publicPersonSchema
  .extend({ athlete: athleteSchema.nullable(), coach: z.boolean() })
  .refine((v) => v.athlete !== null || v.coach, {
    message: "Selecione atleta ou técnico.",
  });
export const personSnapshotSchema = personSchema.extend({
  version: z.number().int().positive(),
  savedAt: z.iso.datetime({ offset: true }),
});
export const personListingSchema = z
  .object({
    items: z.array(personSnapshotSchema).max(20),
    hasMore: z.boolean(),
  })
  .strict();
export const savePersonSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(2147483646),
    disputeId: z.uuid().nullable(),
    confirmHomonym: z.boolean(),
    person: personSchema,
  })
  .strict();
export type Person = z.infer<typeof personSchema>;
export type PersonSnapshot = z.infer<typeof personSnapshotSchema>;
export type SavePerson = z.infer<typeof savePersonSchema>;
export function emptyPerson(id: string): Person {
  return {
    id,
    name: "",
    nickname: null,
    publicBirthYear: null,
    heightCm: null,
    weightKg: null,
    position: null,
    dominantHand: null,
    originCity: null,
    originState: null,
    biography: null,
    athlete: null,
    coach: false,
  };
}
