import type { PublicResult } from "../publication/pdf-contract";
import { normalizeParsedConfirmedGame } from "../statistics/confirmed-facts";
import {
  aggregateConfirmedStatistics,
  type MetricCell,
} from "../statistics/aggregate";
import { TEAM_METRIC_KEYS, type TeamMetric } from "./metrics";

export type TeamAppearance = { snapshot: PublicResult; side: "home" | "away" };
type Observation = Partial<Record<TeamMetric, number>>;
const unknown = (): MetricCell => ({ status: "unavailable", value: null });
const available = (value: number): MetricCell => ({
  status: "available",
  value: Object.is(value, -0) ? 0 : value,
});

/** Only complete published observations; never use a private roster or partial player totals. */
function observe({ snapshot: g, side }: TeamAppearance): Observation {
  const team = g.facts.teams[side],
    players = g.facts.players.filter((p) => p.side === side);
  const sum = (key: "two" | "three" | "free") =>
    players.reduce((n, p) => n + p[key], 0);
  const result: Observation = {
    games: 1,
    points: team.points,
    pointsPerGame: team.points,
    pointsAgainst: g.facts.teams[side === "home" ? "away" : "home"].points,
    twoMade: sum("two"),
    threeMade: sum("three"),
    freeMade: sum("free"),
  };
  result.difference = result.points! - result.pointsAgainst!;
  if ("freeTaken" in team) {
    result.freeMade = team.freeMade;
    result.freeThrowsMade = team.freeMade;
    result.freeThrowsAttempted = team.freeTaken;
    const rows = players.filter((p) => "fouls" in p);
    result.foulsCommitted = rows.reduce(
      (n, p) => n + ("fouls" in p ? p.fouls : 0),
      0,
    );
    const collective = team.teamStatistics;
    if (collective) {
      result.technicalFouls = collective.technicalFouls;
      if (collective.disqualifications !== null)
        result.disqualifications = collective.disqualifications;
      if (collective.foulsReceived !== null)
        result.foulsReceived = collective.foulsReceived;
    }
    result.unsportsmanlikeFouls = rows.reduce(
      (n, p) => n + ("unsportsmanlike" in p ? p.unsportsmanlike : 0),
      0,
    );
    result.fiveFouls = rows.filter(
      (p) => "status" in p && p.status === "excluded",
    ).length;
  } else {
    // The public PDF contract contains the entire related roster and enforces
    // coverage for every player. Reuse the player calculator for additive facts.
    const facts = normalizeParsedConfirmedGame(g).filter(
      (p) =>
        p.registration.registrationId === g.game[side].registrationId &&
        p.played,
    );
    const rows = aggregateConfirmedStatistics(facts, {
      mode: "total",
      minimumSeconds: 600,
      presentation: "public-leaderboard",
    });
    for (const metric of [
      "assists",
      "steals",
      "blocks",
      "foulsCommitted",
      "foulsReceived",
      "fieldGoalsMade",
      "fieldGoalsAttempted",
      "threePointersMade",
      "threePointersAttempted",
      "freeThrowsMade",
      "freeThrowsAttempted",
    ] as const) {
      if (
        rows.length &&
        rows.every((r) => r.metrics[metric].status === "available")
      )
        result[metric] = rows.reduce((n, r) => n + r.metrics[metric].value!, 0);
    }
  }
  // MIN and +/- are not additive team measures. REB/RO/RD, ER and EF need
  // uncredited collective events absent from these public snapshots. PP% has
  // no meaningful collective equivalent. Keep these cells unavailable.
  return result;
}

export function aggregateTeamStatistics(
  appearances: TeamAppearance[],
  mode: "total" | "per-game",
  sheetOnly: boolean,
  uniform = false,
) {
  const observations = appearances.map(observe);
  const metricCoverage = Object.fromEntries(
    TEAM_METRIC_KEYS.map((key) => [
      key,
      observations.filter((o) => o[key] !== undefined).length,
    ]),
  ) as Record<TeamMetric, number>;
  const ratios = {
    fieldGoalPercentage: ["fieldGoalsMade", "fieldGoalsAttempted"],
    threePointPercentage: ["threePointersMade", "threePointersAttempted"],
    freeThrowPercentage: ["freeThrowsMade", "freeThrowsAttempted"],
  } as const;
  const statistics = Object.fromEntries(
    TEAM_METRIC_KEYS.map((key): [TeamMetric, MetricCell] => {
      if (key in ratios) {
        const [made, attempted] = ratios[key as keyof typeof ratios];
        const covered = observations.filter(
          (o) => o[made] !== undefined && o[attempted] !== undefined,
        );
        metricCoverage[key] = covered.length;
        const attempts = covered.reduce((n, o) => n + o[attempted]!, 0);
        return [
          key,
          covered.length === observations.length && attempts > 0
            ? available(
                (100 * covered.reduce((n, o) => n + o[made]!, 0)) / attempts,
              )
            : unknown(),
        ];
      }
      if (!observations.length || metricCoverage[key] !== observations.length)
        return [key, unknown()];
      const total = observations.reduce((n, o) => n + o[key]!, 0);
      const scale =
        key === "games" ||
        (!uniform &&
          ((!sheetOnly && key === "points") ||
            key === "fiveFouls" ||
            (!sheetOnly && key === "disqualifications")))
          ? 1
          : key === "pointsPerGame" || mode === "per-game"
            ? observations.length
            : 1;
      return [key, available(total / scale)];
    }),
  ) as Record<TeamMetric, MetricCell>;
  return { statistics, metricCoverage };
}
