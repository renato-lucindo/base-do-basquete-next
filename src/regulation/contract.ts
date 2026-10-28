import { z } from "zod";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647),
  score = z.number().int().min(0).max(2147483647);
export const tieCriterionSchema = z.enum([
  "wins",
  "point_difference",
  "points_for",
  "head_to_head_points",
  "head_to_head_difference",
  "head_to_head_for",
]);
export const roundRobinRulesSchema = z
  .object({
    format: z.literal("round_robin"),
    points: z
      .object({
        win: z.number().int().min(-1000000).max(1000000),
        loss: z.number().int().min(-1000000).max(1000000),
      })
      .strict(),
    tieBreakers: z.array(tieCriterionSchema).max(6),
  })
  .strict()
  .refine(
    (r) => new Set(r.tieBreakers).size === r.tieBreakers.length,
    "Não repita critérios de desempate.",
  );
export const competitiveFactSchema = z
  .object({
    gameId: uuid,
    publicationVersion: version,
    disputeId: uuid,
    homeRegistrationId: uuid,
    awayRegistrationId: uuid,
    homePoints: score,
    awayPoints: score,
    status: z.literal("played"),
    pointsSource: z
      .object({ kind: z.enum(["sheet", "pdf"]), version })
      .strict(),
  })
  .strict()
  .refine(
    (g) =>
      g.homeRegistrationId !== g.awayRegistrationId &&
      g.homePoints !== g.awayPoints,
    "Confira inscrições distintas e resultado final sem empate.",
  );
export const standingsInputSchema = z
  .object({
    disputeId: uuid,
    registrationIds: z.array(uuid).max(1000),
    rules: roundRobinRulesSchema,
    games: z.array(competitiveFactSchema).max(10000),
  })
  .strict()
  .superRefine((s, c) => {
    const ids = new Set(s.registrationIds),
      games = new Set(s.games.map((g) => g.gameId));
    if (
      ids.size !== s.registrationIds.length ||
      games.size !== s.games.length ||
      s.games.some(
        (g) =>
          g.disputeId !== s.disputeId ||
          !ids.has(g.homeRegistrationId) ||
          !ids.has(g.awayRegistrationId),
      )
    )
      c.addIssue({
        code: "custom",
        message:
          "Confira disputa, inscrições e uma única versão publicada de cada jogo atribuído ao recorte.",
      });
  });
export type RoundRobinRules = z.infer<typeof roundRobinRulesSchema>;
export type CompetitiveFact = z.infer<typeof competitiveFactSchema>;
export type TieCriterion = z.infer<typeof tieCriterionSchema>;
export type StandingsInput = z.infer<typeof standingsInputSchema>;
