import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  PublicHeader,
  PublicBreadcrumb,
  PublicFooter,
} from "../public-ui/shell";
import { TeamFilter } from "./reference/team-filter";
import { ColumnPicker } from "./reference/column-picker";
import { TooltipProvider } from "./reference/tooltip";
import {
  ScoresheetStatisticsTable,
  StatisticsLegend,
  referenceMetric,
} from "./reference/scoresheet-statistics-table";
import { ResourceState } from "./reference/resource-state";
import { api, ApiFailure } from "../competition/api";
import { statisticsPageSchema, type StatisticsPage } from "./page-contract";
import { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
import {
  parseStatisticsQuery,
  serializeStatisticsQuery,
  updateStatisticsQuery,
  STATISTICS_COLUMN_PRESETS,
  type StatisticsQuery,
} from "./query-contract";

const metricKeys = Object.keys(STATISTICS_METRICS) as StatisticsMetric[];
const scoreKeys: StatisticsMetric[] = [
  "games",
  "points",
  "pointsPerGame",
  "pointsShare",
  "twoMade",
  "threeMade",
  "freeMade",
  "foulsCommitted",
  "technicalFouls",
  "unsportsmanlikeFouls",
  "fiveFouls",
  "disqualifications",
];
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const display = (values: string[]) =>
  values.length === 1 ? values[0] : "var.";
type Row = StatisticsPage["rows"][number];
function Cell({ value }: { value: Row["metrics"][StatisticsMetric] }) {
  return value.status === "available" ? (
    <>{number.format(value.value)}</>
  ) : value.status === "insufficient-sample" ? (
    <span
      className="statistics-insufficient"
      aria-label="Amostra insuficiente"
      title="Amostra temporal abaixo do mínimo da publicação"
    >
      -
    </span>
  ) : (
    <span title="Não informado para este cálculo">—</span>
  );
}
function location() {
  const [id = "", search = ""] = window.location.hash.slice(1).split("?", 2);
  const params = new URLSearchParams(search);
  if (params.get("view") === "boxscore") params.set("dataset", "boxscore");
  if (!params.has("mode")) params.set("mode", "total");
  const query = parseStatisticsQuery(params);
  const saved = sessionStorage.getItem("statistics-selected-columns");
  if (!params.has("columns") && saved !== null) {
    query.preset = "custom";
    query.columns = saved
      .split(",")
      .filter((key): key is StatisticsMetric =>
        Object.hasOwn(STATISTICS_METRICS, key),
      );
  } else if (
    !params.has("columns") &&
    window.matchMedia("(max-width: 600px)").matches
  ) {
    query.preset = "custom";
    query.columns = query.columns.filter(
      (key) =>
        ![
          "technicalFouls",
          "unsportsmanlikeFouls",
          "fiveFouls",
          "disqualifications",
        ].includes(key),
    );
  }
  return {
    id: z.uuid().safeParse(id).success ? id.toLowerCase() : null,
    query,
  };
}
export function StatisticsPageView() {
  const [route, setRoute] = useState(location),
    [draft, setDraft] = useState(route.query),
    [data, setData] = useState<StatisticsPage | null>(null),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [share, setShare] = useState(false),
    [comparisonEnabled, setComparisonEnabled] = useState(
      route.query.compare.length > 0,
    ),
    [showTeam, setShowTeam] = useState(
      () => sessionStorage.getItem("statistics-team-column") !== "hidden",
    );
  const form = useRef<HTMLFormElement>(null),
    resultHeading = useRef<HTMLHeadingElement>(null),
    focusResult = useRef(false),
    focusTarget = useRef<string | null>(null),
    shareInput = useRef<HTMLInputElement>(null),
    responsiveColumns = useRef(
      !new URLSearchParams(window.location.hash.split("?")[1] ?? "").has(
        "columns",
      ) && sessionStorage.getItem("statistics-selected-columns") === null,
    );
  useEffect(() => {
    const read = () => {
      const next = location();
      setRoute(next);
      setDraft(next.query);
      setShare(false);
    };
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const serialized = serializeStatisticsQuery(route.query).toString();
  useEffect(() => {
    if (!route.id) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setData((current) => (current?.disputeId === route.id ? current : null));
    setError(null);
    setLoading(true);
    void api(
      `/api/public/statistics/${route.id}?${serialized}`,
      statisticsPageSchema,
      undefined,
      controller.signal,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        const requested = parseStatisticsQuery(new URLSearchParams(serialized));
        if (
          next.disputeId !== route.id ||
          next.mode !== requested.mode ||
          next.scope !== requested.scope ||
          next.dataset !== requested.dataset ||
          next.compared.some((r) => !requested.compare.includes(r.personId))
        )
          throw new ApiFailure(
            503,
            "A resposta não corresponde à consulta. Tente novamente.",
          );
        setData(next);
        const canonical = serializeStatisticsQuery({
          ...requested,
          page: next.page,
        });
        window.history.replaceState(null, "", `#${route.id}?${canonical}`);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [route.id, serialized, retry]);
  useLayoutEffect(() => {
    if (!data) return;
    // Network completion does not imply that React has committed the replacement table.
    if (focusTarget.current) {
      const target = focusTarget.current;
      focusTarget.current = null;
      (document.getElementById(target) ?? resultHeading.current)?.focus();
    } else if (focusResult.current) {
      focusResult.current = false;
      resultHeading.current?.focus();
    }
  }, [data]);
  function navigate(next: StatisticsQuery, focus = false, validate = true) {
    if (!route.id || (validate && !form.current?.reportValidity())) return;
    const normalized = parseStatisticsQuery(serializeStatisticsQuery(next));
    focusResult.current = focus;
    setDraft(normalized);
    const hash = `#${route.id}?${serializeStatisticsQuery(normalized)}`;
    if (window.location.hash === hash) {
      setRetry((n) => n + 1);
    } else window.location.hash = hash;
  }
  function quickChange(patch: Partial<StatisticsQuery>) {
    navigate(updateStatisticsQuery(draft, patch), false, false);
  }
  function change(patch: Partial<StatisticsQuery>, focus = false) {
    navigate(updateStatisticsQuery(draft, patch), focus);
  }
  useEffect(() => {
    if (draft.search === route.query.search) return;
    const timer = window.setTimeout(
      () => navigate(updateStatisticsQuery(draft, { page: 1 }), false, false),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [draft.search, route.query.search]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 600px)");
    const resize = () => {
      if (
        !responsiveColumns.current ||
        (draft.preset !== "essentials" && draft.preset !== "custom")
      )
        return;
      const columns = scoreKeys.filter(
        (key) =>
          !media.matches ||
          ![
            "technicalFouls",
            "unsportsmanlikeFouls",
            "fiveFouls",
            "disqualifications",
          ].includes(key),
      );
      navigate(
        updateStatisticsQuery(draft, { preset: "custom", columns }),
        false,
        false,
      );
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, [serialized]);
  function selectColumns(columns: StatisticsMetric[], team = showTeam) {
    responsiveColumns.current = false;
    setShowTeam(team);
    sessionStorage.setItem(
      "statistics-team-column",
      team ? "visible" : "hidden",
    );
    sessionStorage.setItem("statistics-selected-columns", columns.join(","));
    const sort =
      columns.length > 0 &&
      draft.sort !== "player" &&
      draft.sort !== "team" &&
      !columns.includes(draft.sort)
        ? columns.includes("points")
          ? "points"
          : columns[0]
        : draft.sort;
    quickChange({
      preset: "custom",
      columns,
      sort,
      direction: sort === draft.sort ? draft.direction : "desc",
    });
  }
  function togglePerson(id: string, focusId?: string) {
    const compared = draft.compare.includes(id)
      ? draft.compare.filter((v) => v !== id)
      : [...draft.compare, id];
    if (compared.length <= 2) {
      focusTarget.current = focusId ?? null;
      change({ compare: compared }, !focusId);
    }
  }
  function filter(
    index: number,
    patch: Partial<StatisticsQuery["filters"][number]>,
  ) {
    setDraft({
      ...draft,
      filters: draft.filters.map((f, i) =>
        i === index ? { ...f, ...patch } : f,
      ),
    });
  }
  const minimumGames =
    draft.filters.find((f) => f.metric === "games" && f.operator === ">=")
      ?.value ?? 0;
  const namesByPerson = new Map<string, string[]>();
  for (const r of data?.compared ?? [])
    namesByPerson.set(r.personId, [
      ...new Set([...(namesByPerson.get(r.personId) ?? []), ...r.names]),
    ]);
  const compareNames = [...namesByPerson.entries()].map(
    ([id, names]) => [id, names.join(" / ")] as const,
  );
  return (
    <div className="public-site statistics-public">
      <TooltipProvider>
        <a
          className="skip"
          href="#statistics-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("statistics-content")?.focus();
          }}
        >
          Ir para estatísticas
        </a>
        <PublicHeader />
        <main id="statistics-content" tabIndex={-1} className="wrap">
          <PublicBreadcrumb page="Estatísticas" />
          <h1 className="sr-only">Estatísticas dos atletas</h1>
          {route.query.dataset === "boxscore" && (
            <p>Esta consulta inclui somente jogos com boxscore publicado.</p>
          )}
          {!route.id ? (
            <p role="alert">Abra as estatísticas a partir de uma disputa.</p>
          ) : (
            <>
              <section
                className="statistics"
                aria-label="Estatísticas e filtros"
              >
                <form
                  className="filters"
                  role="search"
                  aria-label="Filtrar atletas"
                  onSubmit={(e) => {
                    e.preventDefault();
                    quickChange({ search: draft.search, page: 1 });
                  }}
                >
                  <label className="search-label" htmlFor="search">
                    Buscar atleta
                    <div className="search-field">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <circle cx="10.5" cy="10.5" r="6.5" />
                        <path d="m16 16 4.5 4.5" />
                      </svg>
                      <input
                        id="search"
                        type="search"
                        aria-label="Buscar atleta ou equipe"
                        placeholder="Nome do atleta"
                        autoComplete="off"
                        maxLength={80}
                        value={draft.search}
                        onChange={(e) =>
                          setDraft({ ...draft, search: e.target.value })
                        }
                      />
                    </div>
                  </label>
                  <TeamFilter
                    options={(data?.teams ?? []).map((t) => ({
                      id: t.id,
                      name: t.names.join(" / "),
                    }))}
                    value={draft.teams ?? (data?.teams ?? []).map((t) => t.id)}
                    onChange={(teams) =>
                      quickChange({
                        teams:
                          teams.length === data?.teams.length ? null : teams,
                        page: 1,
                      })
                    }
                  />
                  <label htmlFor="minimum">
                    Mínimo de jogos <span className="optional">opcional</span>
                    <input
                      id="minimum"
                      type="number"
                      aria-label="Mínimo de jogos"
                      min={1}
                      max={9999}
                      step={1}
                      inputMode="numeric"
                      placeholder="Sem restrição"
                      value={minimumGames || ""}
                      onChange={(e) => {
                        const n = Number(e.currentTarget.value);
                        if (!Number.isSafeInteger(n) || n < 0 || n > 9999)
                          return;
                        quickChange({
                          filters: [
                            ...draft.filters.filter(
                              (f) =>
                                !(f.metric === "games" && f.operator === ">="),
                            ),
                            ...(n
                              ? [
                                  {
                                    metric: "games" as const,
                                    operator: ">=" as const,
                                    value: n,
                                  },
                                ]
                              : []),
                          ],
                          page: 1,
                        });
                      }}
                    />
                  </label>
                  <button
                    className="clear-button"
                    type="button"
                    onClick={() =>
                      quickChange({
                        search: "",
                        teams: null,
                        filters: [],
                        page: 1,
                      })
                    }
                  >
                    Limpar filtros
                  </button>
                </form>
                <div className="table-toolbar">
                  <p role="status" aria-live="polite">
                    {loading
                      ? "Carregando atletas…"
                      : data && !error
                        ? `${data.total} ${data.total === 1 ? "registro por equipe" : "registros por equipe"} · Página ${data.page} de ${data.totalPages}`
                        : ""}
                  </p>
                  <div className="table-display-controls">
                    <ColumnPicker
                      options={[
                        { key: "team", label: "Equipe", name: "" },
                        ...[...new Set([...scoreKeys, ...draft.columns])].map(
                          (key) => ({
                            key,
                            label: referenceMetric(key).label,
                            name: STATISTICS_METRICS[key].name,
                          }),
                        ),
                      ]}
                      value={[...(showTeam ? ["team"] : []), ...draft.columns]}
                      onChange={(keys) =>
                        selectColumns(
                          keys.filter((k): k is StatisticsMetric =>
                            Object.hasOwn(STATISTICS_METRICS, k),
                          ),
                          keys.includes("team"),
                        )
                      }
                    />
                    <fieldset className="mode-control">
                      <legend>Arremessos e faltas</legend>
                      <div className="segmented">
                        <button
                          type="button"
                          aria-pressed={draft.mode === "total"}
                          onClick={() =>
                            quickChange({ mode: "total", page: 1 })
                          }
                        >
                          Totais
                        </button>
                        <button
                          type="button"
                          aria-pressed={draft.mode === "per-game"}
                          onClick={() =>
                            quickChange({ mode: "per-game", page: 1 })
                          }
                        >
                          Por jogo
                        </button>
                      </div>
                    </fieldset>
                  </div>
                </div>
                <p className="scroll-hint">
                  Deslize a tabela para ver todas as estatísticas{" "}
                  <span aria-hidden="true">↔</span>
                </p>
                {loading && !data && (
                  <ResourceState
                    kind="loading"
                    title="Carregando estatísticas"
                    detail="Aguarde um instante."
                  />
                )}
                {error ? (
                  <ResourceState
                    kind={
                      error instanceof ApiFailure && error.status === 404
                        ? "empty"
                        : "error"
                    }
                    title={
                      error instanceof ApiFailure && error.status === 404
                        ? "Ainda não há resultados publicados"
                        : "Não foi possível consultar as estatísticas"
                    }
                    detail={
                      error instanceof Error
                        ? error.message
                        : "Tente novamente em alguns instantes."
                    }
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          focusResult.current = true;
                          setRetry((n) => n + 1);
                        }}
                      >
                        Tentar novamente
                      </button>
                    }
                  />
                ) : null}
                {data && !error && (
                  <section
                    aria-label="Resultado da consulta"
                    aria-busy={loading}
                  >
                    <h2
                      className="statistics-result-heading"
                      ref={resultHeading}
                      tabIndex={-1}
                    >
                      Participações no contexto
                    </h2>
                    {!data.total ? (
                      <ResourceState
                        kind="empty"
                        title="Nenhum atleta encontrado"
                        detail="Nenhuma participação atende à consulta."
                        action={
                          <button
                            type="button"
                            onClick={() => {
                              quickChange({
                                search: "",
                                teams: null,
                                filters: [],
                                page: 1,
                              });
                              document.getElementById("search")?.focus();
                            }}
                          >
                            Limpar filtros
                          </button>
                        }
                      />
                    ) : (
                      <ScoresheetStatisticsTable
                        data={data}
                        showTeam={showTeam}
                        compare={draft.compare}
                        comparisonEnabled={
                          comparisonEnabled || draft.compare.length > 0
                        }
                        onCompare={togglePerson}
                        onSort={(key) =>
                          quickChange({
                            sort: key,
                            direction:
                              draft.sort === key && draft.direction === "desc"
                                ? "asc"
                                : "desc",
                          })
                        }
                      />
                    )}
                    <StatisticsLegend columns={data.columns} />
                    <nav
                      className="statistics-actions"
                      aria-label="Paginação estatística"
                    >
                      <button
                        className="statistics-secondary"
                        disabled={data.page <= 1}
                        onClick={() => change({ page: data.page - 1 }, true)}
                      >
                        Página anterior
                      </button>
                      <span>
                        {data.page} / {data.totalPages}
                      </span>
                      <button
                        className="statistics-secondary"
                        disabled={data.page >= data.totalPages}
                        onClick={() => change({ page: data.page + 1 }, true)}
                      >
                        Próxima página
                      </button>
                    </nav>
                    {!!draft.compare.length && (
                      <section aria-label="Comparação de atletas">
                        <h2>Comparação</h2>
                        <p>
                          O resumo considera todas as inscrições do atleta neste
                          recorte. A tabela seguinte preserva cada inscrição.
                        </p>
                        <div
                          className="statistics-scroll"
                          role="region"
                          aria-label="Resumo comparativo rolável"
                          tabIndex={0}
                        >
                          <table aria-label="Resumo comparativo dos atletas">
                            <thead>
                              <tr>
                                <th>Métrica</th>
                                {data.comparisonSummaries.map((s) => (
                                  <th key={s.personId}>
                                    Resumo: {s.names.join(" / ")}
                                    <small>
                                      {s.registrationIds.length} inscrições ·{" "}
                                      {s.gamesPlayed} jogos
                                    </small>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {data.columns.map((key) => (
                                <tr key={key}>
                                  <th scope="row">
                                    {STATISTICS_METRICS[key].name}
                                  </th>
                                  {data.comparisonSummaries.map((s, i) => {
                                    const state =
                                        data.comparisonStates[key][
                                          i === 0 ? "left" : "right"
                                        ],
                                      cell = s.metrics[key],
                                      description =
                                        state === "better"
                                          ? "Melhor valor"
                                          : state === "worse"
                                            ? "Pior valor"
                                            : state === "equal"
                                              ? "Mesmo valor"
                                              : "Sem comparação";
                                    return (
                                      <td
                                        key={s.personId}
                                        className={`statistics-comparison-${state}`}
                                        aria-label={`${description}: ${cell.status === "available" ? number.format(cell.value) : cell.status === "insufficient-sample" ? "-" : "—"}`}
                                      >
                                        <Cell value={cell} />
                                        <small aria-hidden="true">
                                          {description}
                                        </small>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p>
                          Inscrições são exibidas separadamente. ER, FC e GD têm
                          melhor valor quando menores. A ausência não recebe
                          valor nem vence uma comparação.
                        </p>
                        {compareNames.map(([id, name]) => (
                          <button
                            key={id}
                            className="statistics-secondary"
                            onClick={() => togglePerson(id)}
                          >
                            Remover {name} da comparação
                          </button>
                        ))}
                        {draft.compare.some(
                          (id) => !data.compared.some((r) => r.personId === id),
                        ) && (
                          <p>
                            Um atleta selecionado não tem participação neste
                            recorte.
                          </p>
                        )}
                        <div
                          className="statistics-scroll"
                          role="region"
                          aria-label="Tabela comparativa rolável"
                          tabIndex={0}
                        >
                          <table>
                            <thead>
                              <tr>
                                <th>Atleta</th>
                                <th>Inscrição</th>
                                {data.columns.map((key) => (
                                  <th
                                    key={key}
                                    title={STATISTICS_METRICS[key].name}
                                  >
                                    {STATISTICS_METRICS[key].label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {data.compared.map((r) => (
                                <tr key={`${r.personId}/${r.registrationId}`}>
                                  <th scope="row" title={r.names.join(" / ")}>
                                    <a href={`/atleta.html#${r.personId}`}>
                                      {display(r.names)}
                                    </a>
                                  </th>
                                  <td title={r.registrationNames.join(" / ")}>
                                    <a
                                      href={`/equipe.html#${r.teamId}?disputeId=${data.disputeId}&registrationId=${r.registrationId}`}
                                    >
                                      {display(r.registrationNames)}
                                    </a>
                                  </td>
                                  {data.columns.map((key) => (
                                    <td key={key}>
                                      <Cell value={r.metrics[key]} />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}
                  </section>
                )}
              </section>
            </>
          )}
          {data && (
            <>
              <details className="statistics-explanation">
                <summary>Fonte e cobertura dos dados</summary>
                <p>
                  Fonte confirmada v{data.version} ·{" "}
                  {new Date(data.confirmedAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}{" "}
                  (UTC−03).
                </p>
                <p>
                  Cobertura de fases: {data.coverage.regularGames} regulares,{" "}
                  {data.coverage.playoffGames} eliminatórias e{" "}
                  {data.coverage.unclassifiedGames} sem fase confirmada. Jogos
                  sem fase aparecem somente em Todos.
                </p>
                {data.scope !== "all" &&
                  data.coverage.unclassifiedGames > 0 && (
                    <button
                      className="statistics-secondary"
                      onClick={() => change({ scope: "all" })}
                    >
                      Ver todos os jogos confirmados
                    </button>
                  )}
                <p>
                  Mínimo para o cálculo por 30:{" "}
                  {number.format(data.minimumSeconds)} segundos cobertos. PTS e
                  cestas por30 usam a fonte avançada com minutos; o fallback
                  manual não fornece minutos.
                </p>
                <p>
                  “—” = não informado; “-” = amostra insuficiente; “var.” =
                  varia entre as ocasiões confirmadas. Células destacadas são
                  líderes da consulta antes da paginação, incluindo empates.
                  REB/AST e demais médias usam apenas os jogos que cobrem aquela
                  métrica.
                </p>
              </details>
            </>
          )}
          <details className="statistics-advanced">
            <summary>Mais filtros e opções</summary>
            <form
              ref={form}
              className="statistics-controls"
              onSubmit={(e) => {
                e.preventDefault();
                change({ page: 1 }, true);
              }}
            >
              <label className="statistics-check">
                <input
                  type="checkbox"
                  checked={comparisonEnabled || draft.compare.length > 0}
                  onChange={(e) => setComparisonEnabled(e.target.checked)}
                />
                Comparar atletas na tabela
              </label>
              <div className="statistics-fields">
                <label>
                  Modo
                  <select
                    value={draft.mode}
                    onChange={(e) =>
                      change({
                        mode: e.target.value as StatisticsQuery["mode"],
                      })
                    }
                  >
                    <option value="per-game">Por jogo</option>
                    <option value="total">Total</option>
                    <option value="per-30">Por 30 minutos</option>
                  </select>
                </label>
                <label>
                  Escopo
                  <select
                    value={draft.scope}
                    onChange={(e) =>
                      change({
                        scope: e.target.value as StatisticsQuery["scope"],
                      })
                    }
                  >
                    <option value="regular">Fase regular</option>
                    <option value="playoffs">Eliminatórias</option>
                    <option value="all">Todos</option>
                  </select>
                </label>
                <label>
                  Busca avançada
                  <input
                    type="search"
                    maxLength={80}
                    value={draft.search}
                    onChange={(e) =>
                      setDraft({ ...draft, search: e.target.value })
                    }
                  />
                </label>
                <label>
                  Ordenar por
                  <select
                    value={draft.sort}
                    onChange={(e) =>
                      change({
                        sort: e.target.value as StatisticsQuery["sort"],
                      })
                    }
                  >
                    <option value="player">Atleta</option>
                    <option value="team">Inscrição</option>
                    {metricKeys
                      .filter((k) => draft.mode !== "per-30" || k !== "minutes")
                      .map((k) => (
                        <option key={k} value={k}>
                          {STATISTICS_METRICS[k].name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Direção
                  <select
                    value={draft.direction}
                    onChange={(e) =>
                      change({ direction: e.target.value as "asc" | "desc" })
                    }
                  >
                    <option value="desc">Decrescente</option>
                    <option value="asc">Crescente</option>
                  </select>
                </label>
                <label>
                  Conjunto de colunas
                  <select
                    value={draft.preset}
                    onChange={(e) => {
                      responsiveColumns.current = false;
                      const preset = e.target
                        .value as StatisticsQuery["preset"];
                      const columns =
                        preset === "custom"
                          ? draft.columns
                          : [...STATISTICS_COLUMN_PRESETS[preset]];
                      sessionStorage.setItem(
                        "statistics-selected-columns",
                        columns.join(","),
                      );
                      change({ preset, columns });
                    }}
                  >
                    <option value="essentials">Essenciais do boxscore</option>
                    <option value="simple">Súmula</option>
                    <option value="all">Todas</option>
                    <option value="custom">Personalizadas</option>
                  </select>
                </label>
              </div>
              <details>
                <summary>Personalizar colunas</summary>
                <fieldset className="statistics-column-options">
                  <legend>Colunas visíveis</legend>
                  {metricKeys.map((key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={draft.columns.includes(key)}
                        disabled={key === "minutes" && draft.mode === "per-30"}
                        onChange={(e) =>
                          selectColumns(
                            e.target.checked
                              ? [...draft.columns, key]
                              : draft.columns.filter((k) => k !== key),
                          )
                        }
                      />
                      {STATISTICS_METRICS[key].name} (
                      {STATISTICS_METRICS[key].label})
                    </label>
                  ))}
                </fieldset>
              </details>
              {draft.mode === "per-30" && (
                <p>
                  MIN fica oculta neste modo e volta ao trocar de modo. J,
                  percentuais, GD e saldo em quadra não são escalados.
                </p>
              )}
              <fieldset>
                <legend>Equipes</legend>
                <label className="statistics-check">
                  <input
                    type="checkbox"
                    checked={draft.teams === null}
                    onChange={(e) =>
                      change({ teams: e.target.checked ? null : [], page: 1 })
                    }
                  />
                  Todas as equipes
                </label>
                {(data?.teams ?? []).map((team) => (
                  <label key={team.id} className="statistics-check">
                    <input
                      type="checkbox"
                      checked={
                        draft.teams === null || draft.teams.includes(team.id)
                      }
                      onChange={(e) => {
                        const current =
                          draft.teams ?? data!.teams.map((t) => t.id);
                        change({
                          teams: e.target.checked
                            ? [...new Set([...current, team.id])]
                            : current.filter((v) => v !== team.id),
                          page: 1,
                        });
                      }}
                    />
                    {team.names.join(" / ")}
                  </label>
                ))}
                {draft.teams?.length === 0 && (
                  <p>Nenhuma equipe selecionada.</p>
                )}
              </fieldset>
              <fieldset>
                <legend>Filtros numéricos</legend>
                {draft.filters.map((f, i) => (
                  <div className="statistics-filter" key={i}>
                    <label>
                      Métrica do filtro {i + 1}
                      <select
                        id={`statistics-filter-${i}`}
                        value={f.metric}
                        onChange={(e) =>
                          filter(i, {
                            metric: e.target.value as StatisticsMetric,
                          })
                        }
                      >
                        {metricKeys
                          .filter(
                            (k) => draft.mode !== "per-30" || k !== "minutes",
                          )
                          .map((k) => (
                            <option key={k} value={k}>
                              {STATISTICS_METRICS[k].name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Operador do filtro {i + 1}
                      <select
                        value={f.operator}
                        onChange={(e) =>
                          filter(i, {
                            operator: e.target
                              .value as StatisticsQuery["filters"][number]["operator"],
                          })
                        }
                      >
                        {[">=", ">", "<=", "<", "="].map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Valor do filtro {i + 1}
                      <input
                        required
                        type="number"
                        step="any"
                        value={Number.isFinite(f.value) ? f.value : ""}
                        onChange={(e) =>
                          filter(i, { value: e.target.valueAsNumber })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="statistics-secondary"
                      onClick={() => {
                        const next = {
                          ...draft,
                          filters: draft.filters.filter(
                            (_, index) => index !== i,
                          ),
                          page: 1,
                        };
                        setDraft(next);
                        if (
                          next.filters.every((item) =>
                            Number.isFinite(item.value),
                          )
                        )
                          navigate(next, false, false);
                        requestAnimationFrame(() =>
                          document
                            .getElementById("statistics-add-filter")
                            ?.focus(),
                        );
                      }}
                    >
                      Remover filtro {i + 1}
                    </button>
                  </div>
                ))}
                <button
                  id="statistics-add-filter"
                  type="button"
                  className="statistics-secondary"
                  disabled={draft.filters.length >= 5}
                  onClick={() => {
                    setDraft({
                      ...draft,
                      filters: [
                        ...draft.filters,
                        { metric: "points", operator: ">=", value: 0 },
                      ],
                    });
                    requestAnimationFrame(() =>
                      document
                        .getElementById(
                          `statistics-filter-${draft.filters.length}`,
                        )
                        ?.focus(),
                    );
                  }}
                >
                  Adicionar filtro
                </button>
                <p>
                  Até cinco filtros. Ausências e amostras insuficientes ficam
                  fora do filtro e da liderança daquela métrica.
                </p>
              </fieldset>
              <div className="statistics-actions">
                <button type="submit">Aplicar consulta</button>
                <button
                  type="button"
                  className="statistics-secondary"
                  onClick={() => {
                    setShare(true);
                    requestAnimationFrame(() => {
                      shareInput.current?.focus();
                      shareInput.current?.select();
                    });
                  }}
                >
                  Compartilhar consulta
                </button>
              </div>
              {share && (
                <label>
                  Endereço desta consulta
                  <input
                    ref={shareInput}
                    readOnly
                    value={window.location.href}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </label>
              )}
            </form>
          </details>
        </main>
        <PublicFooter />
      </TooltipProvider>
    </div>
  );
}
