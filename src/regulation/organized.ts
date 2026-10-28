import { z } from "zod";
import { crossingsInputSchema, entrantReferenceSchema } from "./crossings";
import { groupPhaseInputSchema } from "./groups";
import { occurrencesInputSchema, previewOccurrences } from "./occurrences";
import { calculateOutcomeStandings } from "./outcome-standings";
import { resolveOutcomeSeries } from "./outcome-series";
import { previewEntrantGraph } from "./crossing-graph";
import { seriesFormatSchema } from "./series";
import type { OutcomeGame } from "./outcome";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const organizedInputSchema = z
  .object({
    context: occurrencesInputSchema,
    groupPhases: z
      .array(
        z
          .object({
            phaseId: uuid,
            rules: groupPhaseInputSchema.shape.rules,
            groups: groupPhaseInputSchema.shape.groups,
          })
          .strict(),
      )
      .max(64),
    series: z
      .array(
        z
          .object({
            id: uuid,
            phaseId: uuid,
            format: seriesFormatSchema,
            home: entrantReferenceSchema,
            away: entrantReferenceSchema,
            games: z
              .array(
                z
                  .object({
                    slot: z.number().int().min(1).max(7),
                    gameId: uuid,
                  })
                  .strict(),
              )
              .max(7),
          })
          .strict(),
      )
      .max(256),
  })
  .strict()
  .superRefine((s, c) => {
    const ctx = s.context,
      games = new Map(ctx.games.map((g) => [g.id, g])),
      assigned = new Set<string>();
    const issue = () =>
      c.addIssue({
        code: "custom",
        message:
          "Confira referências e atribuições únicas dos jogos nesta disputa.",
      });
    // Validate the same reference catalog without converting any award into a played fact.
    const structural = crossingsInputSchema.safeParse({
      disputeId: ctx.disputeId,
      regulationVersion: ctx.regulationVersion,
      registrationIds: ctx.registrationIds,
      groupPhases: s.groupPhases.map((p) => ({
        ...p,
        disputeId: ctx.disputeId,
        publishedGames: [],
      })),
      series: s.series.map((n) => ({ ...n, games: [] })),
    });
    if (!structural.success) issue();
    const assign = (id: string) => {
      if (!games.has(id) || assigned.has(id)) issue();
      assigned.add(id);
    };
    for (const p of s.groupPhases)
      for (const g of p.groups) {
        const members = new Set(g.registrationIds);
        for (const id of g.gameIds) {
          assign(id);
          const game = games.get(id);
          if (
            game &&
            (!members.has(game.homeRegistrationId) ||
              !members.has(game.awayRegistrationId))
          )
            issue();
        }
      }
    for (const n of s.series) {
      const maximum = {
        single: 1,
        two_leg: 2,
        best_of_3: 3,
        best_of_5: 5,
        best_of_7: 7,
      }[n.format];
      if (
        new Set(n.games.map((g) => g.slot)).size !== n.games.length ||
        n.games.some((g) => g.slot > maximum)
      )
        issue();
      n.games.forEach((g) => assign(g.gameId));
    }
    if (assigned.size > 10000) issue();
  });
export type OrganizedInput = z.infer<typeof organizedInputSchema>;
/** Administrative/private preview. No persistence or public confirmation is implied. */
export function previewOrganizedCompetition(input: unknown) {
  const s = organizedInputSchema.parse(input),
    p = previewOccurrences(s.context),
    games = new Map(p.games.map((g) => [g.gameId, g])),
    catalog = new Map(s.series.map((n) => [n.id, n]));
  const outcome = (gameId: string): OutcomeGame | null => {
    const game = games.get(gameId)!;
    return game.outcome
      ? {
          gameId,
          disputeId: s.context.disputeId,
          homeRegistrationId: game.homeRegistrationId,
          awayRegistrationId: game.awayRegistrationId,
          outcome: game.outcome,
        }
      : null;
  };
  const groupPhases = s.groupPhases
    .map((phase) => ({
      phaseId: phase.phaseId,
      groups: [...phase.groups]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((g) => ({
          groupId: g.id,
          pendingGameIds: g.gameIds
            .filter((id) =>
              ["pending", "conflict"].includes(games.get(id)!.state),
            )
            .sort(),
          excludedGameIds: g.gameIds
            .filter((id) => games.get(id)!.state === "excluded")
            .sort(),
          standings: calculateOutcomeStandings({
            disputeId: s.context.disputeId,
            registrationIds: g.registrationIds,
            rules: phase.rules,
            outcomes: g.gameIds.flatMap((id) => {
              const o = outcome(id);
              return o ? [o] : [];
            }),
          }),
        })),
    }))
    .sort((a, b) => a.phaseId.localeCompare(b.phaseId));
  const series = previewEntrantGraph(
    s.series.map((n) => ({
      ...n,
      hasResults: n.games.some((g) => outcome(g.gameId) !== null),
      blockingGameIds: n.games
        .filter((g) => games.get(g.gameId)!.state === "conflict")
        .map((g) => g.gameId),
      games: n.games.map(({ gameId }) => {
        const g = games.get(gameId)!;
        return {
          gameId,
          homeRegistrationId: g.homeRegistrationId,
          awayRegistrationId: g.awayRegistrationId,
        };
      }),
    })),
    groupPhases,
    (id, homeRegistrationId, awayRegistrationId) => {
      const n = catalog.get(id)!;
      return resolveOutcomeSeries({
        disputeId: s.context.disputeId,
        homeRegistrationId,
        awayRegistrationId,
        format: n.format,
        games: n.games.flatMap(({ slot, gameId }) => {
          const game = outcome(gameId);
          return game ? [{ slot, game }] : [];
        }),
      });
    },
  );
  return {
    algorithmVersion: "organized-v1" as const,
    status: "preview" as const,
    disputeId: s.context.disputeId,
    regulationVersion: s.context.regulationVersion,
    groupPhases,
    series,
    games: p.games,
    lineage: p.lineage,
  };
}
