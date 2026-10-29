// Adaptado do ScoresheetStatisticsTable aprovado: mantém estrutura e estilos;
// valores, cobertura e posições são fornecidos pela projeção pública.
import { ScrollableTable } from "./scrollable-table";
import { useNameTooltip } from "./tooltip";
import { STATISTICS_METRICS, type StatisticsMetric } from "../metrics";
import type { StatisticsPage } from "../page-contract";
import type { StatisticsQuery } from "../query-contract";
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const referenceMetric = (key: StatisticsMetric) =>
  key === "foulsCommitted"
    ? { ...STATISTICS_METRICS[key], label: "F" }
    : STATISTICS_METRICS[key];
type Row = StatisticsPage["rows"][number];
export function MetricCell({
  value,
  metric,
  mode,
}: {
  value: Row["metrics"][StatisticsMetric];
  metric?: StatisticsMetric;
  mode?: StatisticsPage["mode"];
}) {
  if (value.status !== "available")
    return (
      <span
        className="missing"
        role={value.status === "insufficient-sample" ? "img" : undefined}
        aria-label={
          value.status === "insufficient-sample"
            ? "Amostra insuficiente"
            : undefined
        }
        title={
          value.status === "insufficient-sample"
            ? "Amostra temporal abaixo do mínimo da publicação"
            : "Não informado para este cálculo"
        }
      >
        {value.status === "insufficient-sample" ? "-" : "—"}
      </span>
    );
  return (
    <>
      {(metric === "pointsShare" ||
      metric === "pointsPerGame" ||
      (mode === "per-game" &&
        metric &&
        [
          "twoMade",
          "threeMade",
          "freeMade",
          "foulsCommitted",
          "technicalFouls",
          "unsportsmanlikeFouls",
        ].includes(metric))
        ? decimal
        : number
      ).format(value.value)}
      {metric === "pointsShare" ? "%" : ""}
    </>
  );
}
function SortHeader({
  metric,
  data,
  onSort,
}: {
  metric: StatisticsMetric;
  data: StatisticsPage;
  onSort: (key: StatisticsMetric) => void;
}) {
  const definition = referenceMetric(metric),
    active = data.sort === metric;
  const tooltip = useNameTooltip(definition.name);
  return (
    <th
      scope="col"
      data-public-metric={metric}
      aria-label={definition.name}
      aria-sort={
        active
          ? data.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      className={active ? "reference-sorted active-column" : undefined}
    >
      <button
        {...tooltip}
        type="button"
        className="statistics-sort sort"
        aria-label={`Ordenar por ${definition.label} (${definition.name})`}
        aria-pressed={active}
        onClick={(event) => {
          onSort(metric);
          tooltip.onClick(event);
        }}
      >
        <span>{definition.label}</span>
        {active && (
          <span className="sort-arrow" aria-hidden="true">
            {data.direction === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    </th>
  );
}
export function ScoresheetStatisticsTable({
  data,
  showTeam,
  onSort,
  compare,
  onCompare,
  comparisonEnabled,
}: {
  data: StatisticsPage;
  showTeam: boolean;
  onSort: (key: StatisticsMetric) => void;
  compare: StatisticsQuery["compare"];
  onCompare: (id: string, focusId: string) => void;
  comparisonEnabled: boolean;
}) {
  return (
    <div
      className="reference-explorer statistics-explorer"
      data-source-component="ScoresheetStatisticsTable"
    >
      <ScrollableTable label="Tabela estatística rolável">
        <table
          aria-label="Estatísticas dos atletas"
          className="statistics-table statistics-table-scoresheet"
          style={{
            minWidth: `calc(var(--identity-columns, 450px) - ${showTeam ? "0px" : "var(--team-column, 135px)"} + ${data.columns.length * 68}px)`,
          }}
        >
          <caption className="sr-only">
            Estatísticas publicadas. Selecione um cabeçalho para ordenar.
            Legenda ao final da tabela.
          </caption>
          <colgroup>
            <col className="column-position" />
            <col className="column-player" />
            {showTeam && <col className="column-team" />}
            {data.columns.length > 0 && (
              <col span={data.columns.length} className="column-metric" />
            )}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="statistics-position">
                Pos.
              </th>
              <th scope="col" className="statistics-player">
                Atleta
              </th>
              {showTeam && (
                <th scope="col" className="team-column-header">
                  Equipe
                </th>
              )}
              {data.columns.map((key) => (
                <SortHeader
                  key={key}
                  metric={key}
                  data={data}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={`${row.personId}/${row.registrationId}`}>
                <td className="statistics-position">{row.rank ?? "—"}</td>
                <th
                  scope="row"
                  className="reference-player statistics-player"
                  title={row.names.join(" / ")}
                >
                  <span className="player">
                    {comparisonEnabled && (
                      <input
                        className="reference-compare"
                        id={`compare-${row.personId}-${row.registrationId}`}
                        type="checkbox"
                        aria-label={`Comparar ${row.names.join(" / ")} na inscrição ${row.registrationNames.join(" / ")}`}
                        checked={compare.includes(row.personId)}
                        disabled={
                          compare.length >= 2 && !compare.includes(row.personId)
                        }
                        onChange={(e) =>
                          onCompare(row.personId, e.currentTarget.id)
                        }
                      />
                    )}
                    <a
                      className="player-name"
                      href={`/atleta.html#${row.personId}`}
                    >
                      {row.names.length === 1 ? row.names[0] : "var."}
                    </a>{" "}
                    <span
                      className="player-jersey"
                      aria-label={`Camisa ${row.jerseys.join(" / ")}`}
                      title={
                        row.jerseys.length > 1
                          ? "Camisas usadas nas participações publicadas"
                          : undefined
                      }
                    >
                      #{row.jerseys.join(" / ")}
                    </span>
                  </span>
                </th>
                {showTeam && (
                  <td
                    className="team-name"
                    title={[...row.registrationNames, ...row.teamNames].join(
                      " / ",
                    )}
                  >
                    <a
                      href={`/equipe.html#${row.teamId}?disputeId=${data.disputeId}&registrationId=${row.registrationId}`}
                    >
                      {row.registrationNames.length === 1
                        ? row.registrationNames[0]
                        : "var."}
                    </a>
                  </td>
                )}
                {data.columns.map((key) => (
                  <td
                    key={key}
                    data-public-metric={key}
                    className={
                      data.sort === key
                        ? "reference-sorted active-column"
                        : undefined
                    }
                    data-leader={
                      data.leaders[key]?.some(
                        (ref) =>
                          ref.personId === row.personId &&
                          ref.registrationId === row.registrationId,
                      ) || undefined
                    }
                    title={`Cobertura: ${row.coverage.scoringGames} jogos com pontos; ${row.coverage.advancedGames} avançados; ${row.coverage.foulGames} com FC; ${row.coverage.foulsReceivedGames} com FR; ${row.coverage.plusMinusGames} com saldo; ${row.coverage.disciplineGames} disciplinares.`}
                  >
                    <MetricCell
                      metric={key}
                      mode={data.mode}
                      value={row.metrics[key]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </div>
  );
}
export function StatisticsLegend({ columns }: { columns: StatisticsMetric[] }) {
  if (!columns.length) return null;
  return (
    <section
      className="table-legend reference-legend"
      aria-labelledby="legend-title"
    >
      <h2 id="legend-title">Legenda</h2>
      <dl>
        {columns.map((key) => (
          <div key={key}>
            <dt>{referenceMetric(key).label}</dt>
            <dd>{STATISTICS_METRICS[key].name}</dd>
          </div>
        ))}
      </dl>
      <div className="legend-notes">
        <p>
          <strong>Por jogo:</strong> somente 2P, 3P, LL, F, T e U são divididos
          por J. As outras colunas permanecem iguais.
        </p>
        <p>
          <strong>F:</strong> total de faltas cometidas, já incluindo T e U.
          Essas colunas detalham o total e não devem ser somadas novamente a F.
        </p>
        <p>
          <strong>PP%:</strong> pontos do atleta ÷ pontos da equipe nos mesmos
          jogos em que participou × 100.
        </p>
        <p>
          <strong>#:</strong> camisas nas participações publicadas.{" "}
          <strong>0:</strong> valor conhecido. <strong>—:</strong> informação
          ausente ou incompleta.
        </p>
        <p>
          Empates compartilham posição (1, 1, 3). O ranking considera a precisão
          completa dos cálculos.
        </p>
      </div>
    </section>
  );
}
