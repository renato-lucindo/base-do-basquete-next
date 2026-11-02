import { BOXSCORE_METRICS } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-metrics";

export const STATISTICS_METRICS = {
  ...BOXSCORE_METRICS,
  pointsShare: {
    label: "PP%",
    name: "Participação nos pontos da equipe nos jogos em que atuou",
    normalizable: false,
    lowerIsBetter: false,
  },
  technicalFouls: {
    label: "T",
    name: "Faltas técnicas registradas",
    normalizable: true,
    lowerIsBetter: true,
  },
  unsportsmanlikeFouls: {
    label: "U",
    name: "Faltas antidesportivas registradas",
    normalizable: true,
    lowerIsBetter: true,
  },
  fiveFouls: {
    label: "5F",
    name: "Exclusões por cinco faltas confirmadas",
    normalizable: false,
    lowerIsBetter: true,
  },
  pointsPerGame: {
    label: "PPJ",
    name: "Pontos oficiais por jogo",
    normalizable: false,
    lowerIsBetter: false,
  },
  disqualifications: {
    label: "GD",
    name: "Desqualificações",
    normalizable: false,
    lowerIsBetter: true,
  },
  twoMade: {
    label: "2P",
    name: "Cestas de dois oficiais",
    normalizable: true,
    lowerIsBetter: false,
  },
  threeMade: {
    label: "3P",
    name: "Cestas de três oficiais",
    normalizable: true,
    lowerIsBetter: false,
  },
  freeMade: {
    label: "LL",
    name: "Lances livres oficiais",
    normalizable: true,
    lowerIsBetter: false,
  },
} as const;
export type StatisticsMetric = keyof typeof STATISTICS_METRICS;
