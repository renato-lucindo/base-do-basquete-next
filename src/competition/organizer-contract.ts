import { z } from "zod";
import { snapshotSchema } from "./contract";

export const organizerKindLabels = {
  federation: "Federação",
  confederation: "Confederação",
  international: "Entidade internacional",
  independent: "Independente",
  public_authority: "Poder público",
  student: "Estudantil",
} as const;

// Persist the enum keys and keep the labels at the interface boundary.
const kind = z.enum(
  Object.keys(organizerKindLabels) as [
    keyof typeof organizerKindLabels,
    ...(keyof typeof organizerKindLabels)[],
  ],
);
const fields = {
  name: z.string().trim().min(1).max(120),
  abbreviation: z.string().trim().min(1).max(24).nullable(),
};

export const organizerSchema = z.strictObject({
  ...fields,
  id: z.uuid(),
  kind: z.union([kind, z.literal("system")]),
});
export const organizerListSchema = z.array(organizerSchema).max(25);
export const organizerSelectionSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("existing"), id: z.uuid() }),
  z.strictObject({ mode: z.literal("create"), ...fields, kind }),
  z.strictObject({ mode: z.literal("test") }),
]);
export const organizerSnapshotSchema = snapshotSchema.extend({
  organizer: organizerSchema.nullable(),
  organizerLocked: z.boolean(),
});
export const compatibleOrganizerSnapshotSchema = snapshotSchema.extend({
  organizer: organizerSchema.nullable().optional(),
  organizerLocked: z.boolean().optional(),
});
export type Organizer = z.infer<typeof organizerSchema>;
export type OrganizerKind = z.infer<typeof kind>;
export type OrganizerSelection = z.infer<typeof organizerSelectionSchema>;
export type OrganizerSnapshot = z.infer<
  typeof compatibleOrganizerSnapshotSchema
>;
