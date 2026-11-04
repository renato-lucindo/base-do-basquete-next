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
export const players = names.map((name, i) => {
  const two = 17 + ((i * 7) % 44),
    three = 3 + ((i * 3) % 18),
    free = (i * 5) % 27,
    games = 5 + (i % 4),
    points = two * 2 + three * 3 + free;
  return {
    id: `player-${i + 1}`,
    name,
    team: teams[i % teams.length],
    shirt: i === 5 ? "00" : i === 6 ? "0" : String((i % 23) + 4),
    games,
    points,
    average: points / games,
    two,
    three,
    free,
    fouls: 8 + (i % 13),
    technical: i % 3,
    unsportsmanlike: i % 2,
    excluded: i % 4 === 0 ? 1 : 0,
    disqualified: 0,
  };
});
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
export const displayDate = (date: string | null) =>
  date ? date.split("-").reverse().join("/") : "A definir";
