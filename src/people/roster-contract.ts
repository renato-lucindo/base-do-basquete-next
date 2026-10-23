import { z } from "zod";
import { publicPersonSchema } from "./contract";
export const rosterEntrySchema = z
  .object({
    id: z.uuid(),
    registrationId: z.uuid(),
    personId: z.uuid(),
    jersey: z.string().regex(/^(00|0|[1-9][0-9]?)$/),
    active: z.boolean(),
  })
  .strict();
export const saveRosterSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(2147483646),
    entry: rosterEntrySchema,
  })
  .strict();
export const rosterSnapshotSchema = rosterEntrySchema.extend({
  disputeId: z.uuid(),
  version: z.number().int().positive(),
  savedAt: z.iso.datetime({ offset: true }),
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }).nullable(),
  person: publicPersonSchema.pick({
    id: true,
    name: true,
    nickname: true,
    publicBirthYear: true,
  }),
});
export const rosterListingSchema = z
  .object({
    items: z.array(rosterSnapshotSchema).max(20),
    hasMore: z.boolean(),
  })
  .strict();
export type SaveRoster = z.infer<typeof saveRosterSchema>;
export type RosterSnapshot = z.infer<typeof rosterSnapshotSchema>;
