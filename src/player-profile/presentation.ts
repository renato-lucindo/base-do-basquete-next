import type { ConfirmedPlayerGame } from "./participation-contract";
import type { PlayerProfilePage } from "./page-contract";

export type RecordMetric = "points" | "twoMade" | "threeMade" | "freeMade";
export const RECORD_METRICS: RecordMetric[] = [
  "points",
  "twoMade",
  "threeMade",
  "freeMade",
];
export function rankCareerGames(
  games: ConfirmedPlayerGame[],
  metric: RecordMetric,
) {
  return games
    .filter((g) => g.fact.played && g.fact.scoring !== null)
    .sort(
      (a, b) =>
        b.fact.scoring![metric] - a.fact.scoring![metric] ||
        (b.game.date ?? "").localeCompare(a.game.date ?? "") ||
        (b.game.time ?? "").localeCompare(a.game.time ?? "") ||
        b.fact.gameId.localeCompare(a.fact.gameId),
    )
    .slice(0, 5);
}
export function teamTrajectory(history: PlayerProfilePage["history"]) {
  const passages: {
    team: PlayerProfilePage["history"][number]["registration"]["team"];
    firstYear: number;
    lastYear: number;
    history: PlayerProfilePage["history"][number];
  }[] = [];
  for (const h of [...history].sort(
    (a, b) =>
      a.context.year - b.context.year ||
      (a.firstGameDate ?? "9999").localeCompare(b.firstGameDate ?? "9999") ||
      a.registration.registrationId.localeCompare(
        b.registration.registrationId,
      ),
  )) {
    const previous = passages.at(-1);
    if (previous?.team.id === h.registration.team.id) {
      previous.lastYear = h.context.year;
      previous.history = h;
      previous.team = h.registration.team;
    } else
      passages.push({
        team: h.registration.team,
        firstYear: h.context.year,
        lastYear: h.context.year,
        history: h,
      });
  }
  return passages;
}
export function groupPlacements(awards: PlayerProfilePage["teamPlacements"]) {
  const groups: {
    position: number;
    competitions: {
      id: string;
      name: string;
      editions: PlayerProfilePage["teamPlacements"];
    }[];
  }[] = [];
  for (const award of [...awards].sort(
    (a, b) => a.position - b.position || b.context.year - a.context.year,
  )) {
    let group = groups.find((g) => g.position === award.position);
    if (!group) {
      group = { position: award.position, competitions: [] };
      groups.push(group);
    }
    let competition = group.competitions.find(
      (c) => c.id === award.context.championshipId,
    );
    if (!competition) {
      competition = {
        id: award.context.championshipId,
        name: award.context.name,
        editions: [],
      };
      group.competitions.push(competition);
    }
    competition.editions.push(award);
  }
  return groups;
}
export function groupHonors(awards: PlayerProfilePage["honors"]) {
  const groups: {
    id: string;
    title: string;
    name: string;
    editions: PlayerProfilePage["honors"];
  }[] = [];
  for (const award of [...awards].sort(
    (a, b) => b.context.year - a.context.year,
  )) {
    const id = JSON.stringify([
      award.context.championshipId,
      award.honor.title,
    ]);
    let group = groups.find((g) => g.id === id);
    if (!group) {
      group = {
        id,
        title: award.honor.title,
        name: award.context.name,
        editions: [],
      };
      groups.push(group);
    }
    group.editions.push(award);
  }
  return groups;
}
export const profileDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${value}T12:00:00Z`),
      )
    : "—";
