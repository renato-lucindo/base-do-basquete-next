const averageNumber = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function basketAverage(
  pointsFor: number | null | undefined,
  pointsAgainst: number | null | undefined,
) {
  return pointsFor == null || pointsAgainst == null || pointsAgainst === 0
    ? "—"
    : averageNumber.format(pointsFor / pointsAgainst);
}

export const standingsMetricLegend = [
  { label: "PTS", name: "Pontos de classificação" },
  { label: "AVG", name: "Cesta average" },
];
