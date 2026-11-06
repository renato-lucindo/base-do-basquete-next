import { useEffect, useRef, useState } from "react";
import { api, ApiFailure } from "../competition/api";
import { PublicHeader, PublicFooter } from "../public-ui/shell";
import { usePublicPosition } from "../public-ui/position";
import { usePublicStandings } from "../regulation/public-page";
import { TeamFilter } from "../statistics/reference/team-filter";
import { ColumnPicker } from "../statistics/reference/column-picker";
import {
  parseTeamsListQuery,
  serializeTeamsListQuery,
  LIST_METRIC_KEYS,
  LIST_SHEET_COLUMNS,
  type TeamsListQuery,
} from "./list-query";
import { readTeamsListRoute, serializeTeamsListRoute } from "./list-navigation";
import { teamsListPageSchema, type TeamsListPage } from "./list-contract";
import { TEAM_COLUMN_PRESETS } from "./metrics";
import { TeamsListTable, listMetric } from "./list-table";
function initial() {
  try {
    return { ...readTeamsListRoute(location.hash), error: "" };
  } catch (e) {
    return {
      disputeId: null,
      query: parseTeamsListQuery(new URLSearchParams()),
      local: false,
      error:
        e instanceof Error && e.message.includes("seleção")
          ? e.message
          : "Abra esta consulta a partir de uma disputa identificada.",
    };
  }
}
function Segments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mode-control" aria-label={label}>
      <div className="segmented">
        {options.map(([key, text]) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === value}
            onClick={() => onChange(key)}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function TeamsListPublicPage() {
  const [advanced, setAdvanced] = useState(() => {
    try {
      return sessionStorage.getItem("team-advanced-open") === "true";
    } catch {
      return false;
    }
  });
  const [route, setRoute] = useState(initial),
    [search, setSearch] = useState(route.query.search),
    [response, setResponse] = useState<TeamsListPage | null>(null),
    [loading, setLoading] = useState(false),
    [sourceMissing, setSourceMissing] = useState(false),
    [error, setError] = useState(route.error),
    [retry, setRetry] = useState(0),
    [notice, setNotice] = useState("");
  const routeRef = useRef(route);
  routeRef.current = route;
  const key = serializeTeamsListQuery(route.query),
    id = route.disputeId;
  const data = response && response.disputeId === id ? response : null;
  const confirmed = usePublicStandings(sourceMissing ? id : null);
  const withoutResults =
    sourceMissing &&
    confirmed.data &&
    confirmed.data.games.every(
      (g) => g.state !== "played" && g.state !== "awarded",
    );
  const options =
    data?.options ??
    (withoutResults
      ? confirmed.data!.registrations.map((r) => ({
          registrationId: r.id,
          name: r.name,
        }))
      : []);
  usePublicPosition(!loading && !!data && !error);
  useEffect(() => {
    const read = () => {
      const next = initial();
      setRoute(next);
      setSearch(next.query.search);
      setError(next.error);
    };
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  function change(patch: Partial<TeamsListQuery>) {
    const current = routeRef.current;
    if (!current.disputeId) return;
    const next = {
      ...current,
      query: { ...current.query, search, ...patch, page: 1 },
    };
    try {
      const hash = serializeTeamsListRoute(current.disputeId, next.query);
      next.local = hash.includes("stateRef=");
      history.replaceState(null, "", hash);
      setNotice("");
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Não foi possível guardar a seleção.",
      );
      return;
    }
    routeRef.current = next;
    setRoute(next);
  }
  useEffect(() => {
    if (search === route.query.search) return;
    const timer = setTimeout(() => change({ search }), 300);
    return () => clearTimeout(timer);
  });
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const base = `/api/public/teams/${id}`,
      long = key.length > 7000;
    void api(
      long ? `${base}?pageSize=all` : `${base}?${key}`,
      teamsListPageSchema,
      long ? { query: key } : undefined,
      controller.signal,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        const expected = {
          ...routeRef.current.query,
          columns: next.scoresheet
            ? LIST_SHEET_COLUMNS
            : routeRef.current.query.columns,
        };
        if (
          next.disputeId !== id ||
          serializeTeamsListQuery(next.query) !==
            serializeTeamsListQuery(expected)
        )
          throw Error("Consulta incompatível.");
        setResponse(next);
        setSourceMissing(false);
        // Preserve control nodes and focus while replacing only the data.
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setSourceMissing(e instanceof ApiFailure && e.status === 404);
          setError(
            e instanceof ApiFailure
              ? e.message
              : "Não foi possível confirmar a consulta. Tente novamente.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, key, retry]);
  useEffect(() => {
    if (!id || key.length <= 1800 || route.local) return;
    try {
      const hash = serializeTeamsListRoute(id, route.query);
      history.replaceState(null, "", hash);
      setRoute((r) => ({ ...r, local: true }));
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Não foi possível guardar a seleção.",
      );
    }
  }, [id, key, route.local, route.query]);
  const q = route.query;
  const selected =
    q.selection === "all"
      ? options.map((o) => o.registrationId)
      : q.selection === "none"
        ? []
        : q.registrationIds;
  return (
    <>
      <a
        className="access-skip"
        href="#team-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("team-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <PublicHeader disputeId={id} section="equipes" />
      <main
        id="team-content"
        tabIndex={-1}
        className="access-main statistics-page team-public-page team-list-page"
      >
        <h1 className="sr-only">Equipes</h1>
        {id && (
          <div className="public-site statistics-public">
            <div className="team-list-filters">
              <label className="search-field">
                Buscar equipe ou inscrição
                <input
                  type="search"
                  name="q"
                  autoComplete="off"
                  maxLength={80}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <TeamFilter
                options={options.map((o) => ({
                  id: o.registrationId,
                  name: o.name,
                }))}
                value={selected}
                onChange={(ids) =>
                  change({
                    selection:
                      ids.length === options.length
                        ? "all"
                        : ids.length
                          ? "custom"
                          : "none",
                    registrationIds: ids.length === options.length ? [] : ids,
                  })
                }
              />
              <Segments
                label="Escopo"
                value={q.scope}
                options={[
                  ["all", "Todos"],
                  ["regular", "Fase regular"],
                  ["playoffs", "Eliminatórias"],
                ]}
                onChange={(scope) => change({ scope })}
              />
              {data?.hasBoxscore && (
                <label>
                  Dados
                  <select
                    value={q.dataset}
                    onChange={(e) =>
                      change({
                        dataset: e.target.value as TeamsListQuery["dataset"],
                      })
                    }
                  >
                    <option value="all">Todos os resultados</option>
                    <option value="boxscore">Boxscores com estatísticas</option>
                  </select>
                </label>
              )}
              {data?.hasBoxscore && (
                <details
                  className="team-advanced-controls"
                  open={advanced}
                  onToggle={(e) => {
                    const open = e.currentTarget.open;
                    setAdvanced(open);
                    try {
                      sessionStorage.setItem(
                        "team-advanced-open",
                        String(open),
                      );
                    } catch {
                      /* Panel still works. */
                    }
                  }}
                >
                  <summary>Mais opções</summary>
                  <label>
                    Colunas
                    <select
                      value={q.preset}
                      onChange={(e) => {
                        const preset = e.target
                          .value as TeamsListQuery["preset"];
                        change({
                          preset,
                          columns:
                            preset === "all"
                              ? [...LIST_METRIC_KEYS]
                              : [
                                  ...TEAM_COLUMN_PRESETS[
                                    preset === "custom" ? "essentials" : preset
                                  ],
                                ],
                        });
                      }}
                    >
                      <option value="essentials">Essenciais</option>
                      <option value="boxscore">Boxscore</option>
                      <option value="all">Todas</option>
                      <option value="custom">Personalizadas</option>
                    </select>
                  </label>
                  <label>
                    Ordenar por
                    <select
                      value={q.sort}
                      onChange={(e) =>
                        change({
                          sort: e.target.value as TeamsListQuery["sort"],
                        })
                      }
                    >
                      <option value="name">Inscrição</option>
                      <option value="pointsFor">Pontos a favor</option>
                      {LIST_METRIC_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {listMetric(key).name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Direção
                    <select
                      value={q.direction}
                      onChange={(e) =>
                        change({
                          direction: e.target
                            .value as TeamsListQuery["direction"],
                        })
                      }
                    >
                      <option value="asc">Crescente</option>
                      <option value="desc">Decrescente</option>
                    </select>
                  </label>
                </details>
              )}
            </div>
            {(route.local || notice) && (
              <p className="team-list-notice" role="status">
                {notice ||
                  "Esta seleção está guardada neste navegador e não está integralmente representada no link."}
              </p>
            )}
            {withoutResults ? (
              <section aria-label="Equipes confirmadas">
                <h2>Participantes confirmados</h2>
                <ul className="public-results">
                  {options
                    .filter(
                      (o) =>
                        selected.includes(o.registrationId) &&
                        o.name
                          .normalize("NFD")
                          .replace(/\p{M}/gu, "")
                          .toLocaleLowerCase("pt-BR")
                          .includes(
                            q.search
                              .normalize("NFD")
                              .replace(/\p{M}/gu, "")
                              .toLocaleLowerCase("pt-BR"),
                          ),
                    )
                    .map((o) => (
                      <li key={o.registrationId}>{o.name}</li>
                    ))}
                </ul>
                <p>Nenhum resultado estatístico publicado nesta disputa.</p>
              </section>
            ) : (
              error && (
                <div role="alert">
                  <p>{error}</p>
                  <button type="button" onClick={() => setRetry((n) => n + 1)}>
                    Tentar novamente
                  </button>
                </div>
              )
            )}
            <div
              className="statistics-results-block team-list-results"
              data-sheet-only={data?.scoresheet || undefined}
            >
              <div className="table-toolbar">
                <span className="sr-only" role="status">
                  {loading
                    ? "Consultando…"
                    : data
                      ? `${data.total} inscrições`
                      : ""}
                </span>
                <Segments
                  label="Modo"
                  value={q.mode}
                  options={[
                    ["total", "Totais"],
                    ["per-game", "Por jogo"],
                  ]}
                  onChange={(mode) => change({ mode })}
                />
                {data?.hasBoxscore && (
                  <ColumnPicker
                    options={LIST_METRIC_KEYS.map((key) => ({
                      key,
                      ...listMetric(key),
                    }))}
                    value={q.columns}
                    identityNote="A equipe e a posição estatística ficam sempre visíveis."
                    onChange={(columns) =>
                      change({
                        columns: columns as TeamsListQuery["columns"],
                        preset: "custom",
                      })
                    }
                  />
                )}
              </div>
              {data && (
                <div aria-busy={loading}>
                  <TeamsListTable
                    canNavigate={!notice || key.length <= 1800}
                    data={data}
                    onSort={(sort) =>
                      change({
                        sort,
                        direction:
                          sort === q.sort
                            ? q.direction === "asc"
                              ? "desc"
                              : "asc"
                            : sort === "name" ||
                                (sort !== "pointsFor" &&
                                  listMetric(sort).lowerIsBetter)
                              ? "asc"
                              : "desc",
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}
        {!id && <p role="alert">{route.error}</p>}
      </main>
      <PublicFooter />
    </>
  );
}
