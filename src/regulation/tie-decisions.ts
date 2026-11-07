import { z } from "zod";
import type { RoundRobinRules } from "./contract";
import { outcomeScore, type OutcomeGame } from "./outcome";
import type { calculateOutcomeStandings } from "./outcome-standings";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const tieDecisionSchema = z
  .object({
    id: uuid,
    phaseId: uuid,
    groupId: uuid,
    order: z.array(uuid).min(2).max(1000),
    basis: z.string().min(1).max(1048576),
  })
  .strict()
  .refine(
    (d) => new Set(d.order).size === d.order.length,
    "Não repita equipes no desempate.",
  );
export const tieNoteSchema = z
  .object({
    id: uuid,
    comment: z.string().trim().min(1).max(2000),
    actorId: uuid.optional(),
    decidedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();
export type TieDecision = z.infer<typeof tieDecisionSchema>;
/** Canonical public facts, not a private-context fingerprint. No motives or agenda.
 * Storing this bounded exact basis avoids hash collisions and works synchronously
 * in both server and browser projections. The definition's total size limit applies.
 */
export function tieDecisionContext(
  rules: RoundRobinRules,
  members: string[],
  gameIds: string[],
  outcomes: OutcomeGame[],
) {
  const sortedMembers = [...members].sort(),
    sortedGames = [...gameIds].sort(),
    memberIndex = new Map(sortedMembers.map((id, i) => [id, i])),
    gameIndex = new Map(sortedGames.map((id, i) => [id, i]));
  return JSON.stringify([
    "tie-context-v1",
    rules.calculationPolicy ?? "legacy",
    rules.turns ?? null,
    rules.points.win,
    rules.points.loss,
    rules.tieBreakers,
    sortedMembers,
    sortedGames,
    [...outcomes]
      .sort((a, b) => a.gameId.localeCompare(b.gameId))
      .map((g) => {
        const score = outcomeScore(g);
        return [
          gameIndex.get(g.gameId) ?? g.gameId,
          memberIndex.get(g.homeRegistrationId),
          memberIndex.get(g.awayRegistrationId),
          score?.homePoints ?? null,
          score?.awayPoints ?? null,
          g.outcome.kind === "played"
            ? [
                "played",
                g.outcome.publication.publicationVersion,
                g.outcome.publication.pointsSource,
              ]
            : [
                "awarded",
                g.outcome.award.occurrenceId,
                g.outcome.award.version,
                g.outcome.award.winnerRegistrationId,
                g.outcome.award.homeLeaguePoints,
                g.outcome.award.awayLeaguePoints,
              ],
        ];
      }),
  ]);
}
type Standings = ReturnType<typeof calculateOutcomeStandings>;
export function applyTieDecisions(
  standings: Standings,
  decisions: TieDecision[],
  basis: string,
) {
  const rows = [...standings.rows],
    unresolvedTies = [...standings.unresolvedTies],
    appliedTieDecisionIds: string[] = [],
    staleTieDecisionIds: string[] = [];
  for (const d of decisions) {
    const tied = unresolvedTies.findIndex(
      (ids) =>
        ids.length === d.order.length &&
        new Set(d.order).size === ids.length &&
        ids.every((id) => d.order.includes(id)),
    );
    if (d.basis !== basis || tied < 0) {
      staleTieDecisionIds.push(d.id);
      continue;
    }
    const ids = new Set(d.order),
      start = rows.findIndex((r) => ids.has(r.registrationId)),
      catalog = new Map(
        rows
          .filter((r) => ids.has(r.registrationId))
          .map((r) => [r.registrationId, r]),
      );
    rows.splice(
      start,
      d.order.length,
      ...d.order.map((id, i) => ({
        ...catalog.get(id)!,
        position: start + i + 1,
        tied: false,
      })),
    );
    unresolvedTies.splice(tied, 1);
    appliedTieDecisionIds.push(d.id);
  }
  return {
    standings: { ...standings, rows, unresolvedTies },
    appliedTieDecisionIds,
    staleTieDecisionIds,
  };
}
