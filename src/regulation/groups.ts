import { z } from "zod";
import { competitiveFactSchema, roundRobinRulesSchema } from "./contract";
import { calculateStandings } from "./standings";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const groupPhaseInputSchema = z
  .object({
    disputeId: uuid,
    phaseId: uuid,
    rules: roundRobinRulesSchema,
    groups: z
      .array(
        z
          .object({
            id: uuid,
            registrationIds: z.array(uuid).max(1000),
            gameIds: z.array(uuid).max(10000),
          })
          .strict(),
      )
      .max(1000),
    publishedGames: z.array(competitiveFactSchema).max(10000),
  })
  .strict()
  .superRefine((s, c) => {
    const groups = s.groups.map((g) => g.id),
      registrations = s.groups.flatMap((g) => g.registrationIds),
      assigned = s.groups.flatMap((g) => g.gameIds),
      facts = s.publishedGames.map((g) => g.gameId);
    if (
      new Set(groups).size !== groups.length ||
      new Set(registrations).size !== registrations.length ||
      new Set(assigned).size !== assigned.length ||
      new Set(facts).size !== facts.length ||
      registrations.length > 1000 ||
      assigned.length > 10000 ||
      s.publishedGames.some((g) => g.disputeId !== s.disputeId)
    )
      c.addIssue({
        code: "custom",
        message:
          "Confira grupos únicos, inscrições e atribuições sem repetição e fatos publicados desta disputa.",
      });
  });
/** Missing publication means pending, not a 0–0 fact. Existence/context of scheduled IDs is a future writer FK guard. */
export function calculateGroupPhase(input: unknown) {
  const s = groupPhaseInputSchema.parse(input),
    facts = new Map(s.publishedGames.map((g) => [g.gameId, g]));
  const groups = [...s.groups]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((group) => {
      const games = group.gameIds.flatMap((id) => {
        const fact = facts.get(id);
        return fact ? [fact] : [];
      });
      return {
        groupId: group.id,
        unpublishedGameIds: group.gameIds.filter((id) => !facts.has(id)).sort(),
        standings: calculateStandings({
          disputeId: s.disputeId,
          registrationIds: group.registrationIds,
          rules: s.rules,
          games,
        }),
      };
    });
  return {
    disputeId: s.disputeId,
    phaseId: s.phaseId,
    status: groups.some((g) => g.standings.status === "provisional")
      ? ("provisional" as const)
      : ("empty" as const),
    groups,
  };
}
