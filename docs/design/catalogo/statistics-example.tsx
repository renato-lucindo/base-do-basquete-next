import { useState } from "react";
import { ColumnPicker } from "../../../src/statistics/reference/column-picker";
import {
  StatisticsLegend,
  referenceMetric,
} from "../../../src/statistics/reference/scoresheet-statistics-table";
import { ScrollableTable } from "../../../src/statistics/reference/scrollable-table";
import { StatisticsSortHeader } from "../../../src/statistics/reference/sort-header";
import { TeamFilter } from "../../../src/statistics/reference/team-filter";
import { TooltipProvider } from "../../../src/statistics/reference/tooltip";
import { nextSort, sortRows, type Sort } from "../../../src/ui-system/controls";
import { ModeButtons } from "../../../src/team-profile/panels";
import { QueryTableLayout } from "../../../src/ui-system/query-table-layout";

const teams = [
  { id: "serra", name: "Associação Atlética da Serra" },
  { id: "enseada", name: "Clube Náutico da Enseada" },
];
const athletes = [
  { name: "Ana Vitória de Almeida", team: "serra", games: 12, points: 168 },
  { name: "Lívia Rodrigues", team: "enseada", games: 15, points: 143 },
  { name: "Isabela Martins", team: "serra", games: 11, points: 118 },
];
const metrics = ["games", "points"] as const;
const options = metrics.map((key) => ({ key, ...referenceMetric(key) }));

export function StatisticsExample() {
  const [teamIds, setTeamIds] = useState(() => teams.map((team) => team.id));
  const [shown, setShown] = useState<string[]>([...metrics]);
  const [sort, setSort] = useState<Sort>({ key: "points", direction: "desc" });
  const [mode, setMode] = useState<"total" | "per-game">("total");
  const columns = metrics.filter((key) => shown.includes(key));
  const currentSort = shown.includes(sort.key)
    ? sort
    : { key: "name", direction: "asc" as const };
  const rows = sortRows(
    athletes.filter((row) => teamIds.includes(row.team)),
    currentSort,
    (row, key) => row[key as keyof typeof row],
    (row) => row.name,
  );

  return (
    <div className="catalog-card">
      <h3>Estatísticas de atletas</h3>
      <div className="catalog-statistics public-site statistics-public">
        <TooltipProvider>
          <QueryTableLayout>
            <div className="catalog-filter-bar">
              <TeamFilter
                options={teams}
                value={teamIds}
                onChange={setTeamIds}
              />
              <ColumnPicker
                options={options}
                value={shown}
                onChange={setShown}
                identityNote="Atleta fica sempre visível."
              />
              <ModeButtons value={mode} onChange={setMode} />
              {teamIds.length !== teams.length && (
                <button
                  type="button"
                  onClick={() => setTeamIds(teams.map((team) => team.id))}
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <ScrollableTable label="Resultados de atletas">
              <table className="catalog-metrics">
                <caption className="sr-only">Estatísticas por atleta</caption>
                <thead>
                  <tr>
                    <th scope="col">Atleta</th>
                    {columns.map((metric) => (
                      <StatisticsSortHeader
                        key={metric}
                        definition={referenceMetric(metric)}
                        active={currentSort.key === metric}
                        direction={currentSort.direction}
                        onSort={() => setSort(nextSort(currentSort, metric))}
                        metricKey={metric}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">{row.name}</th>
                      {columns.map((metric) => (
                        <td key={metric}>
                          {metric === "points" && mode === "per-game"
                            ? new Intl.NumberFormat("pt-BR", {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              }).format(row.points / row.games)
                            : row[metric]}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={1 + columns.length}>
                        Nenhum atleta nas equipes selecionadas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </ScrollableTable>
            <StatisticsLegend columns={columns} />
          </QueryTableLayout>
        </TooltipProvider>
      </div>
    </div>
  );
}
