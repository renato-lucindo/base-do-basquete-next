import type { StatisticsSource } from "../../src/statistics/source";
/** Controlled public RPC fixture, not a database/Storage integration proof. */
export function statisticsRpcBody(
  source: StatisticsSource | null,
  path: string,
  args: { p_version?: number; p_after?: string | null },
) {
  if (source === null) return null;
  const { games, ...meta } = source;
  if (path.endsWith("/get_public_statistics_head"))
    return {
      ...meta,
      kind: "confirmed-statistics-head-v1",
      gameCount: games.length,
    };
  const sorted = [...games].sort((a, b) =>
    a.snapshot.id.toLowerCase().localeCompare(b.snapshot.id.toLowerCase()),
  );
  const rest = sorted.filter(
    (g) => !args.p_after || g.snapshot.id.toLowerCase() > args.p_after,
  );
  const page = rest.slice(0, 100);
  return {
    kind: "confirmed-statistics-page-v1",
    disputeId: source.disputeId,
    version: source.version,
    after: args.p_after ?? null,
    next: rest.length > 100 ? page.at(-1)!.snapshot.id.toLowerCase() : null,
    games: page,
  };
}
