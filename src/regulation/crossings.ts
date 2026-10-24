import { z } from "zod";
import { calculateGroupPhase, groupPhaseInputSchema } from "./groups";
import { resolveSeries, seriesFormatSchema, seriesInputSchema } from "./series";
import type { CompetitiveFact } from "./contract";
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
type Reference = z.infer<typeof entrantReferenceSchema>;
type Entry = {
  reference: Reference;
  status: "ready" | "pending";
  registrationId: string | null;
  needs:
    | "group_tie"
    | "group_results"
    | "series_result"
    | "upstream_conflict"
    | null;
};
type Conflict = {
  code:
    | "duplicate_entrant"
    | "opponents_changed"
    | "unresolved_entrants"
    | "invalid_sequence";
  gameIds: string[];
};
type Node = {
  id: string;
  phaseId: string;
  status: "ready" | "pending" | "complete" | "tied" | "conflict";
  home: Entry;
  away: Entry;
  result: ReturnType<typeof resolveSeries> | null;
  conflicts: Conflict[];
};
/** Pure preview only. A writer must re-read versions under locks; no games or opponents are changed here. */
export function previewCrossings(input: unknown) {
  const s = crossingsInputSchema.parse(input),
    catalog = new Map(s.series.map((n) => [n.id, n])),
    visited = new Set<string>(),
    visiting = new Set<string>(),
    order: string[] = [];
  const visit = (id: string) => {
    if (visiting.has(id))
      throw Error("Há ciclo nas referências de entrada dos confrontos.");
    if (visited.has(id)) return;
    visiting.add(id);
    const n = catalog.get(id)!;
    for (const ref of [n.home, n.away])
      if (ref.kind === "series_winner" || ref.kind === "series_loser")
        visit(ref.seriesId);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };
  [...catalog.keys()].sort().forEach(visit);
  const groupPhases = s.groupPhases
      .map(calculateGroupPhase)
      .sort((a, b) => a.phaseId.localeCompare(b.phaseId)),
    phases = new Map(groupPhases.map((p) => [p.phaseId, p])),
    nodes = new Map<string, Node>();
  const entry = (ref: Reference): Entry => {
    const ready = (registrationId: string): Entry => ({
      reference: ref,
      registrationId,
      status: "ready",
      needs: null,
    });
    const pending = (needs: Entry["needs"]): Entry => ({
      reference: ref,
      registrationId: null,
      status: "pending",
      needs,
    });
    if (ref.kind === "registration") return ready(ref.registrationId);
    if (ref.kind === "group_rank") {
      const group = phases
        .get(ref.phaseId)!
        .groups.find((g) => g.groupId === ref.groupId)!;
      if (group.unpublishedGameIds.length || group.standings.status === "empty")
        return pending("group_results");
      // Competition ranking skips positions covered by ties (1,1,3). All covered positions stay pending.
      const rows = group.standings.rows,
        row = rows[ref.position - 1];
      if (row.tied || row.position !== ref.position)
        return pending("group_tie");
      return ready(row.registrationId);
    }
    const upstream = nodes.get(ref.seriesId)!;
    if (upstream.status === "conflict") return pending("upstream_conflict");
    const winner = upstream.result?.winnerRegistrationId;
    if (upstream.status !== "complete" || !winner)
      return pending("series_result");
    return ready(
      ref.kind === "series_winner"
        ? winner
        : upstream.home.registrationId === winner
          ? upstream.away.registrationId!
          : upstream.home.registrationId!,
    );
  };
  for (const id of order) {
    const n = catalog.get(id)!,
      home = entry(n.home),
      away = entry(n.away),
      gameIds = n.games.map((g) => g.game.gameId).sort();
    const node: Node = {
      id,
      phaseId: n.phaseId,
      home,
      away,
      status: "pending",
      result: null,
      conflicts: [],
    };
    if (!home.registrationId || !away.registrationId) {
      if (n.games.length)
        node.conflicts.push({ code: "unresolved_entrants", gameIds });
    } else if (home.registrationId === away.registrationId) {
      node.conflicts.push({ code: "duplicate_entrant", gameIds });
    } else {
      const opponents = new Set([home.registrationId, away.registrationId]),
        changed = n.games.filter(
          ({ game }) =>
            !opponents.has(game.homeRegistrationId) ||
            !opponents.has(game.awayRegistrationId),
        );
      if (changed.length)
        node.conflicts.push({
          code: "opponents_changed",
          gameIds: changed.map((g) => g.game.gameId).sort(),
        });
      else {
        try {
          node.result = resolveSeries({
            disputeId: s.disputeId,
            homeRegistrationId: home.registrationId,
            awayRegistrationId: away.registrationId,
            format: n.format,
            games: n.games,
          });
          node.status = n.games.length ? node.result.status : "ready";
        } catch {
          node.conflicts.push({ code: "invalid_sequence", gameIds });
        }
      }
    }
    if (node.conflicts.length) node.status = "conflict";
    nodes.set(id, node);
  }
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
    series: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    lineage: [...facts.values()]
      .sort((a, b) => a.gameId.localeCompare(b.gameId))
      .map((g) => ({
        gameId: g.gameId,
        publicationVersion: g.publicationVersion,
        pointsSource: g.pointsSource,
      })),
  };
}
