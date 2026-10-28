import { z } from "zod";

// Removal does not increment the row version, so the full positive int range fits.
const version = z.number().int().min(1).max(2147483647);
export const registrationRemovalSchema = z
  .object({
    commandId: z.uuid(),
    registrationId: z.uuid(),
    disputeId: z.uuid(),
    expectedVersion: version,
  })
  .strict();

const registration = z
  .object({
    id: z.uuid(),
    disputeId: z.uuid(),
    teamId: z.uuid(),
    name: z.string().min(1).max(120),
    teamName: z.string().min(1).max(120),
    version,
  })
  .strict();
export const removalBlockerSchema = z.enum([
  "roster",
  "staff",
  "games",
  "scoresheet",
  "publication",
  "decisions",
  "regulation",
  "text_review",
  "transfer",
  "awards",
]);
const blockers = z
  .array(removalBlockerSchema)
  .max(10)
  .refine((items) => new Set(items).size === items.length);
export const removalResultSchema = z
  .object({
    state: z.literal("removed"),
    id: z.uuid(),
    disputeId: z.uuid(),
    deletedVersion: version,
  })
  .strict();
export const removalContextSchema = z.discriminatedUnion("state", [
  z
    .object({
      state: z.literal("available"),
      registration,
      blockers: blockers.refine((items) => items.length === 0),
    })
    .strict(),
  z
    .object({
      state: z.literal("blocked"),
      registration,
      blockers: blockers.refine((items) => items.length > 0),
    })
    .strict(),
  removalResultSchema,
]);

export type RegistrationRemoval = z.infer<typeof registrationRemovalSchema>;
export type RemovalContext = z.infer<typeof removalContextSchema>;
export type RemovalResult = z.infer<typeof removalResultSchema>;
