import { BOXSCORE_METRICS } from "../../especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/app/modules/statistics/boxscore-metrics";

export const STATISTICS_METRICS = {
  ...BOXSCORE_METRICS,
  disqualifications: {
    label: "GD",
    name: "Desqualificações",
    normalizable: false,
    lowerIsBetter: true,
  },
  twoMade: {
    label: "2PC",
    name: "Cestas de dois oficiais",
    normalizable: true,
    lowerIsBetter: false,
  },
  threeMade: {
    label: "3PC",
    name: "Cestas de três oficiais",
    normalizable: true,
    lowerIsBetter: false,
  },
  freeMade: {
    label: "LLC",
    name: "Lances livres oficiais",
    normalizable: true,
    lowerIsBetter: false,
  },
} as const;
export type StatisticsMetric = keyof typeof STATISTICS_METRICS;
