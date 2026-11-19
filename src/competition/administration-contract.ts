import { z } from "zod";
import { saveCompetitionSchema } from "./contract";
import { organizerSelectionSchema } from "./organizer-contract";

export const disputeStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);
const visibility = z.enum(["public", "private"]);
export const disputeAdministrationSchema = z
  .object({
    disputeId: z.uuid(),
    version: z.number().int().positive(),
    status: disputeStatusSchema,
    visibility,
    wasPublic: z.boolean(),
    isTest: z.boolean(),
    lockReason: z
      .enum(["registration", "game", "import", "regulation", "achievement"])
      .nullable(),
  })
  .strict();
export const disputeAdministrationListSchema = z
  .array(disputeAdministrationSchema)
  .max(2048);
const reason = z.string().trim().max(2000).nullable();
export const saveCompetitionAdministrationSchema = saveCompetitionSchema.extend(
  {
    testDisputeIds: z.array(z.uuid()).max(2048),
    renameReason: reason,
    organizer: organizerSelectionSchema.optional(),
  },
);
export const disputeAdministrationCommandSchema = z
  .object({
    commandId: z.uuid(),
    disputeId: z.uuid(),
    expectedVersion: z.number().int().min(1).max(2147483646),
    action: z.enum(["complete", "cancel", "reopen", "set_visibility"]),
    visibility: visibility.nullable(),
    reason,
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.action === "set_visibility") !== (value.visibility !== null))
      ctx.addIssue({
        code: "custom",
        path: ["visibility"],
        message: "Confira a visibilidade.",
      });
    if (
      (value.action === "cancel" || value.action === "reopen") &&
      (value.reason?.length ?? 0) < 3
    )
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Informe o motivo.",
      });
  });
export type DisputeAdministration = z.infer<typeof disputeAdministrationSchema>;
export type DisputeAdministrationCommand = z.infer<
  typeof disputeAdministrationCommandSchema
>;
export type SaveCompetitionAdministration = z.infer<
  typeof saveCompetitionAdministrationSchema
>;
export const disputeStatusLabels: Record<
  z.infer<typeof disputeStatusSchema>,
  string
> = {
  planned: "Planejada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};
export const disputeLockLabels: Record<
  NonNullable<DisputeAdministration["lockReason"]>,
  string
> = {
  registration: "A disputa já tem histórico de inscrições.",
  game: "A disputa já tem histórico de jogos.",
  import: "A disputa já tem histórico de importações.",
  regulation: "A disputa já tem configuração ou regulamento salvo.",
  achievement: "A disputa já tem conquistas registradas.",
};
