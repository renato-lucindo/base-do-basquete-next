import { z } from "zod";
import {
  aggregateConfirmedStatistics,
  STATISTICS_METRICS,
  type StatisticsMetric,
  type StatisticsRow,
} from "./aggregate";
import { selectStatisticsFacts } from "./source";
import {
  parseBoxscoreGameScope,
  parseBoxscoreStatisticsMode,
  type BoxscoreGameScope,
  type BoxscoreStatisticsMode,
} from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-statistics-contract";
export type FilterOperator = ">=" | ">" | "<=" | "<" | "=";
export interface StatisticsQuery {
  mode: BoxscoreStatisticsMode;
  scope: BoxscoreGameScope;
  sort: StatisticsMetric | "player" | "team";
  direction: "asc" | "desc";
  search: string;
  teams: string[] | null;
  filters: {
    metric: StatisticsMetric;
    operator: FilterOperator;
    value: number;
  }[];
  page: number;
  compare: string[];
  preset: "essentials" | "all" | "custom";
  /** Remembered preference: MIN is hidden, not removed, in per-30. */
  columns: StatisticsMetric[];
}
const metricKeys = Object.keys(STATISTICS_METRICS) as StatisticsMetric[];
const isMetric = (value: string): value is StatisticsMetric =>
  Object.hasOwn(STATISTICS_METRICS, value);
const essentials: StatisticsMetric[] = [
  "games",
  "minutes",
  "points",
  "rebounds",
  "assists",
  "fieldGoalPercentage",
  "threePointPercentage",
  "freeThrowPercentage",
  "efficiency",
  "plusMinus",
];
const uuid = (s: string): string[] =>
  z.uuid().safeParse(s).success ? [s.toLowerCase()] : [];
const unique = <T>(values: T[]) => [...new Set(values)];
const operators = new Set<FilterOperator>([">=", ">", "<=", "<", "="]);
const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

/** Adapted from the portable parser; public identities are UUIDs in this implementation. */
export function parseStatisticsQuery(params: URLSearchParams): StatisticsQuery {
  const mode = parseBoxscoreStatisticsMode(params.get("mode")),
    requestedSort = params.get("sort") ?? "points",
    sort =
      requestedSort === "player" ||
      requestedSort === "team" ||
      isMetric(requestedSort)
        ? requestedSort
        : "points",
    preset =
      params.get("preset") === "all"
        ? "all"
        : params.get("preset") === "custom"
          ? "custom"
          : "essentials",
    columns = unique((params.get("columns") ?? "").split(",").filter(isMetric)),
    page = Number(params.get("page"));
  return {
    mode,
    scope: parseBoxscoreGameScope(params.get("scope")),
    sort: mode === "per-30" && sort === "minutes" ? "points" : sort,
    direction: params.get("dir") === "asc" ? "asc" : "desc",
    search: (params.get("q") ?? "").trim().slice(0, 80),
    teams: params.has("team")
      ? unique(params.getAll("team").flatMap(uuid)).slice(0, 32)
      : null,
    filters: (params.get("filters") ?? "")
      .split(";")
      .slice(0, 5)
      .flatMap((entry) => {
        const [metric, operator, raw, ...rest] = entry.split(":"),
          value = Number(raw);
        return metric &&
          isMetric(metric) &&
          operators.has(operator as FilterOperator) &&
          raw?.trim() &&
          !rest.length &&
          Number.isFinite(value) &&
          !(mode === "per-30" && metric === "minutes")
          ? [{ metric, operator: operator as FilterOperator, value }]
          : [];
      }),
    page:
      /^[1-9][0-9]*$/u.test(params.get("page") ?? "") &&
      Number.isSafeInteger(page)
        ? page
        : 1,
    compare: unique(
      (params.get("compare") ?? "").split(",").flatMap(uuid),
    ).slice(0, 2),
    preset,
    columns: columns.length
      ? columns
      : preset === "all"
        ? [...metricKeys]
        : [...essentials],
  };
}
export function serializeStatisticsQuery(
  query: StatisticsQuery,
): URLSearchParams {
  const p = new URLSearchParams({
    mode: query.mode,
    scope: query.scope,
    sort: query.sort,
    dir: query.direction,
    page: String(query.page),
    preset: query.preset,
    columns: query.columns.join(","),
  });
  if (query.search) p.set("q", query.search);
  if (query.teams !== null)
    for (const id of query.teams.length ? query.teams : [""])
      p.append("team", id);
  if (query.filters.length)
    p.set(
      "filters",
      query.filters
        .map((f) => `${f.metric}:${f.operator}:${f.value}`)
        .join(";"),
    );
  if (query.compare.length) p.set("compare", query.compare.join(","));
  return p;
}
export function updateStatisticsQuery(
  query: StatisticsQuery,
  patch: Partial<StatisticsQuery>,
) {
  return parseStatisticsQuery(
    serializeStatisticsQuery({
      ...query,
      ...patch,
      page:
        (patch.mode !== undefined && patch.mode !== query.mode) ||
        (patch.scope !== undefined && patch.scope !== query.scope)
          ? 1
          : (patch.page ?? query.page),
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
    selected = selectStatisticsFacts(input, query.scope),
    all = aggregateConfirmedStatistics(selected.facts, {
      mode: query.mode,
      minimumSeconds: selected.minimumSeconds,
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
  const totalPages = Math.max(1, Math.ceil(sorted.length / 20)),
    page = Math.min(query.page, totalPages);
  return {
    kind: "confirmed-statistics-page-v1" as const,
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
    rows: sorted.slice((page - 1) * 20, page * 20),
    compared: query.compare.flatMap((id) =>
      all.filter((r) => r.personId === id),
    ),
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
  a: StatisticsRow,
  b: StatisticsRow,
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
