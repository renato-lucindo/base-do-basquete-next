import {
  aggregateConfirmedStatistics,
  aggregateComparedStatistics,
  type StatisticsRow,
} from "./aggregate";
import { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
import { selectStatisticsFacts } from "./source";
import {
  parseStatisticsQuery,
  serializeStatisticsQuery,
  normalizeStatisticsSearch as normalize,
  type StatisticsQuery,
  type FilterOperator,
} from "./query-contract";
export {
  parseStatisticsQuery,
  serializeStatisticsQuery,
  updateStatisticsQuery,
  type StatisticsQuery,
} from "./query-contract";
const metricKeys = Object.keys(STATISTICS_METRICS) as StatisticsMetric[];
const unique = <T>(values: T[]) => [...new Set(values)];
function matches(value: number, operator: FilterOperator, target: number) {
  switch (operator) {
    case ">=":
      return value >= target;
    case ">":
      return value > target;
    case "<=":
      return value <= target;
    case "<":
      return value < target;
    case "=":
      return value === target;
  }
}
const rowRef = (row: StatisticsRow) => ({
  personId: row.personId,
  registrationId: row.registrationId,
});
export function buildStatisticsPage(
  input: unknown,
  requested: StatisticsQuery,
) {
  const query = parseStatisticsQuery(serializeStatisticsQuery(requested)),
    selected = selectStatisticsFacts(input, query.scope, query.dataset),
    all = aggregateConfirmedStatistics(selected.facts, {
      mode: query.mode,
      minimumSeconds: selected.minimumSeconds,
      presentation: "public-leaderboard",
    });
  const searched = all.filter(
    (r) =>
      (!query.search ||
        normalize(
          [
            ...r.names,
            ...r.nicknames.filter((v) => v !== null),
            ...r.teamNames,
            ...r.registrationNames,
          ].join(" "),
        ).includes(normalize(query.search))) &&
      (query.teams === null || query.teams.includes(r.teamId)) &&
      query.filters.every((f) => {
        const cell = r.metrics[f.metric];
        return (
          cell.status === "available" &&
          matches(cell.value, f.operator, f.value)
        );
      }),
  );
  const value = (r: StatisticsRow) =>
    query.sort === "player"
      ? r.names.join(" / ")
      : query.sort === "team"
        ? r.registrationNames.join(" / ")
        : r.metrics[query.sort].value;
  const sorted = [...searched].sort((a, b) => {
    const av = value(a),
      bv = value(b);
    const tied = () =>
      a.names.join().localeCompare(b.names.join(), "pt-BR") ||
      a.personId.localeCompare(b.personId) ||
      a.registrationId.localeCompare(b.registrationId);
    if (av === null) return bv === null ? tied() : 1;
    if (bv === null) return -1;
    const c =
      typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv, "pt-BR", { sensitivity: "base" })
        : Number(av) - Number(bv);
    return (query.direction === "asc" ? c : -c) || tied();
  });
  const leaders: Partial<
    Record<StatisticsMetric, ReturnType<typeof rowRef>[]>
  > = {};
  for (const metric of metricKeys) {
    if (query.mode === "per-30" && metric === "minutes") continue;
    const covered = searched.filter(
      (r) => r.metrics[metric].status === "available",
    );
    if (!covered.length) continue;
    const lower = STATISTICS_METRICS[metric].lowerIsBetter;
    const best = covered.reduce(
      (winner, row) =>
        lower
          ? Math.min(winner, row.metrics[metric].value!)
          : Math.max(winner, row.metrics[metric].value!),
      covered[0].metrics[metric].value!,
    );
    leaders[metric] = covered
      .filter((r) => r.metrics[metric].value === best)
      .map(rowRef);
  }
  const ranked = sorted.map((row, index) => ({
    ...row,
    rank:
      value(row) === null
        ? null
        : index > 0 && value(row) === value(sorted[index - 1])
          ? 0
          : index + 1,
  }));
  for (let i = 0, previous = 1; i < ranked.length; i++) {
    const rank = ranked[i].rank;
    if (rank === 0) ranked[i].rank = previous;
    else if (rank !== null) previous = rank;
  }
  const totalPages = Math.max(1, Math.ceil(sorted.length / 20)),
    page = Math.min(query.page, totalPages);
  const comparisonSummaries = query.compare.length
    ? aggregateComparedStatistics(selected.facts, query.compare, {
        mode: query.mode,
        minimumSeconds: selected.minimumSeconds,
        presentation: "public-leaderboard",
      })
    : [];
  const comparisonStates = Object.fromEntries(
    metricKeys.map((key) => [
      key,
      comparisonSummaries.length === 2
        ? compareStatisticsRows(
            comparisonSummaries[0],
            comparisonSummaries[1],
            key,
          )
        : { left: "unavailable" as const, right: "unavailable" as const },
    ]),
  ) as Record<StatisticsMetric, ReturnType<typeof compareStatisticsRows>>;
  return {
    kind: "confirmed-statistics-page-v1" as const,
    dataset: query.dataset,
    disputeId: selected.disputeId,
    version: selected.version,
    confirmedAt: selected.confirmedAt,
    minimumSeconds: selected.minimumSeconds,
    mode: query.mode,
    scope: query.scope,
    sort: query.sort,
    direction: query.direction,
    columns: query.columns.filter(
      (c) => query.mode !== "per-30" || c !== "minutes",
    ),
    page,
    pageSize: 20 as const,
    total: sorted.length,
    totalPages,
    rows: ranked.slice((page - 1) * 20, page * 20),
    compared: query.compare.flatMap((id) =>
      all.filter((r) => r.personId === id),
    ),
    comparisonSummaries,
    comparisonStates,
    leaders,
    teams: unique(all.map((r) => r.teamId)).map((id) => ({
      id,
      names: unique(
        all
          .filter((r) => r.teamId === id)
          .flatMap((r) => [...r.teamNames, ...r.registrationNames]),
      ),
    })),
    coverage: selected.coverage,
  };
}
export function compareStatisticsRows(
  a: Pick<StatisticsRow, "metrics">,
  b: Pick<StatisticsRow, "metrics">,
  metric: StatisticsMetric,
) {
  const av = a.metrics[metric],
    bv = b.metrics[metric];
  if (av.status !== "available" || bv.status !== "available")
    return { left: "unavailable", right: "unavailable" } as const;
  if (av.value === bv.value) return { left: "equal", right: "equal" } as const;
  return (
    STATISTICS_METRICS[metric].lowerIsBetter
      ? av.value < bv.value
      : av.value > bv.value
  )
    ? ({ left: "better", right: "worse" } as const)
    : ({ left: "worse", right: "better" } as const);
}
