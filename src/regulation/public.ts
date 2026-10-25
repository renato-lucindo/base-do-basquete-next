import { outcomeScore, outcomeWinner } from "./outcome";
import { previewRegulationDefinition } from "./persistence-contract";
import {
  publicCompetitiveContext,
  publicStandingsSchema,
  publicStandingsSourceSchema,
  type PublicStandings,
} from "./public-contract";

/** A confirmed public source is a precondition; this function grants no visibility. */
export function buildPublicStandings(input: unknown): PublicStandings {
  const s = publicStandingsSourceSchema.parse(input),
    context = publicCompetitiveContext(s),
    regulationContext = {
      registrationIds: context.registrationIds,
      games: context.games,
      publishedGames: context.publishedGames,
      occurrences: context.occurrences,
      withdrawals: context.withdrawals,
    };
  const projection = previewRegulationDefinition(
      s.definition,
      regulationContext,
      s.disputeId,
      s.regulationVersion,
    ),
    decisions = new Map(projection.games.map((g) => [g.gameId, g]));
  return publicStandingsSchema.parse({
    schemaVersion: "public-standings-v1",
    disputeId: s.disputeId,
    publicationVersion: s.publicationVersion,
    regulationVersion: s.regulationVersion,
    publishedAt: s.publishedAt,
    context: s.context,
    definition: s.definition,
    registrations: s.registrations,
    games: s.games.map((g) => {
      const decision = decisions.get(g.id)!,
        outcome = decision.outcome
          ? {
              gameId: g.id,
              disputeId: s.disputeId,
              homeRegistrationId: g.homeRegistrationId,
              awayRegistrationId: g.awayRegistrationId,
              outcome: decision.outcome,
            }
          : null;
      return {
        ...g,
        state: decision.state,
        needs: decision.needs,
        score: outcome ? outcomeScore(outcome) : null,
        winnerRegistrationId: outcome ? outcomeWinner(outcome) : null,
        publicationVersion: decision.publication?.publicationVersion ?? 0,
        sourceKind:
          decision.outcome?.kind === "awarded"
            ? "administrative"
            : decision.outcome?.kind === "played"
              ? decision.outcome.publication.pointsSource.kind
              : null,
      };
    }),
    projection: {
      algorithmVersion: projection.algorithmVersion,
      status: "provisional",
      disputeId: projection.disputeId,
      regulationVersion: projection.regulationVersion,
      groupPhases: projection.groupPhases,
      series: projection.series,
      lineage: projection.lineage,
    },
  });
}
