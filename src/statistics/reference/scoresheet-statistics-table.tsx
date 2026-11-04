import { publicDetailLink } from "../../public-ui/navigation";
// Adaptado do ScoresheetStatisticsTable aprovado: mantém estrutura e estilos;
// valores, cobertura e posições são fornecidos pela projeção pública.
import { ScrollableTable } from "./scrollable-table";
import { StatisticsSortHeader } from "./sort-header";
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
  forceDecimal = false,
}: {
  value: Row["metrics"][StatisticsMetric];
  metric?: StatisticsMetric;
  mode?: StatisticsPage["mode"];
  forceDecimal?: boolean;
}) {
  if (value.status !== "available")
    return (
      <span
        className="missing"
        role={value.status === "insufficient-sample" ? "img" : undefined}
        aria-label={
          value.status === "insufficient-sample"
            ? "Amostra insuficiente"
            : "Não informado para este cálculo"
        }
      >
        {value.status === "insufficient-sample" ? "-" : "—"}
      </span>
    );
  return (
    <>
      {(forceDecimal ||
      metric === "pointsShare" ||
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
  return (
    <StatisticsSortHeader
      definition={referenceMetric(metric)}
      active={data.sort === metric}
      direction={data.direction}
      onSort={() => onSort(metric)}
      metricKey={metric}
    />
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
                  title={row.names[0]}
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
                      href={publicDetailLink(
                        `/atleta.html#${row.personId}`,
                        data.disputeId,
                      )}
                    >
                      {row.names[0]}
                    </a>{" "}
                    <span
                      className="player-jersey"
                      aria-label={`Camisa ${row.jerseys.join(" / ")}`}
                    >
                      #{row.jerseys.join(" / ")}
                    </span>
                    {!showTeam && (
                      <span className="player-team-mobile">
                        {" "}
                        ·{" "}
                        <a
                          href={publicDetailLink(
                            `/equipe.html#${row.teamId}?disputeId=${data.disputeId}&registrationId=${row.registrationId}`,
                            data.disputeId,
                          )}
                        >
                          {row.registrationNames.join(" / ")}
                        </a>
                      </span>
                    )}
                  </span>
                </th>
                {showTeam && (
                  <td className="team-name">
                    <a
                      href={publicDetailLink(
                        `/equipe.html#${row.teamId}?disputeId=${data.disputeId}&registrationId=${row.registrationId}`,
                        data.disputeId,
                      )}
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
