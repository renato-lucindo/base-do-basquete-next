import type { PublicStandings } from "../regulation/public-contract";
import type { CatalogGame } from "./catalog-contract";

type PublicTeamProfile = { teamId: string; registrationId: string };

export type PublicGameRow = {
  id: string;
  disputeId: string;
  number: string | null;
  home: string;
  away: string;
  homeProfile: PublicTeamProfile | null;
  awayProfile: PublicTeamProfile | null;
  published: boolean;
  date: string | null;
  time: string | null;
  venue: string | null;
  score: { home: number; away: number } | null;
  phase: string | null;
  seriesGame: number | null;
  walkover: boolean;
};

export function publicScheduleRows(
  value: PublicStandings,
  publishedGames: CatalogGame[] = [],
): PublicGameRow[] {
  const eligible = publishedGames.filter(
    (g) => g.disputeId === value.disputeId,
  );
  const publishedIds = new Set(eligible.map((g) => g.id));
  const profiles = new Map(
    eligible.flatMap((g) =>
      [g.game.home, g.game.away].map(
        (team) =>
          [
            team.registrationId,
            { teamId: team.team.id, registrationId: team.registrationId },
          ] as const,
      ),
    ),
  );
  const names = new Map(value.registrations.map((r) => [r.id, r.name]));
  const phases = new Map(
    value.definition.knockoutPhases.map((p) => [p.id, p.name]),
  );
  const assignments = new Map(
    value.definition.series.flatMap((series) =>
      series.games.map(
        (game) =>
          [
            game.gameId,
            {
              phase: phases.get(series.phaseId) ?? null,
              seriesGame: series.format === "single" ? null : game.slot,
            },
          ] as const,
      ),
    ),
  );
  return value.games.map((game) => ({
    id: game.id,
    disputeId: value.disputeId,
    number: game.number,
    home: names.get(game.homeRegistrationId) ?? "Equipe a definir",
    away: names.get(game.awayRegistrationId) ?? "Equipe a definir",
    homeProfile: profiles.get(game.homeRegistrationId) ?? null,
    awayProfile: profiles.get(game.awayRegistrationId) ?? null,
    published: publishedIds.has(game.id),
    date: game.date,
    time: game.time,
    venue: game.venue,
    score: game.score
      ? { home: game.score.homePoints, away: game.score.awayPoints }
      : null,
    phase:
      assignments.get(game.id)?.phase ??
      (game.stageKind === "knockout" ? (game.knockoutStage ?? null) : null),
    seriesGame: assignments.get(game.id)?.seriesGame ?? null,
    walkover: game.walkover,
  }));
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
const descending = (a: string | null, b: string | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : b.localeCompare(a);

export function selectPublicGames(games: PublicGameRow[], search: string) {
  const query = normalize(search.trim());
  return games
    .map((game, index) => ({ game, index }))
    .filter(({ game }) =>
      normalize(`${game.home} ${game.away} ${game.venue ?? ""}`).includes(
        query,
      ),
    )
    .sort(
      (a, b) =>
        descending(a.game.date, b.game.date) ||
        descending(a.game.time, b.game.time) ||
        a.index - b.index,
    )
    .map(({ game }) => game);
}
