import { publicDetailLink } from "../public-ui/navigation";
import type { TeamsPage } from "./contract";
import type { TeamDetailPage } from "./detail-contract";
import type { StatisticsMetric } from "../statistics/metrics";
import { teamDetailLink } from "./navigation";
import { TEAM_METRICS, sheetTeamMetric, type TeamMetric } from "./metrics";
import {
  MetricCell,
  referenceMetric,
} from "../statistics/reference/scoresheet-statistics-table";
import { TooltipProvider } from "../statistics/reference/tooltip";
import { StatisticsSortHeader } from "../statistics/reference/sort-header";
import { ScrollableTable } from "../statistics/reference/scrollable-table";
type Detail = Extract<TeamDetailPage, { kind: "confirmed-team-detail-v1" }>;
export const teamNumber = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
export const teamStamp = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
const date = (s: string | null) =>
  s ? s.split("-").reverse().join("/") : "Data não informada";
export function TeamPager({
  page,
  totalPages,
  total,
  kind,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  kind: "inscrições" | "participantes" | "jogos";
  onChange: (p: number) => void;
}) {
  return (
    <div className="statistics-actions">
      <button
        type="button"
        disabled={page === 1}
        aria-label={`Página anterior de ${kind}`}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span>
        Página {page} de {totalPages} · {total} {kind}
      </span>
      <button
        type="button"
        disabled={page === totalPages}
        aria-label={`Próxima página de ${kind}`}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
export function TeamsTable({
  data: d,
  onPage,
  onSort,
}: {
  data: TeamsPage;
  onPage: (p: number) => void;
  onSort: (key: TeamsPage["query"]["sort"]) => void;
}) {
  if (!d.total)
    return (
      <p className="statistics-empty">
        Nenhuma inscrição com resultados confirmados neste recorte.
      </p>
    );
  return (
    <>
      <TooltipProvider>
        <div className="public-site statistics-public">
          <div className="reference-explorer team-statistics-explorer">
            <ScrollableTable label="Tabela de equipes">
              <table
                className="statistics-table"
                style={{
                  minWidth: `${(d.scoresheet ? 296 : 240) + d.query.columns.length * 68}px`,
                }}
              >
                <caption className="sr-only">
                  Equipes com resultados confirmados
                </caption>
                <colgroup>
                  {d.scoresheet && <col style={{ width: 56 }} />}
                  <col style={{ width: 240 }} />
                  {d.query.columns.length > 0 && (
                    <col span={d.query.columns.length} style={{ width: 68 }} />
                  )}
                </colgroup>
                <thead>
                  <tr>
                    {d.scoresheet && (
                      <th
                        scope="col"
                        aria-label="Posição no ranking estatístico"
                        title="Posição no ranking estatístico; empates compartilham posição. Selecione uma métrica para ranquear."
                      >
                        Pos
                      </th>
                    )}
                    <StatisticsSortHeader
                      definition={{ label: "Equipe", name: "Nome da equipe" }}
                      metricKey="name"
                      metricAttribute="data-team-metric"
                      active={d.query.sort === "name"}
                      direction={d.query.direction}
                      onSort={() => onSort("name")}
                    />
                    {d.query.columns.map((metric) => (
                      <StatisticsSortHeader
                        key={metric}
                        definition={
                          d.scoresheet
                            ? sheetTeamMetric(metric)
                            : metric === "pointsAgainst" ||
                                metric === "difference"
                              ? TEAM_METRICS[metric]
                              : referenceMetric(metric)
                        }
                        active={d.query.sort === metric}
                        direction={d.query.direction}
                        onSort={() => onSort(metric)}
                        metricKey={metric}
                        metricAttribute="data-team-metric"
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.registrationId}>
                      {d.scoresheet && (
                        <td className="rank">{r.rank ?? "—"}</td>
                      )}
                      <th scope="row">
                        <a
                          href={teamDetailLink(
                            d.disputeId,
                            r.teamId,
                            r.registrationId,
                            d.query,
                          )}
                        >
                          {r.name}
                        </a>
                        {r.names.length > 1 && (
                          <small>Nomes na ocasião: {r.names.join(" / ")}</small>
                        )}
                        <small>{r.teamName}</small>
                        <details>
                          <summary>Fonte do nome</summary>
                          <a
                            href={publicDetailLink(
                              `/resultado.html#${r.origin.gameId}`,
                              d.disputeId,
                            )}
                          >
                            Resultado v{r.origin.publicationVersion}
                          </a>
                          <p>{teamStamp(r.origin.publishedAt)}</p>
                        </details>
                      </th>
                      {d.query.columns.map((metric: TeamMetric) => (
                        <td
                          key={metric}
                          title={`${TEAM_METRICS[metric].name}. Cobertura: ${r.metricCoverage[metric]} de ${r.gamesPlayed} jogos publicados.`}
                        >
                          <MetricCell
                            value={r.statistics[metric]}
                            metric={
                              metric === "pointsAgainst" ||
                              metric === "difference"
                                ? undefined
                                : metric
                            }
                            mode={d.query.mode}
                            forceDecimal={
                              d.scoresheet &&
                              d.query.mode === "per-game" &&
                              metric !== "games" &&
                              !metric.endsWith("Percentage")
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        </div>
      </TooltipProvider>
      <TeamPager {...d} kind="inscrições" onChange={onPage} />
    </>
  );
}
export function TeamParticipants({
  data: d,
  onPage,
}: {
  data: Detail;
  onPage: (p: number) => void;
}) {
  if (!d.roster.total)
    return <p>Nenhum participante em jogos publicados neste recorte.</p>;
  const metrics: [StatisticsMetric, string][] = [
    ["points", "PTS"],
    ["foulsCommitted", "FC"],
    ["rebounds", "REB"],
    ["assists", "AST"],
  ];
  return (
    <>
      <p>
        Participantes das ocasiões publicadas, em ordem de camisa. Esta lista
        não representa o elenco atual. J conta quem jogou; DNP não produz
        observações e quem jogou sem ações conserva zero conhecido.
      </p>
      <div
        className="statistics-scroll"
        role="region"
        aria-label="Tabela de participantes históricos"
        tabIndex={0}
      >
        <table>
          <caption>Participantes em jogos publicados</caption>
          <thead>
            <tr>
              {[
                "Camisas",
                "Atleta",
                "Participação",
                "J",
                ...metrics.map(([, v]) => v),
                "Datas de jogos",
              ].map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.roster.items.map((r) => (
              <tr key={r.personId}>
                <td>{r.jerseys.join(" / ")}</td>
                <th scope="row">
                  <a
                    href={publicDetailLink(
                      `/atleta.html#${r.personId}`,
                      d.disputeId,
                    )}
                  >
                    {r.names.join(" / ")}
                  </a>
                  {r.nicknames.some(Boolean) && (
                    <small>{r.nicknames.filter(Boolean).join(" / ")}</small>
                  )}
                </th>
                <td>
                  {r.playedGames
                    ? `${r.relatedGames} relacionados`
                    : "Não participou"}
                </td>
                <td>{r.playedGames}</td>
                {metrics.map(([key]) => {
                  const c = r.statistics?.metrics[key];
                  return (
                    <td
                      key={key}
                      title={
                        r.statistics
                          ? `Cobertura: ${key === "points" ? r.statistics.coverage.scoringGames : key === "foulsCommitted" ? r.statistics.coverage.foulGames : r.statistics.coverage.advancedGames} partidas com esta métrica.`
                          : undefined
                      }
                    >
                      {c?.status === "available" ? (
                        teamNumber.format(c.value)
                      ) : (
                        <span title="Não informado para este cálculo">—</span>
                      )}
                    </td>
                  );
                })}
                <td>
                  {r.firstGameDate
                    ? `${date(r.firstGameDate)} a ${date(r.lastGameDate)}`
                    : "Datas não informadas"}
                  {r.firstGameDate && r.unknownDates && (
                    <small>Há jogos sem data informada.</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        As métricas mantêm a cobertura de cada fonte; valores ausentes não são
        zero. As participações por partida e suas fontes estão nos resultados
        vinculados.
      </p>
      <TeamPager {...d.roster} kind="participantes" onChange={onPage} />
    </>
  );
}
const collectiveLabels = {
  pointsFromTurnovers: "Pontos após erros",
  pointsInPaint: "Pontos no garrafão",
  pointsInPaintMade: "Cestas no garrafão",
  pointsInPaintAttempted: "Tentativas no garrafão",
  secondChancePoints: "Pontos de segunda chance",
  fastBreakPoints: "Pontos de contra-ataque",
  fastBreakPointsFromTurnovers: "Pontos de contra-ataque após erros",
  benchPoints: "Pontos do banco",
  largestLead: "Maior vantagem",
  largestScoringRun: "Maior sequência de pontos",
  pointsPerPossession: "Pontos por posse",
  timeLeadingSeconds: "Tempo à frente (segundos)",
} as const;
export function TeamGames({
  data: d,
  onPage,
}: {
  data: Detail;
  onPage: (p: number) => void;
}) {
  if (!d.games.total) return <p>Nenhum jogo publicado neste recorte.</p>;
  return (
    <>
      <p>
        Ordem da confirmação mais recente. Data, hora e local aparecem quando
        informados; o resultado vinculado abre a versão atual.
      </p>
      <div
        className="statistics-scroll"
        role="region"
        aria-label="Tabela de jogos da inscrição"
        tabIndex={0}
      >
        <table>
          <caption>Jogos da inscrição</caption>
          <thead>
            <tr>
              {[
                "Resultado",
                "Quando e onde",
                "Campeonato e categoria",
                "Coletivos informados",
              ].map((t) => (
                <th key={t} scope="col">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.games.items.map((g) => (
              <tr key={g.gameId}>
                <th scope="row">
                  <a
                    href={publicDetailLink(
                      `/resultado.html#${g.gameId}`,
                      d.disputeId,
                    )}
                  >
                    {g.game.home.name} {g.score.home} × {g.score.away}{" "}
                    {g.game.away.name}
                  </a>
                  <small>
                    <a
                      href={teamDetailLink(
                        d.disputeId,
                        g.game.home.team.id,
                        g.game.home.registrationId,
                      )}
                    >
                      {g.game.home.name}
                    </a>{" "}
                    ·{" "}
                    <a
                      href={teamDetailLink(
                        d.disputeId,
                        g.game.away.team.id,
                        g.game.away.registrationId,
                      )}
                    >
                      {g.game.away.name}
                    </a>
                  </small>
                  <small>
                    Resultado v{g.publicationVersion} ·{" "}
                    {teamStamp(g.publishedAt)}
                  </small>
                </th>
                <td>
                  {date(g.game.date)}
                  {g.game.time ? ` · ${g.game.time}` : ""}
                  {g.game.venue ? ` · ${g.game.venue}` : ""}
                </td>
                <td>
                  {g.context.name} · {g.context.year} · {g.context.gender} ·{" "}
                  {g.context.category}
                  {g.context.division ? ` · ${g.context.division}` : ""}
                </td>
                <td>
                  {g.collective ? (
                    <details>
                      <summary>Ver dados desta partida</summary>
                      <p>
                        {g.game[g.side].name} · PDF v
                        {g.collectiveOrigin?.version}
                      </p>
                      <dl>
                        {Object.entries(collectiveLabels).map(([k, label]) => (
                          <div key={k}>
                            <dt>{label}</dt>
                            <dd>
                              {teamNumber.format(
                                g.collective![
                                  k as keyof typeof collectiveLabels
                                ],
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : (
                    "Não informados"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TeamPager {...d.games} kind="jogos" onChange={onPage} />
    </>
  );
}
