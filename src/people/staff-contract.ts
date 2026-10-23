import { z } from "zod";
import { publicPersonSchema } from "./contract";
export const staffEntrySchema = z
  .object({
    id: z.uuid(),
    registrationId: z.uuid(),
    personId: z.uuid(),
    role: z.enum(["head", "assistant"]),
    active: z.boolean(),
  })
  .strict();
export const saveStaffSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(2147483646),
    entry: staffEntrySchema,
  })
  .strict();
export const staffSnapshotSchema = staffEntrySchema.extend({
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
export const staffListingSchema = z
  .object({ items: z.array(staffSnapshotSchema).max(20), hasMore: z.boolean() })
  .strict();
export type SaveStaff = z.infer<typeof saveStaffSchema>;
export type StaffSnapshot = z.infer<typeof staffSnapshotSchema>;
