import type { PublicStandings } from "../../../../src/regulation/public-contract";
import { recentGroupResults } from "../../../../src/regulation/recent-results";
import type { StatisticsMetric } from "../../../../src/statistics/metrics";
import { STATISTICS_COLUMN_PRESETS } from "../../../../src/statistics/query-contract";
import {
  SHEET_TEAM_COLUMNS,
  TEAM_COLUMN_PRESETS,
  type TeamMetric,
} from "../../../../src/team-statistics/metrics";

export const team = {
  name: "Associação Atlética da Serra",
  abbreviation: "AAS",
  city: "Serra, ES",
};
const opponents = {
  enseada: { name: "Clube Náutico da Enseada", abbreviation: "CNE" },
  estrela: { name: "Estrela do Vale", abbreviation: "EV" },
  vila: { name: "Basquete Vila do Sol", abbreviation: "BVS" },
} as const;

type TeamSource = "sheet" | "boxscore";
type Game = PublicStandings["games"][number];
export type Participation = {
  id: string;
  dispute: string;
  name: string;
  year: number;
  category: string;
  gender: "Masculino" | "Feminino";
  division?: string;
  status: "active" | "closed" | null;
  source: TeamSource;
  group?: {
    id: string;
    name: string;
    phase: string;
    phaseName: string;
    position: number | null;
  };
  knockout?: { phase: string; name: string };
  finalPosition?: number;
};
export const participations: readonly Participation[] = [
  {
    id: "copa-sub17-m",
    dispute: "copa-2026-sub17-m",
    name: "Copa do Litoral",
    year: 2026,
    category: "Sub-17",
    gender: "Masculino",
    division: "Série Ouro",
    status: "active",
    source: "sheet",
    group: {
      id: "a",
      name: "Grupo A",
      phase: "classificatoria",
      phaseName: "Fase classificatória",
      position: 2,
    },
  },
  {
    id: "liga-sub17-f",
    dispute: "liga-2026-sub17-f",
    name: "Liga Metropolitana",
    year: 2026,
    category: "Sub-17",
    gender: "Feminino",
    status: "active",
    source: "boxscore",
    group: {
      id: "b",
      name: "Grupo B",
      phase: "classificatoria",
      phaseName: "Fase classificatória",
      position: 1,
    },
    knockout: { phase: "semifinal", name: "Semifinal" },
  },
  {
    id: "regional-sub15-f",
    dispute: "regional-2026-sub15-f",
    name: "Torneio Regional",
    year: 2026,
    category: "Sub-15",
    gender: "Feminino",
    status: "active",
    source: "sheet",
    group: {
      id: "unico",
      name: "Grupo único",
      phase: "classificatoria",
      phaseName: "Fase classificatória",
      position: null,
    },
  },
  {
    id: "liga-2025-m",
    dispute: "liga-2025-sub17-m",
    name: "Liga Metropolitana",
    year: 2025,
    category: "Sub-17",
    gender: "Masculino",
    status: "closed",
    source: "sheet",
    finalPosition: 1,
  },
  {
    id: "copa-2025-f",
    dispute: "copa-2025-sub15-f",
    name: "Copa do Litoral",
    year: 2025,
    category: "Sub-15",
    gender: "Feminino",
    division: "Série Prata",
    status: "closed",
    source: "sheet",
    finalPosition: 2,
  },
  {
    id: "regional-2024-m",
    dispute: "regional-2024-sub15-m",
    name: "Torneio Regional",
    year: 2024,
    category: "Sub-15",
    gender: "Masculino",
    status: "closed",
    source: "sheet",
    finalPosition: 3,
  },
  {
    id: "copa-2024-f",
    dispute: "copa-2024-sub17-f",
    name: "Copa do Litoral",
    year: 2024,
    category: "Sub-17",
    gender: "Feminino",
    status: "closed",
    source: "sheet",
  },
  {
    id: "festival-sub14-m",
    dispute: "festival-2026-sub14-m",
    name: "Festival da Serra",
    year: 2026,
    category: "Sub-14",
    gender: "Masculino",
    status: null,
    source: "sheet",
  },
];

export function participationContext(p: Participation) {
  return [p.year, p.category, p.gender, p.division].filter(Boolean).join(" · ");
}

function game(
  registrationId: string,
  ordinal: number,
  date: string,
  opponent: keyof typeof opponents,
  score: [number, number] | null,
  away = false,
): Game {
  const p = participations.find((item) => item.id === registrationId)!;
  const homeRegistrationId = away ? opponent : p.id;
  const awayRegistrationId = away ? p.id : opponent;
  return {
    id: `${registrationId}-${ordinal}`,
    disputeId: p.dispute,
    homeRegistrationId,
    awayRegistrationId,
    date,
    time: "19:00",
    timeZone: "America/Sao_Paulo",
    venue: "Ginásio da Serra",
    number: String(ordinal),
    version: 1,
    state: score ? "played" : "pending",
    needs: score ? null : "result",
    score: score ? { homePoints: score[0], awayPoints: score[1] } : null,
    winnerRegistrationId: score
      ? score[0] > score[1]
        ? homeRegistrationId
        : awayRegistrationId
      : null,
    publicationVersion: score ? 1 : 0,
    sourceKind: score ? (p.source === "sheet" ? "sheet" : "pdf") : null,
    walkover: false,
  };
}

const games = [
  game("copa-sub17-m", 1, "2026-10-02", "vila", [70, 60]),
  game("copa-sub17-m", 2, "2026-10-09", "enseada", [66, 61], true),
  game("copa-sub17-m", 3, "2026-10-16", "estrela", [75, 65]),
  game("copa-sub17-m", 4, "2026-10-23", "vila", [60, 73], true),
  game("copa-sub17-m", 5, "2026-11-06", "enseada", [68, 72]),
  game("copa-sub17-m", 6, "2026-11-13", "estrela", [82, 69]),
  game("copa-sub17-m", 7, "2026-11-28", "vila", null),
  game("liga-sub17-f", 1, "2026-11-01", "estrela", [65, 57]),
  game("liga-sub17-f", 2, "2026-11-14", "enseada", [68, 73], true),
  game("liga-sub17-f", 3, "2026-11-29", "vila", null),
  game("regional-sub15-f", 1, "2026-12-06", "vila", null),
  game("liga-2025-m", 1, "2025-12-07", "estrela", [80, 63]),
  game("copa-2025-f", 1, "2025-11-23", "enseada", [52, 57]),
  game("regional-2024-m", 1, "2024-10-19", "vila", [66, 63]),
  game("copa-2024-f", 1, "2024-11-24", "estrela", [54, 61]),
  game("festival-sub14-m", 1, "2026-09-20", "vila", [52, 46]),
];

export function teamLabel(id: string, compact = false) {
  const identity = opponents[id as keyof typeof opponents] ?? team;
  return compact ? identity.abbreviation : identity.name;
}
export function gamesFor(p: Participation) {
  return games
    .filter(
      (g) =>
        g.disputeId === p.dispute &&
        (g.homeRegistrationId === p.id || g.awayRegistrationId === p.id),
    )
    .sort(
      (a, b) =>
        (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
        a.id.localeCompare(b.id),
    );
}
export function recentFor(p: Participation) {
  const inDispute = gamesFor(p);
  return (
    recentGroupResults(
      inDispute,
      inDispute.map((g) => g.id),
    ).get(p.id) ?? []
  );
}

export const teamColumns: Record<TeamSource, readonly TeamMetric[]> = {
  sheet: SHEET_TEAM_COLUMNS,
  boxscore: TEAM_COLUMN_PRESETS.boxscore,
};
export const rosterColumns: Record<TeamSource, readonly StatisticsMetric[]> = {
  sheet: STATISTICS_COLUMN_PRESETS.essentials,
  boxscore: [
    "games",
    "points",
    "pointsPerGame",
    "pointsShare",
    "rebounds",
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
    "foulsCommitted",
  ],
};

type Totals = Partial<Record<TeamMetric, number | null>>;
export type Athlete = { jersey: string; name: string; totals: Totals };

export function teamTotals(p: Participation): Totals {
  const published = gamesFor(p).filter((g) => g.score);
  const count = published.length;
  if (!count) return {};
  const points = published.reduce(
    (sum, { score, homeRegistrationId }) =>
      sum +
      (homeRegistrationId === p.id ? score!.homePoints : score!.awayPoints),
    0,
  );
  if (p.source === "boxscore")
    return {
      games: count,
      points,
      pointsPerGame: points / count,
      assists: 28,
      steals: 15,
      blocks: 5,
      fieldGoalsMade: 52,
      fieldGoalsAttempted: 114,
      fieldGoalPercentage: (100 * 52) / 114,
      threePointersMade: 11,
      threePointersAttempted: 28,
      threePointPercentage: (100 * 11) / 28,
      freeThrowsMade: 23,
      freeThrowsAttempted: 30,
      freeThrowPercentage: (100 * 23) / 30,
    };
  const threeMade = Math.floor(points / 14);
  const freeBase = Math.floor(points / 9);
  const freeMade = freeBase + ((points - 3 * threeMade - freeBase) % 2);
  const freeAttempts = freeMade + 4 * count;
  return {
    games: count,
    points,
    twoMade: (points - 3 * threeMade - freeMade) / 2,
    threeMade,
    foulsCommitted: 17 * count,
    foulsReceived: null,
    freeThrowsMade: freeMade,
    freeThrowsAttempted: freeAttempts,
    freeThrowPercentage: (100 * freeMade) / freeAttempts,
    technicalFouls: 0,
    unsportsmanlikeFouls: count > 3 ? 1 : 0,
    disqualifications: 0,
  };
}

export function rosterFor(p: Participation): readonly Athlete[] {
  const totals = teamTotals(p),
    count = totals.games ?? 0,
    teamPoints = totals.points ?? 0;
  if (!count) return [];
  if (p.source === "boxscore") {
    const players = [
      [
        "7",
        "Ana Vitória Monteiro de Almeida",
        12,
        9,
        5,
        0,
        13,
        26,
        3,
        8,
        8,
        10,
        4,
      ],
      ["11", "Lívia Rodrigues", 7, 6, 2, 1, 11, 24, 4, 10, 2, 2, 1],
      ["13", "Camila Fernandes", 8, 5, 3, 1, 12, 26, 2, 5, 4, 5, 3],
      ["14", "Beatriz Souza", 10, 4, 3, 2, 9, 20, 1, 3, 5, 7, 3],
      ["17", "Marina Oliveira", 4, 4, 2, 1, 7, 18, 1, 2, 4, 6, 2],
    ] as const;
    const rows: Athlete[] = players.map(
      ([
        jersey,
        name,
        rebounds,
        assists,
        steals,
        blocks,
        fieldGoalsMade,
        fieldGoalsAttempted,
        threePointersMade,
        threePointersAttempted,
        freeThrowsMade,
        freeThrowsAttempted,
        foulsCommitted,
      ]) => {
        const points = 2 * fieldGoalsMade + threePointersMade + freeThrowsMade;
        return {
          jersey,
          name,
          totals: {
            games: count,
            points,
            pointsPerGame: points / count,
            pointsShare: (100 * points) / teamPoints,
            rebounds,
            assists,
            steals,
            blocks,
            fieldGoalsMade,
            fieldGoalsAttempted,
            threePointersMade,
            threePointersAttempted,
            freeThrowsMade,
            freeThrowsAttempted,
            foulsCommitted,
            fieldGoalPercentage: (100 * fieldGoalsMade) / fieldGoalsAttempted,
            threePointPercentage:
              (100 * threePointersMade) / threePointersAttempted,
            freeThrowPercentage: (100 * freeThrowsMade) / freeThrowsAttempted,
          },
        };
      },
    );
    rows.push({ jersey: "18", name: "Isabela Martins", totals: { games: 0 } });
    return rows;
  }
  const names =
    p.gender === "Masculino"
      ? [
          "Rafael Monteiro de Almeida",
          "Miguel Rocha",
          "Lucas Vieira",
          "Gabriel Ramos",
          "João Pedro Martins",
          "Bernardo Soares",
          "Pedro Oliveira",
        ]
      : [
          "Laura Monteiro de Almeida",
          "Alice Rocha",
          "Marina Vieira",
          "Júlia Ramos",
          "Beatriz Martins",
          "Helena Soares",
          "Sofia Oliveira",
        ];
  return names.map((name, index) => {
    const jersey = ["0", "5", "8", "11", "14", "22", "00"][index];
    const games = index === 6 ? 0 : Math.max(1, count - (index % 2));
    const cumulativeShares = [0, 28, 50, 68, 82, 93, 100, 100];
    function share(value: number | null | undefined) {
      const total = value ?? 0;
      return (
        Math.floor((total * cumulativeShares[index + 1]) / 100) -
        Math.floor((total * cumulativeShares[index]) / 100)
      );
    }
    const twoMade = share(totals.twoMade),
      threeMade = share(totals.threeMade),
      freeMade = share(totals.freeThrowsMade),
      points = 2 * twoMade + 3 * threeMade + freeMade;
    return {
      jersey,
      name,
      totals: games
        ? {
            games,
            points,
            pointsPerGame: points / games,
            pointsShare: teamPoints ? (100 * points) / teamPoints : null,
            twoMade,
            threeMade,
            freeMade,
            foulsCommitted: index === 4 ? 0 : 2 * games,
            technicalFouls: 0,
            unsportsmanlikeFouls: 0,
            fiveFouls: 0,
            disqualifications: 0,
          }
        : { games: 0 },
    };
  });
}
