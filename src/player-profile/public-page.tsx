import { useEffect, useRef, useState } from "react";
import { ApiFailure } from "../competition/api";
import { compareJerseys } from "../domain/jersey";
import { PublicHeader, PublicFooter } from "../public-ui/shell";
import { publicDetailLink } from "../public-ui/navigation";
import { publicPlayerName } from "../public-ui/player-name";
import { SectionTabs } from "../ui-system/components";
import { TooltipProvider } from "../statistics/reference/tooltip";
import { STATISTICS_METRICS } from "../statistics/metrics";
import { loadPublicCareer } from "./public-loader";
import {
  careerGroups,
  careerStatistics,
  chronologicalGames,
  metricLabel,
  type ProfileMetric,
  type PublicCareer,
} from "./public-model";
import { RECORD_METRICS, rankCareerGames } from "./presentation";
import {
  CareerHonors,
  CareerRecords,
  TeamTrajectory,
  ProfileGames,
  MetricTerm,
  useGameScores,
} from "./approved-components";
import {
  PROFILE_TABS,
  readProfileLocation,
  profileQuery,
  seasonAge,
  type ProfileView,
} from "./view-state";
import { ProfileFilters } from "./profile-filters";
import { useProfilePanelSpace } from "./panel-space";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const readLocation = () => readProfileLocation(window.location.hash);
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
function value(
  summary: ReturnType<typeof careerStatistics>,
  metric: ProfileMetric,
) {
  const c = summary?.metrics[metric];
  return c?.status === "available" ? number.format(c.value) : "—";
}
export function PlayerPublicPage() {
  const [route, setRoute] = useState(readLocation),
    [career, setCareer] = useState<PublicCareer | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [filters, setFilters] = useState<"stats" | "games" | null>(null);
  const restored = useRef(false),
    alert = useRef<HTMLDivElement>(null),
    tableScroll = useRef<HTMLDivElement>(null),
    statsScroll = useRef(0);
  const { id, origin, view } = route;
  useEffect(() => {
    const read = () => {
      setFilters(null);
      setRoute(readLocation());
    };
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, []);
  useEffect(() => {
    setCareer(null);
    setError("");
    restored.current = false;
    if (!id) {
      setError("Abra o perfil a partir de um atleta identificado.");
      return;
    }
    const c = new AbortController();
    void loadPublicCareer(id, c.signal)
      .then((next) => {
        if (!c.signal.aborted) setCareer(next);
      })
      .catch((e: unknown) => {
        if (!c.signal.aborted)
          setError(
            e instanceof ApiFailure
              ? e.message
              : "Não foi possível consultar o perfil. Tente novamente.",
          );
      });
    return () => c.abort();
  }, [id, retry]);
  const ready = career?.page.personId === id ? career : null;
  useProfilePanelSpace(!!ready, `${view.section}/${view.columns.join(",")}`);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(
          `player-scroll:${location.pathname}${location.hash}`,
          String(window.scrollY),
        );
      } catch {
        /* Optional storage. */
      }
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(
        `player-scroll:${location.pathname}${location.hash}`,
      );
    } catch {
      /* Optional storage. */
    }
    const frame = requestAnimationFrame(() => {
      if (saved !== null && Number.isFinite(Number(saved)))
        window.scrollTo(0, Number(saved));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready]);
  useEffect(() => {
    if (tableScroll.current)
      tableScroll.current.scrollLeft = statsScroll.current;
  }, [view]);
  function update(patch: Partial<ProfileView>, jump = false) {
    const next = { ...view, ...patch };
    window.history.pushState(
      window.history.state,
      "",
      `#${id}?${profileQuery(next, origin)}`,
    );
    setRoute({ ...route, view: next });
    if (jump)
      requestAnimationFrame(() => {
        document
          .getElementById(`player-tabs-${next.section}`)
          ?.focus({ preventScroll: true });
      });
  }
  const groups = ready ? careerGroups(ready) : [];
  const teams = [
    ...new Map(
      groups.map((g) => [
        g.history.registration.team.id,
        {
          id: g.history.registration.team.id,
          name: g.history.registration.team.name,
        },
      ]),
    ).values(),
  ];
  const years = [...new Set(groups.map((g) => g.history.context.year))].sort(
    (a, b) => b - a,
  );
  const championships = [
    ...new Map(
      groups.map((g) => [
        g.history.context.championshipId,
        { id: g.history.context.championshipId, name: g.history.context.name },
      ]),
    ).values(),
  ];
  const filtered = groups
    .filter(
      (g) =>
        (!view.year || String(g.history.context.year) === view.year) &&
        (!view.championship ||
          g.history.context.championshipId === view.championship) &&
        (view.teams === null ||
          view.teams.includes(g.history.registration.team.id)),
    )
    .map((g) => ({
      ...g,
      games: g.games.filter(
        (p) =>
          view.scope === "all" ||
          p.fact.phase ===
            (view.scope === "regular" ? "round_robin" : "knockout"),
      ),
    }));
  const summaries = new Map(
    filtered.map((g) => [g.key, careerStatistics(g.games, id!, view.mode)]),
  );
  const ordered = [...filtered].sort((a, b) => {
    if (view.sort === "jersey") {
      const left = a.history.jerseys[0] ?? null,
        right = b.history.jerseys[0] ?? null;
      if (left === "00" || right === "00")
        return left === right
          ? a.key.localeCompare(b.key)
          : left === "00"
            ? 1
            : -1;
      return (
        (view.direction === "asc" ? 1 : -1) * compareJerseys(left, right) ||
        a.key.localeCompare(b.key)
      );
    }
    const pick = (g: typeof a): string | number | null =>
      view.sort === "year"
        ? g.history.context.year
        : view.sort === "competition"
          ? g.history.context.name
          : view.sort === "team"
            ? g.history.registration.name
            : view.sort === "games"
              ? g.games.filter((p) => p.fact.played).length
              : (summaries.get(g.key)?.metrics[view.sort as ProfileMetric]
                  ?.value ?? null);
    const av = pick(a),
      bv = pick(b);
    if (av === null || bv === null)
      return av === bv ? a.key.localeCompare(b.key) : av === null ? 1 : -1;
    const diff =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "pt-BR", {
            numeric: true,
            sensitivity: "base",
          });
    return (
      (view.direction === "asc" ? diff : -diff) || a.key.localeCompare(b.key)
    );
  });
  const statsPages = Math.max(1, Math.ceil(ordered.length / 20)),
    statsPage = Math.min(view.statsPage, statsPages);
  const allGames = chronologicalGames(ready?.games ?? []),
    recent = allGames.filter((g) => g.fact.played).slice(0, 5);
  const appearances = allGames.filter((g) => g.fact.played);
  const games = allGames.filter(
    (g) =>
      g.fact.played &&
      (!view.gameYear || String(g.fact.context.year) === view.gameYear) &&
      (!view.gameChampionship ||
        g.fact.context.championshipId === view.gameChampionship) &&
      (!view.gameTeam || g.fact.registration.team.id === view.gameTeam) &&
      (!view.opponent ||
        normalize(
          g.game[g.fact.side === "home" ? "away" : "home"].name,
        ).includes(normalize(view.opponent))),
  );
  const pages = Math.max(1, Math.ceil(games.length / 12)),
    page = Math.min(view.page, pages),
    pageGames = games.slice((page - 1) * 12, page * 12);
  const visibleGames =
    view.section === "jogos"
      ? pageGames
      : view.section === "historico"
        ? [
            ...new Map(
              RECORD_METRICS.flatMap((m) =>
                rankCareerGames(ready?.games ?? [], m).slice(
                  0,
                  view.expanded.includes(m) ? 5 : 1,
                ),
              ).map((g) => [g.fact.gameId, g]),
            ).values(),
          ]
        : view.section === "resumo"
          ? recent
          : [];
  const scores = useGameScores(visibleGames);
  // Effective pages are reflected in the URL before another page action or return link.
  useEffect(() => {
    if (!ready || (view.page === page && view.statsPage === statsPage)) return;
    const next = { ...view, page, statsPage };
    history.replaceState(
      history.state,
      "",
      `#${id}?${profileQuery(next, origin)}`,
    );
    setRoute({ ...route, view: next });
  }, [ready, page, statsPage, view, route, id, origin]);
  const name = ready
    ? publicPlayerName(ready.page.identity.name, ready.page.identity.nickname)
    : "Perfil do atleta";
  const latest = allGames[0],
    latestYear = years[0],
    birthYear = ready?.page.identity.metadata?.publicBirthYear ?? null,
    hasAge = birthYear !== null;
  const metadata = ready?.page.identity.metadata;
  const summaryRows = [
    {
      label: latestYear ? String(latestYear) : "Temporada",
      games: allGames.filter((g) => g.fact.context.year === latestYear),
    },
    { label: "Carreira", games: allGames },
  ];
  const hasHonors = !!(
    ready &&
    (ready.page.honors.length || ready.page.teamPlacements.length)
  );
  const legendMetrics: (ProfileMetric | "games")[] =
    view.section === "estatisticas"
      ? ["games", ...view.columns]
      : view.section === "historico"
        ? [...RECORD_METRICS]
        : view.section === "jogos"
          ? ["points"]
          : ["games", ...RECORD_METRICS];
  const sort = (key: string) =>
    update({
      sort: key,
      direction:
        view.sort === key && view.direction === "desc" ? "asc" : "desc",
      statsPage: 1,
    });
  const pager = (kind: "stats" | "games") => {
    const p = kind === "stats" ? statsPage : page,
      total = kind === "stats" ? statsPages : pages;
    return total > 1 ? (
      <nav
        className="player-pager"
        aria-label={
          kind === "stats" ? "Paginação de campeonatos" : "Paginação de jogos"
        }
      >
        <button
          disabled={p <= 1}
          onClick={() =>
            update(kind === "stats" ? { statsPage: p - 1 } : { page: p - 1 })
          }
        >
          Anterior
        </button>
        <span>
          Página {p} de {total}
        </span>
        <button
          disabled={p >= total}
          onClick={() =>
            update(kind === "stats" ? { statsPage: p + 1 } : { page: p + 1 })
          }
        >
          Próxima
        </button>
      </nav>
    ) : null;
  };
  const preview = ready ? (
    <section className="player-career-preview">
      <h2>Recordes da carreira</h2>
      <div className="player-record-preview">
        {RECORD_METRICS.map((m) => (
          <a
            key={m}
            href={`#${id}?${profileQuery({ ...view, section: "historico" }, origin)}`}
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                update({ section: "historico" }, true);
              }
            }}
          >
            <strong>
              {(rankCareerGames(ready.games, m)[0]?.fact.scoring?.[m] ||
                null) ??
                "—"}
            </strong>
            <span>{metricLabel(m)}</span>
          </a>
        ))}
      </div>
      <div className="player-link-footer">
        <a
          href={`#${id}?${profileQuery({ ...view, section: "historico" }, origin)}`}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
              e.preventDefault();
              update({ section: "historico" }, true);
            }
          }}
        >
          Ver carreira
        </a>
      </div>
    </section>
  ) : null;
  return (
    <TooltipProvider>
      <a
        className="access-skip"
        href="#player-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("player-content")?.focus();
        }}
      >
        Pular para o perfil
      </a>
      <PublicHeader disputeId={origin} section="jogadores" detail={name} />
      <main
        id="player-content"
        tabIndex={-1}
        className="access-main player-page bb-ui"
      >
        {error ? (
          <div className="access-error" role="alert" ref={alert} tabIndex={-1}>
            <h1>Perfil do atleta</h1>
            <p>{error}</p>
            {id && (
              <button onClick={() => setRetry((n) => n + 1)}>
                Tentar novamente
              </button>
            )}
          </div>
        ) : !ready ? (
          <>
            <h1>Perfil do atleta</h1>
            <p role="status">Consultando perfil e participações publicadas…</p>
          </>
        ) : (
          <>
            <div
              className={`player-intro ${hasHonors ? "player-with-honors" : ""}`}
            >
              <header className="player-identity">
                <h1>{name}</h1>
                {name !== ready.page.identity.name && (
                  <p className="player-full-name">{ready.page.identity.name}</p>
                )}
                {latest && (
                  <>
                    <p className="player-current-team">
                      <a
                        href={publicDetailLink(
                          `/equipe.html#${latest.fact.registration.team.id}?registrationId=${latest.fact.registration.registrationId}`,
                          latest.fact.disputeId,
                        )}
                      >
                        {latest.fact.registration.name}
                      </a>
                      {latest.fact.jersey === null
                        ? null
                        : ` · #${latest.fact.jersey}`}
                    </p>
                    <p className="player-current-context">
                      {latest.fact.context.name} {latest.fact.context.year} ·{" "}
                      {latest.fact.context.category}
                    </p>
                  </>
                )}
                <div className="player-bio">
                  {seasonAge(birthYear, new Date().getFullYear()) !== null && (
                    <span>
                      {seasonAge(birthYear, new Date().getFullYear())} anos
                    </span>
                  )}
                  {metadata?.heightCm != null && (
                    <span>
                      {new Intl.NumberFormat("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(metadata.heightCm / 100)}{" "}
                      m
                    </span>
                  )}
                  {metadata?.position && <span>{metadata.position}</span>}
                </div>
                {metadata?.biography && (
                  <p className="player-biography">{metadata.biography}</p>
                )}
              </header>
              {hasHonors && (
                <div className="player-desktop-honors">
                  <CareerHonors career={ready} prefix="header-" />
                </div>
              )}
            </div>
            <div className="player-tabs-shell">
              <SectionTabs
                id="player-tabs"
                label="Seções do perfil"
                items={PROFILE_TABS}
                active={view.section}
                onChange={(key) =>
                  update({ section: key as ProfileView["section"] }, true)
                }
              />
            </div>
            {PROFILE_TABS.map((tab) => (
              <section
                role="tabpanel"
                id={`player-tabs-panel-${tab.key}`}
                aria-labelledby={`player-tabs-${tab.key}`}
                key={tab.key}
                hidden={view.section !== tab.key}
                inert={view.section !== tab.key}
                className={`player-tab-panel${tab.key === "resumo" ? " player-overview-panel" : ""}`}
              >
                {view.section !== tab.key &&
                tab.key !== "resumo" ? null : tab.key === "resumo" ? (
                  <div className="player-overview">
                    <section
                      className="player-summary"
                      aria-label="Resumo de temporada e carreira"
                      tabIndex={0}
                    >
                      <table aria-label="Resumo de temporada e carreira">
                        <thead>
                          <tr>
                            <th scope="col">Resumo</th>
                            <th scope="col">
                              <MetricTerm metric="games" />
                            </th>
                            {RECORD_METRICS.map((m) => (
                              <th scope="col" key={m}>
                                <MetricTerm metric={m} />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {summaryRows.map((row) => {
                            const summary = careerStatistics(row.games, id!);
                            return (
                              <tr key={row.label}>
                                <th scope="row">{row.label}</th>
                                <td>
                                  {
                                    row.games.filter((g) => g.fact.played)
                                      .length
                                  }
                                </td>
                                {RECORD_METRICS.map((m) => (
                                  <td key={m}>{value(summary, m)}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </section>
                    <section className="player-recent">
                      <h2>Últimos jogos</h2>
                      <ProfileGames
                        games={recent}
                        scores={scores}
                        label="Últimos jogos"
                      />
                      <div className="player-link-footer">
                        <a
                          href={`#${id}?${profileQuery({ ...view, section: "jogos" }, origin)}`}
                          onClick={(e) => {
                            if (
                              !e.ctrlKey &&
                              !e.metaKey &&
                              !e.shiftKey &&
                              !e.altKey
                            ) {
                              e.preventDefault();
                              update({ section: "jogos" }, true);
                            }
                          }}
                        >
                          Ver todos os jogos
                        </a>
                      </div>
                    </section>
                    {preview}
                  </div>
                ) : tab.key === "estatisticas" ? (
                  <section className="player-championships">
                    <div className="player-section-title">
                      <button
                        className="player-adjust"
                        aria-expanded={filters === "stats"}
                        onClick={() => setFilters("stats")}
                      >
                        Filtrar e ajustar
                      </button>
                    </div>
                    <div className="player-stat-controls">
                      <div
                        className="player-segmented"
                        role="group"
                        aria-label="Exibição das estatísticas"
                      >
                        {(["total", "per-game"] as const).map((mode) => (
                          <button
                            key={mode}
                            aria-pressed={view.mode === mode}
                            onClick={() => update({ mode })}
                          >
                            {mode === "total" ? "Total" : "Por jogo"}
                          </button>
                        ))}
                      </div>
                      {(view.year ||
                        view.championship ||
                        view.teams !== null ||
                        view.scope !== "all") && (
                        <button
                          className="player-clear"
                          onClick={() =>
                            update({
                              year: "",
                              championship: "",
                              teams: null,
                              scope: "all",
                              statsPage: 1,
                            })
                          }
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                    <div
                      className="player-scroll"
                      role="region"
                      aria-label="Estatísticas por campeonato"
                      tabIndex={0}
                      ref={tableScroll}
                      onScroll={(e) => {
                        statsScroll.current = e.currentTarget.scrollLeft;
                      }}
                    >
                      <table
                        className="player-stats-table"
                        aria-label="Estatísticas por campeonato"
                      >
                        <thead>
                          <tr>
                            <th scope="col" className="player-year">
                              <button onClick={() => sort("year")}>Ano</button>
                            </th>
                            {hasAge && (
                              <th scope="col" className="player-age">
                                Idade
                              </th>
                            )}
                            <th scope="col" className="player-champ">
                              <button onClick={() => sort("competition")}>
                                Campeonato
                              </button>
                            </th>
                            {(["games", ...view.columns] as const).map((m) => (
                              <th
                                key={m}
                                scope="col"
                                aria-sort={
                                  view.sort === m
                                    ? view.direction === "asc"
                                      ? "ascending"
                                      : "descending"
                                    : "none"
                                }
                              >
                                <MetricTerm
                                  metric={m}
                                  onClick={() => sort(m)}
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ordered
                            .slice((statsPage - 1) * 20, statsPage * 20)
                            .map((g) => (
                              <tr key={g.key}>
                                <td className="player-year">
                                  {g.history.context.year}
                                </td>
                                {hasAge && (
                                  <td className="player-age">
                                    {seasonAge(
                                      birthYear,
                                      g.history.context.year,
                                    ) ?? "—"}
                                  </td>
                                )}
                                <th scope="row" className="player-champ">
                                  <span className="player-competition-name">
                                    {g.history.context.name}
                                    {g.history.context.category
                                      .trim()
                                      .toLocaleLowerCase("pt-BR") !== "adulto"
                                      ? ` · ${g.history.context.category}`
                                      : ""}
                                    {g.history.context.division
                                      ? ` · ${g.history.context.division}`
                                      : ""}
                                  </span>
                                  <small>
                                    <a
                                      href={publicDetailLink(
                                        `/equipe.html#${g.history.registration.team.id}?registrationId=${g.history.registration.registrationId}`,
                                        g.history.disputeId,
                                      )}
                                    >
                                      {g.history.registration.name}
                                    </a>
                                    {g.history.jerseys.length
                                      ? ` · #${g.history.jerseys.join(" / ")}`
                                      : ""}
                                  </small>
                                </th>
                                <td>
                                  {g.games.filter((p) => p.fact.played).length}
                                </td>
                                {view.columns.map((m) => (
                                  <td key={m}>
                                    {value(summaries.get(g.key) ?? null, m)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!ordered.length && (
                      <p className="player-empty">
                        Nenhuma participação neste recorte.
                      </p>
                    )}
                    {pager("stats")}
                  </section>
                ) : tab.key === "historico" ? (
                  <div className="player-career">
                    <CareerRecords
                      career={ready}
                      scores={scores}
                      expanded={view.expanded}
                      onChange={(expanded) => update({ expanded })}
                    />
                    <div className="player-mobile-honors">
                      <CareerHonors career={ready} />
                    </div>
                    <TeamTrajectory career={ready} />
                  </div>
                ) : (
                  <section className="player-games-page">
                    <div className="player-section-title">
                      <button
                        className="player-adjust"
                        aria-expanded={filters === "games"}
                        onClick={() => setFilters("games")}
                      >
                        Filtrar e ajustar
                      </button>
                    </div>
                    {(view.gameYear ||
                      view.gameChampionship ||
                      view.gameTeam ||
                      view.opponent) && (
                      <div className="player-active-filters">
                        {[
                          view.gameYear,
                          championships.find(
                            (c) => c.id === view.gameChampionship,
                          )?.name,
                          teams.find((t) => t.id === view.gameTeam)?.name,
                          view.opponent,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        <button
                          className="player-clear"
                          onClick={() =>
                            update({
                              gameYear: "",
                              gameChampionship: "",
                              gameTeam: "",
                              opponent: "",
                              page: 1,
                            })
                          }
                        >
                          Limpar filtros
                        </button>
                      </div>
                    )}
                    <p className="player-games-count" role="status">
                      {games.length}{" "}
                      {games.length === 1
                        ? "jogo encontrado"
                        : "jogos encontrados"}
                    </p>
                    <ProfileGames
                      games={pageGames}
                      scores={scores}
                      label="Jogos do atleta"
                    />
                    {pager("games")}
                  </section>
                )}
              </section>
            ))}
            <section
              className="player-legend reference-legend"
              aria-labelledby="player-legend-title"
            >
              <h2 id="player-legend-title">Legenda</h2>
              <dl>
                {legendMetrics.map((m) => (
                  <div key={m}>
                    <dt>{m === "games" ? "J" : metricLabel(m)}</dt>
                    <dd>
                      {m === "games" ? "Jogos" : STATISTICS_METRICS[m].name}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            {filters && (
              <ProfileFilters
                kind={filters}
                view={view}
                years={
                  filters === "games"
                    ? years.filter((year) =>
                        appearances.some((g) => g.fact.context.year === year),
                      )
                    : years
                }
                championships={
                  filters === "games"
                    ? championships.filter((c) =>
                        appearances.some(
                          (g) => g.fact.context.championshipId === c.id,
                        ),
                      )
                    : championships
                }
                teams={
                  filters === "games"
                    ? teams.filter((t) =>
                        appearances.some(
                          (g) => g.fact.registration.team.id === t.id,
                        ),
                      )
                    : teams
                }
                onClose={() => setFilters(null)}
                onApply={(patch) => {
                  setFilters(null);
                  update(patch);
                }}
              />
            )}
          </>
        )}
      </main>
      <PublicFooter />
    </TooltipProvider>
  );
}
