import type { PublicStandings } from "./public-contract";
import { seriesDependencyOrder } from "./crossing-graph";

type Definition = PublicStandings["definition"]["series"][number];
type Node = PublicStandings["projection"]["series"][number];
export const bracketFormats = {
  single: { label: "Jogo único", description: "Jogo único", games: 1 },
  two_leg: { label: "Ida e volta", description: "Ida e volta", games: 2 },
  best_of_3: { label: "MD3", description: "Melhor de três", games: 3 },
  best_of_5: { label: "MD5", description: "Melhor de cinco", games: 5 },
  best_of_7: { label: "MD7", description: "Melhor de sete", games: 7 },
} as const;
export function standingsSelection(
  value: PublicStandings,
  params: URLSearchParams,
) {
  const groups = value.definition.groupPhases;
  const knockoutAvailable = value.projection.series.some(
    (s) => s.home.registrationId && s.away.registrationId,
  );
  const legacyKnockout = value.definition.knockoutPhases.some(
    (p) => p.id === params.get("fase"),
  );
  const requested = params.get("etapa");
  const stage =
    knockoutAvailable &&
    (requested === "eliminatoria" ||
      !groups.length ||
      (requested !== "classificatoria" && legacyKnockout))
      ? "eliminatoria"
      : "classificatoria";
  const phase =
    groups.find((p) => p.phaseId === params.get("fase")) ??
    groups.find((p) => p.groups.some((g) => g.id === params.get("grupo"))) ??
    groups[0];
  const group =
    phase?.groups.find((g) => g.id === params.get("grupo")) ?? phase?.groups[0];
  return { stage, phase, group, knockoutAvailable } as const;
}

export type BracketEdge = {
  from: string;
  to: string;
  kind: "series_winner" | "series_loser";
};
export type BracketCard = {
  id: string;
  name: string;
  format: Definition["format"];
  row: number;
  homeId: string | null;
  awayId: string | null;
  winnerId: string | null;
  homeReference: Definition["home"];
  awayReference: Definition["away"];
  status: Node["status"];
  slots: {
    slot: number;
    homePoints: number | null;
    awayPoints: number | null;
    winnerId: string | null;
    state: PublicStandings["games"][number]["state"];
  }[];
  total: { homePoints: number | null; awayPoints: number | null } | null;
};

/** Presentation only: no advancement, result or opponent is recalculated here. */
export function publicBracket(value: PublicStandings) {
  const definitions = new Map(value.definition.series.map((s) => [s.id, s]));
  const nodes = new Map(value.projection.series.map((s) => [s.id, s]));
  const games = new Map(value.games.map((g) => [g.id, g]));
  const phaseOrder = new Map(
    value.definition.knockoutPhases.map((p, i) => [p.id, i]),
  );
  const depths = new Map<string, number>();
  const edges: BracketEdge[] = [];
  for (const id of seriesDependencyOrder(value.definition.series)) {
    const definition = definitions.get(id)!;
    let depth = phaseOrder.get(definition.phaseId) ?? 0;
    for (const ref of [definition.home, definition.away]) {
      if (ref.kind === "series_winner" || ref.kind === "series_loser") {
        edges.push({ from: ref.seriesId, to: id, kind: ref.kind });
        depth = Math.max(depth, depths.get(ref.seriesId)! + 1);
      }
    }
    depths.set(id, depth);
  }
  const buckets = new Map<
    string,
    { phaseId: string; depth: number; definitions: Definition[] }
  >();
  for (const definition of value.definition.series) {
    const depth = depths.get(definition.id)!,
      key = `${depth}:${definition.phaseId}`;
    const bucket = buckets.get(key) ?? {
      phaseId: definition.phaseId,
      depth,
      definitions: [],
    };
    bucket.definitions.push(definition);
    buckets.set(key, bucket);
  }
  const rows = new Map<string, number>();
  const columns = [...buckets.entries()]
    .sort(
      ([, a], [, b]) =>
        a.depth - b.depth ||
        (phaseOrder.get(a.phaseId) ?? 0) - (phaseOrder.get(b.phaseId) ?? 0),
    )
    .map(([id, bucket], index) => {
      const desired = (id: string, fallback: number) => {
        const parents = edges
          .filter((e) => e.to === id)
          .map((e) => rows.get(e.from))
          .filter((n): n is number => n !== undefined);
        return parents.length
          ? parents.reduce((a, b) => a + b, 0) / parents.length
          : fallback + 0.5;
      };
      const ordered = bucket.definitions
        .map((d, i) => ({ d, i, target: desired(d.id, i) }))
        .sort((a, b) => a.target - b.target || a.i - b.i);
      let previous = -0.5;
      const cards: BracketCard[] = ordered.map(({ d, target }) => {
        const node = nodes.get(d.id)!;
        const row = Math.max(target, previous + 1);
        previous = row;
        rows.set(d.id, row);
        const slots = Array.from(
          { length: bracketFormats[d.format].games },
          (_, i) => {
            const slot = i + 1,
              gameId = d.games.find((g) => g.slot === slot)?.gameId;
            const game = gameId ? games.get(gameId) : undefined;
            const sameOpponents =
              !!game &&
              !!node.home.registrationId &&
              !!node.away.registrationId &&
              node.home.registrationId !== node.away.registrationId &&
              new Set([
                game.homeRegistrationId,
                game.awayRegistrationId,
                node.home.registrationId,
                node.away.registrationId,
              ]).size === 2;
            const counted =
              sameOpponents &&
              (game!.state === "played" || game!.state === "awarded");
            const forward =
              game?.homeRegistrationId === node.home.registrationId;
            return {
              slot,
              homePoints: counted
                ? ((forward
                    ? game!.score?.homePoints
                    : game!.score?.awayPoints) ?? null)
                : null,
              awayPoints: counted
                ? ((forward
                    ? game!.score?.awayPoints
                    : game!.score?.homePoints) ?? null)
                : null,
              winnerId: counted ? game!.winnerRegistrationId : null,
              state: game?.state ?? "pending",
            };
          },
        );
        return {
          id: d.id,
          name: d.name,
          format: d.format,
          row,
          homeId: node.home.registrationId,
          awayId: node.away.registrationId,
          homeReference: d.home,
          awayReference: d.away,
          status: node.status,
          winnerId:
            node.status === "complete"
              ? (node.result?.winnerRegistrationId ?? null)
              : null,
          slots,
          total:
            d.format === "two_leg"
              ? ((node.status !== "conflict" ? node.result?.totals : null) ?? {
                  homePoints: null,
                  awayPoints: null,
                })
              : null,
        };
      });
      return {
        id,
        index,
        name:
          value.definition.knockoutPhases.find((p) => p.id === bucket.phaseId)
            ?.name ?? "Eliminatória",
        cards,
      };
    });
  return { columns, edges, rows: Math.max(1, ...rows.values()) + 0.5 };
}
