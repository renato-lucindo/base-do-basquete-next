import { z } from "zod";

const version = z.number().int().min(1).max(2147483647);
const phase = z.enum(["round_robin", "knockout"]);
const game = z
  .object({
    gameId: z.uuid(),
    gameVersion: version,
    publicationVersion: version,
    previousPhase: phase.nullable(),
  })
  .strict();

export const confirmGameStagesSchema = z
  .object({
    requestId: z.uuid(),
    disputeId: z.uuid(),
    baseStatisticsVersion: version.max(2147483646),
    reason: z.string().trim().min(10).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u),
    games: z.array(game).min(1).max(100),
  })
  .strict()
  .refine(
    ({ games }) => new Set(games.map((g) => g.gameId.toLowerCase())).size === games.length,
    "O mesmo jogo não pode aparecer duas vezes.",
  );
export type ConfirmGameStages = z.infer<typeof confirmGameStagesSchema>;

export const confirmGameStagesReceiptSchema = z
  .object({
    requestId: z.uuid(),
    disputeId: z.uuid(),
    version,
    changedGameCount: z.number().int().min(0).max(100),
    changedGameIds: z.array(z.uuid()).max(100),
  })
  .strict()
  .refine((r) => r.changedGameCount === r.changedGameIds.length);
