import { athletes as fixtureAthletes, teams } from "./fixtures";
import {
  compareValues,
  normalizeSearch,
  type SortDirection,
} from "./adapted/table-controls";

export type Mode = "totals" | "averages";
export type Game = {
  two: number | null;
  three: number | null;
  ft: number | null;
  fouls: number | null;
  technical: number | null;
  unsportsmanlike: number | null;
  five: number | null;
  gd: number | null;
  teamPoints: number | null;
  jersey: number | string | null;
};
export type Athlete = {
  id: string;
  personId: string;
  name: string;
  team: string;
  jersey: number;
  games: Game[];
};
export const athletes = fixtureAthletes as unknown as Athlete[];
export const metricDefinitions = [
  {
    key: "games",
    field: "gamesPlayed",
    code: "j",
    label: "J",
    name: "Jogos disputados",
  },
  {
    key: "points",
    field: "points",
    code: "pts",
    label: "PTS",
    name: "Pontos totais",
  },
  {
    key: "pointsPerGame",
    field: "pointsPerGame",
    code: "ppj",
    label: "PPJ",
    name: "Pontos por jogo",
  },
  {
    key: "pointShare",
    field: "pointShare",
    code: "pp",
    label: "PP%",
    name: "Participação na pontuação da equipe",
  },
  {
    key: "twoPointMade",
    field: "twoPointMade",
    code: "two",
    label: "2P",
    name: "Cestas de dois pontos",
    perGame: true,
  },
  {
    key: "threePointMade",
    field: "threePointMade",
    code: "three",
    label: "3P",
    name: "Cestas de três pontos",
    perGame: true,
  },
  {
    key: "freeThrowMade",
    field: "freeThrowMade",
    code: "ft",
    label: "LL",
    name: "Lances livres",
    perGame: true,
  },
  {
    key: "fouls",
    field: "fouls",
    code: "fouls",
    label: "F",
    name: "Faltas cometidas",
    perGame: true,
  },
  {
    key: "technical",
    field: "technical",
    code: "t",
    label: "T",
    name: "Faltas técnicas",
    perGame: true,
  },
  {
    key: "unsportsmanlike",
    field: "unsportsmanlike",
    code: "u",
    label: "U",
    name: "Faltas antidesportivas",
    perGame: true,
  },
  {
    key: "fiveFoulGames",
    field: "fiveFoulGames",
    code: "five",
    label: "5F",
    name: "Jogos com cinco faltas",
  },
  {
    key: "disqualifications",
    field: "disqualifications",
    code: "gd",
    label: "GD",
    name: "Jogos com desqualificação",
  },
] as const;
export type MetricKey = (typeof metricDefinitions)[number]["key"];
export type MetricField = (typeof metricDefinitions)[number]["field"];
export type Values = Record<MetricField, number | null> & {
  gamesPlayed: number;
};
export type PlayerRow = Values & {
  id: string;
  playerId: string;
  personId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  rank: number | null;
  jersey: string | null;
};
export const metricCode = (key: string) =>
  metricDefinitions.find((m) => m.key === key || m.field === key)?.code ?? key;
export function metricName(key: string, label = "") {
  const def = metricDefinitions.find((m) => m.key === key);
  return def
    ? def.name + ("perGame" in def && label.endsWith("/J") ? " por jogo" : "")
    : label;
}
export const definition = (key: string) =>
  metricDefinitions.find((m) => m.key === key || m.field === key)!;
export const teamOptions = Object.entries(teams)
  .map(([id, t]) => ({ id, name: t.name }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export function preferredJersey(games: Pick<Game, "jersey">[]): string | null {
  const counts = new Map<
    string,
    { number: string; count: number; last: number }
  >();
  games.forEach((g, index) => {
    if (g.jersey === null || g.jersey === undefined) return;
    const key = String(g.jersey);
    counts.set(key, {
      number: key,
      count: (counts.get(key)?.count ?? 0) + 1,
      last: index,
    });
  });
  return (
    [...counts.values()].sort((a, b) => b.count - a.count || b.last - a.last)[0]
      ?.number ?? null
  );
}
const sum = (
  games: Game[],
  key: Exclude<keyof Game, "jersey">,
): number | null =>
  games.some((g) => g[key] === null)
    ? null
    : games.reduce((n, g) => n + g[key]!, 0);
export function summarize(a: Athlete): PlayerRow {
  const j = a.games.length,
    two = sum(a.games, "two"),
    three = sum(a.games, "three"),
    ft = sum(a.games, "ft");
  const pts =
    two === null || three === null || ft === null
      ? null
      : two * 2 + three * 3 + ft;
  const teamPoints = sum(a.games, "teamPoints");
  return {
    id: a.id,
    personId: a.personId,
    playerId: a.personId,
    playerName: a.name,
    teamId: a.team,
    teamName: teams[a.team as keyof typeof teams].name,
    jersey: preferredJersey(a.games),
    rank: null,
    gamesPlayed: j,
    points: pts,
    pointsPerGame: pts === null || j === 0 ? null : pts / j,
    pointShare:
      pts === null || teamPoints === null || teamPoints === 0
        ? null
        : (100 * pts) / teamPoints,
    twoPointMade: two,
    threePointMade: three,
    freeThrowMade: ft,
    fouls: sum(a.games, "fouls"),
    technical: sum(a.games, "technical"),
    unsportsmanlike: sum(a.games, "unsportsmanlike"),
    fiveFoulGames: sum(a.games, "five"),
    disqualifications: sum(a.games, "gd"),
  };
}
export function metricValue(
  player: PlayerRow,
  key: string,
  mode: Mode,
): number | null {
  const def = definition(key);
  const raw = player[def.field];
  return raw === null
    ? null
    : "perGame" in def && mode === "averages"
      ? raw / player.gamesPlayed
      : raw;
}
export function queryPlayers(query: {
  search: string;
  teams: string[];
  minimum: string;
  sort: string;
  direction: SortDirection;
  mode: Mode;
}): PlayerRow[] {
  const term = normalizeSearch(query.search);
  const result = athletes
    .filter((a) => a.games.length > 0)
    .map(summarize)
    .filter(
      (a) =>
        normalizeSearch(a.playerName).includes(term) &&
        query.teams.includes(a.teamId) &&
        a.gamesPlayed >= (Number(query.minimum) || 0),
    );
  result.sort(
    (a, b) =>
      compareValues(
        metricValue(a, query.sort, query.mode),
        metricValue(b, query.sort, query.mode),
        query.direction,
      ) ||
      compareValues(a.playerName, b.playerName, "asc") ||
      compareValues(a.teamName, b.teamName, "asc"),
  );
  let previous: number | null | undefined,
    rank = 0;
  result.forEach((p, index) => {
    const value = metricValue(p, query.sort, query.mode);
    if (index === 0 || value !== previous) rank = index + 1;
    p.rank = value === null ? null : rank;
    previous = value;
  });
  return result;
}
const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export function formatMetric(
  player: PlayerRow,
  key: string,
  mode: Mode,
): string {
  const def = definition(key),
    v = metricValue(player, key, mode);
  if (v === null) return "—";
  const fraction =
    def.key === "pointsPerGame" ||
    def.key === "pointShare" ||
    ("perGame" in def && mode === "averages");
  return (
    (fraction ? decimal : integer).format(v) +
    (def.key === "pointShare" ? "%" : "")
  );
}
export const auditRow = (p: PlayerRow) => ({
  id: p.id,
  rank: p.rank,
  ...Object.fromEntries(metricDefinitions.map((m) => [m.code, p[m.field]])),
});
