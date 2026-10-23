import { z } from "zod";
const name = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .transform((v) => v.replace(/\s+/gu, " "));
const version = z.number().int().min(0).max(2147483646);
export const teamSchema = z
  .object({
    id: z.uuid(),
    name,
    abbreviation: z
      .string()
      .trim()
      .max(12)
      .nullable()
      .transform((v) => v?.replace(/\s+/gu, " ") || null),
  })
  .strict();
export const registrationSchema = z
  .object({ id: z.uuid(), disputeId: z.uuid(), teamId: z.uuid(), name })
  .strict();
const metadata = {
  version: z.number().int().positive(),
  savedAt: z.iso.datetime({ offset: true }),
};
export const teamSnapshotSchema = teamSchema.extend(metadata);
export const registrationSnapshotSchema = registrationSchema.extend({
  ...metadata,
  team: teamSnapshotSchema,
});
export const teamListingSchema = z
  .object({ items: z.array(teamSnapshotSchema).max(20), hasMore: z.boolean() })
  .strict();
export const registrationListingSchema = z
  .object({
    items: z.array(registrationSnapshotSchema).max(20),
    hasMore: z.boolean(),
  })
  .strict();
export const saveTeamSchema = z
  .object({ commandId: z.uuid(), expectedVersion: version, team: teamSchema })
  .strict();
export const saveRegistrationSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: version,
    registration: registrationSchema,
  })
  .strict();
export type TeamSnapshot = z.infer<typeof teamSnapshotSchema>;
export type RegistrationSnapshot = z.infer<typeof registrationSnapshotSchema>;
export type SaveTeam = z.infer<typeof saveTeamSchema>;
export type SaveRegistration = z.infer<typeof saveRegistrationSchema>;
