import { makeSheet, type Sheet } from "./match-model";
import { normalizeSearch } from "../../../../src/ui-system/controls";
import type {
  SearchGroup,
  SearchItem,
  SearchProvider,
} from "../../../../src/ui-system/global-search";

// All identities, results and measurements in this pilot are fictional fixtures.
export const teams = [
  {
    id: "alvares",
    name: "Álvares Cabral",
    fullName: "Clube de Natação e Regatas Álvares Cabral",
    city: "Vitória · ES",
  },
  {
    id: "saldanha",
    name: "Saldanha da Gama",
    fullName: "Clube de Regatas Saldanha da Gama",
    city: "Vitória · ES",
  },
  {
    id: "lusb",
    name: "LUSB",
    fullName: "Liga Universitária de Serra Basquete",
    city: "Serra · ES",
  },
  {
    id: "cetaf",
    name: "IVV/Cetaf",
    fullName: "Instituto Viva Vida / Cetaf",
    city: "Vila Velha · ES",
  },
  {
    id: "amprl",
    name: "AMPRL",
    fullName: "Associação de Basquete AMPRL",
    city: "Cariacica · ES",
  },
  {
    id: "nice",
    name: "GS Nice de Paula",
    fullName: "GS Nice de Paula",
    city: "Serra · ES",
  },
];
const names = [
  "João Pedro Silva",
  "Lucas Almeida",
  "Pedro Henrique",
  "Gabriel Santos",
  "Arthur Oliveira",
  "Miguel Costa",
  "Davi Rodrigues",
  "Matheus Ferreira",
  "Rafael Souza",
  "Guilherme Pereira",
  "Bernardo Alves",
  "Vinícius Martins",
  "Felipe Lima",
  "Enzo Carvalho",
  "Nicolas Gomes",
  "Samuel Ribeiro",
  "André Fernandes",
  "Bruno Araújo",
  "Caio Barbosa",
  "Daniel Rocha",
  "Eduardo Nascimento",
  "Henrique Moreira",
  "Igor Teixeira",
  "José Antônio de Albuquerque e Vasconcelos",
  "João Pedro Silva",
  "Leonardo Dias",
  "Murilo Freitas",
  "Otávio Cardoso",
];
const jerseys = [
  "4",
  "0",
  "00",
  "7",
  "11",
  "14",
  "17",
  "21",
  "22",
  "35",
  "42",
  "55",
];
const identities = names.map((name, i) => ({
  id: `player-${i + 1}`,
  name,
  team: teams[i % 6],
}));
for (const [ti, team] of teams.entries()) {
  const count = identities.filter((p) => p.team.id === team.id).length;
  for (let i = count; i < 12; i++)
    identities.push({
      id: `player-${team.id}-${i}`,
      name: `${["Vitor", "Bruno", "César", "Diego", "Alan", "Ruan", "Leandro", "Danilo", "Ícaro", "Hugo", "Fábio", "Breno"][i]} ${["Pereira", "Mendes", "Barros", "Teixeira", "Ramos", "Castro"][ti]}`,
      team,
    });
}
export const players = identities.map((person) => ({
  ...person,
  shirt:
    jerseys[
      identities.filter((p) => p.team.id === person.team.id).indexOf(person)
    ],
  games: 0,
  points: 0,
  average: null as number | null,
  two: 0,
  three: 0,
  free: 0,
  fouls: 0 as number | null,
  technical: 0 as number | null,
  unsportsmanlike: 0 as number | null,
  excluded: 0 as number | null,
  disqualified: 0 as number | null,
}));
export type Player = (typeof players)[number];
const numbers = [
  4,
  5,
  15,
  10,
  2,
  7,
  12,
  8,
  3,
  21,
  19,
  6,
  11,
  22,
  9,
  14,
  24,
  17,
  18,
  16,
  13,
  23,
  20,
  1,
  100,
  null,
  30,
  28,
];
export const games = numbers.map((number, i) => ({
  id: `game-${i + 1}`,
  number,
  home: teams[i % 6],
  away: teams[(i + 1 + (i % 3)) % 6],
  date:
    i === 26
      ? null
      : `2026-${String(4 + Math.floor(i / 9)).padStart(2, "0")}-${String(1 + (i % 9) * 3).padStart(2, "0")}`,
  time: i === 26 ? null : ["08:30", "13:20", "15:30", "19:00"][i % 4],
  venue:
    i === 26
      ? null
      : [
          "Centro de Excelência Sidney Carvalho Rosadas",
          "EMEB Zilma Coelho Pinto",
          "Ginásio Audifax Barreto",
        ][i % 3],
  status: i < 23 ? "Resultado publicado" : "Agendado",
  homePoints: i < 23 ? 58 + (i % 29) : null,
  awayPoints: i < 23 ? 49 + (i % 23) : null,
}));
export type Game = (typeof games)[number];
export type PublishedGame = Game & {
  year: number;
  competition: string;
  category: string;
  gender: string;
  sheet: Sheet;
};
const roster = (id: string) => players.filter((p) => p.team.id === id);
export const publishedGames: PublishedGame[] = games
  .filter((g) => g.status === "Resultado publicado")
  .map((g, i) => {
    const sheet = makeSheet(i, g.home, g.away, roster);
    g.homePoints = sheet.home.points;
    g.awayPoints = sheet.away.points;
    return {
      ...g,
      year: 2026,
      competition: "Copa ES",
      category: "Sub-15",
      gender: "Masculino",
      sheet,
    };
  });
// Explicit previous-team participation; names alone never identify a player.
for (const [i, g] of games.slice(0, 8).entries()) {
  const oldRoster = (id: string) =>
    roster(teams[(teams.findIndex((t) => t.id === id) + 1) % teams.length].id);
  const sheet = makeSheet(i + 3, g.home, g.away, oldRoster);
  publishedGames.push({
    ...g,
    id: `history-${i + 1}`,
    number: i + 1,
    date: `2025-08-${String(i + 10).padStart(2, "0")}`,
    homePoints: sheet.home.points,
    awayPoints: sheet.away.points,
    year: 2025,
    competition: "Copa da Base",
    category: "Sub-14",
    gender: "Masculino",
    sheet,
  });
}
export function appearances(playerId: string) {
  return publishedGames
    .flatMap((game) =>
      (["home", "away"] as const).flatMap((side) => {
        const team = game.sheet[side],
          person = team.players.find((p) => p.id === playerId);
        return person?.played
          ? [
              {
                game,
                team,
                player: person,
                opponent: game[side === "home" ? "away" : "home"],
              },
            ]
          : [];
      }),
    )
    .sort((a, b) => (b.game.date ?? "").localeCompare(a.game.date ?? ""));
}
// Current table totals are derived from the very same published game appearances.
for (const player of players) {
  const records = appearances(player.id).filter((a) => a.game.year === 2026);
  player.games = records.length;
  for (const key of ["points", "two", "three", "free"] as const)
    player[key] = records.reduce((sum, a) => sum + (a.player[key] ?? 0), 0);
  player.fouls = records.some((a) => a.player.fouls === null)
    ? null
    : records.reduce((sum, a) => sum + (a.player.fouls ?? 0), 0);
  player.average = records.length ? player.points / records.length : null;
  const events = records.flatMap((a) => a.player.foulEvents);
  player.technical = records.some((a) => a.player.fouls === null)
    ? null
    : events.filter((e) => e.kind === "T").length;
  player.unsportsmanlike = records.some((a) => a.player.fouls === null)
    ? null
    : events.filter((e) => e.kind === "U").length;
  player.excluded = records.some((a) => a.player.status === null)
    ? null
    : records.filter((a) => a.player.status === "five").length;
  player.disqualified = records.some((a) => a.player.status === null)
    ? null
    : records.filter((a) => ["GD", "D"].includes(a.player.status ?? "")).length;
}
export type Appearance = ReturnType<typeof appearances>[number];
export function teamSummary(teamId: string) {
  const records = publishedGames.filter(
    (g) => g.year === 2026 && (g.home.id === teamId || g.away.id === teamId),
  );
  const own = records.map((g) =>
    g.home.id === teamId ? g.sheet.home : g.sheet.away,
  );
  const points = own.reduce((sum, team) => sum + team.points, 0);
  const against = records.reduce(
    (sum, g) =>
      sum + (g.home.id === teamId ? g.sheet.away.points : g.sheet.home.points),
    0,
  );
  const wins = records.filter((g) =>
    g.home.id === teamId
      ? g.sheet.home.points > g.sheet.away.points
      : g.sheet.away.points > g.sheet.home.points,
  ).length;
  return {
    games: records.length,
    points,
    against,
    wins,
    losses: records.length - wins,
    difference: points - against,
    two: own.reduce(
      (sum, t) => sum + t.players.reduce((n, p) => n + (p.two ?? 0), 0),
      0,
    ),
    three: own.reduce(
      (sum, t) => sum + t.players.reduce((n, p) => n + (p.three ?? 0), 0),
      0,
    ),
    free: own.reduce(
      (sum, t) => sum + t.players.reduce((n, p) => n + (p.free ?? 0), 0),
      0,
    ),
  };
}
export type Participation = {
  id: string;
  year: number;
  competition: string;
  category: string;
  teamId: string;
  teamName: string;
  shirt: string;
  games: number;
  points: number;
  two: number;
  three: number;
  free: number;
  fouls: number | null;
};
export function participations(playerId: string): Participation[] {
  const rows = new Map<string, Participation>();
  for (const a of appearances(playerId)) {
    const id = `${a.game.year}/${a.game.competition}/${a.team.id}/${a.player.jersey}`;
    const row = rows.get(id) ?? {
      id,
      year: a.game.year,
      competition: a.game.competition,
      category: a.game.category,
      teamId: a.team.id,
      teamName: a.team.name,
      shirt: a.player.jersey,
      games: 0,
      points: 0,
      two: 0,
      three: 0,
      free: 0,
      fouls: 0,
    };
    row.games++;
    for (const key of ["points", "two", "three", "free"] as const)
      row[key] += a.player[key] ?? 0;
    row.fouls =
      row.fouls === null || a.player.fouls === null
        ? null
        : row.fouls + a.player.fouls;
    rows.set(id, row);
  }
  // Documented registration without individual game coverage remains a participation.
  const person = players.find((p) => p.id === playerId);
  if (person)
    rows.set("2024-registration", {
      id: "2024-registration",
      year: 2024,
      competition: "Festival das Escolas",
      category: "Sub-13",
      teamId: person.team.id,
      teamName: person.team.name,
      shirt: "12",
      games: 0,
      points: 0,
      two: 0,
      three: 0,
      free: 0,
      fouls: null,
    });
  return [...rows.values()];
}
export function profileSummary(playerId: string) {
  const records = appearances(playerId);
  const years = participations(playerId).map((row) => row.year);
  const latestYear = years.length ? Math.max(...years) : null;
  return [
    {
      id: "season",
      label: latestYear === null ? "Temporada" : String(latestYear),
      records: records.filter((row) => row.game.year === latestYear),
    },
    { id: "career", label: "Carreira", records },
  ].map(({ id, label, records }) => {
    const mean = (key: "points" | "two" | "three" | "free" | "fouls") =>
      !records.length || records.some((row) => row.player[key] === null)
        ? null
        : records.reduce((sum, row) => sum + row.player[key]!, 0) /
          records.length;
    return {
      id,
      label,
      games: records.length,
      points: mean("points"),
      two: mean("two"),
      three: mean("three"),
      free: mean("free"),
      fouls: mean("fouls"),
    };
  });
}
export type PublicBio = {
  nickname?: string;
  birthYear?: number;
  position?: string;
  height?: string;
  weight?: string;
  dominantHand?: string;
  city?: string;
};
export const publicBio = (playerId: string): PublicBio | null =>
  playerId === "player-1"
    ? {
        nickname: "JP",
        birthYear: 2011,
        position: "Armador",
        height: "1,76 m",
        city: "Vitória · ES",
      }
    : null;
export const honors = (playerId: string) =>
  playerId === "player-1"
    ? [
        {
          id: "honor-1",
          kind: "collective",
          title: "Campeão",
          competition: "Copa da Base",
          year: 2025,
          category: "Sub-14",
          team: "GS Nice de Paula",
        },
        {
          id: "honor-2",
          kind: "individual",
          title: "Quinteto ideal",
          competition: "Copa ES",
          year: 2026,
          category: "Sub-15",
          team: "Álvares Cabral",
        },
      ]
    : [];
export const competitions = [
  {
    id: "copa-es",
    name: "Copa ES",
    years: [2026, 2025],
    categories: ["Adulto", "Sub-13", "Sub-14", "Sub-15", "Sub-17", "Sub-22"],
  },
  {
    id: "copa-base",
    name: "Copa da Base",
    years: [2026],
    categories: ["Sub-14", "Sub-16", "Sub-18"],
  },
];
export const allSearchItems: SearchItem[] = [
  ...players.map((p) => ({
    id: p.id,
    type: "players" as const,
    label: p.name,
    description: `${p.team.name} · Sub-15 · Camisa ${p.shirt}`,
  })),
  ...teams.map((t) => ({
    id: t.id,
    type: "teams" as const,
    label: t.name,
    description: t.city,
  })),
  ...competitions.map((c) => ({
    id: c.id,
    type: "competitions" as const,
    label: c.name,
    description: `Temporadas ${c.years.join(" e ")}`,
  })),
];
export const pilotSearch: SearchProvider = async (query, type, signal) => {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 80);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
  const term = normalizeSearch(query);
  const rank = (item: SearchItem) => {
    const n = normalizeSearch(item.label);
    return n === term ? 0 : n.startsWith(term) ? 1 : 2;
  };
  const matches = allSearchItems
    .filter(
      (i) =>
        (type === "all" || i.type === type) &&
        normalizeSearch(`${i.label} ${i.description}`).includes(term),
    )
    .sort(
      (a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, "pt-BR"),
    );
  return (
    [
      { type: "players", label: "Jogadores" },
      { type: "teams", label: "Equipes" },
      { type: "competitions", label: "Campeonatos" },
    ] as const
  )
    .map((group) => ({
      ...group,
      items: matches.filter((i) => i.type === group.type),
    }))
    .filter((g) => g.items.length) satisfies SearchGroup[];
};
export const metricLabels: Record<string, string> = {
  games: "Jogos disputados",
  points: "Pontos",
  average: "Pontos por jogo",
  two: "Cestas de dois pontos convertidas",
  three: "Cestas de três pontos convertidas",
  free: "Lances livres convertidos",
  fouls: "Faltas cometidas",
  technical: "Faltas técnicas (incluídas nas faltas cometidas)",
  unsportsmanlike: "Faltas antidesportivas (incluídas nas faltas cometidas)",
  excluded: "Jogos com exclusão por cinco faltas",
  disqualified: "Jogos com desqualificação",
};
export const metricShort: Record<string, string> = {
  games: "J",
  points: "PTS",
  average: "PPJ",
  two: "2P",
  three: "3P",
  free: "LL",
  fouls: "F",
  technical: "T",
  unsportsmanlike: "U",
  excluded: "5F",
  disqualified: "GD",
};
export const decimal = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
export const displayDate = (date: string | null) =>
  date ? dateFormat.format(new Date(`${date}T12:00:00Z`)) : "A definir";
