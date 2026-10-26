import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { api } from "../competition/api";
import { statisticsPageSchema, type StatisticsPage } from "./page-contract";
import { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
import {
  serializeStatisticsQuery,
  type StatisticsQuery,
} from "./query-contract";
import { simpleStatisticsQuery } from "./simple-query";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const title = (metric: StatisticsMetric) =>
  metric === "foulsCommitted" ? "F" : STATISTICS_METRICS[metric].label;
const display = (names: string[]) =>
  names.length === 1 ? names[0] : names.join(" / ");
function readRoute() {
  const [id = "", search = ""] = window.location.hash.slice(1).split("?", 2);
  return {
    id: z.uuid().safeParse(id).success ? id.toLowerCase() : null,
    query: simpleStatisticsQuery(new URLSearchParams(search)),
  };
}
function hash(id: string, query: StatisticsQuery) {
  const p = serializeStatisticsQuery(query);
  p.set("view", "simple");
  return `#${id}?${p}`;
}
export function SimpleStatisticsPageView() {
  const [route, setRoute] = useState(readRoute),
    [search, setSearch] = useState(route.query.search),
    [data, setData] = useState<StatisticsPage | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null),
    focusResult = useRef(false);
  useEffect(() => {
    const update = () => {
      const next = readRoute();
      setRoute(next);
      setSearch(next.query.search);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const serialized = serializeStatisticsQuery(route.query).toString();
  useEffect(() => {
    if (!route.id) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    void api(
      `/api/public/statistics/${route.id}?${serialized}`,
      statisticsPageSchema,
      undefined,
      controller.signal,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        if (
          next.disputeId !== route.id ||
          next.mode !== "total" ||
          next.dataset !== "all" ||
          next.scope !== route.query.scope
        )
          throw Error(
            "A resposta não corresponde à consulta. Tente novamente.",
          );
        setData(next);
        window.history.replaceState(
          null,
          "",
          hash(route.id!, { ...route.query, page: next.page }),
        );
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível consultar as estatísticas.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [route.id, serialized, retry]);
  useLayoutEffect(() => {
    if (data && focusResult.current) {
      focusResult.current = false;
      heading.current?.focus();
    }
  }, [data]);
  function change(patch: Partial<StatisticsQuery>, page = false) {
    if (!route.id) return;
    const next = simpleStatisticsQuery(
      serializeStatisticsQuery({
        ...route.query,
        ...patch,
        page: page ? (patch.page ?? 1) : 1,
      }),
    );
    focusResult.current = true;
    const nextHash = hash(route.id, next);
    if (nextHash === window.location.hash) setRetry((n) => n + 1);
    else window.location.hash = nextHash;
  }
  function sort(key: StatisticsQuery["sort"]) {
    change({
      sort: key,
      direction:
        route.query.sort === key && route.query.direction === "desc"
          ? "asc"
          : "desc",
    });
  }
  function sortHeader(key: StatisticsQuery["sort"], label: string) {
    return (
      <th
        key={key}
        scope="col"
        aria-sort={
          route.query.sort === key
            ? route.query.direction === "asc"
              ? "ascending"
              : "descending"
            : undefined
        }
      >
        <button
          className="statistics-sort"
          aria-label={`Ordenar por ${label}`}
          onClick={() => sort(key)}
        >
          {label}
        </button>
      </th>
    );
  }
  return (
    <>
      <a
        className="access-skip"
        href="#simple-statistics-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("simple-statistics-content")?.focus();
        }}
      >
        Ir para estatísticas
      </a>
      <header className="access-header">
        <a href="/foundation.html">Base do Basquete</a>
        <span className="access-preview">Resultados confirmados</span>
      </header>
      <main
        className="access-main statistics-page simple-statistics"
        id="simple-statistics-content"
        tabIndex={-1}
      >
        <div className="simple-statistics-heading">
          <div>
            <h1>Estatísticas de súmula</h1>
            <p>
              Pontos, cestas e faltas de todos os jogos publicados, por súmula
              ou PDF.
            </p>
          </div>
          {route.id && (
            <a
              className="simple-statistics-view"
              href={`#${route.id}?${new URLSearchParams({ scope: route.query.scope, view: "boxscore", dataset: "boxscore", q: route.query.search })}`}
            >
              Boxscore completo
            </a>
          )}
        </div>
        {!route.id ? (
          <p role="alert">Abra as estatísticas a partir de uma disputa.</p>
        ) : (
          <>
            <form
              className="simple-statistics-controls"
              onSubmit={(e) => {
                e.preventDefault();
                change({ search });
              }}
            >
              <label>
                Buscar atleta ou equipe
                <input
                  type="search"
                  maxLength={80}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                Equipe
                <select
                  value={route.query.teams?.[0] ?? ""}
                  onChange={(e) =>
                    change({
                      teams: e.target.value ? [e.target.value] : null,
                      search,
                    })
                  }
                >
                  <option value="">Todas as equipes</option>
                  {(data?.teams ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {display(t.names)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fase
                <select
                  value={route.query.scope}
                  onChange={(e) =>
                    change({
                      scope: e.target.value as StatisticsQuery["scope"],
                      search,
                    })
                  }
                >
                  <option value="all">Todos os jogos</option>
                  <option value="regular">Fase regular</option>
                  <option value="playoffs">Eliminatórias</option>
                </select>
              </label>
              <button type="submit">Buscar</button>
            </form>
            {loading && <p role="status">Carregando estatísticas…</p>}
            {error && (
              <div role="alert" className="access-error">
                <p>{error}</p>
                <button
                  onClick={() => {
                    focusResult.current = true;
                    setRetry((n) => n + 1);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )}
            {data && (
              <section aria-label="Resultado da consulta de súmula">
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="simple-statistics-result"
                >
                  Jogadores
                </h2>
                <p role="status">
                  {data.total} participações contextuais · Página {data.page} de{" "}
                  {data.totalPages}
                </p>
                {!data.total ? (
                  <p>Nenhuma participação atende à consulta.</p>
                ) : (
                  <div
                    className="statistics-scroll"
                    role="region"
                    aria-label="Tabela de súmula rolável"
                    tabIndex={0}
                  >
                    <table className="simple-statistics-table">
                      <caption>Dados simples dos jogos publicados</caption>
                      <thead>
                        <tr>
                          <th scope="col">Pos.</th>
                          {sortHeader("player", "Atleta")}
                          {sortHeader("team", "Equipe")}
                          {data.columns.map((key) =>
                            sortHeader(key, title(key)),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((r, index) => (
                          <tr key={`${r.personId}/${r.registrationId}`}>
                            <td>
                              {(data.page - 1) * data.pageSize + index + 1}
                            </td>
                            <th scope="row">
                              <a href={`/atleta.html#${r.personId}`}>
                                {display(r.names)}
                              </a>
                              {r.gamesPlayed === 0 && <small>Não jogou</small>}
                            </th>
                            <td>
                              <a
                                href={`/equipe.html#${r.teamId}?disputeId=${data.disputeId}&registrationId=${r.registrationId}`}
                              >
                                {display(r.registrationNames)}
                              </a>
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
                                title={`Cobertura: ${r.coverage.scoringGames} jogos com pontos; ${r.coverage.foulGames} com faltas; ${r.coverage.disciplineGames} disciplinares.`}
                              >
                                {r.metrics[key].status === "available"
                                  ? number.format(r.metrics[key].value)
                                  : "—"}
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
                <p className="simple-statistics-note">
                  J conta apenas quem entrou. PTS/J usa os jogos com pontuação
                  conhecida. “—” indica dado não informado; GD considera somente
                  jogos com situação disciplinar registrada. Jogos sem fase
                  confirmada aparecem em Todos os jogos.
                </p>
                <small>
                  Fonte confirmada v{data.version} ·{" "}
                  {new Date(data.confirmedAt).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}{" "}
                  (UTC−03). O endereço desta página preserva a consulta.
                </small>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
