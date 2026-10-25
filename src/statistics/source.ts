import { z } from "zod";
import { publicResultSchema } from "../publication/pdf-contract";
import { normalizeConfirmedGame } from "./confirmed-facts";
import { aggregationOptionsSchema } from "./aggregate";
import {
  scopesForStageKind,
  type BoxscoreGameScope,
} from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const statisticsSourceSchema = z
  .object({
    kind: z.literal("confirmed-statistics-v1"),
    disputeId: uuid,
    version: z.number().int().min(1).max(2147483647),
    confirmedAt: z.iso.datetime({ offset: true }),
    minimumSeconds: aggregationOptionsSchema.shape.minimumSeconds,
    games: z
      .array(
        z
          .object({
            snapshot: publicResultSchema,
            phase: z.enum(["round_robin", "knockout"]).nullable(),
          })
          .strict(),
      )
      .max(10000),
  })
  .strict()
  .superRefine((s, ctx) => {
    const ids = new Set<string>(),
      first = s.games[0]?.snapshot;
    for (const { snapshot: g } of s.games) {
      const id = g.id.toLowerCase();
      if (
        ids.has(id) ||
        g.disputeId.toLowerCase() !== s.disputeId ||
        (first &&
          (g.context.championshipId.toLowerCase() !==
            first.context.championshipId.toLowerCase() ||
            g.context.seasonId.toLowerCase() !==
              first.context.seasonId.toLowerCase()))
      )
        ctx.addIssue({
          code: "custom",
          message: "Fonte estatística repete jogo ou mistura contextos.",
        });
      ids.add(id);
    }
  });
export type StatisticsSource = z.infer<typeof statisticsSourceSchema>;

/** Metadata and snapshots must have been frozen together by the authoritative writer. */
export function selectStatisticsFacts(
  input: unknown,
  scope: BoxscoreGameScope,
) {
  const source = statisticsSourceSchema.parse(input);
  z.enum(["regular", "playoffs", "all"]).parse(scope);
  // Validate/normalize every publication, including games outside the selected scope.
  const normalized = source.games.map(({ snapshot, phase }) => ({
    phase,
    facts: normalizeConfirmedGame(snapshot).map((fact) => ({ ...fact, phase })),
  }));
  return {
    disputeId: source.disputeId,
    version: source.version,
    confirmedAt: source.confirmedAt,
    minimumSeconds: source.minimumSeconds,
    coverage: {
      regularGames: normalized.filter((g) => g.phase === "round_robin").length,
      playoffGames: normalized.filter((g) => g.phase === "knockout").length,
      unclassifiedGames: normalized.filter((g) => g.phase === null).length,
    },
    facts: normalized
      .filter((g) => scopesForStageKind(g.phase).includes(scope))
      .flatMap((g) => g.facts),
  };
}
