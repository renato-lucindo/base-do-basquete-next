import { z } from "zod";
import { competitiveFactSchema } from "./contract";
import { competitiveAwardSchema } from "./occurrences";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const outcomeGameSchema = z
  .object({
    gameId: uuid,
    disputeId: uuid,
    homeRegistrationId: uuid,
    awayRegistrationId: uuid,
    outcome: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("played"),
          publication: competitiveFactSchema,
        })
        .strict(),
      z
        .object({ kind: z.literal("awarded"), award: competitiveAwardSchema })
        .strict(),
    ]),
  })
  .strict()
  .superRefine((s, c) => {
    let valid = s.homeRegistrationId !== s.awayRegistrationId;
    if (s.outcome.kind === "played") {
      const p = s.outcome.publication;
      valid &&=
        p.gameId === s.gameId &&
        p.disputeId === s.disputeId &&
        p.homeRegistrationId === s.homeRegistrationId &&
        p.awayRegistrationId === s.awayRegistrationId;
    } else {
      const a = s.outcome.award;
      valid &&= [s.homeRegistrationId, s.awayRegistrationId].includes(
        a.winnerRegistrationId,
      );
      if (a.score)
        valid &&=
          a.score.homePoints !== a.score.awayPoints &&
          (a.winnerRegistrationId === s.homeRegistrationId) ===
            a.score.homePoints > a.score.awayPoints;
    }
    if (!valid)
      c.addIssue({
        code: "custom",
        message:
          "Confira efeito, vencedor, placar competitivo e contexto do jogo.",
      });
  });
export type OutcomeGame = z.infer<typeof outcomeGameSchema>;
export function outcomeScore(g: OutcomeGame) {
  return g.outcome.kind === "awarded"
    ? g.outcome.award.score
    : {
        homePoints: g.outcome.publication.homePoints,
        awayPoints: g.outcome.publication.awayPoints,
      };
}
export function outcomeWinner(g: OutcomeGame) {
  if (g.outcome.kind === "awarded") return g.outcome.award.winnerRegistrationId;
  return g.outcome.publication.homePoints > g.outcome.publication.awayPoints
    ? g.homeRegistrationId
    : g.awayRegistrationId;
}
export function outcomeLineage(g: OutcomeGame) {
  return g.outcome.kind === "awarded"
    ? {
        kind: "awarded" as const,
        gameId: g.gameId,
        occurrenceId: g.outcome.award.occurrenceId,
        version: g.outcome.award.version,
      }
    : {
        kind: "played" as const,
        gameId: g.gameId,
        publicationVersion: g.outcome.publication.publicationVersion,
        pointsSource: g.outcome.publication.pointsSource,
      };
}
