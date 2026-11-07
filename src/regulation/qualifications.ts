import { z } from "zod";

export const qualificationCriterionSchema = z.enum([
  "league_points_per_game",
  "difference_per_game",
  "points_for_per_game",
  "wins_per_game",
  "league_points",
  "difference",
  "points_for",
  "wins",
]);
export const qualificationPoolSchema = z
  .object({
    id: z.uuid(),
    phaseId: z.uuid(),
    size: z.number().int().min(1).max(1000).optional(),
    directPerGroup: z.number().int().min(0).max(1000),
    extras: z
      .array(
        z
          .object({
            position: z.number().int().min(1).max(1000),
            count: z.number().int().min(1).max(1000),
          })
          .strict(),
      )
      .max(32),
    comparison: z
      .array(qualificationCriterionSchema)
      .min(1)
      .max(8)
      .refine((v) => new Set(v).size === v.length),
    manualOrder: z.array(z.uuid().nullable()).max(1000).optional(),
  })
  .strict();
export type QualificationPool = z.infer<typeof qualificationPoolSchema>;
type Row = {
  registrationId: string;
  position: number | null;
  tied: boolean;
  games: number;
  leaguePoints: number;
  difference: number | null;
  pointsFor: number | null;
  wins?: number;
};
export type QualificationGroup = {
  groupId: string;
  pendingGameIds: string[];
  qualificationReady?: boolean;
  standings: { status: string; rows: Row[] };
};

/** Only sporting ordering is calculated here; UUIDs are never a tie breaker. */
export function resolveQualifications(
  input: unknown,
  groups: QualificationGroup[],
  registrationIds?: string[],
) {
  const pool = qualificationPoolSchema.parse(input),
    expected =
      pool.size ??
      pool.directPerGroup * groups.length +
        pool.extras.reduce((n, e) => n + e.count, 0),
    allowed = new Set(
      registrationIds ??
        groups.flatMap((g) => g.standings.rows.map((r) => r.registrationId)),
    );
  const pending = (needs: "group_results" | "group_tie") => ({
    status: "pending" as const,
    registrationIds: [] as string[],
    manual: false,
    needs,
  });
  if (pool.manualOrder?.length) {
    if (
      pool.manualOrder.length !== expected ||
      new Set(pool.manualOrder).size !== expected ||
      pool.manualOrder.some((id) => !id || !allowed.has(id))
    )
      return pending("group_results");
    return {
      status: "ready" as const,
      registrationIds: pool.manualOrder.filter(
        (id): id is string => id !== null,
      ),
      manual: true,
      needs: null,
    };
  }
  if (
    !groups.length ||
    groups.some(
      (g) =>
        g.qualificationReady === false ||
        g.pendingGameIds.length ||
        g.standings.status === "empty",
    )
  )
    return pending("group_results");
  const metric = (
    row: Row,
    criterion: QualificationPool["comparison"][number],
  ): [bigint, bigint] | null => {
    const average = criterion.endsWith("_per_game"),
      value = criterion.startsWith("league_points")
        ? row.leaguePoints
        : criterion.startsWith("difference")
          ? row.difference
          : criterion.startsWith("points_for")
            ? row.pointsFor
            : row.wins;
    if (!row.games || value == null || !Number.isSafeInteger(value))
      return null;
    return [BigInt(value), BigInt(average ? row.games : 1)];
  };
  const compare = (a: Row, b: Row) => {
    for (const criterion of pool.comparison) {
      const av = metric(a, criterion),
        bv = metric(b, criterion);
      if (!av || !bv) return 0;
      const delta = av[0] * bv[1] - bv[0] * av[1];
      if (delta) return delta > 0 ? -1 : 1;
    }
    return 0;
  };
  const result: Row[] = [];
  const addPosition = (position: number, count: number) => {
    const candidates = groups.flatMap((g) =>
      g.standings.rows.filter((r) => r.position === position && !r.tied),
    );
    if (candidates.length < count || candidates.some((r) => !r.games))
      return false;
    candidates.sort(compare);
    // Ties within the selected seeds also need a manual order: do not fabricate crossings.
    if (
      candidates.some(
        (r, i) => i > 0 && i <= count && compare(candidates[i - 1], r) === 0,
      )
    )
      return false;
    result.push(...candidates.slice(0, count));
    return true;
  };
  for (let position = 1; position <= pool.directPerGroup; position++)
    if (!addPosition(position, groups.length)) return pending("group_tie");
  for (const extra of pool.extras)
    if (!addPosition(extra.position, extra.count)) return pending("group_tie");
  const ids = result.map((r) => r.registrationId);
  if (ids.length !== expected || new Set(ids).size !== ids.length)
    return pending("group_results");
  return {
    status: "ready" as const,
    registrationIds: ids,
    manual: false,
    needs: null,
  };
}
