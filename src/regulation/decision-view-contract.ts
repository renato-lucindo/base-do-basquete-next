import { z } from "zod";
import { outcomeGameSchema } from "./outcome";
import { regulationDefinitionSchema } from "./persistence-contract";
import { regulationProjectionSchema } from "./view-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase());
const affectedGame = z
  .object({
    gameId: uuid,
    disputeId: uuid,
    homeRegistrationId: uuid,
    awayRegistrationId: uuid,
    state: z.enum(["played", "awarded", "pending", "excluded", "conflict"]),
    needs: z
      .enum([
        "result",
        "postponed",
        "interrupted",
        "withdrawal_decision",
        "withdrawal_review",
        "occurrence_review",
      ])
      .nullable(),
    outcome: outcomeGameSchema.shape.outcome.nullable(),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      (v.outcome !== null) !== ["played", "awarded"].includes(v.state) ||
      (v.outcome &&
        (v.outcome.kind !== v.state ||
          !outcomeGameSchema.safeParse({
            gameId: v.gameId,
            disputeId: v.disputeId,
            homeRegistrationId: v.homeRegistrationId,
            awayRegistrationId: v.awayRegistrationId,
            outcome: v.outcome,
          }).success))
    )
      c.addIssue({
        code: "custom",
        message: "Efeito não corresponde ao estado competitivo.",
      });
  });
export const decisionPreviewResultSchema = z
  .object({
    kind: z.enum(["game_occurrence", "registration_withdrawal"]),
    targetId: uuid,
    disputeId: uuid,
    commandId: uuid,
    baseVersion: z.number().int().min(0).max(2147483646),
    regulationVersion: z.number().int().min(0).max(2147483647),
    contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    definition: regulationDefinitionSchema.nullable(),
    before: regulationProjectionSchema.nullable(),
    after: regulationProjectionSchema.nullable(),
    requiresImpact: z.boolean(),
    affected: z
      .object({
        before: z.array(affectedGame).max(10000),
        after: z.array(affectedGame).max(10000),
      })
      .strict(),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      [...v.affected.before, ...v.affected.after].some(
        (g) => g.disputeId !== v.disputeId,
      )
    )
      c.addIssue({
        code: "custom",
        message: "Prévia fora da disputa solicitada.",
      });
  });
export type DecisionPreviewResult = z.infer<typeof decisionPreviewResultSchema>;
