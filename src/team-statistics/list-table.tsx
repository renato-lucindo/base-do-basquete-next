import type { TeamsListPage } from "./list-contract";
import { LIST_METRICS, type ListMetric } from "./list-query";
import { sheetTeamMetric } from "./metrics";
import { ScrollableTable } from "../statistics/reference/scrollable-table";
import { StatisticsSortHeader } from "../statistics/reference/sort-header";
import { TooltipProvider } from "../statistics/reference/tooltip";
import { publicDetailLink } from "../public-ui/navigation";
export const listMetric = (key: ListMetric) =>
  key === "benchPoints" || key === "benchPointsShare"
    ? LIST_METRICS[key]
    : sheetTeamMetric(key);
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export function TeamsListTable({
  data: d,
  onSort,
  canNavigate = true,
}: {
  data: TeamsListPage;
  canNavigate?: boolean;
  onSort: (key: TeamsListPage["query"]["sort"]) => void;
}) {
  const maxima = Object.fromEntries(
    d.query.columns.map((key) => [
      key,
      Math.max(0, ...d.rows.map((r) => r.statistics[key].value ?? 0)),
    ]),
  );
  return (
    <TooltipProvider>
      {d.total ? (
        <div
          className="reference-explorer team-statistics-explorer team-list-explorer"
          data-scoresheet={d.scoresheet || undefined}
        >
          <ScrollableTable label="Tabela de equipes">
            <table
              className="statistics-table"
              aria-label="Estatísticas das equipes"
            >
              <caption className="sr-only">
                Ranking estatístico por inscrição. Selecione uma métrica para
                ordenar. Legenda ao final.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="team-list-position">
                    Pos.
                  </th>
                  <StatisticsSortHeader
                    definition={{ label: "Equipe", name: "Nome da equipe" }}
                    metricKey="name"
                    metricAttribute="data-team-metric"
                    active={d.query.sort === "name"}
                    direction={d.query.direction}
                    onSort={() => onSort("name")}
                  />
                  {d.query.columns.map((key) => (
                    <StatisticsSortHeader
                      key={key}
                      definition={listMetric(key)}
                      metricKey={key}
                      metricAttribute="data-team-metric"
                      active={d.query.sort === key}
                      direction={d.query.direction}
                      onSort={() => onSort(key)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.registrationId}>
                    <td className="rank">{r.rank ?? "—"}</td>
                    <th scope="row">
                      <a
                        href={
                          canNavigate
                            ? publicDetailLink(
                                `/equipe.html#${r.teamId}?disputeId=${d.disputeId}&registrationId=${r.registrationId}&mode=${d.query.mode}&scope=${d.query.scope}`,
                                d.disputeId,
                              )
                            : undefined
                        }
                        aria-disabled={!canNavigate || undefined}
                      >
                        {r.name}
                      </a>
                    </th>
                    {d.query.columns.map((key) => {
                      const cell = r.statistics[key],
                        positive =
                          cell.value !== null &&
                          cell.value > 0 &&
                          cell.value === maxima[key];
                      return (
                        <td
                          key={key}
                          data-team-value={key}
                          className={positive ? "team-list-maximum" : undefined}
                        >
                          {cell.value === null ? (
                            <span
                              className="missing"
                              aria-label="Não informado para este cálculo"
                            >
                              —
                            </span>
                          ) : (
                            (cell.value !== 0 &&
                            d.query.mode === "per-game" &&
                            key !== "games" &&
                            !key.endsWith("Percentage") &&
                            !key.endsWith("Share")
                              ? decimal
                              : number
                            ).format(cell.value)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      ) : (
        <p className="statistics-empty" role="status">
          Nenhuma inscrição neste recorte.
        </p>
      )}
      <section className="table-legend" aria-labelledby="team-legend">
        <h2 id="team-legend">Legenda</h2>
        <dl>
          {d.query.columns.map((key) => (
            <div key={key}>
              <dt>{listMetric(key).label}</dt>
              <dd>{listMetric(key).name}</dd>
            </div>
          ))}
        </dl>
      </section>
    </TooltipProvider>
  );
}
