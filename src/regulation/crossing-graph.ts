import type { z } from "zod";
import type { entrantReferenceSchema } from "./crossings";
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
    | "unresolved_results"
    | "invalid_sequence";
  gameIds: string[];
};
type Result = {
  status: "complete" | "pending" | "tied";
  winnerRegistrationId: string | null;
};
type Node<R extends Result> = {
  id: string;
  phaseId: string;
  home: Entry;
  away: Entry;
  status: "ready" | "pending" | "complete" | "tied" | "conflict";
  result: R | null;
  conflicts: Conflict[];
};
export type GraphSeries = {
  id: string;
  phaseId: string;
  home: Reference;
  away: Reference;
  hasResults: boolean;
  blockingGameIds?: string[];
  games: {
    gameId: string;
    homeRegistrationId: string;
    awayRegistrationId: string;
  }[];
};
export type GraphGroupPhase = {
  phaseId: string;
  groups: {
    groupId: string;
    pendingGameIds: string[];
    standings: {
      status: "empty" | "provisional";
      rows: {
        registrationId: string;
        tied: boolean;
        position: number | null;
      }[];
    };
  }[];
};
/** Internal typed composition seam. Public entry points validate the catalog and context before calling it. */
export function previewEntrantGraph<R extends Result>(
  catalogSeries: GraphSeries[],
  groupPhases: GraphGroupPhase[],
  resolve: (id: string, home: string, away: string) => R,
) {
  const catalog = new Map(catalogSeries.map((n) => [n.id, n])),
    visited = new Set<string>(),
    visiting = new Set<string>(),
    order: string[] = [];
  const visit = (id: string) => {
    if (visiting.has(id))
      throw Error("Há ciclo nas referências de entrada dos confrontos.");
    if (visited.has(id)) return;
    const n = catalog.get(id);
    if (!n) throw Error("Referência a confronto inexistente.");
    visiting.add(id);
    for (const ref of [n.home, n.away])
      if (ref.kind === "series_winner" || ref.kind === "series_loser")
        visit(ref.seriesId);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };
  [...catalog.keys()].sort().forEach(visit);
  const phases = new Map(groupPhases.map((p) => [p.phaseId, p])),
    nodes = new Map<string, Node<R>>();
  const entry = (ref: Reference): Entry => {
    const ready = (registrationId: string): Entry => ({
        reference: ref,
        registrationId,
        status: "ready",
        needs: null,
      }),
      pending = (needs: Entry["needs"]): Entry => ({
        reference: ref,
        registrationId: null,
        status: "pending",
        needs,
      });
    if (ref.kind === "registration") return ready(ref.registrationId);
    if (ref.kind === "group_rank") {
      const group = phases
        .get(ref.phaseId)
        ?.groups.find((g) => g.groupId === ref.groupId);
      if (!group) throw Error("Referência a grupo inexistente.");
      if (group.pendingGameIds.length || group.standings.status === "empty")
        return pending("group_results");
      const row = group.standings.rows[ref.position - 1];
      if (!row || row.tied || row.position !== ref.position)
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
      gameIds = n.games.map((g) => g.gameId).sort(),
      node: Node<R> = {
        id,
        phaseId: n.phaseId,
        home,
        away,
        status: "pending",
        result: null,
        conflicts: [],
      };
    if (n.blockingGameIds?.length) {
      node.conflicts.push({
        code: "unresolved_results",
        gameIds: [...n.blockingGameIds].sort(),
      });
    } else if (!home.registrationId || !away.registrationId) {
      if (n.games.length)
        node.conflicts.push({ code: "unresolved_entrants", gameIds });
    } else if (home.registrationId === away.registrationId)
      node.conflicts.push({ code: "duplicate_entrant", gameIds });
    else {
      const opponents = new Set([home.registrationId, away.registrationId]),
        changed = n.games.filter(
          (game) =>
            !opponents.has(game.homeRegistrationId) ||
            !opponents.has(game.awayRegistrationId),
        );
      if (changed.length)
        node.conflicts.push({
          code: "opponents_changed",
          gameIds: changed.map((g) => g.gameId).sort(),
        });
      else
        try {
          node.result = resolve(id, home.registrationId, away.registrationId);
          node.status = n.hasResults ? node.result.status : "ready";
        } catch {
          node.conflicts.push({ code: "invalid_sequence", gameIds });
        }
    }
    if (node.conflicts.length) node.status = "conflict";
    nodes.set(id, node);
  }
  return [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
}
