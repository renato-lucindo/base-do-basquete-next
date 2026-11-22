import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PublicHeader, PublicFooter } from "../public-ui/shell";
import { publicDetailLink, safePublicReturn } from "../public-ui/navigation";
import { siteDisputeId } from "../public-ui/site";
import { previewDisputeId } from "../public-ui/preview";
import { SectionTabs, TabPanel } from "../ui-system/components";
import { TooltipProvider } from "../statistics/reference/tooltip";
import { standingsSelection } from "../regulation/public-bracket-model";
import { PublicStandingsTables } from "../regulation/public-page";
import { recentGroupResults } from "../regulation/recent-results";
import { RecentResultsCell } from "../regulation/recent-results-cell";
import { disputeStatusLabels } from "../competition/administration-contract";
import { ScrollableTable } from "../statistics/reference/scrollable-table";
import { loadTeamProfile } from "./loader";
import {
  GENERAL_TABS,
  DISPUTE_TABS,
  readTeamProfileLocation,
  teamProfileHref,
  generalTeamReturn,
} from "./view-state";
import {
  initialTeamYear,
  selectTeamHonors,
  chronologicalTeamGames,
  participationCampaign,
  participationPosition,
  participationGames,
  type TeamProfile,
  type TeamParticipation,
  type TeamGame,
} from "./model";
import {
  PlayersPanel,
  CollectivePanel,
  ParticipationStatistics,
  Legend,
  ModeButtons,
  campaignLegend,
  showNumber,
} from "./panels";
const gender = (g: string) => (g === "masculino" ? "Masculino" : "Feminino");
function Status({ p }: { p: TeamParticipation }) {
  return p.status ? (
    <span className="team-profile-status" data-status={p.status}>
      {disputeStatusLabels[p.status]}
    </span>
  ) : (
    <span>—</span>
  );
}
function Select({
  label,
  value,
  values,
  onChange,
  all,
}: {
  label: string;
  value: string;
  values: (string | number)[];
  onChange: (v: string) => void;
  all?: string;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {all && <option value="">{all}</option>}
        {values.map((v) => (
          <option value={v} key={v}>
            {v === "masculino" || v === "feminino" ? gender(String(v)) : v}
          </option>
        ))}
      </select>
    </label>
  );
}
function RecentSequence({ p }: { p: TeamParticipation }) {
  if (!p.standings) return <>—</>;
  const s = p.standings,
    ids = s.games
      .filter((g) => ["played", "awarded"].includes(g.state))
      .map((g) => g.id),
    results = recentGroupResults(s.games, ids).get(p.registrationId) ?? [];
  const names = new Map(s.registrations.map((r) => [r.id, r.name]));
  const compact = new Map(
    s.registrations.map((r) => [r.id, r.team.abbreviation || r.name]),
  );
  return (
    <RecentResultsCell
      results={results}
      teamName={p.name}
      label={(id) => names.get(id) ?? "A definir"}
      compactLabel={(id) => compact.get(id) ?? "A definir"}
    />
  );
}
function Campaigns({
  rows,
  link,
}: {
  rows: TeamParticipation[];
  link: (p: TeamParticipation) => string;
}) {
  return rows.length ? (
    <ScrollableTable label="Campanhas por disputa">
      <table className="statistics-table team-profile-campaigns">
        <thead>
          <tr>
            <th scope="col">Disputa</th>
            <th scope="col">Situação</th>
            <th scope="col">Colocação / etapa</th>
            {["J", "V", "D", "Aprov.", "PP", "PC", "SLD", "Últimos jogos"].map(
              (k) => (
                <th scope="col" key={k}>
                  {k}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const c = participationCampaign(p),
              position = participationPosition(p);
            return (
              <tr key={`${p.disputeId}/${p.registrationId}`}>
                <th scope="row">
                  <a href={link(p)}>{p.context.name}</a>
                  <small>
                    {p.context.year} · {p.context.category} ·{" "}
                    {gender(p.context.gender)}
                    {p.context.division ? ` · ${p.context.division}` : ""}
                  </small>
                  {rows.some(
                    (r) =>
                      r.disputeId === p.disputeId &&
                      r.registrationId !== p.registrationId,
                  ) && <small>{p.name}</small>}
                </th>
                <td>
                  <Status p={p} />
                </td>
                <td>
                  <strong>{position.label}</strong>
                  <small>{position.detail}</small>
                </td>
                <td>{showNumber(c?.games)}</td>
                <td>{showNumber(c?.wins)}</td>
                <td>{showNumber(c?.losses)}</td>
                <td>
                  {showNumber(c?.percentage)}
                  {c?.percentage != null ? "%" : ""}
                </td>
                <td>{showNumber(c?.pointsFor)}</td>
                <td>{showNumber(c?.pointsAgainst)}</td>
                <td>{showNumber(c?.difference)}</td>
                <td>
                  <RecentSequence p={p} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollableTable>
  ) : (
    <p>Nenhuma participação neste recorte.</p>
  );
}
function GamesTable({ games }: { games: TeamGame[] }) {
  return games.length ? (
    <ScrollableTable label="Jogos da equipe">
      <table className="statistics-table team-profile-games">
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Confronto</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const match = (
              <>
                <span className="team-profile-match">
                  <span>{g.home}</span>
                  <strong>
                    {showNumber(g.score?.home)} × {showNumber(g.score?.away)}
                  </strong>
                  <span>{g.away}</span>
                </span>
                <small>
                  {g.context.name} · {g.context.year} · {g.context.category} ·{" "}
                  {gender(g.context.gender)}
                  {g.context.division ? ` · ${g.context.division}` : ""}
                  {!g.score ? " · Agendado" : ""}
                </small>
              </>
            );
            return (
              <tr key={g.id}>
                <td>
                  {g.date
                    ? new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        timeZone: "UTC",
                      }).format(new Date(`${g.date}T12:00:00Z`))
                    : "A definir"}
                  <small>{g.time ?? "Horário a definir"}</small>
                </td>
                <td>
                  {g.published ? (
                    <a
                      href={publicDetailLink(
                        `/resultado.html#${g.id}`,
                        g.disputeId,
                      )}
                    >
                      {match}
                    </a>
                  ) : (
                    match
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollableTable>
  ) : (
    <p>Nenhum jogo encontrado neste recorte.</p>
  );
}
function Honors({
  profile,
  category,
  naipe,
  onCategory,
  onNaipe,
  contextual,
  link,
}: {
  profile: TeamProfile;
  category: string;
  naipe: string;
  onCategory: (v: string) => void;
  onNaipe: (v: string) => void;
  contextual: boolean;
  link: (p: { disputeId: string; registrationId: string }) => string;
}) {
  const honors = selectTeamHonors(profile.honors, category, naipe);
  return (
    <aside className="team-profile-honors" aria-labelledby="team-honors-title">
      <h2 id="team-honors-title">Conquistas</h2>
      {contextual ? (
        <div className="team-profile-honors-context">
          <strong>
            {category} · {gender(naipe)}
          </strong>
          <small>Histórico em todas as competições</small>
        </div>
      ) : (
        <div className="team-profile-toolbar">
          <Select
            label="Categoria"
            value={category}
            values={[
              ...new Set(profile.participations.map((p) => p.context.category)),
            ]}
            onChange={onCategory}
            all="Todas"
          />
          <Select
            label="Naipe"
            value={naipe}
            values={["masculino", "feminino"]}
            onChange={onNaipe}
            all="Todos"
          />
        </div>
      )}
      {[1, 2, 3].map((position) => {
        const items = honors
          .filter((h) => h.position === position)
          .sort((a, b) => b.year - a.year);
        return (
          !!items.length && (
            <section className="team-profile-award" key={position}>
              <div
                className={`team-profile-medal medal-${position}`}
                role="img"
                aria-label={`${position}º lugar`}
              >
                <svg
                  aria-hidden="true"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path
                    d={
                      position === 1
                        ? "M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 5 4m7-7h4v3a4 4 0 0 1-5 4m-3 2v6m-4 0h8"
                        : "M9 2 7 7m8-5 2 5M12 8a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 4v6m-3-3h6"
                    }
                  />
                </svg>
              </div>
              <div>
                <h3>
                  {["", "Campeão", "Vice-campeão", "3º lugar"][position]}
                  <span>{items.length}×</span>
                </h3>
                {[...new Set(items.map((h) => h.championshipId))].map((id) => {
                  const editions = items.filter((h) => h.championshipId === id);
                  return (
                    <details key={id}>
                      <summary>
                        {profile.participations.find(
                          (p) => p.disputeId === editions[0].disputeId,
                        )?.context.name ?? editions[0].name}{" "}
                        <span>
                          (
                          {editions.length > 1
                            ? `${editions.length}×`
                            : editions[0].year}
                          )
                        </span>
                      </summary>
                      <ul>
                        {editions.map((h) => (
                          <li key={`${h.disputeId}/${h.registrationId}`}>
                            <a href={link(h)}>
                              {h.year} · {h.category} · {gender(h.gender)}
                              {h.division ? ` · ${h.division}` : ""}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </section>
          )
        );
      })}
      {!honors.length && <p>Nenhum pódio publicado neste recorte.</p>}
    </aside>
  );
}
export function TeamProfilePage() {
  const [view, setView] = useState(() =>
    readTeamProfileLocation(window.location.hash),
  );
  const [attempt, retry] = useState(0);
  const rosterNav = useRef<HTMLElement>(null);
  const rosterReturn = useRef<{ y: number; top: number; id: string } | null>(
    null,
  );
  const [loaded, setLoaded] = useState<{
    teamId: string;
    scope: string | null;
    data: TeamProfile | null;
    error: string;
  }>({ teamId: "", scope: null, data: null, error: "" });
  const scope = previewDisputeId() ?? siteDisputeId;
  useEffect(() => {
    const read = () => setView(readTeamProfileLocation(window.location.hash));
    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
    };
  }, []);
  useEffect(() => {
    if (!view.teamId) return;
    const teamId = view.teamId,
      c = new AbortController();
    void loadTeamProfile(teamId, c.signal, scope)
      .then((data) => {
        if (!c.signal.aborted) setLoaded({ teamId, scope, data, error: "" });
      })
      .catch((error) => {
        if (!c.signal.aborted)
          setLoaded({
            teamId,
            scope,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Não foi possível carregar o perfil.",
          });
      });
    return () => c.abort();
  }, [view.teamId, scope, attempt]);
  const profile =
    loaded.teamId === view.teamId && loaded.scope === scope
      ? loaded.data
      : null;
  const error =
    loaded.teamId === view.teamId && loaded.scope === scope ? loaded.error : "";
  const update = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(view.params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const target = new URL(window.location.href);
    target.hash = teamProfileHref(view.teamId!, params).split("#")[1];
    window.history.pushState(
      null,
      "",
      target.pathname + target.search + target.hash,
    );
    setView(readTeamProfileLocation(window.location.hash));
  };
  const contextParts =
    profile?.participations.filter((p) => p.disputeId === view.disputeId) ?? [];
  const contextual = !!view.disputeId;
  const selected =
    contextParts.find((p) => p.registrationId === view.registrationId) ??
    (contextParts.length === 1 && !view.registrationId
      ? contextParts[0]
      : null);
  const localHref = (params: URLSearchParams) => {
    const target = new URL(window.location.href);
    target.hash = teamProfileHref(view.teamId!, params).split("#")[1];
    return target.pathname + target.search + target.hash;
  };
  const selectedRoster = view.params.get("elenco");
  useLayoutEffect(() => {
    const saved = rosterReturn.current;
    if (selectedRoster || !saved || !rosterNav.current) return;
    rosterNav.current.scrollTop = saved.top;
    rosterNav.current
      .querySelector<HTMLAnchorElement>(`[data-registration="${saved.id}"]`)
      ?.focus({ preventScroll: true });
    window.scrollTo(0, saved.y);
    rosterReturn.current = null;
  }, [selectedRoster]);
  const contextualLink = (p: { disputeId: string; registrationId: string }) => {
    const params = new URLSearchParams({
      disputeId: p.disputeId,
      registrationId: p.registrationId,
      secao: "resumo",
    });
    if (view.params.has("ano")) params.set("ano", view.params.get("ano")!);
    return publicDetailLink(teamProfileHref(view.teamId!, params), p.disputeId);
  };
  const years = profile
    ? [...new Set(profile.participations.map((p) => p.context.year))].sort(
        (a, b) => b - a,
      )
    : [];
  const year = years.includes(Number(view.params.get("ano")))
    ? Number(view.params.get("ano"))
    : initialTeamYear(years, new Date().getFullYear());
  const yearRows =
    profile?.participations.filter((p) => p.context.year === year) ?? [];
  const category = view.params.get("categoria") ?? "",
    naipe = view.params.get("naipe") ?? "",
    competition = view.params.get("competicao") ?? "";
  const filter = (rows: TeamParticipation[]) =>
    rows.filter(
      (p) =>
        (!category || p.context.category === category) &&
        (!naipe || p.context.gender === naipe) &&
        (!competition || p.context.championshipId === competition),
    );
  const tabs = contextual ? DISPUTE_TABS : GENERAL_TABS;
  const currentGames = chronologicalTeamGames(
    (contextual ? (selected ? [selected] : []) : yearRows).flatMap(
      participationGames,
    ),
  );
  const recent = currentGames
    .filter(
      (g) =>
        g.counted ||
        (!profile?.participations.find((p) => p.disputeId === g.disputeId)
          ?.standings &&
          g.published),
    )
    .slice(0, 5);
  const lastGames = (
    <section className="team-profile-section">
      <div className="team-profile-section-head">
        <h2>Últimos jogos{!contextual && year ? ` · ${year}` : ""}</h2>
        <a
          href={localHref(
            new URLSearchParams({
              ...Object.fromEntries(view.params),
              secao: "jogos",
            }),
          )}
        >
          Ver todos os jogos
        </a>
      </div>
      <GamesTable games={recent} />
    </section>
  );
  const filters = profile && (
    <div className="team-profile-toolbar">
      <Select
        label="Categoria"
        value={category}
        values={[
          ...new Set(profile.participations.map((p) => p.context.category)),
        ]}
        onChange={(v) => update({ categoria: v })}
        all="Todas"
      />
      <Select
        label="Naipe"
        value={naipe}
        values={["masculino", "feminino"]}
        onChange={(v) => update({ naipe: v })}
        all="Todos"
      />
      <label className="grow">
        Competição
        <select
          value={competition}
          onChange={(e) => update({ competicao: e.target.value })}
        >
          <option value="">Todas</option>
          {[
            ...new Map(
              profile.participations.map((p) => [
                p.context.championshipId,
                p.context.name,
              ]),
            ).entries(),
          ].map(([id, name]) => (
            <option value={id} key={id}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
  return (
    <TooltipProvider>
      <a
        className="access-skip"
        href="#team-profile"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("team-profile")?.focus();
        }}
      >
        Pular para o perfil
      </a>
      <PublicHeader
        disputeId={view.disputeId}
        section="equipes"
        detail={selected?.name ?? profile?.name ?? "Perfil da equipe"}
      />
      <main
        id="team-profile"
        className="team-profile-page bb-ui public-site statistics-public"
        tabIndex={-1}
      >
        {!view.teamId ? (
          <div role="alert">
            <h1>Perfil da equipe</h1>
            <p>Abra uma equipe pela busca ou por uma disputa.</p>
          </div>
        ) : !profile ? (
          <div>
            <h1>Perfil da equipe</h1>
            {error ? (
              <div role="alert">
                <p>{error}</p>
                <button onClick={() => retry((n) => n + 1)}>
                  Tentar novamente
                </button>
              </div>
            ) : (
              <p role="status">Consultando participações públicas…</p>
            )}
          </div>
        ) : (
          <div className="team-profile-layout">
            <header className="team-profile-identity">
              <div className="team-profile-identity-row">
                <div className="team-profile-avatar" aria-hidden="true">
                  {profile.abbreviation ??
                    profile.name
                      .split(" ")
                      .slice(0, 2)
                      .map((s) => s[0])
                      .join("")}
                </div>
                <div>
                  <p className="team-profile-eyebrow">
                    {contextual ? "Equipe na disputa" : "Perfil da equipe"}
                  </p>
                  <h1>{selected?.name ?? profile.name}</h1>
                  {selected && profile.name !== selected.name && (
                    <p className="team-profile-subtitle">{profile.name}</p>
                  )}
                  <p className="team-profile-subtitle">
                    {selected
                      ? `${selected.context.category} · ${gender(selected.context.gender)}`
                      : "Todas as categorias"}
                  </p>
                </div>
              </div>
              {contextual && (
                <div className="team-profile-context">
                  <div>
                    {selected && (
                      <>
                        <strong>
                          {selected.context.name} · {selected.context.year}
                        </strong>
                        <small>
                          {gender(selected.context.gender)} ·{" "}
                          {selected.context.category}
                          {selected.context.division
                            ? ` · ${selected.context.division}`
                            : ""}
                        </small>
                      </>
                    )}
                  </div>
                  <a
                    href={generalTeamReturn(
                      new URLSearchParams(window.location.search).get(
                        "returnTo",
                      ),
                      profile.teamId,
                      year,
                    )}
                  >
                    Ver perfil geral
                  </a>
                </div>
              )}
              {contextual && (
                <a
                  className="team-profile-list-return"
                  href={
                    safePublicReturn(
                      new URLSearchParams(window.location.search).get(
                        "returnTo",
                      ),
                      view.disputeId,
                    ) ??
                    `/equipes.html#${view.disputeId}${view.params.get("listState") ? `?${view.params.get("listState")}` : ""}`
                  }
                >
                  Voltar às equipes
                </a>
              )}
            </header>
            <Honors
              profile={profile}
              category={
                selected?.context.category ??
                view.params.get("categoriaConquistas") ??
                ""
              }
              naipe={
                selected?.context.gender ??
                view.params.get("naipeConquistas") ??
                ""
              }
              contextual={!!selected}
              onCategory={(v) => update({ categoriaConquistas: v })}
              onNaipe={(v) => update({ naipeConquistas: v })}
              link={contextualLink}
            />
            <div className="team-profile-workspace">
              <SectionTabs
                id="team-profile-tabs"
                label="Seções do perfil da equipe"
                items={tabs}
                active={view.section}
                onChange={(section) =>
                  update({ secao: section, section: null })
                }
              />
              <TabPanel id="team-profile-tabs" active={view.section}>
                {contextual && !selected ? (
                  <section>
                    <h2>Inscrições da equipe</h2>
                    <p>
                      {contextParts.length
                        ? "Escolha a inscrição para consultar esta disputa."
                        : "Esta inscrição não possui participação pública nesta disputa."}
                    </p>
                    <ul className="team-profile-registration-choices">
                      {contextParts.map((p) => (
                        <li key={p.registrationId}>
                          <a href={contextualLink(p)}>{p.name}</a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : view.section === "resumo" ? (
                  contextual && selected ? (
                    <>
                      <div className="team-profile-section-head">
                        <h2>Classificação</h2>
                        <Status p={selected} />
                      </div>
                      {selected.standings ? (
                        <PublicStandingsTables
                          value={selected.standings}
                          profile={{
                            teamId: profile.teamId,
                            registrationId: selected.registrationId,
                          }}
                          publishedRegistrationIds={
                            new Set(
                              selected.catalog.flatMap((g) => [
                                g.game.home.registrationId,
                                g.game.away.registrationId,
                              ]),
                            )
                          }
                        />
                      ) : (
                        <p>Classificação ainda indisponível nesta disputa.</p>
                      )}
                      <CollectivePanel
                        participation={selected}
                        query={view.params.get("coletivos") ?? ""}
                        change={(q) => update({ coletivos: q })}
                        after={lastGames}
                        extraLegend={
                          selected.standings &&
                          standingsSelection(selected.standings, view.params)
                            .stage === "classificatoria"
                            ? [
                                { label: "Pos.", name: "Posição" },
                                ...campaignLegend,
                              ]
                            : []
                        }
                      />
                    </>
                  ) : (
                    <>
                      <section>
                        <div className="team-profile-section-head">
                          <div>
                            <h2>Campanhas</h2>
                            <p>
                              {yearRows.length} disputas em {year}
                            </p>
                          </div>
                          <Select
                            label="Ano"
                            value={String(year ?? "")}
                            values={years}
                            onChange={(v) => update({ ano: v })}
                          />
                        </div>
                        <Campaigns rows={yearRows} link={contextualLink} />
                      </section>
                      {lastGames}
                      <Legend entries={campaignLegend} />
                    </>
                  )
                ) : view.section === "competicoes" ? (
                  <>
                    <div className="team-profile-section-head">
                      <h2>Participações em competições</h2>
                    </div>
                    {filters}
                    <Select
                      label="Ano"
                      value={view.params.get("anoHistorico") ?? ""}
                      values={years}
                      all="Todos"
                      onChange={(v) => update({ anoHistorico: v })}
                    />
                    <Campaigns
                      rows={filter(profile.participations).filter(
                        (p) =>
                          !view.params.get("anoHistorico") ||
                          String(p.context.year) ===
                            view.params.get("anoHistorico"),
                      )}
                      link={contextualLink}
                    />
                    <Legend entries={campaignLegend} />
                  </>
                ) : view.section === "jogadores" && selected ? (
                  <>
                    <h2>Jogadores na disputa</h2>
                    <PlayersPanel
                      key={selected.registrationId}
                      participation={selected}
                      query={view.params.get("jogadores") ?? ""}
                      change={(q) => update({ jogadores: q })}
                    />
                  </>
                ) : view.section === "elencos" ? (
                  <>
                    <div className="team-profile-section-head">
                      <h2>Elencos por participação</h2>
                      <Select
                        label="Ano"
                        value={String(year ?? "")}
                        values={years}
                        onChange={(v) => update({ ano: v, elenco: null })}
                      />
                    </div>
                    <div
                      className={`team-profile-rosters ${view.params.has("elenco") ? "has-selection" : ""}`}
                    >
                      <nav
                        ref={rosterNav}
                        aria-label="Participações para consultar jogadores"
                      >
                        {yearRows.map((p) => (
                          <a
                            key={`${p.disputeId}/${p.registrationId}`}
                            data-registration={p.registrationId}
                            onClick={(e) => {
                              if (
                                e.button === 0 &&
                                !e.ctrlKey &&
                                !e.metaKey &&
                                !e.shiftKey &&
                                !e.altKey
                              )
                                rosterReturn.current = {
                                  y: window.scrollY,
                                  top: rosterNav.current?.scrollTop ?? 0,
                                  id: p.registrationId,
                                };
                            }}
                            aria-current={
                              view.params.get("elenco") === p.registrationId
                                ? "true"
                                : undefined
                            }
                            href={localHref(
                              new URLSearchParams({
                                ...Object.fromEntries(view.params),
                                elenco: p.registrationId,
                              }),
                            )}
                          >
                            <strong>{p.context.name}</strong>
                            <small>
                              {p.context.category} · {gender(p.context.gender)}{" "}
                              · {p.name}
                            </small>
                          </a>
                        ))}
                      </nav>
                      <div className="team-profile-roster-detail">
                        {(() => {
                          const p =
                            yearRows.find(
                              (p) =>
                                p.registrationId === view.params.get("elenco"),
                            ) ?? yearRows[0];
                          return p ? (
                            <>
                              <button
                                className="team-profile-mobile-back"
                                onClick={() => update({ elenco: null })}
                              >
                                Voltar às participações
                              </button>
                              <h3>{p.context.name}</h3>
                              <p>
                                {p.context.year} · {p.context.category} ·{" "}
                                {gender(p.context.gender)}
                              </p>
                              <PlayersPanel
                                key={p.registrationId}
                                participation={p}
                                query={view.params.get("jogadores") ?? ""}
                                change={(q) => update({ jogadores: q })}
                              />
                            </>
                          ) : (
                            <p>Nenhum participante publicado.</p>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                ) : view.section === "estatisticas" ? (
                  <>
                    <div className="team-profile-section-head">
                      <h2>Estatísticas por participação</h2>
                      <ModeButtons
                        value={view.params.get("mode") ?? "per-game"}
                        onChange={(mode) => update({ mode })}
                      />
                    </div>
                    <Select
                      label="Ano"
                      value={String(year ?? "")}
                      values={years}
                      onChange={(v) => update({ ano: v })}
                    />
                    {filters}
                    <ParticipationStatistics
                      participations={filter(yearRows)}
                      mode={
                        view.params.get("mode") === "total"
                          ? "total"
                          : "per-game"
                      }
                      link={contextualLink}
                    />
                  </>
                ) : view.section === "jogos" ? (
                  <>
                    <div className="team-profile-section-head">
                      <h2>Jogos da equipe</h2>
                      {!contextual && (
                        <Select
                          label="Ano"
                          value={String(year ?? "")}
                          values={years}
                          onChange={(v) => update({ ano: v })}
                        />
                      )}
                    </div>
                    {!contextual && filters}
                    <div className="team-profile-toolbar">
                      <Select
                        label="Exibir"
                        value={view.params.get("tipoJogos") ?? ""}
                        values={["Resultados", "Agenda"]}
                        all="Resultados e agenda"
                        onChange={(v) => update({ tipoJogos: v })}
                      />
                      <label className="grow">
                        Adversário
                        <input
                          type="search"
                          value={view.params.get("adversario") ?? ""}
                          placeholder="Buscar adversário…"
                          onChange={(e) =>
                            update({ adversario: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <GamesTable
                      games={currentGames.filter((g) => {
                        const text = (view.params.get("adversario") ?? "")
                          .normalize("NFD")
                          .replace(/\p{M}/gu, "")
                          .toLowerCase();
                        const names = `${g.home} ${g.away}`
                          .normalize("NFD")
                          .replace(/\p{M}/gu, "")
                          .toLowerCase();
                        return (
                          names.includes(text) &&
                          (!view.params.get("tipoJogos") ||
                            (view.params.get("tipoJogos") === "Resultados"
                              ? !!g.score
                              : !g.score)) &&
                          (contextual ||
                            ((!category || g.context.category === category) &&
                              (!naipe || g.context.gender === naipe) &&
                              (!competition ||
                                g.context.championshipId === competition)))
                        );
                      })}
                    />
                  </>
                ) : null}
              </TabPanel>
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </TooltipProvider>
  );
}
