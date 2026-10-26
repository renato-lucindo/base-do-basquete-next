import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
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
  return {
    id: z.uuid().safeParse(id).success ? id.toLowerCase() : null,
    query: parseStatisticsQuery(new URLSearchParams(search)),
  };
}
export function StatisticsPageView() {
  const [route, setRoute] = useState(location),
    [draft, setDraft] = useState(route.query),
    [data, setData] = useState<StatisticsPage | null>(null),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [share, setShare] = useState(false);
  const form = useRef<HTMLFormElement>(null),
    resultHeading = useRef<HTMLHeadingElement>(null),
    focusResult = useRef(false),
    focusTarget = useRef<string | null>(null),
    shareInput = useRef<HTMLInputElement>(null);
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
    setData(null);
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
  function change(patch: Partial<StatisticsQuery>, focus = false) {
    navigate(updateStatisticsQuery(draft, patch), focus);
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
  const namesByPerson = new Map<string, string[]>();
  for (const r of data?.compared ?? [])
    namesByPerson.set(r.personId, [
      ...new Set([...(namesByPerson.get(r.personId) ?? []), ...r.names]),
    ]);
  const compareNames = [...namesByPerson.entries()].map(
    ([id, names]) => [id, names.join(" / ")] as const,
  );
  return (
    <>
      <a
        className="access-skip"
        href="#statistics-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("statistics-content")?.focus();
        }}
      >
        Ir para estatísticas
      </a>
      <header className="access-header">
        <a href="/foundation.html">Base do Basquete</a>
        <span className="access-preview">Resultados confirmados</span>
      </header>
      <main
        id="statistics-content"
        tabIndex={-1}
        className="access-main statistics-page"
      >
        <h1>Estatísticas dos atletas</h1>
        <p>
          Dados da ocasião confirmada. J conta quem jogou; um relacionado sem
          participação não acrescenta jogo nem observação estatística.
        </p>
        {!route.id ? (
          <p role="alert">Abra as estatísticas a partir de uma disputa.</p>
        ) : (
          <>
            <form
              ref={form}
              className="statistics-controls"
              onSubmit={(e) => {
                e.preventDefault();
                change({ page: 1 }, true);
              }}
            >
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
                  Buscar atleta ou equipe
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
                      const preset = e.target
                        .value as StatisticsQuery["preset"];
                      change({
                        preset,
                        columns:
                          preset === "custom"
                            ? draft.columns
                            : [...STATISTICS_COLUMN_PRESETS[preset]],
                      });
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
                          change({
                            preset: "custom",
                            columns: e.target.checked
                              ? [...draft.columns, key]
                              : draft.columns.filter((k) => k !== key),
                          })
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
            {loading && <p role="status">Carregando estatísticas…</p>}
            {error instanceof ApiFailure && error.status === 404 ? (
              <p className="statistics-empty">{error.message}</p>
            ) : error ? (
              <div className="access-error" role="alert">
                <p>
                  {error instanceof Error
                    ? error.message
                    : "Não foi possível consultar as estatísticas."}
                </p>
                <button
                  onClick={() => {
                    focusResult.current = true;
                    setRetry((n) => n + 1);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}
            {data && (
              <section aria-label="Resultado da consulta">
                <h2 ref={resultHeading} tabIndex={-1}>
                  Participações no contexto
                </h2>
                <p role="status">
                  {data.total} participações contextuais · Página {data.page} de{" "}
                  {data.totalPages}
                </p>
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
                {!data.total ? (
                  <p className="statistics-empty">
                    Nenhuma participação atende à consulta.
                  </p>
                ) : (
                  <div
                    className="statistics-scroll"
                    role="region"
                    aria-label="Tabela estatística rolável"
                    tabIndex={0}
                  >
                    <table aria-label="Estatísticas dos atletas">
                      <caption>
                        Selecione até dois atletas para comparar. Arraste ou use
                        o teclado para percorrer as colunas.
                      </caption>
                      <thead>
                        <tr>
                          <th>Comparar</th>
                          <th>Atleta</th>
                          <th>Inscrição</th>
                          <th>Camisa</th>
                          {data.columns.map((key) => (
                            <th
                              key={key}
                              aria-label={STATISTICS_METRICS[key].name}
                              aria-sort={
                                data.sort === key
                                  ? data.direction === "asc"
                                    ? "ascending"
                                    : "descending"
                                  : undefined
                              }
                            >
                              <button
                                className="statistics-sort"
                                title={STATISTICS_METRICS[key].name}
                                aria-label={`Ordenar por ${STATISTICS_METRICS[key].name}`}
                                onClick={() =>
                                  change({
                                    sort: key,
                                    direction:
                                      draft.sort === key &&
                                      draft.direction === "desc"
                                        ? "asc"
                                        : "desc",
                                  })
                                }
                              >
                                {STATISTICS_METRICS[key].label}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((r) => (
                          <tr key={`${r.personId}/${r.registrationId}`}>
                            <td>
                              <input
                                id={`compare-${r.personId}-${r.registrationId}`}
                                type="checkbox"
                                aria-label={`Comparar ${r.names.join(" / ")} na inscrição ${r.registrationNames.join(" / ")}`}
                                checked={draft.compare.includes(r.personId)}
                                disabled={
                                  draft.compare.length >= 2 &&
                                  !draft.compare.includes(r.personId)
                                }
                                onChange={(e) =>
                                  togglePerson(r.personId, e.currentTarget.id)
                                }
                              />
                            </td>
                            <th scope="row" title={r.names.join(" / ")}>
                              <a href={`/atleta.html#${r.personId}`}>
                                {display(r.names)}
                              </a>
                              {r.nicknames.some((n) => n !== null) && (
                                <small>
                                  {r.nicknames
                                    .filter((n) => n !== null)
                                    .join(" / ")}
                                </small>
                              )}
                            </th>
                            <td
                              title={[
                                ...r.registrationNames,
                                ...r.teamNames,
                              ].join(" / ")}
                            >
                              <a
                                href={`/equipe.html#${r.teamId}?disputeId=${data.disputeId}&registrationId=${r.registrationId}`}
                              >
                                {display(r.registrationNames)}
                              </a>
                            </td>
                            <td title={r.jerseys.join(" / ")}>
                              {display(r.jerseys)}
                            </td>
                            {data.columns.map((key) => (
                              <td
                                key={key}
                                className={
                                  data.leaders[key]?.some(
                                    (v) =>
                                      v.personId === r.personId &&
                                      v.registrationId === r.registrationId,
                                  )
                                    ? "statistics-leader"
                                    : undefined
                                }
                                title={`Cobertura: ${r.coverage.scoringGames} jogos com pontos; ${r.coverage.advancedGames} avançados; ${r.coverage.foulGames} com FC; ${r.coverage.foulsReceivedGames} com FR; ${r.coverage.plusMinusGames} com saldo; ${r.coverage.disciplineGames} disciplinares.`}
                              >
                                <Cell value={r.metrics[key]} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                      melhor valor quando menores. A ausência não recebe valor
                      nem vence uma comparação.
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
          </>
        )}
      </main>
    </>
  );
}
