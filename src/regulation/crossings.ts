import { z } from "zod";
import { calculateGroupPhase, groupPhaseInputSchema } from "./groups";
import { resolveSeries, seriesFormatSchema, seriesInputSchema } from "./series";
import type { CompetitiveFact } from "./contract";
import { previewEntrantGraph } from "./crossing-graph";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const entrantReferenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("registration"), registrationId: uuid }).strict(),
  z
    .object({
      kind: z.literal("group_rank"),
      phaseId: uuid,
      groupId: uuid,
      position: z.number().int().min(1).max(1000),
    })
    .strict(),
  z.object({ kind: z.literal("series_winner"), seriesId: uuid }).strict(),
  z.object({ kind: z.literal("series_loser"), seriesId: uuid }).strict(),
]);
const seriesNodeSchema = z
  .object({
    id: uuid,
    phaseId: uuid,
    format: seriesFormatSchema,
    home: entrantReferenceSchema,
    away: entrantReferenceSchema,
    games: seriesInputSchema.shape.games,
  })
  .strict();
export const crossingsInputSchema = z
  .object({
    disputeId: uuid,
    regulationVersion: z.number().int().min(1).max(2147483647),
    registrationIds: z.array(uuid).max(1000),
    groupPhases: z.array(groupPhaseInputSchema).max(64),
    series: z.array(seriesNodeSchema).max(256),
  })
  .strict()
  .superRefine((s, c) => {
    const registrations = new Set(s.registrationIds),
      phases = new Map(s.groupPhases.map((p) => [p.phaseId, p])),
      series = new Map(s.series.map((n) => [n.id, n])),
      assigned = new Set<string>(),
      facts = new Map<string, string>();
    const issue = () =>
      c.addIssue({
        code: "custom",
        message:
          "Confira referências existentes, posições, versões, inscrições e atribuições únicas desta disputa.",
      });
    if (
      registrations.size !== s.registrationIds.length ||
      phases.size !== s.groupPhases.length ||
      series.size !== s.series.length
    )
      issue();
    const assign = (id: string) => {
      if (assigned.has(id)) issue();
      assigned.add(id);
    };
    let factCount = 0,
      groupCount = 0;
    const fact = (g: CompetitiveFact) => {
      factCount++;
      const encoded = JSON.stringify(g),
        previous = facts.get(g.gameId);
      if (
        g.disputeId !== s.disputeId ||
        !registrations.has(g.homeRegistrationId) ||
        !registrations.has(g.awayRegistrationId) ||
        (previous && previous !== encoded)
      )
        issue();
      facts.set(g.gameId, encoded);
    };
    for (const p of s.groupPhases) {
      if (p.disputeId !== s.disputeId) issue();
      groupCount += p.groups.length;
      for (const g of p.groups) {
        if (g.registrationIds.some((id) => !registrations.has(id))) issue();
        g.gameIds.forEach(assign);
      }
      p.publishedGames.forEach(fact);
    }
    for (const n of s.series) {
      if (phases.has(n.phaseId)) issue();
      for (const ref of [n.home, n.away]) {
        if (ref.kind === "registration") {
          if (!registrations.has(ref.registrationId)) issue();
        } else if (ref.kind === "group_rank") {
          const group = phases
            .get(ref.phaseId)
            ?.groups.find((g) => g.id === ref.groupId);
          if (!group || ref.position > group.registrationIds.length) issue();
        } else if (!series.has(ref.seriesId)) issue();
      }
      const slots = new Set(n.games.map((g) => g.slot)),
        maximum = {
          single: 1,
          two_leg: 2,
          best_of_3: 3,
          best_of_5: 5,
          best_of_7: 7,
        }[n.format];
      if (
        slots.size !== n.games.length ||
        n.games.some((g) => g.slot > maximum)
      )
        issue();
      for (const g of n.games) {
        assign(g.game.gameId);
        fact(g.game);
      }
    }
    if (assigned.size > 10000 || factCount > 10000 || groupCount > 1000)
      issue();
  });
export type CrossingsInput = z.infer<typeof crossingsInputSchema>;
/** Pure preview only. A writer must re-read versions under locks; no games or opponents are changed here. */
export function previewCrossings(input: unknown) {
  const s = crossingsInputSchema.parse(input),
    groupPhases = s.groupPhases
      .map(calculateGroupPhase)
      .sort((a, b) => a.phaseId.localeCompare(b.phaseId)),
    catalog = new Map(s.series.map((n) => [n.id, n])),
    series = previewEntrantGraph(
      s.series.map((n) => ({
        ...n,
        hasResults: n.games.length > 0,
        games: n.games.map(({ game }) => ({
          gameId: game.gameId,
          homeRegistrationId: game.homeRegistrationId,
          awayRegistrationId: game.awayRegistrationId,
        })),
      })),
      groupPhases.map((p) => ({
        ...p,
        groups: p.groups.map((g) => ({
          ...g,
          pendingGameIds: g.unpublishedGameIds,
        })),
      })),
      (id, homeRegistrationId, awayRegistrationId) => {
        const n = catalog.get(id)!;
        return resolveSeries({
          disputeId: s.disputeId,
          homeRegistrationId,
          awayRegistrationId,
          format: n.format,
          games: n.games,
        });
      },
    );
  const facts = new Map<string, CompetitiveFact>();
  for (const p of s.groupPhases) {
    const assigned = new Set(p.groups.flatMap((g) => g.gameIds));
    p.publishedGames
      .filter((g) => assigned.has(g.gameId))
      .forEach((g) => facts.set(g.gameId, g));
  }
  s.series.forEach((n) =>
    n.games.forEach(({ game }) => facts.set(game.gameId, game)),
  );
  return {
    algorithmVersion: "crossings-v1" as const,
    status: "preview" as const,
    disputeId: s.disputeId,
    regulationVersion: s.regulationVersion,
    groupPhases,
    series,
    lineage: [...facts.values()]
      .sort((a, b) => a.gameId.localeCompare(b.gameId))
      .map((g) => ({
        gameId: g.gameId,
        publicationVersion: g.publicationVersion,
        pointsSource: g.pointsSource,
      })),
  };
}
