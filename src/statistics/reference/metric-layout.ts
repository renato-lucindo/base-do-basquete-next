import type { StatisticsPage } from "../page-contract";
import type { StatisticsMetric } from "../metrics";

/** The presentation reserve uses the same observed sample as the projection. */
export function metricSampleSize(
  row: StatisticsPage["rows"][number],
  metric: StatisticsMetric,
) {
  if (["twoMade", "threeMade", "freeMade", "points"].includes(metric))
    return row.coverage.scoringGames;
  if (metric === "foulsCommitted") return row.coverage.foulGames;
  if (metric === "foulsReceived") return row.coverage.foulsReceivedGames;
  if (["technicalFouls", "unsportsmanlikeFouls"].includes(metric))
    return row.coverage.disciplineGames;
  if (metric === "plusMinus") return row.coverage.plusMinusGames;
  return row.coverage.advancedGames;
}
