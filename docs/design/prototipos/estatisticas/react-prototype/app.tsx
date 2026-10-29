import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ScoresheetStatisticsTable } from "./adapted/scoresheet-statistics-table";
import { ResourceState } from "./upstream/resource-state";
import { TooltipProvider } from "./adapted/tooltip";
import { TeamFilter } from "./adapted/team-filter";
import { ColumnPicker } from "./adapted/column-picker";
import { nextSort, type SortDirection } from "./adapted/table-controls";
import {
  athletes,
  auditRow,
  metricDefinitions,
  preferredJersey,
  queryPlayers,
  teamOptions,
  type Mode,
} from "./model";
import "../styles.css";
import "./adapted/reference-table.css";
import "./overrides.css";

const initialQuery = {
  search: "",
  teams: teamOptions.map((t) => t.id),
  minimum: "",
  sort: "points",
  direction: "desc" as SortDirection,
  mode: "totals" as Mode,
};
const mobileColumns = new Set([
  "technical",
  "unsportsmanlike",
  "fiveFoulGames",
  "disqualifications",
]);
const columnOptions = [
  { key: "team", label: "Equipe", name: "" },
  ...metricDefinitions,
];
function Legend({ visibleColumns }: { visibleColumns: string[] }) {
  return (
    <section
      className="table-legend reference-legend"
      aria-labelledby="legend-title"
    >
      <h2 id="legend-title">Legenda</h2>
      <dl>
        {metricDefinitions
          .filter((m) => visibleColumns.includes(m.key))
          .map((m) => (
            <div key={m.key}>
              <dt>{m.label}</dt>
              <dd>{m.name}</dd>
            </div>
          ))}
      </dl>
      <div className="legend-notes">
        <p>
          <strong>Por jogo:</strong> somente 2P, 3P, LL, F, T e U são divididos
          por J. As outras colunas permanecem iguais.
        </p>
        <p>
          <strong>F:</strong> total de faltas cometidas, já incluindo T e U. As
          colunas T e U detalham esse total e não devem ser somadas novamente a
          F.
        </p>
        <p>
          <strong>PP%:</strong> pontos do atleta ÷ pontos da equipe nos mesmos
          jogos × 100. Partidas sem participação ficam fora do cálculo.
        </p>
        <p>
          <strong>#:</strong> camisa mais usada pelo atleta nesta equipe; em
          caso de empate, a última usada. <strong>0:</strong> valor conhecido.{" "}
          <strong>—:</strong> informação ausente ou incompleta.
        </p>
        <p>
          Empates compartilham posição (1, 1, 3), com nomes em ordem alfabética.
          O ranking considera a precisão completa dos cálculos.
        </p>
      </div>
    </section>
  );
}
function App() {
  const [query, setQuery] = useState(initialQuery);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 600px)").matches,
  );
  const [columnSelection, setColumnSelection] = useState<string[] | null>(null);
  const defaultColumns = columnOptions
    .filter((m) => !mobile || !mobileColumns.has(m.key))
    .map((m) => m.key);
  const visibleColumns: string[] = columnSelection ?? defaultColumns;
  const visibleMetrics = visibleColumns.filter((key) => key !== "team");
  const effectiveSort =
    visibleMetrics.length === 0
      ? query.sort
      : visibleColumns.includes(query.sort)
        ? query.sort
        : visibleColumns.includes("points")
          ? "points"
          : visibleMetrics[0];
  const effectiveDirection =
    effectiveSort === query.sort ? query.direction : "desc";
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const players = useMemo(
    () =>
      queryPlayers({
        ...query,
        sort: effectiveSort,
        direction: effectiveDirection,
      }),
    [query, effectiveSort, effectiveDirection],
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 600px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (effectiveSort !== query.sort)
      setQuery((q) => ({ ...q, sort: effectiveSort, direction: "desc" }));
  }, [effectiveSort, query.sort]);
  const currentRows = useRef(players);
  currentRows.current = players;
  const change = (patch: Partial<typeof initialQuery>) => {
    clearTimeout(timer.current);
    setLoading(false);
    setQuery((q) => ({ ...q, ...patch }));
  };
  const clear = () =>
    change({ search: "", teams: teamOptions.map((t) => t.id), minimum: "" });
  const shortcut = (sort: string, mode: Mode = "totals") => {
    clearTimeout(timer.current);
    setLoading(false);
    setQuery({ ...initialQuery, sort, mode });
  };
  const sort = (key: string) =>
    setQuery((q) => {
      const next = nextSort(q.sort, q.direction, key);
      return { ...q, sort: next.key, direction: next.direction };
    });
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    document.documentElement.dataset.renderer = "react";
    const audit = Object.freeze({
      rows: () => currentRows.current.map(auditRow),
      fixtures: () => structuredClone(athletes),
      preferredJersey,
    });
    Object.defineProperty(window, "prototypeStatistics", {
      value: audit,
      configurable: true,
    });
  }, []);
  const unique = new Set(players.map((p) => p.personId)).size;
  return (
    <TooltipProvider>
      <a className="skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="prototype" role="region" aria-label="Aviso de protótipo">
        <div className="wrap">
          <span>Protótipo para avaliação</span>
          <span>Dados fictícios</span>
        </div>
      </div>
      <header className="site-header">
        <div className="wrap header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              b.
            </span>
            <span>Base do Basquete</span>
          </div>
          <span className="public-label">Consulta pública</span>
        </div>
      </header>
      <main id="conteudo" className="wrap" tabIndex={-1}>
        <div className="breadcrumb">
          Campeonatos <span aria-hidden="true">/</span> Copa da Base{" "}
          <span aria-hidden="true">/</span> Estatísticas
        </div>
        <h1 className="sr-only">Estatísticas de atletas</h1>
        <section className="statistics" aria-label="Estatísticas e filtros">
          <form
            id="filters"
            className="filters"
            role="search"
            aria-label="Filtrar atletas"
            onSubmit={(e) => e.preventDefault()}
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
                  ref={searchRef}
                  id="search"
                  type="search"
                  placeholder="Nome do atleta"
                  autoComplete="off"
                  value={query.search}
                  onChange={(e) => change({ search: e.target.value })}
                />
              </div>
            </label>
            <TeamFilter
              options={teamOptions}
              value={query.teams}
              onChange={(teams) => change({ teams })}
            />
            <label htmlFor="minimum">
              Mínimo de jogos <span className="optional">opcional</span>
              <input
                id="minimum"
                type="number"
                min="1"
                step="1"
                placeholder="Sem restrição"
                inputMode="numeric"
                value={query.minimum}
                onChange={(e) => change({ minimum: e.target.value })}
              />
            </label>
            <button
              id="clear"
              type="button"
              className="clear-button"
              onClick={clear}
            >
              Limpar filtros
            </button>
          </form>
          <div className="table-toolbar">
            <p id="result-count" role="status" aria-live="polite">
              {loading
                ? "Carregando atletas…"
                : `${unique} ${unique === 1 ? "atleta" : "atletas"} · ${players.length} ${players.length === 1 ? "registro por equipe" : "registros por equipe"}`}
            </p>
            <div className="table-display-controls">
              <ColumnPicker
                options={columnOptions}
                value={visibleColumns}
                onChange={setColumnSelection}
              />
              <fieldset className="mode-control">
                <legend>Arremessos e faltas</legend>
                <div className="segmented">
                  <button
                    type="button"
                    id="totals"
                    aria-pressed={query.mode === "totals"}
                    onClick={() => change({ mode: "totals" })}
                  >
                    Totais
                  </button>
                  <button
                    type="button"
                    id="averages"
                    aria-pressed={query.mode === "averages"}
                    onClick={() => change({ mode: "averages" })}
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
          <div
            id="table-region"
            className="reference-explorer statistics-explorer"
            aria-busy={loading}
            data-source-component="ScoresheetStatisticsTable"
          >
            {loading ? (
              <ResourceState
                kind="loading"
                title="Carregando estatísticas"
                detail="Aguarde um instante."
              />
            ) : players.length ? (
              <ScoresheetStatisticsTable
                players={players}
                sortKey={effectiveSort}
                direction={effectiveDirection}
                mode={query.mode}
                visibleColumns={visibleColumns}
                onSort={sort}
              />
            ) : (
              <ResourceState
                kind="empty"
                title="Nenhum atleta encontrado"
                detail="Tente outro nome ou ajuste os filtros para ampliar a busca."
                action={
                  <button
                    id="empty-clear"
                    type="button"
                    onClick={() => {
                      clear();
                      searchRef.current?.focus();
                    }}
                  >
                    Limpar filtros
                  </button>
                }
              />
            )}
          </div>
          {visibleMetrics.length > 0 ? (
            <Legend visibleColumns={visibleColumns} />
          ) : null}
        </section>
        <details className="demo-controls">
          <summary>Cenários do protótipo</summary>
          <div className="demo-inner">
            <p>Dados fictícios. Atalhos para conferir ordenação e estados.</p>
            <div className="demo-buttons">
              <button id="demo-points" onClick={() => shortcut("points")}>
                Ranking por PTS
              </button>
              <button id="demo-ppj" onClick={() => shortcut("pointsPerGame")}>
                Ranking por PPJ
              </button>
              <button
                id="demo-threes"
                onClick={() => shortcut("threePointMade", "averages")}
              >
                Ranking por 3P/J
              </button>
              <button
                id="demo-loading"
                onClick={() => {
                  clearTimeout(timer.current);
                  setLoading(true);
                  timer.current = setTimeout(() => setLoading(false), 1200);
                }}
              >
                Simular carregamento
              </button>
              <button
                id="demo-empty"
                onClick={() => {
                  setLoading(false);
                  setQuery({ ...initialQuery, search: "Atleta inexistente" });
                }}
              >
                Nenhum resultado
              </button>
              <button id="demo-reset" onClick={() => shortcut("points")}>
                Restaurar demonstração
              </button>
            </div>
          </div>
        </details>
      </main>
      <footer className="wrap footer">
        <span>Base do Basquete</span>
        <span>Protótipo · 2026</span>
      </footer>
    </TooltipProvider>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
