import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type SetStateAction,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  DataTable,
  Icon,
  Modal,
  Pager,
  SectionTabs,
  TabPanel,
  type Column,
} from "../../../../src/ui-system/components";
import {
  nextSort,
  normalizeSearch,
  sortRows,
  type Sort,
  type SortValue,
} from "../../../../src/ui-system/controls";
import {
  GlobalSearch,
  type SearchItem,
} from "../../../../src/ui-system/global-search";
import {
  competitions,
  decimal,
  displayDate,
  games,
  metricLabels,
  metricShort,
  pilotSearch,
  players,
  teams,
  type Game,
  type Player,
} from "./fixtures";
import "../../../../src/ui-system/theme.css";
import "./pilot.css";

type Go = (route: string) => void;
function PilotLink({
  to,
  go,
  children,
  ...props
}: { to: string; go: Go } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={`#${to}`}
      onClick={(event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey &&
          event.button === 0
        ) {
          event.preventDefault();
          go(to);
        }
      }}
    >
      {children}
    </a>
  );
}
// State is retained only in this fictional pilot's current browser session.
const retained = new Map<string, unknown>();
function useRetainedState<T>(
  key: string,
  initial: T | (() => T),
): [T, (action: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() =>
    retained.has(key)
      ? (retained.get(key) as T)
      : typeof initial === "function"
        ? (initial as () => T)()
        : initial,
  );
  return [
    value,
    (action) =>
      setValue((previous) => {
        const next =
          typeof action === "function"
            ? (action as (value: T) => T)(previous)
            : action;
        retained.set(key, next);
        return next;
      }),
  ];
}
const publicTabs = [
  { key: "classificacao", label: "Classificação" },
  { key: "jogos", label: "Jogos" },
  { key: "equipes", label: "Equipes" },
  { key: "jogadores", label: "Jogadores" },
];
const adminTabs = [
  { key: "informacoes", label: "Informações" },
  { key: "equipes", label: "Equipes e elencos" },
  { key: "jogos", label: "Jogos" },
  { key: "regulamento", label: "Regulamento" },
];
type Guard = { current: () => boolean };
function useLeaveGuard(guard: Guard, dirty: boolean) {
  useEffect(() => {
    guard.current = () =>
      !dirty ||
      window.confirm("Há alterações não salvas. Descartar e continuar?");
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      guard.current = () => true;
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty, guard]);
}
function Heading({
  title,
  count,
  actions,
  level = "h1",
}: {
  title: string;
  count?: string;
  actions?: ReactNode;
  level?: "h1" | "h2";
}) {
  const Title = level;
  return (
    <div className="bb-heading">
      <div>
        <Title>{title}</Title>
        {count && <span className="bb-count">{count}</span>}
      </div>
      {actions && <div className="bb-actions">{actions}</div>}
    </div>
  );
}
function App() {
  const [route, setRoute] = useState(
      location.hash.slice(1) || "publico/jogadores",
    ),
    guard = useRef(() => true),
    approved = useRef(false),
    current = useRef(route),
    main = useRef<HTMLElement>(null);
  const [siglas, setSiglas] = useState(false);
  const admin = route.startsWith("admin/"),
    section = route.split("?")[0].split("/")[1] ?? "jogadores";
  const contextQuery = new URLSearchParams(route.split("?")[1] ?? "");
  const contextName = contextQuery.get("competition") ?? "Copa ES";
  const contextDetail = `${contextQuery.get("year") ?? "2026"} · ${contextQuery.get("gender") ?? "Masculino"} · ${contextQuery.get("category") ?? "Sub-15"}${contextQuery.get("division") ? ` · ${contextQuery.get("division")}` : ""}`;
  current.current = route;
  const go: Go = (next) => {
    const destination =
      next.includes("?") ||
      next.startsWith("admin/") ||
      next.includes("campeonatos") ||
      !current.current.includes("?")
        ? next
        : `${next}?${current.current.split("?")[1]}`;
    if (destination !== current.current && guard.current()) {
      approved.current = true;
      location.hash = destination;
    }
  };
  useEffect(() => {
    const changed = () => {
      const next = location.hash.slice(1) || "publico/jogadores";
      if (!approved.current && !guard.current()) {
        history.replaceState(null, "", `#${current.current}`);
        return;
      }
      approved.current = false;
      setRoute(next);
      window.scrollTo(0, 0);
      requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
    };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  function onSearch(item: SearchItem) {
    go(
      `publico/${item.type === "players" ? "jogador" : item.type === "teams" ? "participacoes" : "campeonatos"}/${item.id}`,
    );
  }
  const navSection =
    section === "jogador"
      ? "jogadores"
      : ["equipe", "participacoes"].includes(section)
        ? "equipes"
        : section === "jogo"
          ? "jogos"
          : section;
  return (
    <div className={`bb-ui ${admin ? "bb-admin" : "bb-public"}`}>
      <a
        className="bb-skip"
        href="#pilot-main"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
          main.current?.scrollIntoView();
        }}
      >
        Pular para o conteúdo
      </a>
      <div className="pilot-strip">
        <span>
          Piloto de interface{" "}
          <span className="pilot-disclaimer">· Dados fictícios</span>
        </span>
        <nav aria-label="Áreas do piloto">
          <PilotLink
            go={go}
            to="publico/jogadores"
            aria-current={!admin ? "page" : undefined}
          >
            Público
          </PilotLink>
          <PilotLink
            go={go}
            to="admin/jogos"
            aria-current={admin ? "page" : undefined}
          >
            Administração
          </PilotLink>
        </nav>
      </div>
      <header className="bb-site-header">
        <div className="bb-header-inner">
          <PilotLink
            go={go}
            to={admin ? "admin/jogos" : "publico/campeonatos"}
            className="bb-brand"
          >
            <span className="bb-brand-mark" aria-hidden="true">
              b.
            </span>
            <span>Base do Basquete</span>
          </PilotLink>
          {!admin && (
            <GlobalSearch provider={pilotSearch} onSelect={onSearch} />
          )}
          <PilotLink
            go={go}
            to="publico/campeonatos"
            className="bb-header-link"
          >
            {admin ? "Ver site" : "Campeonatos"}
            <Icon name="chevron" />
          </PilotLink>
        </div>
      </header>
      {(admin || !["campeonatos", "participacoes"].includes(section)) && (
        <div className="bb-context-wrap">
          <div className="bb-context">
            <div>
              <PilotLink
                go={go}
                to="publico/campeonatos"
                className="bb-text-button"
              >
                {admin ? "Campeonatos" : "Competições"}
              </PilotLink>
              <span aria-hidden="true">/</span>
              <strong>{admin ? "Copa ES" : contextName}</strong>
            </div>
            <span className="bb-context-detail">
              {admin ? "2026 · Masculino · Sub-15" : contextDetail}
            </span>
          </div>
          <nav
            className="bb-tabs"
            aria-label={
              admin ? "Administração do campeonato" : "Seções da disputa"
            }
          >
            {(admin ? adminTabs : publicTabs).map((item) => (
              <PilotLink
                key={item.key}
                go={go}
                to={`${admin ? "admin" : "publico"}/${item.key}${!admin && contextQuery.size ? `?${contextQuery}` : ""}`}
                aria-current={navSection === item.key ? "page" : undefined}
              >
                {item.label}
              </PilotLink>
            ))}
          </nav>
        </div>
      )}
      <main ref={main} id="pilot-main" className="bb-main" tabIndex={-1}>
        {admin ? (
          <section aria-label="Área administrativa">
            {section === "informacoes" ? (
              <Information guard={guard} />
            ) : section === "equipes" ? (
              <Rosters guard={guard} />
            ) : section === "regulamento" ? (
              <RegulationPilot />
            ) : (
              <Games admin go={go} />
            )}
          </section>
        ) : section === "campeonatos" ? (
          <CompetitionPicker
            go={go}
            selected={route.split("?")[0].split("/")[2]}
          />
        ) : section === "participacoes" ? (
          <Participations go={go} teamId={route.split("?")[0].split("/")[2]} />
        ) : ["jogador", "equipe"].includes(section) ? (
          <Profile
            key={route}
            kind={section}
            id={route.split("?")[0].split("/")[2]}
            go={go}
            onSiglas={() => setSiglas(true)}
          />
        ) : section === "jogo" ? (
          <GameDetail id={route.split("?")[0].split("/")[2]} go={go} />
        ) : (
          <section aria-label="Dados da disputa">
            {section === "equipes" ? (
              <TeamStatistics go={go} />
            ) : section === "jogos" ? (
              <Games go={go} />
            ) : section === "classificacao" ? (
              <Standings go={go} />
            ) : (
              <PlayerStatistics go={go} onSiglas={() => setSiglas(true)} />
            )}
          </section>
        )}
      </main>
      <footer className="pilot-footer">
        Piloto para avaliação visual · alterações mantidas somente enquanto esta
        página estiver aberta.
      </footer>
      {siglas && (
        <Modal title="Siglas das estatísticas" onClose={() => setSiglas(false)}>
          <dl className="bb-definitions">
            {Object.entries(metricLabels).map(([key, value]) => (
              <div key={key}>
                <dt>{metricShort[key]}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
}
function ColumnPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as Node) && details.current)
        details.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      ref={details}
      className="bb-column-picker"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="bb-button">
        <Icon name="columns" />
        Colunas<span className="bb-count">{selected.length}</span>
      </summary>
      <div className="bb-column-menu">
        <strong>Colunas visíveis</strong>
        {Object.entries(metricLabels).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              name={`column-${key}`}
              checked={selected.includes(key)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? Object.keys(metricLabels).filter(
                        (k) => k === key || selected.includes(k),
                      )
                    : selected.filter((k) => k !== key),
                )
              }
            />
            <span>
              {metricShort[key]} <small>{label}</small>
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}
function PlayerStatistics({
  go,
  onSiglas,
  subset = players,
}: {
  go: Go;
  onSiglas: () => void;
  subset?: Player[];
}) {
  const stateKey = `players/${subset === players ? "all" : subset.map((p) => p.id).join(",")}`;
  const [query, setQuery] = useRetainedState(`${stateKey}/query`, ""),
    [team, setTeam] = useRetainedState(`${stateKey}/team`, "all"),
    [minimum, setMinimum] = useRetainedState(`${stateKey}/minimum`, "0"),
    [mode, setMode] = useRetainedState(`${stateKey}/mode`, "total"),
    [page, setPage] = useRetainedState(`${stateKey}/page`, 1),
    [sort, setSort] = useRetainedState<Sort>(`${stateKey}/sort`, {
      key: "points",
      direction: "desc",
    });
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 639px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 639px)");
    const change = () => setMobile(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const [columns, setColumns] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("bb-pilot-player-columns") ?? "null",
      );
      if (
        Array.isArray(saved) &&
        saved.every((k) => typeof k === "string" && k in metricLabels)
      )
        return saved;
    } catch {
      /* Storage may be disabled for local files. */
    }
    return window.innerWidth < 640
      ? ["games", "points", "average"]
      : ["games", "points", "average", "two", "three", "free", "fouls"];
  });
  const filtered = subset.filter(
    (p) =>
      normalizeSearch(p.name).includes(normalizeSearch(query)) &&
      (team === "all" || p.team.id === team) &&
      p.games >= Number(minimum),
  );
  const val = (p: Player, key: string): SortValue => {
    const value =
      key === "team" ? p.team.name : (p[key as keyof Player] as SortValue);
    return typeof value === "number" &&
      mode === "average" &&
      [
        "two",
        "three",
        "free",
        "fouls",
        "technical",
        "unsportsmanlike",
      ].includes(key)
      ? value / p.games
      : value;
  };
  const sorted = sortRows(filtered, sort, val, (p) => p.id),
    size = 14;
  const rank = (p: Player) =>
    ["name", "team"].includes(sort.key)
      ? "—"
      : 1 +
        sorted.filter((other) =>
          sort.direction === "desc"
            ? Number(val(other, sort.key)) > Number(val(p, sort.key))
            : Number(val(other, sort.key)) < Number(val(p, sort.key)),
        ).length;
  const schema: Column<Player>[] = [
    { key: "rank", label: "Pos.", numeric: true, render: (p) => rank(p) },
    {
      key: "name",
      label: "Atleta",
      sortable: true,
      primary: true,
      render: (p) => (
        <>
          <PilotLink
            className="bb-row-link"
            go={go}
            to={`publico/jogador/${p.id}`}
          >
            {p.name}
            <span className="bb-shirt">{p.shirt}</span>
          </PilotLink>
          <small className="bb-mobile-team">{p.team.name}</small>
        </>
      ),
    },
    ...(!mobile
      ? [
          {
            key: "team",
            label: "Equipe",
            sortable: true,
            render: (p: Player) => (
              <PilotLink
                className="bb-text-button"
                go={go}
                to={`publico/equipe/${p.team.id}`}
              >
                {p.team.name}
              </PilotLink>
            ),
          },
        ]
      : []),
    ...columns.map((key) => ({
      key,
      label: metricShort[key],
      description: metricLabels[key],
      numeric: true,
      sortable: true,
      render: (p: Player) => decimal.format(Number(val(p, key))),
    })),
  ];
  function changeColumns(value: string[]) {
    setColumns(value);
    try {
      sessionStorage.setItem("bb-pilot-player-columns", JSON.stringify(value));
    } catch {
      /* Optional preference only. */
    }
  }
  return (
    <>
      <Heading
        title={subset === players ? "Jogadores" : "Estatísticas"}
        level={subset === players ? "h1" : "h2"}
        count={`${filtered.length} atletas`}
        actions={
          <button type="button" className="bb-text-button" onClick={onSiglas}>
            Siglas
          </button>
        }
      />
      <div className="bb-toolbar">
        <label className="bb-local-search">
          <span className="bb-sr-only">Buscar jogador na tabela</span>
          <Icon name="search" />
          <input
            type="search"
            placeholder="Buscar jogador"
            name="player-filter"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="bb-select-label">
          <span className="bb-sr-only">Filtrar por equipe</span>
          <select
            value={team}
            name="team-filter"
            onChange={(e) => {
              setTeam(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todas as equipes</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="bb-minimum">
          Mín. jogos
          <input
            type="number"
            min="0"
            max="99"
            value={minimum}
            name="minimum-games"
            onChange={(e) => {
              setMinimum(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="bb-toolbar-spacer" />
        <div
          className="bb-segment"
          role="group"
          aria-label="Exibição de estatísticas"
        >
          <button
            type="button"
            aria-pressed={mode === "total"}
            onClick={() => setMode("total")}
          >
            Totais
          </button>
          <button
            type="button"
            aria-pressed={mode === "average"}
            onClick={() => setMode("average")}
          >
            Por jogo
          </button>
        </div>
        <ColumnPicker selected={columns} onChange={changeColumns} />
      </div>
      <DataTable
        label="Estatísticas de jogadores"
        columns={schema}
        rows={sorted.slice((page - 1) * size, page * size)}
        rowId={(p) => p.id}
        sort={sort}
        onSort={(key) => {
          setSort(nextSort(sort, key));
          setPage(1);
        }}
      />
      <Pager
        page={page}
        total={filtered.length}
        size={size}
        onChange={setPage}
      />
    </>
  );
}
function TeamStatistics({ go, teamId }: { go: Go; teamId?: string }) {
  const [query, setQuery] = useState(""),
    [sort, setSort] = useState<Sort>({ key: "points", direction: "desc" });
  const rows = teams
    .map((team, i) => ({
      ...team,
      games: 6,
      points: 360 + i * 17,
      two: 112 + i * 3,
      three: 21 + i * 2,
      free: 73 + i * 5,
    }))
    .filter((t) => !teamId || t.id === teamId);
  const filtered = sortRows(
    rows.filter((t) =>
      normalizeSearch(t.name).includes(normalizeSearch(query)),
    ),
    sort,
    (t, key) => t[key as keyof typeof t],
    (t) => t.id,
  );
  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "position",
      label: "Pos.",
      numeric: true,
      render: (t) =>
        sort.key === "name"
          ? "—"
          : 1 +
            filtered.filter((x) =>
              sort.direction === "desc"
                ? Number(x[sort.key as keyof typeof x]) >
                  Number(t[sort.key as keyof typeof t])
                : Number(x[sort.key as keyof typeof x]) <
                  Number(t[sort.key as keyof typeof t]),
            ).length,
    },
    {
      key: "name",
      label: "Equipe",
      primary: true,
      sortable: true,
      render: (t) => (
        <PilotLink
          className="bb-row-link"
          go={go}
          to={`publico/equipe/${t.id}`}
        >
          {t.name}
        </PilotLink>
      ),
    },
    ...["games", "points", "two", "three", "free"].map((key) => ({
      key,
      label: metricShort[key],
      numeric: true,
      sortable: true,
      render: (t: (typeof rows)[number]) => t[key as "games" | "points"],
    })),
  ];
  return (
    <>
      <Heading
        title={teamId ? "Estatísticas" : "Equipes"}
        level={teamId ? "h2" : "h1"}
        count={teamId ? undefined : "6 equipes"}
      />
      <div className="bb-toolbar">
        <label className="bb-local-search">
          <Icon name="search" />
          <span className="bb-sr-only">Buscar equipe</span>
          <input
            placeholder="Buscar equipe"
            name="team-filter"
            autoComplete="off"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <DataTable
        label="Estatísticas de equipes"
        columns={columns}
        rows={filtered}
        rowId={(t) => t.id}
        sort={sort}
        onSort={(key) => setSort(nextSort(sort, key))}
      />
    </>
  );
}
function Standings({ go }: { go: Go }) {
  const columns: Column<(typeof teams)[number]>[] = [
    {
      key: "position",
      label: "Pos.",
      numeric: true,
      render: (t) => teams.indexOf(t) + 1,
    },
    {
      key: "name",
      label: "Equipe",
      primary: true,
      render: (t) => (
        <PilotLink
          className="bb-row-link"
          go={go}
          to={`publico/equipe/${t.id}`}
        >
          {t.name}
        </PilotLink>
      ),
    },
    ...["J", "V", "D", "Aprov.", "PP", "PC", "SLD"].map((key, i) => ({
      key,
      label: key,
      numeric: true,
      render: (t: (typeof teams)[number]) =>
        [
          6,
          6 - teams.indexOf(t),
          teams.indexOf(t),
          `${decimal.format(((6 - teams.indexOf(t)) / 6) * 100)}%`,
          450 - teams.indexOf(t) * 12,
          310 + teams.indexOf(t) * 10,
          140 - teams.indexOf(t) * 22,
        ][i],
    })),
  ];
  return (
    <>
      <Heading title="Classificação" />
      <div className="bb-subheading">
        Fase de grupos <span className="bb-muted">· Grupo único</span>
      </div>
      <DataTable
        label="Classificação do grupo único"
        columns={columns}
        rows={teams}
        rowId={(t) => t.id}
      />
    </>
  );
}
function Games({
  admin = false,
  go,
  teamId,
  embedded = false,
}: {
  admin?: boolean;
  go: Go;
  teamId?: string;
  embedded?: boolean;
}) {
  const stateKey = `${admin ? "admin-games" : "public-games"}/${teamId ?? "all"}`;
  const [query, setQuery] = useRetainedState(`${stateKey}/query`, ""),
    [sort, setSort] = useRetainedState<Sort>(`${stateKey}/sort`, {
      key: "date",
      direction: "asc",
    }),
    [page, setPage] = useRetainedState(`${stateKey}/page`, 1),
    [editing, setEditing] = useState<Game | "new" | null>(null),
    [rows, setRows] = useRetainedState("pilot-games", games),
    [notice, setNotice] = useState("");
  const filtered = rows
    .filter((g) => !teamId || g.home.id === teamId || g.away.id === teamId)
    .filter((g) =>
      normalizeSearch(
        `${g.number ?? ""} ${g.home.name} ${g.away.name} ${g.venue ?? ""}`,
      ).includes(normalizeSearch(query)),
    );
  const sorted = sortRows(
      filtered,
      sort,
      (g, key) =>
        key === "match"
          ? `${g.home.name} ${g.away.name}`
          : g[key as "number" | "date" | "time" | "venue" | "status"],
      (g) => g.id,
    ),
    size = 14;
  const columns: Column<Game>[] = [
    {
      key: "number",
      label: "Nº",
      numeric: true,
      sortable: true,
      render: (g) => g.number ?? "—",
    },
    {
      key: "match",
      label: "Confronto",
      primary: true,
      sortable: true,
      render: (g) =>
        admin ? (
          <button
            type="button"
            className="bb-row-link"
            onClick={() => setEditing(g)}
          >
            {g.home.name}
            <span className="bb-versus">×</span>
            {g.away.name}
          </button>
        ) : (
          <PilotLink
            className="bb-row-link"
            go={go}
            to={`publico/jogo/${g.id}`}
          >
            {g.home.name}
            <span className="bb-versus">×</span>
            {g.away.name}
          </PilotLink>
        ),
    },
    {
      key: "date",
      label: "Data",
      sortable: true,
      render: (g) => displayDate(g.date),
    },
    {
      key: "time",
      label: "Horário",
      sortable: true,
      render: (g) => g.time ?? "A definir",
    },
    {
      key: "venue",
      label: "Local",
      sortable: true,
      render: (g) => g.venue ?? "A definir",
    },
    {
      key: "status",
      label: "Situação",
      sortable: true,
      render: (g) => (
        <span
          className={`bb-status ${g.status === "Agendado" ? "bb-status-neutral" : ""}`}
        >
          {g.status === "Resultado publicado" && <Icon name="check" />}
          {g.status}
        </span>
      ),
    },
  ];
  return (
    <>
      <Heading
        title="Jogos"
        level={embedded ? "h2" : "h1"}
        count={`${filtered.length} jogos`}
        actions={
          admin ? (
            <>
              <button
                type="button"
                className="bb-button"
                onClick={() =>
                  setNotice(
                    "Importação de PDFs preservada no produto atual. Este piloto avalia a listagem e o cadastro de jogos.",
                  )
                }
              >
                <Icon name="file" />
                Importar PDFs
              </button>
              <button
                type="button"
                className="bb-button bb-primary"
                onClick={() => setEditing("new")}
              >
                <Icon name="plus" />
                Novo jogo
              </button>
            </>
          ) : undefined
        }
      />
      <div className="bb-toolbar">
        <label className="bb-local-search">
          <Icon name="search" />
          <span className="bb-sr-only">Buscar jogo</span>
          <input
            type="search"
            placeholder="Buscar jogo, equipe ou local"
            name="game-filter"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      {notice && (
        <p role="status" className="bb-feedback">
          {notice}
          <button
            type="button"
            className="bb-icon-button"
            aria-label="Fechar aviso"
            onClick={() => setNotice("")}
          >
            <Icon name="close" />
          </button>
        </p>
      )}
      <DataTable
        label={admin ? "Jogos do campeonato" : "Jogos da disputa"}
        columns={columns}
        rows={sorted.slice((page - 1) * size, page * size)}
        rowId={(g) => g.id}
        sort={sort}
        onSort={(key) => {
          setSort(nextSort(sort, key));
          setPage(1);
        }}
      />
      <Pager
        page={page}
        total={filtered.length}
        size={size}
        onChange={setPage}
      />
      {editing && (
        <GameEditor
          game={editing}
          onClose={() => setEditing(null)}
          onSave={(game) => {
            setRows((previous) =>
              previous.some((g) => g.id === game.id)
                ? previous.map((g) => (g.id === game.id ? game : g))
                : [...previous, game],
            );
            setNotice("Jogo salvo nesta sessão do piloto.");
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
function GameEditor({
  game,
  onClose,
  onSave,
}: {
  game: Game | "new";
  onClose: () => void;
  onSave: (game: Game) => void;
}) {
  const [initial] = useState<Game>(() =>
    game === "new"
      ? {
          id: `new-${Date.now()}`,
          number: null,
          home: teams[0],
          away: teams[1],
          date: null,
          time: null,
          venue: null,
          status: "Agendado",
          homePoints: null,
          awayPoints: null,
        }
      : game,
  );
  const [value, setValue] = useState<Game>(initial),
    [error, setError] = useState("");
  const dirty = JSON.stringify(initial) !== JSON.stringify(value);
  const close = () => {
    if (!dirty || window.confirm("Descartar as alterações deste jogo?"))
      onClose();
  };
  return (
    <Modal
      title={
        game === "new"
          ? "Novo jogo"
          : `Editar jogo ${game.number ?? "sem número"}`
      }
      onClose={close}
      actions={
        <>
          <button type="button" className="bb-button" onClick={close}>
            Cancelar
          </button>
          <button
            type="submit"
            className="bb-button bb-primary"
            form="pilot-game-form"
          >
            Salvar jogo
          </button>
        </>
      }
    >
      <p className="bb-form-context">Copa ES · 2026 · Masculino · Sub-15</p>
      <form
        id="pilot-game-form"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.home.id === value.away.id) {
            setError("Escolha equipes diferentes para o confronto.");
            e.currentTarget
              .querySelector<HTMLSelectElement>('[name="away-team"]')
              ?.focus();
            return;
          }
          if (value.time && !value.date) {
            setError("Informe a data para definir o horário.");
            e.currentTarget
              .querySelector<HTMLInputElement>('[name="game-date"]')
              ?.focus();
            return;
          }
          onSave(value);
        }}
      >
        <div className="bb-form-grid">
          <label>
            Equipe mandante
            <select
              name="home-team"
              aria-invalid={error.includes("equipes") || undefined}
              aria-describedby={
                error.includes("equipes") ? "pilot-game-error" : undefined
              }
              value={value.home.id}
              onChange={(e) =>
                setValue({
                  ...value,
                  home: teams.find((t) => t.id === e.target.value)!,
                })
              }
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Equipe visitante
            <select
              name="away-team"
              aria-invalid={error.includes("equipes") || undefined}
              aria-describedby={
                error.includes("equipes") ? "pilot-game-error" : undefined
              }
              value={value.away.id}
              onChange={(e) =>
                setValue({
                  ...value,
                  away: teams.find((t) => t.id === e.target.value)!,
                })
              }
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="bb-form-grid bb-game-fields">
          <label>
            Nº do jogo
            <input
              type="number"
              name="game-number"
              min="1"
              value={value.number ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  number: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
          <label>
            Data (opcional)
            <input
              type="date"
              name="game-date"
              aria-invalid={error.includes("data") || undefined}
              aria-describedby={
                error.includes("data") ? "pilot-game-error" : undefined
              }
              value={value.date ?? ""}
              onChange={(e) =>
                setValue({ ...value, date: e.target.value || null })
              }
            />
          </label>
          <label>
            Horário (opcional)
            <input
              type="time"
              name="game-time"
              value={value.time ?? ""}
              onChange={(e) =>
                setValue({ ...value, time: e.target.value || null })
              }
            />
          </label>
        </div>
        <label>
          Local (opcional)
          <input
            name="game-venue"
            value={value.venue ?? ""}
            maxLength={160}
            onChange={(e) =>
              setValue({ ...value, venue: e.target.value || null })
            }
          />
        </label>
        {error && (
          <p id="pilot-game-error" role="alert" className="bb-error">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
function Information({ guard }: { guard: Guard }) {
  const makeSeason = (year: number) => ({
    id: String(year),
    year,
    disputes: ["Adulto", "Sub-13", "Sub-14", "Sub-15", "Sub-17", "Sub-22"].map(
      (category, i) => ({
        id: `${year}-${i}`,
        gender: "Masculino",
        category,
        division: i === 0 ? "Série Ouro" : "",
      }),
    ),
  });
  const [name, setName] = useState("Copa ES"),
    [seasons, setSeasons] = useState([makeSeason(2026)]),
    [working, setWorking] = useState("2026-3"),
    [saved, setSaved] = useState(
      JSON.stringify({ name: "Copa ES", seasons: [makeSeason(2026)] }),
    ),
    [status, setStatus] = useState("");
  const dirty = saved !== JSON.stringify({ name, seasons });
  useLeaveGuard(guard, dirty);
  const edit = (
    si: number,
    di: number,
    field: "gender" | "category" | "division",
    value: string,
  ) => {
    setStatus("");
    setSeasons((previous) =>
      previous.map((s, i) =>
        i === si
          ? {
              ...s,
              disputes: s.disputes.map((d, j) =>
                j === di ? { ...d, [field]: value } : d,
              ),
            }
          : s,
      ),
    );
  };
  return (
    <>
      <Heading
        title="Informações"
        actions={
          <span className="bb-muted" role="status">
            {dirty ? "Alterações não salvas" : status || "Sem alterações"}
          </span>
        }
      />
      <form
        className="bb-information"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(JSON.stringify({ name, seasons }));
          setStatus("Salvo nesta sessão");
        }}
      >
        <label className="bb-name-field">
          Nome do campeonato
          <input
            required
            value={name}
            name="competition-name"
            maxLength={120}
            onChange={(e) => {
              setName(e.target.value);
              setStatus("");
            }}
          />
        </label>
        {seasons.map((s, si) => (
          <fieldset className="bb-season" key={s.id}>
            <legend>Temporada {s.year}</legend>
            <label className="bb-year-field">
              Ano
              <input
                type="number"
                required
                min="1900"
                max="2200"
                value={s.year}
                name={`year-${s.id}`}
                onChange={(e) =>
                  setSeasons((previous) =>
                    previous.map((old, i) =>
                      i === si ? { ...old, year: Number(e.target.value) } : old,
                    ),
                  )
                }
              />
            </label>
            <div
              className="bb-dispute-grid bb-dispute-labels"
              aria-hidden="true"
            >
              <span>Naipe</span>
              <span>Categoria</span>
              <span>Divisão (opcional)</span>
              <span>Disputa de trabalho</span>
            </div>
            {s.disputes.map((d, di) => (
              <div
                className={`bb-dispute-grid ${working === d.id ? "bb-working-dispute" : ""}`}
                key={d.id}
              >
                <label>
                  <span className="bb-mobile-field-label">Naipe</span>
                  <select
                    aria-label={`Naipe da disputa ${si + 1}.${di + 1}`}
                    value={d.gender}
                    name={`gender-${d.id}`}
                    onChange={(e) => edit(si, di, "gender", e.target.value)}
                  >
                    <option>Masculino</option>
                    <option>Feminino</option>
                  </select>
                </label>
                <label>
                  <span className="bb-mobile-field-label">Categoria</span>
                  <input
                    aria-label={`Categoria da disputa ${si + 1}.${di + 1}`}
                    required
                    maxLength={80}
                    value={d.category}
                    name={`category-${d.id}`}
                    onChange={(e) => edit(si, di, "category", e.target.value)}
                  />
                </label>
                <label>
                  <span className="bb-mobile-field-label">
                    Divisão (opcional)
                  </span>
                  <input
                    aria-label={`Divisão da disputa ${si + 1}.${di + 1}`}
                    maxLength={80}
                    value={d.division}
                    name={`division-${d.id}`}
                    onChange={(e) => edit(si, di, "division", e.target.value)}
                  />
                </label>
                <label className="bb-working-radio">
                  <input
                    type="radio"
                    name="working-dispute"
                    checked={working === d.id}
                    onChange={() => setWorking(d.id)}
                    aria-label={`Usar disputa ${d.category}`}
                  />
                  {working === d.id ? "Em edição" : "Selecionar"}
                </label>
              </div>
            ))}
            <button
              type="button"
              className="bb-text-button bb-add-row"
              onClick={() =>
                setSeasons((previous) =>
                  previous.map((old, i) =>
                    i === si
                      ? {
                          ...old,
                          disputes: [
                            ...old.disputes,
                            {
                              id: String(Date.now()),
                              gender: "Masculino",
                              category: "",
                              division: "",
                            },
                          ],
                        }
                      : old,
                  ),
                )
              }
            >
              <Icon name="plus" />
              Adicionar disputa
            </button>
          </fieldset>
        ))}
        <div className="bb-form-bottom">
          <button
            type="button"
            className="bb-button"
            onClick={() =>
              setSeasons((previous) => [
                ...previous,
                {
                  ...makeSeason(2026 + previous.length),
                  disputes: [
                    {
                      id: String(Date.now()),
                      gender: "Masculino",
                      category: "",
                      division: "",
                    },
                  ],
                },
              ])
            }
          >
            <Icon name="plus" />
            Adicionar temporada
          </button>
          <button
            type="submit"
            className="bb-button bb-primary"
            disabled={!dirty}
          >
            Salvar campeonato
          </button>
        </div>
      </form>
    </>
  );
}
function Rosters({ guard }: { guard: Guard }) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [roster, setRoster] = useRetainedState("pilot-rosters", () =>
      teams.flatMap((team, ti) =>
        Array.from({ length: 12 }, (_, i) => ({
          ...players[(i + ti * 4) % players.length],
          id: `roster-${team.id}-${i}`,
          team,
        })),
      ),
    ),
    [editing, setEditing] = useState<Player | null>(null),
    [draft, setDraft] = useState<Player | null>(null),
    [rosterError, setRosterError] = useState(""),
    [status, setStatus] = useState("");
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(editing);
  useLeaveGuard(guard, dirty);
  const team = teams.find((t) => t.id === selected),
    filtered = teams.filter((t) =>
      normalizeSearch(t.name).includes(normalizeSearch(query)),
    ),
    selectedRoster = roster.filter((p) => p.team.id === selected);
  function choose(id: string | null) {
    if (guard.current()) {
      setSelected(id);
      setEditing(null);
      setDraft(null);
      setStatus("");
    }
  }
  const columns: Column<Player>[] = [
    { key: "shirt", label: "Nº", numeric: true, render: (p) => p.shirt },
    { key: "name", label: "Atleta", primary: true, render: (p) => p.name },
    {
      key: "actions",
      label: "",
      render: (p) => (
        <button
          type="button"
          className="bb-text-button"
          aria-label={`Editar ${p.name}`}
          onClick={() => {
            setEditing(p);
            setDraft({ ...p });
            setRosterError("");
          }}
        >
          Editar
        </button>
      ),
    },
  ];
  return (
    <>
      <Heading title="Equipes e elencos" count="6 equipes" />
      <div
        className={`bb-roster-layout ${selected ? "bb-roster-selected" : ""}`}
      >
        <aside className="bb-team-sidebar" aria-label="Equipes inscritas">
          <label className="bb-local-search">
            <Icon name="search" />
            <span className="bb-sr-only">Buscar equipe inscrita</span>
            <input
              type="search"
              placeholder="Buscar equipe"
              name="team-filter"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="bb-team-list">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={selected === t.id}
                onClick={() => choose(t.id)}
              >
                <span>
                  <strong>{t.name}</strong>
                  <small>
                    {roster.filter((p) => p.team.id === t.id).length} atletas
                  </small>
                </span>
                <Icon name="chevron" />
              </button>
            ))}
            {!filtered.length && (
              <p className="bb-empty">Nenhuma equipe encontrada.</p>
            )}
          </div>
        </aside>
        <section className="bb-roster-panel" aria-label="Elenco selecionado">
          {team ? (
            <>
              <button
                className="bb-text-button bb-roster-back"
                type="button"
                onClick={() => choose(null)}
              >
                <Icon name="back" />
                Voltar às equipes
              </button>
              <div className="bb-roster-title">
                <div>
                  <h2>{team.name}</h2>
                  <p className="bb-muted">Sub-15 · Masculino</p>
                </div>
                <span className="bb-count">
                  {selectedRoster.length} atletas
                </span>
              </div>
              {status && (
                <p role="status" className="bb-feedback">
                  {status}
                </p>
              )}
              <DataTable
                label={`Elenco de ${team.name}`}
                columns={columns}
                rows={selectedRoster}
                rowId={(p) => p.id}
              />
            </>
          ) : (
            <div className="bb-selection-empty">
              <Icon name="teams" />
              <p>Selecione uma equipe para ver o elenco.</p>
            </div>
          )}
        </section>
      </div>
      {draft && (
        <Modal
          title={`Editar ${editing?.name}`}
          onClose={() => {
            if (guard.current()) {
              setDraft(null);
              setEditing(null);
            }
          }}
          actions={
            <>
              <button
                type="button"
                className="bb-button"
                onClick={() => {
                  if (guard.current()) {
                    setDraft(null);
                    setEditing(null);
                  }
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bb-button bb-primary"
                form="pilot-player-form"
              >
                Salvar atleta
              </button>
            </>
          }
        >
          <form
            id="pilot-player-form"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                selectedRoster.some(
                  (p) => p.id !== draft.id && p.shirt === draft.shirt,
                )
              ) {
                setRosterError(
                  "Esta camisa já está em uso neste elenco. Escolha outra camisa.",
                );
                e.currentTarget
                  .querySelector<HTMLInputElement>('[name="shirt"]')
                  ?.focus();
                return;
              }
              setRoster((previous) =>
                previous.map((p) => (p.id === draft.id ? draft : p)),
              );
              setDraft(null);
              setEditing(null);
              setStatus("Atleta salvo nesta sessão.");
            }}
          >
            <p className="bb-form-context">{team?.name} · Copa ES · Sub-15</p>
            <label>
              Nome do atleta
              <input
                required
                maxLength={160}
                value={draft.name}
                name="player-name"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="bb-shirt-field">
              Camisa
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                maxLength={2}
                value={draft.shirt}
                name="shirt"
                aria-invalid={!!rosterError || undefined}
                aria-describedby={
                  rosterError ? "pilot-roster-error" : undefined
                }
                onChange={(e) => setDraft({ ...draft, shirt: e.target.value })}
              />
            </label>
            {rosterError && (
              <p id="pilot-roster-error" className="bb-error" role="alert">
                {rosterError}
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
function CompetitionPicker({ go, selected }: { go: Go; selected?: string }) {
  return (
    <>
      <Heading title="Campeonatos" />
      <div className="bb-competition-tree">
        {competitions
          .filter((c) => !selected || c.id === selected)
          .map((c) => (
            <details open key={c.id}>
              <summary>
                <Icon name="trophy" />
                {c.name}
              </summary>
              {c.years.map((year) => (
                <details key={year} open={year === 2026}>
                  <summary>{year}</summary>
                  <div className="bb-gender-columns">
                    {["Masculino", "Feminino"].map((gender) => (
                      <section key={gender}>
                        <h2>{gender}</h2>
                        {c.categories.map((category) => (
                          <PilotLink
                            className="bb-tree-leaf"
                            key={category}
                            go={go}
                            to={`publico/classificacao?${new URLSearchParams({ competition: c.name, year: String(year), gender, category })}`}
                          >
                            {category}
                            <Icon name="chevron" />
                          </PilotLink>
                        ))}
                      </section>
                    ))}
                  </div>
                </details>
              ))}
            </details>
          ))}
      </div>
    </>
  );
}
function Participations({ teamId, go }: { teamId: string; go: Go }) {
  const team = teams.find((t) => t.id === teamId) ?? teams[0];
  return (
    <>
      <Heading title={team.name} />
      <p className="bb-muted">Escolha a participação</p>
      <div className="bb-participations">
        <PilotLink go={go} to={`publico/equipe/${team.id}`}>
          <Icon name="trophy" />
          <span>
            <strong>Copa ES</strong>
            <small>2026 · Masculino · Sub-15</small>
          </span>
          <Icon name="chevron" />
        </PilotLink>
        <PilotLink go={go} to={`publico/equipe/${team.id}?year=2025`}>
          <Icon name="trophy" />
          <span>
            <strong>Copa ES</strong>
            <small>2025 · Masculino · Sub-15</small>
          </span>
          <Icon name="chevron" />
        </PilotLink>
      </div>
    </>
  );
}
function Profile({
  kind,
  id,
  go,
  onSiglas,
}: {
  kind: string;
  id: string;
  go: Go;
  onSiglas: () => void;
}) {
  const isPlayer = kind === "jogador",
    player = players.find((p) => p.id === id) ?? players[0],
    team = isPlayer
      ? player.team
      : (teams.find((t) => t.id === id) ?? teams[0]);
  const [active, setActive] = useState("estatisticas");
  const tabs = [
    { key: "estatisticas", label: "Estatísticas" },
    ...(!isPlayer ? [{ key: "elenco", label: "Elenco" }] : []),
    { key: "jogos", label: "Jogos" },
  ];
  return (
    <>
      <PilotLink
        className="bb-text-button bb-profile-back"
        go={go}
        to={`publico/${isPlayer ? "jogadores" : "equipes"}`}
      >
        <Icon name="back" />
        Voltar a {isPlayer ? "jogadores" : "equipes"}
      </PilotLink>
      <div className="bb-profile-summary">
        <div className="bb-profile-identity">
          <span className="bb-identity-mark">
            <Icon name={isPlayer ? "player" : "teams"} />
          </span>
          <div>
            <h1>
              {isPlayer ? player.name : team.name}
              {isPlayer && <span className="bb-shirt">{player.shirt}</span>}
            </h1>
            <p>{isPlayer ? team.name : team.fullName}</p>
          </div>
        </div>
        <div className="bb-profile-numbers">
          <div>
            <strong>{isPlayer ? player.games : 6}</strong>
            <span>Jogos</span>
          </div>
          <div>
            <strong>{isPlayer ? player.points : 450}</strong>
            <span>Pontos</span>
          </div>
          <div>
            <strong>{decimal.format(isPlayer ? player.average : 75)}</strong>
            <span>Por jogo</span>
          </div>
        </div>
      </div>
      <SectionTabs
        id="profile-tabs"
        label="Seções do perfil"
        active={active}
        items={tabs}
        onChange={setActive}
      />
      <TabPanel id="profile-tabs" active={active}>
        {active === "jogos" ? (
          <Games go={go} teamId={team.id} embedded />
        ) : active === "elenco" ? (
          <PlayerStatistics
            go={go}
            onSiglas={onSiglas}
            subset={players.filter((p) => p.team.id === team.id)}
          />
        ) : isPlayer ? (
          <PlayerStatistics go={go} onSiglas={onSiglas} subset={[player]} />
        ) : (
          <TeamStatistics go={go} teamId={team.id} />
        )}
      </TabPanel>
    </>
  );
}
function GameDetail({ id, go }: { id: string; go: Go }) {
  const game = games.find((g) => g.id === id) ?? games[0];
  return (
    <>
      <PilotLink
        className="bb-text-button bb-profile-back"
        go={go}
        to={"publico/jogos"}
      >
        <Icon name="back" />
        Voltar aos jogos
      </PilotLink>
      <Heading title={`Jogo ${game.number ?? "sem número"}`} />
      <p className="bb-muted">
        {displayDate(game.date)} · {game.time ?? "A definir"} ·{" "}
        {game.venue ?? "Local a definir"}
      </p>
      <div className="bb-scoreboard">
        <PilotLink
          className="bb-row-link"
          go={go}
          to={`publico/equipe/${game.home.id}`}
        >
          {game.home.name}
        </PilotLink>
        <strong>
          {game.homePoints ?? "—"}
          <span>×</span>
          {game.awayPoints ?? "—"}
        </strong>
        <PilotLink
          className="bb-row-link"
          go={go}
          to={`publico/equipe/${game.away.id}`}
        >
          {game.away.name}
        </PilotLink>
      </div>
      <p className="bb-muted">{game.status}</p>
    </>
  );
}
function RegulationPilot() {
  return (
    <>
      <Heading title="Regulamento" />
      <p>O piloto desta etapa cobre Informações, Equipes e elencos e Jogos.</p>
      <p className="bb-muted">
        O fluxo de regulamento será padronizado após o aceite visual,
        preservando suas regras atuais.
      </p>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
