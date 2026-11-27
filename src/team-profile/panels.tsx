import "../ui-system/query-controls.css";
import {
  columnHasDecimal,
  formatStatistic,
  metricColumnStyle,
} from "../ui-system/metric-layout";
import { QueryTableLayout } from "../ui-system/query-table-layout";
import { SearchInput } from "../ui-system/query-controls";
import { useEffect, useState, type ReactNode } from "react";
import type { z } from "zod";
import { api, ApiFailure } from "../competition/api";
import { ColumnPicker } from "../statistics/reference/column-picker";
import {
  ScoresheetStatisticsTable,
  referenceMetric,
} from "../statistics/reference/scoresheet-statistics-table";
import { statisticsPageSchema } from "../statistics/page-contract";
import {
  STATISTICS_METRICS,
  type StatisticsMetric,
} from "../statistics/metrics";
import {
  serializeStatisticsQuery,
  type StatisticsQuery,
  SCORESHEET_PLAYER_COLUMNS,
} from "../statistics/query-contract";
import { teamsListPageSchema } from "../team-statistics/list-contract";
import {
  parseTeamsListQuery,
  serializeTeamsListQuery,
  type TeamsListQuery,
} from "../team-statistics/list-query";
import { TeamsListTable, listMetric } from "../team-statistics/list-table";
import { ScrollableTable } from "../statistics/reference/scrollable-table";
import type { TeamParticipation } from "./model";
import { profilePlayerQuery, profileCollectiveQuery } from "./view-state";
export const number = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
export const showNumber = (v: number | null | undefined) =>
  v == null ? "—" : number.format(v);
export type LegendEntry = { label: string; name: string };
export const campaignLegend: LegendEntry[] = [
  { label: "J", name: "Jogos" },
  { label: "V", name: "Vitórias" },
  { label: "D", name: "Derrotas" },
  { label: "Aprov.", name: "Aproveitamento" },
  { label: "PP", name: "Pontos a favor" },
  { label: "PC", name: "Pontos contra" },
  { label: "SLD", name: "Saldo de pontos" },
];
export function Legend({ entries }: { entries: LegendEntry[] }) {
  return entries.length ? (
    <section className="table-legend reference-legend" aria-label="Legenda">
      <h2>Legenda</h2>
      <dl>
        {[
          ...new Map(entries.map((m) => [`${m.label}: ${m.name}`, m])).values(),
        ].map((m) => (
          <div key={`${m.label}: ${m.name}`}>
            <dt>{m.label}</dt>
            <dd>{m.name}</dd>
          </div>
        ))}
      </dl>
    </section>
  ) : null;
}
function useResource<T>(path: string, schema: z.ZodType<T>, identity: string) {
  const [attempt, retry] = useState(0);
  const [state, setState] = useState<{
    key: string;
    identity: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ key: "", identity: "", data: null, error: "", loading: true });
  useEffect(() => {
    const c = new AbortController();
    setState((previous) => ({
      key: path,
      identity,
      data: previous.identity === identity ? previous.data : null,
      error: "",
      loading: true,
    }));
    void api(path, schema, undefined, c.signal)
      .then((data) => {
        if (!c.signal.aborted)
          setState({ key: path, identity, data, error: "", loading: false });
      })
      .catch((error) => {
        if (!c.signal.aborted)
          setState({
            key: path,
            identity,
            data: null,
            error:
              error instanceof ApiFailure && error.status === 404
                ? "Ainda não há estatísticas publicadas neste recorte."
                : "Não foi possível carregar as estatísticas. Tente novamente.",
            loading: false,
          });
      });
    return () => c.abort();
  }, [path, schema, attempt, identity]);
  const current =
    state.key === path
      ? state
      : {
          data: state.identity === identity ? state.data : null,
          error: "",
          loading: true,
        };
  return {
    data: current.data,
    error: current.error,
    loading: current.loading,
    retry: () => retry((n) => n + 1),
  };
}
function ResourceMessage({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return loading ? (
    <p role="status">Consultando estatísticas…</p>
  ) : error ? (
    <div role="alert">
      <p>{error}</p>
      <button onClick={retry}>Tentar novamente</button>
    </div>
  ) : null;
}
export function ModeButtons({
  value,
  onChange,
}: {
  value: string;
  onChange: (mode: "total" | "per-game") => void;
}) {
  return (
    <div className="segmented" role="group" aria-label="Valores">
      <button
        type="button"
        aria-pressed={value === "total"}
        onClick={() => onChange("total")}
      >
        Total
      </button>
      <button
        type="button"
        aria-pressed={value !== "total"}
        onClick={() => onChange("per-game")}
      >
        Por jogo
      </button>
    </div>
  );
}
function ScopeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (scope: "all" | "regular" | "playoffs") => void;
}) {
  return (
    <label className="bb-query-field">
      <span className="bb-query-label">Fase</span>
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value as "all" | "regular" | "playoffs")
        }
      >
        <option value="all">Todas as fases</option>
        <option value="regular">Classificatória</option>
        <option value="playoffs">Eliminatórias</option>
      </select>
    </label>
  );
}
const sheetKeys = SCORESHEET_PLAYER_COLUMNS;
function noPlayoffGames(p: TeamParticipation) {
  if (!p.standings) return false;
  const assigned = new Set(
    p.standings.definition.series.flatMap((s) => s.games.map((g) => g.gameId)),
  );
  return !p.standings.games.some(
    (g) => g.stageKind === "knockout" || assigned.has(g.id),
  );
}
function emptyStatistics(p: TeamParticipation, scope: string) {
  return scope === "playoffs" && noPlayoffGames(p)
    ? "Ainda não há jogos disponíveis na fase eliminatória."
    : scope === "playoffs"
      ? "Ainda não há estatísticas disponíveis na fase eliminatória."
      : "Nenhum jogador encontrado neste recorte.";
}
export function PlayersPanel({
  participation: p,
  query,
  change,
}: {
  participation: TeamParticipation;
  query: string;
  change: (query: string) => void;
}) {
  const q = profilePlayerQuery(query, p.registrationId);
  const resource = useResource(
    `/api/public/statistics/${p.disputeId}?${serializeStatisticsQuery(q)}`,
    statisticsPageSchema,
    `${p.disputeId}/${p.registrationId}`,
  );
  const valid =
    !resource.data ||
    (resource.data.disputeId === p.disputeId &&
      resource.data.rows.every((r) => r.registrationId === p.registrationId));
  const data = valid ? resource.data : null;
  const available =
    data?.hasBoxscore === false
      ? sheetKeys
      : (Object.keys(STATISTICS_METRICS) as StatisticsMetric[]);
  const columns = q.columns.filter((k) => available.includes(k));
  const visibleColumns = data
    ? (data.hasBoxscore === false ? sheetKeys : data.columns).filter((k) =>
        columns.includes(k),
      )
    : [];
  const update = (patch: Partial<StatisticsQuery>) =>
    change(serializeStatisticsQuery({ ...q, ...patch }).toString());
  return (
    <>
      <div className="team-profile-toolbar team-profile-player-controls">
        <label className="grow bb-query-field">
          <span className="bb-query-label">Jogador</span>
          <SearchInput
            type="search"
            value={q.search}
            placeholder="Buscar jogador…"
            onChange={(e) => update({ search: e.target.value, page: 1 })}
          />
        </label>
        <ScopeSelect
          value={q.scope}
          onChange={(scope) => update({ scope, page: 1 })}
        />
        <ColumnPicker
          options={available.map((k) => ({ key: k, ...referenceMetric(k) }))}
          value={columns}
          onChange={(keys) =>
            update({
              columns: keys as StatisticsMetric[],
              preset: "custom",
              page: 1,
            })
          }
        />
        <ModeButtons
          value={q.mode}
          onChange={(mode) => update({ mode, page: 1 })}
        />
      </div>
      <div className="team-profile-query-status" aria-live="polite">
        <ResourceMessage
          {...resource}
          error={
            valid
              ? resource.error
              : "As estatísticas retornaram outra inscrição. Tente novamente."
          }
        />
      </div>
      <section
        className="team-profile-player-results reference-explorer"
        aria-label="Resultado da consulta"
        aria-busy={resource.loading}
      >
        {data && (
          <>
            {data.total === 0 && (
              <p role="status">
                {q.search || q.filters.length
                  ? "Nenhum jogador encontrado neste recorte."
                  : emptyStatistics(p, q.scope)}
              </p>
            )}
            <ScoresheetStatisticsTable
              data={{
                ...data,
                columns: visibleColumns,
              }}
              showTeam={false}
              teamProfile
              onSort={(sort) =>
                update({
                  sort,
                  direction:
                    q.sort === sort && q.direction === "desc" ? "asc" : "desc",
                  page: 1,
                })
              }
              compare={[]}
              comparisonEnabled={false}
              onCompare={() => undefined}
            />
            {data.totalPages > 1 && (
              <nav
                className="team-profile-pager"
                aria-label="Páginas de jogadores"
              >
                <button
                  disabled={data.page <= 1}
                  onClick={() => update({ page: data.page - 1 })}
                >
                  Anterior
                </button>
                <span>
                  Página {data.page} de {data.totalPages}
                </span>
                <button
                  disabled={data.page >= data.totalPages}
                  onClick={() => update({ page: data.page + 1 })}
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        )}
      </section>
      <Legend entries={visibleColumns.map(referenceMetric)} />
    </>
  );
}
export function CollectivePanel({
  participation: p,
  query,
  change,
  after,
  extraLegend = [],
}: {
  participation: TeamParticipation;
  query: string;
  change: (query: string) => void;
  after?: ReactNode;
  extraLegend?: LegendEntry[];
}) {
  const q = profileCollectiveQuery(query);
  const resource = useResource(
    `/api/public/teams/${p.disputeId}?${serializeTeamsListQuery(q)}`,
    teamsListPageSchema,
    p.disputeId,
  );
  const valid = !resource.data || resource.data.disputeId === p.disputeId;
  const data = valid ? resource.data : null;
  const update = (patch: Partial<TeamsListQuery>) =>
    change(serializeTeamsListQuery({ ...q, ...patch }).toString());
  return (
    <>
      <section className="team-profile-section team-profile-collective">
        <QueryTableLayout>
          <div className="team-profile-section-head">
            <h2>Estatísticas coletivas</h2>
          </div>
          <div className="team-profile-toolbar team-profile-mode-toolbar">
            <ScopeSelect
              value={q.scope}
              onChange={(scope) => update({ scope })}
            />
            <ModeButtons value={q.mode} onChange={(mode) => update({ mode })} />
          </div>
          <ResourceMessage
            {...resource}
            error={
              valid
                ? resource.error
                : "As estatísticas retornaram outra disputa. Tente novamente."
            }
          />
          {data?.total === 0 && q.scope === "playoffs" && (
            <p role="status">{emptyStatistics(p, q.scope)}</p>
          )}
          {data && (
            <TeamsListTable
              data={data}
              showLegend={false}
              highlightRegistrationId={p.registrationId}
              onSort={(sort) =>
                update({
                  sort,
                  direction:
                    q.sort === sort && q.direction === "desc" ? "asc" : "desc",
                })
              }
            />
          )}
        </QueryTableLayout>
      </section>
      {after}
      <Legend
        entries={[
          ...extraLegend,
          ...(data?.query.columns.map((k) => listMetric(k, data.scoresheet)) ??
            []),
        ]}
      />
    </>
  );
}
const globalColumns = [
  "games",
  "points",
  "twoMade",
  "threeMade",
  "freeThrowsMade",
  "freeThrowPercentage",
  "foulsCommitted",
  "pointsAgainst",
  "difference",
] as const;
export function ParticipationStatistics({
  participations,
  mode,
  link,
}: {
  participations: TeamParticipation[];
  mode: "total" | "per-game";
  link: (p: TeamParticipation) => string;
}) {
  type Row = {
    p: TeamParticipation;
    values: z.infer<typeof teamsListPageSchema>["rows"][number] | null;
  };
  const key =
    participations.map((p) => `${p.disputeId}/${p.registrationId}`).join() +
    mode;
  const [result, setResult] = useState<{
    key: string;
    rows: Row[];
    error: string;
  }>({ key: "", rows: [], error: "" });
  const [attempt, retry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    void (async () => {
      const rows: Row[] = [];
      const ids = [...new Set(participations.map((p) => p.disputeId))];
      for (let offset = 0; offset < ids.length; offset += 3) {
        await Promise.all(
          ids.slice(offset, offset + 3).map(async (id) => {
            const q = parseTeamsListQuery(new URLSearchParams(`mode=${mode}`));
            let data: z.infer<typeof teamsListPageSchema> | null = null;
            try {
              data = await api(
                `/api/public/teams/${id}?${serializeTeamsListQuery(q)}`,
                teamsListPageSchema,
                undefined,
                c.signal,
              );
            } catch (e) {
              if (!(e instanceof ApiFailure && e.status === 404)) throw e;
            }
            for (const p of participations.filter((p) => p.disputeId === id))
              rows.push({
                p,
                values:
                  data?.rows.find(
                    (r) => r.registrationId === p.registrationId,
                  ) ?? null,
              });
          }),
        );
      }
      if (!c.signal.aborted)
        setResult({
          key,
          rows: rows.sort(
            (a, b) =>
              b.p.context.year - a.p.context.year ||
              a.p.name.localeCompare(b.p.name),
          ),
          error: "",
        });
    })().catch(() => {
      if (!c.signal.aborted)
        setResult({
          key,
          rows: [],
          error:
            "Não foi possível consultar as participações. Tente novamente.",
        });
    });
    return () => c.abort();
  }, [key, participations, mode, attempt]);
  return (
    <>
      <ResourceMessage
        loading={result.key !== key}
        error={result.key === key ? result.error : ""}
        retry={() => retry((n) => n + 1)}
      />
      {result.key === key && !result.error && (
        <ScrollableTable label="Estatísticas por participação">
          <table className="statistics-table team-profile-participation-table">
            <thead>
              <tr>
                <th scope="col">Participação</th>
                {globalColumns.map((k) => (
                  <th
                    scope="col"
                    key={k}
                    className="bb-metric-column"
                    style={metricColumnStyle(
                      result.rows.map((row) => ({
                        value: row.values?.statistics[k].value ?? null,
                        averageDivisor: listMetric(k).normalizable
                          ? row.values?.metricCoverage[k]
                          : undefined,
                        totalFactor:
                          mode === "per-game" && listMetric(k).normalizable
                            ? row.values?.metricCoverage[k]
                            : 1,
                      })),
                      listMetric(k).label.includes("%"),
                    )}
                  >
                    {listMetric(k).label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map(({ p, values }) => (
                <tr key={`${p.disputeId}/${p.registrationId}`}>
                  <th scope="row">
                    <a href={link(p)}>{p.context.name}</a>
                    <small>
                      {p.context.year} · {p.context.category} ·{" "}
                      {p.context.gender}
                      {p.context.division ? ` · ${p.context.division}` : ""}
                    </small>
                  </th>
                  {globalColumns.map((k) => (
                    <td key={k} className="bb-metric-value">
                      {formatStatistic(
                        values?.statistics[k].value,
                        (mode === "per-game" && listMetric(k).normalizable) ||
                          columnHasDecimal(
                            result.rows.map(
                              (row) => row.values?.statistics[k].value,
                            ),
                          ),
                      )}
                      {values?.statistics[k].value != null &&
                      k === "freeThrowPercentage"
                        ? "%"
                        : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>
      )}
      <Legend entries={globalColumns.map((k) => listMetric(k))} />
    </>
  );
}
