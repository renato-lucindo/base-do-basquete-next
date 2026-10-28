import {
  parseStatisticsQuery,
  STATISTICS_COLUMN_PRESETS,
  type StatisticsQuery,
} from "./query-contract";

/** The simple table always shows counts and PTS/J together, over all published games. */
export function simpleStatisticsQuery(
  params: URLSearchParams,
): StatisticsQuery {
  const q = parseStatisticsQuery(params);
  const columns = [...STATISTICS_COLUMN_PRESETS.simple];
  return {
    ...q,
    mode: "total",
    dataset: "all",
    scope: params.has("scope") ? q.scope : "all",
    preset: "simple",
    columns,
    sort:
      q.sort === "player" || q.sort === "team" || columns.includes(q.sort)
        ? q.sort
        : "points",
    filters: q.filters.filter((f) => columns.includes(f.metric)),
    compare: [],
  };
}
