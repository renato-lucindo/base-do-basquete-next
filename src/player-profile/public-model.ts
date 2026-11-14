import {
  aggregateCareerStatistics,
  validateCareerFacts,
} from "../statistics/aggregate";
import type { StatisticsMetric } from "../statistics/metrics";
import type { ConfirmedPlayerGame } from "./participation-contract";
import type { PlayerProfilePage } from "./page-contract";

export const PROFILE_METRICS = [
  "points",
  "twoMade",
  "threeMade",
  "freeMade",
  "foulsCommitted",
] as const;
export type ProfileMetric = (typeof PROFILE_METRICS)[number];
export type PublicCareer = {
  page: PlayerProfilePage;
  games: ConfirmedPlayerGame[];
  history: PlayerProfilePage["history"];
};

export function careerStatistics(
  games: ConfirmedPlayerGame[],
  personId: string,
  mode: "per-game" | "total" = "per-game",
) {
  const facts = games.map((g) => g.fact);
  const summary = aggregateCareerStatistics(facts, personId, {
    mode,
    minimumSeconds: 1,
  });
  // The profile describes the entire selected participation, never a partial average.
  if (summary)
    for (const metric of PROFILE_METRICS) {
      const covered =
        metric === "foulsCommitted"
          ? summary.coverage.foulGames
          : summary.coverage.scoringGames;
      if (!summary.gamesPlayed || covered !== summary.gamesPlayed)
        summary.metrics[metric] = { status: "unavailable", value: null };
    }
  return summary;
}

export function chronologicalGames(games: ConfirmedPlayerGame[]) {
  return [...games].sort(
    (a, b) =>
      (b.game.date ?? "").localeCompare(a.game.date ?? "") ||
      (b.game.time ?? "").localeCompare(a.game.time ?? "") ||
      b.fact.gameId.localeCompare(a.fact.gameId),
  );
}
export function careerGroups(career: PublicCareer) {
  const groups = new Map<string, ConfirmedPlayerGame[]>();
  for (const game of career.games) {
    const key = `${game.fact.disputeId}/${game.fact.registration.registrationId}`;
    const rows = groups.get(key) ?? [];
    rows.push(game);
    groups.set(key, rows);
  }
  return career.history.map((history) => ({
    key: `${history.disputeId}/${history.registration.registrationId}`,
    history,
    games:
      groups.get(
        `${history.disputeId}/${history.registration.registrationId}`,
      ) ?? [],
  }));
}

export function validatePublicCareer(career: PublicCareer) {
  const { page, games, history } = career;
  if (
    games.length !== page.games.total ||
    history.length !== page.historyPagination.total ||
    new Set(
      history.map((h) => `${h.disputeId}/${h.registration.registrationId}`),
    ).size !== history.length
  )
    throw Error("Histórico incompleto. Atualize o perfil.");
  validateCareerFacts(
    games.map((g) => g.fact),
    page.personId,
  );
  const groups = careerGroups(career);
  if (
    groups.some(
      (g) =>
        g.games.length !== g.history.relatedGames ||
        g.games.filter((p) => p.fact.played).length !== g.history.playedGames,
    ) ||
    groups.reduce((n, g) => n + g.games.length, 0) !== games.length
  )
    throw Error("As participações publicadas mudaram. Atualize o perfil.");
  return career;
}

export const metricLabel = (metric: StatisticsMetric) =>
  metric === "foulsCommitted"
    ? "FC"
    : (
        {
          points: "PTS",
          twoMade: "2P",
          threeMade: "3P",
          freeMade: "LL",
        } as Partial<Record<StatisticsMetric, string>>
      )[metric];
