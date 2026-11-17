import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  DataTable,
  Icon,
  SectionTabs,
  TabPanel,
  type Column,
} from "../../../../src/ui-system/components";
import {
  GlobalSearch,
  type SearchProvider,
} from "../../../../src/ui-system/global-search";
import { normalizeSearch } from "../../../../src/ui-system/controls";
import { TooltipProvider } from "../../../../src/statistics/reference/tooltip";
import {
  gamesFor,
  participationContext,
  participations,
  team,
  teamLabel,
  type Participation,
} from "./fixtures";
import {
  openTeam,
  readRoute,
  searchHref,
  standingsHref,
  tabs,
  teamHref,
  type TeamRoute,
  type TournamentRoute,
} from "./navigation";
import {
  GameTable,
  ParticipationTable,
  printDate,
  Recent,
  RosterTable,
  TeamStats,
} from "./tables";
import "../../../../src/ui-system/readability.css";
import "../../../../src/ui-system/theme.css";
import "../../../../src/regulation/public-standings.css";
import "../../../../src/public-ui/legend.css";
import "./screen.css";

const search: SearchProvider = async (query, type) => {
  const matches = [team.name, team.abbreviation].some((name) =>
    normalizeSearch(name).includes(query),
  );
  return matches && (type === "all" || type === "teams")
    ? [
        {
          type: "teams",
          label: "Equipes",
          items: [
            {
              id: "serra",
              type: "teams",
              label: team.name,
              description: team.city,
            },
          ],
        },
      ]
    : [];
};
const sorted = [...participations].sort(
  (a, b) =>
    b.year - a.year ||
    a.name.localeCompare(b.name, "pt-BR") ||
    a.category.localeCompare(b.category, "pt-BR", { numeric: true }) ||
    a.gender.localeCompare(b.gender, "pt-BR"),
);
const groups = [
  { status: "active", title: "Em andamento" },
  { status: "closed", title: "Histórico" },
  { status: null, title: "Situação não informada" },
] as const;

function Title({
  children,
  context,
}: {
  children: ReactNode;
  context?: ReactNode;
}) {
  return (
    <div className="prototype-title">
      <h1 id="titulo" tabIndex={-1}>
        {children}
      </h1>
      {context && <p>{context}</p>}
    </div>
  );
}

function SearchPage({ q }: { q: string }) {
  const more = q
    ? normalizeSearch(team.name + " " + team.abbreviation).includes(
        normalizeSearch(q),
      )
    : true;
  return (
    <>
      <Title context={q ? `Resultados para “${q}”` : undefined}>Busca</Title>
      <div className="prototype-card prototype-search-body">
        <h2>Equipes</h2>
        {more ? (
          <a className="prototype-search-result" href={openTeam(searchHref(q))}>
            <Icon name="teams" />
            <span>
              <strong>{team.name}</strong>
              <small>{team.city}</small>
            </span>
            <Icon name="chevron" />
          </a>
        ) : (
          <p className="prototype-empty">Nenhuma equipe encontrada.</p>
        )}
        <div className="prototype-entry">
          <h2>Campeonatos</h2>
          {sorted
            .filter((p) => p.status === "active")
            .map((p) => (
              <a
                href={standingsHref(p)}
                className="prototype-search-result"
                key={p.id}
              >
                <Icon name="trophy" />
                <span>
                  <strong>{p.name}</strong>
                  <small>{participationContext(p)}</small>
                </span>
                <Icon name="chevron" />
              </a>
            ))}
        </div>
      </div>
    </>
  );
}

function Standings({ route }: { route: TournamentRoute }) {
  const p = route.registration,
    knockout = route.phase === p.knockout?.phase;
  const label = knockout
    ? p.knockout!.name
    : (p.group?.phaseName ?? "Classificação");
  const pos = p.group?.position ?? p.finalPosition;
  const rows = [
    { id: p.id, name: team.name, pos: knockout ? null : pos, primary: true },
    {
      id: "enseada",
      name: teamLabel("enseada"),
      pos: knockout || pos == null ? null : pos === 1 ? 2 : 1,
      primary: false,
    },
    ...(knockout
      ? []
      : [
          {
            id: "estrela",
            name: teamLabel("estrela"),
            pos: pos == null ? null : Math.max(pos + 1, 3),
            primary: false,
          },
        ]),
  ].sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999));
  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "position",
      label: "Posição",
      numeric: true,
      render: (row) => row.pos ?? "—",
    },
    {
      key: "team",
      label: "Equipe",
      primary: true,
      render: (row) =>
        row.primary ? (
          <a href={openTeam(standingsHref(p, route.phase, route.group), p)}>
            {row.name}
          </a>
        ) : (
          row.name
        ),
    },
    {
      key: "recent",
      label: "Últimos jogos",
      render: (row) => (row.primary ? <Recent p={p} /> : "—"),
    },
  ];
  return (
    <>
      <a className="prototype-return" href={searchHref()}>
        <Icon name="back" /> Busca
      </a>
      <Title context={participationContext(p)}>{p.name}</Title>
      <section className="prototype-card prototype-standing">
        <h2>Classificação</h2>
        {p.knockout && p.group && (
          <nav aria-label="Fase da disputa" className="prototype-phase">
            <a
              aria-current={!knockout ? "page" : undefined}
              href={standingsHref(p, p.group.phase)}
            >
              Fase classificatória
            </a>
            <a
              aria-current={knockout ? "page" : undefined}
              href={standingsHref(p, p.knockout.phase)}
            >
              {p.knockout.name}
            </a>
          </nav>
        )}
        <p className="prototype-context">
          {label}
          {route.group && p.group ? ` · ${p.group.name}` : ""}
        </p>
        <DataTable
          label={`Classificação de ${p.name}`}
          columns={columns}
          rows={rows}
          rowId={(row) => row.id}
        />
      </section>
    </>
  );
}

const awards = [1, 2, 3].map((position) => ({
  position,
  label: ["Título", "Vice-campeonato", "Terceiro lugar"][position - 1],
  entries: sorted.filter((p) => p.finalPosition === position),
}));
function Awards() {
  return (
    <section className="prototype-awards" aria-labelledby="conquistas">
      <h2 id="conquistas">Conquistas</h2>
      <details>
        <summary>
          <span className="prototype-award-summary">
            {awards.map(({ position, label, entries }) => (
              <span key={position}>
                <strong>{entries.length}</strong>
                {label}
              </span>
            ))}
          </span>
          <span className="prototype-award-toggle">
            Ver conquistas <Icon name="chevron" />
          </span>
        </summary>
        <ul className="prototype-award-list">
          {awards.flatMap(({ position, entries }) =>
            entries.map((p) => (
              <li key={p.id}>
                <span
                  className={`prototype-medal medal-${position}`}
                  role="img"
                  aria-label={`${position}º lugar`}
                >
                  {position === 1 ? <Icon name="trophy" /> : `${position}º`}
                </span>
                <div className="prototype-cell-name">
                  <a href={standingsHref(p)}>{p.name}</a>
                  <small>{participationContext(p)}</small>
                </div>
              </li>
            )),
          )}
        </ul>
      </details>
    </section>
  );
}

function Overview() {
  return (
    <div className="prototype-overview">
      {groups.map(({ status, title }) => (
        <ParticipationTable
          key={title}
          title={title}
          entries={sorted.filter((p) => p.status === status)}
        />
      ))}
    </div>
  );
}

function ParticipationSelect({
  current,
  change,
}: {
  current: Participation | null;
  change: (p: Participation) => void;
}) {
  return (
    <label className="prototype-selector">
      <span>Campeonato</span>
      <select
        value={current?.id ?? ""}
        name="campeonato"
        onChange={(event) => {
          const choice = sorted.find((p) => p.id === event.currentTarget.value);
          if (choice) change(choice);
        }}
      >
        <option value="" disabled>
          Selecione uma participação
        </option>
        {groups.map(({ status, title }) => (
          <optgroup label={title} key={title}>
            {sorted
              .filter((p) => p.status === status)
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name} · {participationContext(p)}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function ModeControl({
  mode,
  change,
}: {
  mode: TeamRoute["mode"];
  change: (m: TeamRoute["mode"]) => void;
}) {
  return (
    <div
      className="bb-segment prototype-mode"
      role="group"
      aria-label="Exibição das estatísticas"
    >
      <button
        type="button"
        aria-pressed={mode === "totais"}
        onClick={() => change("totais")}
      >
        Totais
      </button>
      <button
        type="button"
        aria-pressed={mode === "por-jogo"}
        onClick={() => change("por-jogo")}
      >
        Por jogo
      </button>
    </div>
  );
}

function Roster({
  route,
  go,
}: {
  route: TeamRoute;
  go: (href: string) => void;
}) {
  const { registration: current, rosterList } = route;
  const heading = useRef<HTMLHeadingElement>(null);
  const listLinks = useRef(new Map<string, HTMLAnchorElement>());
  const savedScroll = useRef<number | null>(null);
  const selected = useRef<string | null>(null);
  const layoutOnClick = useRef(false);
  const mobile = () => window.matchMedia("(max-width: 999px)").matches;

  useLayoutEffect(() => {
    if ((!current || rosterList) && mobile() && selected.current) {
      if (savedScroll.current !== null) window.scrollTo(0, savedScroll.current);
      listLinks.current.get(selected.current)?.focus({ preventScroll: true });
    } else if (current && layoutOnClick.current) {
      heading.current?.focus();
    }
    layoutOnClick.current = false;
  }, [current, rosterList]);

  function choose(p: Participation, event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    if (mobile()) {
      savedScroll.current = window.scrollY;
      selected.current = p.id;
    }
    layoutOnClick.current = true;
  }
  return (
    <div
      className={`prototype-roster ${current && !rosterList ? "has-detail" : ""}`}
    >
      <nav
        className="prototype-roster-list"
        aria-label="Campeonatos dos elencos"
      >
        <ul>
          {sorted.map((p) => (
            <li key={p.id}>
              <a
                href={teamHref({
                  ...route,
                  registration: p,
                  rosterList: false,
                })}
                aria-current={current?.id === p.id ? "true" : undefined}
                onClick={(event) => choose(p, event)}
                ref={(node) => {
                  if (node) listLinks.current.set(p.id, node);
                  else listLinks.current.delete(p.id);
                }}
              >
                <span className="prototype-cell-name">
                  <strong>{p.name}</strong>
                  <small>{participationContext(p)}</small>
                </span>
                <Icon name="chevron" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <section
        className="prototype-roster-detail"
        aria-labelledby="elenco-selecionado"
      >
        {current ? (
          <>
            <a
              href={teamHref({ ...route, rosterList: true })}
              className="prototype-roster-back prototype-return"
              onClick={(event) => {
                if (
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey ||
                  event.altKey ||
                  event.button !== 0
                )
                  return;
                selected.current ??= current.id;
              }}
            >
              <Icon name="back" /> Voltar aos elencos
            </a>
            <div className="prototype-roster-heading">
              <div className="prototype-cell-name">
                <h2 id="elenco-selecionado" ref={heading} tabIndex={-1}>
                  {current.name}
                </h2>
                <small>{participationContext(current)}</small>
              </div>
              <ModeControl
                mode={route.mode}
                change={(mode) => go(teamHref({ ...route, mode }))}
              />
            </div>
            <RosterTable p={current} mode={route.mode} />
          </>
        ) : (
          <p id="elenco-selecionado" className="prototype-empty">
            Selecione um campeonato para ver o elenco.
          </p>
        )}
      </section>
    </div>
  );
}

function Profile({
  route,
  go,
}: {
  route: TeamRoute;
  go: (href: string) => void;
}) {
  const { back, tab, registration } = route;
  const backRoute = readRoute(back);
  const update = (changes: Partial<TeamRoute>) =>
    go(teamHref({ ...route, ...changes }));
  const panel = () => {
    if (tab === "visao-geral") return <Overview />;
    if (tab === "elencos") return <Roster route={route} go={go} />;
    return (
      <>
        <div className="prototype-toolbar">
          <ParticipationSelect
            current={registration}
            change={(registration) =>
              update({ registration, rosterList: false })
            }
          />
          {registration && tab === "estatisticas" && (
            <ModeControl
              mode={route.mode}
              change={(mode) => update({ mode })}
            />
          )}
        </div>
        {registration &&
          (tab === "estatisticas" ? (
            <TeamStats p={registration} mode={route.mode} />
          ) : (
            <GameTable p={registration} back={teamHref(route)} />
          ))}
      </>
    );
  };
  return (
    <>
      <a href={back} className="prototype-return">
        <Icon name="back" />{" "}
        {backRoute.view === "classificacao"
          ? backRoute.registration.name
          : "Busca"}
      </a>
      <div
        className={`prototype-profile ${tab === "visao-geral" ? "with-awards" : ""}`}
      >
        <Title context={team.city}>{team.name}</Title>
        <div className="prototype-card prototype-profile-body">
          <SectionTabs
            id="perfil"
            label="Perfil da equipe"
            items={tabs}
            active={tab}
            onChange={(key) => {
              const next = tabs.find((t) => t.key === key);
              if (next && next.key !== tab) update({ tab: next.key });
            }}
          />
          {tabs.map(({ key }) => (
            <div key={key} hidden={key !== tab} className="prototype-panel">
              <TabPanel id="perfil" active={key}>
                {key === tab ? panel() : null}
              </TabPanel>
            </div>
          ))}
        </div>
        {tab === "visao-geral" && <Awards />}
      </div>
    </>
  );
}

function Match({
  route,
}: {
  route: Extract<ReturnType<typeof readRoute>, { view: "partida" }>;
}) {
  const game = gamesFor(route.registration).find(
    (g) => g.id === route.gameId && g.score,
  );
  return (
    <>
      <a href={route.back} className="prototype-return">
        <Icon name="back" /> Voltar aos jogos
      </a>
      <Title
        context={`${route.registration.name} · ${participationContext(route.registration)}`}
      >
        Partida
      </Title>
      <section
        className="prototype-card prototype-match"
        aria-label="Resultado da partida"
      >
        {game ? (
          <>
            <p className="prototype-context">
              {printDate(game.date)} · {game.time} · {game.venue}
            </p>
            <div className="prototype-scoreboard">
              <strong>{teamLabel(game.homeRegistrationId)}</strong>
              <span className="prototype-score">
                {game.score!.homePoints} × {game.score!.awayPoints}
              </span>
              <strong>{teamLabel(game.awayRegistrationId)}</strong>
            </div>
          </>
        ) : (
          <p className="prototype-empty">Resultado não publicado.</p>
        )}
      </section>
    </>
  );
}

function App() {
  const [hash, setHash] = useState(window.location.hash);
  const main = useRef<HTMLElement>(null);
  const route = readRoute(hash);
  const previous = useRef(route.view);
  const go = (href: string) => {
    if (window.location.hash !== href) window.location.hash = href;
  };
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useLayoutEffect(() => {
    if (previous.current === route.view) return;
    previous.current = route.view;
    window.scrollTo(0, 0);
    main.current
      ?.querySelector<HTMLElement>("#titulo")
      ?.focus({ preventScroll: true });
  }, [route.view]);

  return (
    <div className="bb-ui public-standings public-site statistics-public team-prototype">
      <TooltipProvider>
        <a
          className="bb-skip"
          href="#conteudo"
          onClick={(event) => {
            event.preventDefault();
            main.current?.focus();
          }}
        >
          Ir para o conteúdo
        </a>
        <header className="prototype-top">
          <div className="prototype-width prototype-top-inner">
            <a href={searchHref()} className="prototype-brand">
              <Icon name="trophy" /> Base do Basquete
            </a>
            <GlobalSearch
              provider={search}
              onSelect={() => go(openTeam(searchHref(team.name)))}
            />
          </div>
        </header>
        <main
          ref={main}
          id="conteudo"
          tabIndex={-1}
          className="prototype-width"
        >
          {route.view === "busca" ? (
            <SearchPage q={route.q} />
          ) : route.view === "classificacao" ? (
            <Standings route={route} />
          ) : route.view === "equipe" ? (
            <Profile route={route} go={go} />
          ) : (
            <Match route={route} />
          )}
        </main>
        <footer className="prototype-width prototype-footer">
          Protótipo · Dados fictícios
        </footer>
      </TooltipProvider>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
