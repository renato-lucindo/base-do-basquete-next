import { rankSortedRows } from "./ranking";
import {
  aggregateConfirmedStatistics,
  aggregateComparedStatistics,
  type StatisticsRow,
} from "./aggregate";
import { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
import { selectStatisticsFacts } from "./source";
import type { ConfirmedPlayerFact } from "./confirmed-facts";
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
const foulHighlights = new Set<StatisticsMetric>([
  "foulsCommitted",
  "technicalFouls",
  "unsportsmanlikeFouls",
  "fiveFouls",
  "disqualifications",
]);
/** Table projection only. Related players count even when they did not play. */
function predominantJerseys(facts: ConfirmedPlayerFact[]) {
  const counts = new Map<string, Map<string, number>>();
  for (const fact of facts) {
    if (!fact.jersey?.trim()) continue;
    const key = `${fact.person.id}/${fact.registration.registrationId}`;
    const jerseys = counts.get(key) ?? new Map<string, number>();
    jerseys.set(fact.jersey, (jerseys.get(fact.jersey) ?? 0) + 1);
    counts.set(key, jerseys);
  }
  return new Map(
    [...counts].map(([key, jerseys]) => {
      const maximum = Math.max(...jerseys.values());
      return [
        key,
        [...jerseys]
          .filter(([, count]) => count === maximum)
          .map(([jersey]) => jersey)
          .sort(),
      ];
    }),
  );
}
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
    labels = selected.registrationLabels,
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
        ? (labels.get(r.registrationId)?.name ?? r.registrationNames[0])
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
    const lower =
      !foulHighlights.has(metric) && STATISTICS_METRICS[metric].lowerIsBetter;
    const best = covered.reduce(
      (winner, row) =>
        lower
          ? Math.min(winner, row.metrics[metric].value!)
          : Math.max(winner, row.metrics[metric].value!),
      covered[0].metrics[metric].value!,
    );
    if (foulHighlights.has(metric) && best <= 0) continue;
    leaders[metric] = covered
      .filter((r) => r.metrics[metric].value === best)
      .map(rowRef);
  }
  const ranked = rankSortedRows(sorted, value);
  const jerseys = predominantJerseys(selected.facts);
  const totalPages = Math.max(1, Math.ceil(sorted.length / query.pageSize)),
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
    pageSize: query.pageSize,
    // Opt-in metadata: legacy clients use a strict DTO with 20-row pages.
    ...(query.pageSize === 30 ? { hasBoxscore: selected.hasBoxscore } : {}),
    total: sorted.length,
    totalPages,
    rows: ranked
      .slice((page - 1) * query.pageSize, page * query.pageSize)
      .map((row) => ({
        ...row,
        registrationNames: [
          labels.get(row.registrationId)?.name ?? row.registrationNames[0],
        ],
        jerseys: jerseys.get(`${row.personId}/${row.registrationId}`) ?? [],
      })),
    compared: query.compare.flatMap((id) =>
      all
        .filter((r) => r.personId === id)
        .map((r) => ({
          ...r,
          registrationNames: [
            labels.get(r.registrationId)?.name ?? r.registrationNames[0],
          ],
        })),
    ),
    comparisonSummaries,
    comparisonStates,
    leaders,
    teams: unique(all.map((r) => r.teamId)).map((id) => ({
      id,
      names: [
        [...labels.values()]
          .filter((r) => r.teamId === id)
          .sort(
            (a, b) =>
              Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
              b.gameId.localeCompare(a.gameId) ||
              b.name.localeCompare(a.name, "pt-BR"),
          )[0].name,
      ],
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
