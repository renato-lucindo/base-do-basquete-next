import { z } from "zod";
import { confirmedPlayerFactSchema } from "../statistics/confirmed-facts";
import { publicGameSchema } from "../publication/contract";

export const confirmedPlayerGameSchema = z
  .object({
    kind: z.literal("confirmed-player-game-v1"),
    statisticsVersion: z.number().int().min(1).max(2147483647),
    minimumSeconds: z.number().int().min(1).max(2147483647),
    fact: confirmedPlayerFactSchema,
    game: publicGameSchema.shape.game,
  })
  .strict()
  .refine((r) => {
    const own = r.game[r.fact.side],
      reg = r.fact.registration;
    return (
      own.registrationId.toLowerCase() === reg.registrationId &&
      own.team.id.toLowerCase() === reg.team.id &&
      own.name === reg.name &&
      own.team.name === reg.team.name &&
      own.team.abbreviation === reg.team.abbreviation
    );
  }, "Participação não corresponde ao lado e à inscrição da ocasião.");

export type ConfirmedPlayerGame = z.infer<typeof confirmedPlayerGameSchema>;
