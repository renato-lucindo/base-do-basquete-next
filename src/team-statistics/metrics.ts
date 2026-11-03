import { STATISTICS_METRICS } from "../statistics/metrics";
import { STATISTICS_COLUMN_PRESETS } from "../statistics/query-contract";

export const TEAM_METRICS = {
  ...STATISTICS_METRICS,
  pointsAgainst: {
    label: "PC",
    name: "Pontos contra",
    normalizable: true,
    lowerIsBetter: true,
  },
  difference: {
    label: "SLD",
    name: "Saldo de pontos",
    normalizable: true,
    lowerIsBetter: false,
  },
} as const;
export type TeamMetric = keyof typeof TEAM_METRICS;
export const SHEET_TEAM_COLUMNS: TeamMetric[] = [
  "games",
  "points",
  "twoMade",
  "threeMade",
  "foulsCommitted",
  "foulsReceived",
  "freeThrowsAttempted",
  "freeThrowsMade",
  "freeThrowPercentage",
  "technicalFouls",
  "unsportsmanlikeFouls",
  "disqualifications",
];
export const sheetTeamMetric = (key: TeamMetric) => {
  const def = TEAM_METRICS[key];
  return { ...def, name: key === "points" ? "Pontos marcados" : def.name };
};
export const TEAM_METRIC_KEYS = Object.keys(TEAM_METRICS) as TeamMetric[];
const simple = STATISTICS_COLUMN_PRESETS.essentials.filter(
  (m) => m !== "pointsShare",
);
export const TEAM_COLUMN_PRESETS: Record<
  "essentials" | "all" | "boxscore",
  TeamMetric[]
> = {
  essentials: [...simple, "freeThrowPercentage", "pointsAgainst", "difference"],
  boxscore: [
    "games",
    "points",
    "pointsPerGame",
    "assists",
    "steals",
    "blocks",
    "fieldGoalsMade",
    "fieldGoalsAttempted",
    "fieldGoalPercentage",
    "threePointersMade",
    "threePointersAttempted",
    "threePointPercentage",
    "freeThrowsMade",
    "freeThrowsAttempted",
    "freeThrowPercentage",
  ],
  all: TEAM_METRIC_KEYS,
};
