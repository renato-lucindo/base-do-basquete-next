import { z } from "zod";
import { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
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
  preset: "essentials" | "simple" | "all" | "custom";
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
export const STATISTICS_COLUMN_PRESETS: Record<
  "essentials" | "simple" | "all",
  StatisticsMetric[]
> = {
  essentials,
  simple: [
    "games",
    "points",
    "twoMade",
    "threeMade",
    "freeMade",
    "foulsCommitted",
    "disqualifications",
  ],
  all: metricKeys,
};
const uuid = (s: string): string[] =>
  z.uuid().safeParse(s).success ? [s.toLowerCase()] : [];
const unique = <T>(values: T[]) => [...new Set(values)];
const operators = new Set<FilterOperator>([">=", ">", "<=", "<", "="]);
export const normalizeStatisticsSearch = (v: string) =>
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
      params.get("preset") === "simple"
        ? "simple"
        : params.get("preset") === "all"
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
      : [
          ...STATISTICS_COLUMN_PRESETS[
            preset === "custom" ? "essentials" : preset
          ],
        ],
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
