import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiFailure } from "../competition/api";
import {
  readTeamRoute,
  serializeTeamRoute,
  teamApiPath,
  teamRouteForResponse,
  teamPublicResponseSchema,
  teamDetailLink,
  type TeamRoute,
  type TeamPublicResponse,
} from "./navigation";
import type { TeamsQuery } from "./query-contract";
import { parseTeamsQuery, serializeTeamsQuery } from "./query-contract";
import type { TeamDetailQuery } from "./detail-query";
import {
  TeamGames,
  TeamParticipants,
  TeamsTable,
  teamNumber,
  teamStamp,
} from "./public-tables";
const sections = [
  { id: "resumo", label: "Resumo" },
  { id: "participantes", label: "Participantes" },
  { id: "jogos", label: "Jogos" },
] as const;
export function TeamsPublicPage({ kind }: { kind: "list" | "detail" }) {
  const [route, setRoute] = useState(() =>
      readTeamRoute(kind, window.location.hash),
    ),
    [response, setResponse] = useState<{
      key: string;
      data: TeamPublicResponse;
      route: TeamRoute;
    } | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [search, setSearch] = useState(
      route.kind === "list" ? route.query.search : "",
    );
  const heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLDivElement>(null),
    focus = useRef(false),
    key = serializeTeamRoute(route);
  const data = response?.key === key ? response.data : null,
    current = data ? response!.route : route;
  useEffect(() => {
    const read = () => {
      const next = readTeamRoute(kind, window.location.hash);
      focus.current = true;
      setLoading(true);
      setError("");
      setSearch(next.kind === "list" ? next.query.search : "");
      setRoute(next);
    };
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [kind]);
  useEffect(() => {
    if (route.kind === "invalid") {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api(
      teamApiPath(route),
      teamPublicResponseSchema,
      undefined,
      controller.signal,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        const canonical = teamRouteForResponse(route, next);
        setResponse({ key, data: next, route: canonical });
        window.history.replaceState(null, "", serializeTeamRoute(canonical));
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setResponse(null);
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
  }, [route, key, retry]);
  useLayoutEffect(() => {
    const target = error ? alert.current : data ? heading.current : null;
    if (!loading && focus.current && target) {
      focus.current = false;
      target.focus();
    }
  }, [data, loading, error]);
  function navigate(next: TeamRoute) {
    focus.current = true;
    const hash = serializeTeamRoute(next);
    if (window.location.hash === hash) setRetry((n) => n + 1);
    else window.location.hash = hash;
  }
  function listChange(patch: Partial<TeamsQuery>, reset = true) {
    if (current.kind === "list")
      navigate({
        ...current,
        query: {
          ...current.query,
          search,
          ...(reset ? { page: 1 } : {}),
          ...patch,
        },
      });
  }
  function detailChange(patch: Partial<TeamDetailQuery>, reset = false) {
    if (current.kind === "detail")
      navigate({
        ...current,
        query: {
          ...current.query,
          ...(reset ? { page: 1, rosterPage: 1 } : {}),
          ...patch,
        },
      });
  }
  const q = current.kind === "invalid" ? null : current.query;
  const name =
    data?.kind === "confirmed-team-detail-v1"
      ? data.identity.name
      : kind === "list"
        ? "Equipes e inscrições"
        : "Equipe e inscrições";
  const listState =
    current.kind === "detail"
      ? (current.listState ?? {
          ...parseTeamsQuery(new URLSearchParams()),
          mode: current.query.mode,
          scope: current.query.scope,
        })
      : null;
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
      <header className="access-header">
        <a href="/foundation.html">Base do Basquete</a>
        <span className="access-preview">
          Equipes em resultados confirmados
        </span>
      </header>
      <main
        id="team-content"
        tabIndex={-1}
        className="access-main statistics-page team-public-page"
      >
        <h1>{name}</h1>
        {current.kind === "invalid" ? (
          <p role="alert">
            Abra a consulta a partir de uma disputa e de uma equipe
            identificadas.
          </p>
        ) : (
          <>
            {current.kind === "detail" && (
              <p>
                <a
                  href={`/equipes.html#${current.disputeId}?${serializeTeamsQuery(listState!)}`}
                >
                  Voltar às equipes
                </a>
              </p>
            )}
            {current.kind === "detail" && current.registrationId && (
              <nav className="team-navigation" aria-label="Seções da equipe">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={serializeTeamRoute({
                      ...current,
                      query: { ...current.query, section: s.id },
                    })}
                    aria-current={
                      current.query.section === s.id ? "page" : undefined
                    }
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            )}
            <form
              className="statistics-controls"
              onSubmit={(e) => {
                e.preventDefault();
                listChange({ search });
              }}
            >
              <div className="statistics-fields">
                {current.kind === "list" && (
                  <label>
                    Buscar equipe ou inscrição
                    <input
                      aria-label="Buscar equipe ou inscrição"
                      maxLength={80}
                      value={search}
                      disabled={loading}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                )}
                <label>
                  Modo
                  <select
                    value={q!.mode}
                    disabled={loading}
                    onChange={(e) => {
                      const mode = e.target.value as TeamsQuery["mode"];
                      if (current.kind === "list") listChange({ mode });
                      else detailChange({ mode }, true);
                    }}
                  >
                    <option value="per-game">Por jogo</option>
                    <option value="total">Total</option>
                  </select>
                </label>
                <label>
                  Escopo
                  <select
                    value={q!.scope}
                    disabled={loading}
                    onChange={(e) => {
                      const scope = e.target.value as TeamsQuery["scope"];
                      if (current.kind === "list") listChange({ scope });
                      else detailChange({ scope }, true);
                    }}
                  >
                    <option value="all">Todos</option>
                    <option value="regular">Fase regular</option>
                    <option value="playoffs">Eliminatórias</option>
                  </select>
                </label>
                {current.kind === "list" && (
                  <>
                    <label>
                      Ordenar por
                      <select
                        disabled={loading}
                        value={current.query.sort}
                        onChange={(e) =>
                          listChange({
                            sort: e.target.value as TeamsQuery["sort"],
                          })
                        }
                      >
                        <option value="name">Inscrição</option>
                        <option value="games">Jogos</option>
                        <option value="pointsFor">Pontos a favor</option>
                        <option value="pointsAgainst">Pontos contra</option>
                        <option value="difference">Saldo</option>
                      </select>
                    </label>
                    <label>
                      Direção
                      <select
                        disabled={loading}
                        value={current.query.direction}
                        onChange={(e) =>
                          listChange({
                            direction: e.target
                              .value as TeamsQuery["direction"],
                          })
                        }
                      >
                        <option value="asc">Crescente</option>
                        <option value="desc">Decrescente</option>
                      </select>
                    </label>
                  </>
                )}
              </div>
              {current.kind === "list" && (
                <button type="submit" disabled={loading}>
                  Buscar
                </button>
              )}
            </form>
            {loading ? (
              <p role="status">Consultando resultados confirmados…</p>
            ) : error ? (
              <div
                ref={alert}
                role="alert"
                tabIndex={-1}
                className="access-error"
              >
                <p>{error}</p>
                <button
                  onClick={() => {
                    focus.current = true;
                    setRetry((n) => n + 1);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              data && (
                <>
                  {data.context && (
                    <p>
                      {data.context.name} · {data.context.year} ·{" "}
                      {data.context.gender} · {data.context.category}
                      {data.context.division
                        ? ` · ${data.context.division}`
                        : ""}
                    </p>
                  )}
                  <p className="team-provenance">
                    Fonte confirmada v{data.version} ·{" "}
                    {teamStamp(data.confirmedAt)}. Fases na fonte da disputa:{" "}
                    {data.coverage.regularGames} regulares;{" "}
                    {data.coverage.playoffGames} eliminatórias;{" "}
                    {data.coverage.unknownGames} sem fase confirmada. Jogos sem
                    fase só entram em Todos.
                  </p>
                  {data.kind === "confirmed-teams-page-v1" ? (
                    <section>
                      <h2 ref={heading} tabIndex={-1}>
                        Equipes com resultados confirmados
                      </h2>
                      <p>
                        Uma linha por inscrição. J conta partidas publicadas; PP
                        e PC são pontos oficiais a favor e contra. Modo Total
                        soma os placares; Por jogo divide pelas partidas. Esta
                        consulta não é uma classificação.
                      </p>
                      <TeamsTable
                        data={data}
                        onPage={(page) => listChange({ page }, false)}
                      />
                    </section>
                  ) : data.kind === "confirmed-team-selection-v1" ? (
                    <section>
                      <h2 ref={heading} tabIndex={-1}>
                        Escolha a inscrição
                      </h2>
                      <p>
                        Esta equipe possui mais de uma inscrição com resultados
                        publicados. Escolha o contexto que deseja consultar.
                      </p>
                      <ul className="team-selection">
                        {data.registrations.map((r) => (
                          <li key={r.registrationId}>
                            <a
                              href={teamDetailLink(
                                data.disputeId,
                                data.teamId,
                                r.registrationId,
                                listState,
                              )}
                            >
                              {r.name}
                            </a>
                            <small>{r.teamName}</small>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : (
                    <section>
                      <h2 ref={heading} tabIndex={-1}>
                        {
                          sections.find((s) => s.id === data.query.section)
                            ?.label
                        }
                      </h2>
                      {data.query.section === "resumo" && (
                        <>
                          <p>
                            Equipe: {data.identity.teamName} · inscrição:{" "}
                            {data.identity.name}.
                          </p>
                          <p>
                            Nomes publicados: {data.identity.names.join(" / ")}.
                            Última confirmação de nome: resultado v
                            {data.identity.origin.publicationVersion} em{" "}
                            {teamStamp(data.identity.origin.publishedAt)}.
                          </p>
                          {data.statistics ? (
                            <>
                              <p>
                                {data.statistics.gamesPlayed} partidas
                                publicadas
                              </p>
                              <dl className="team-summary">
                                <div>
                                  <dt>PP · pontos a favor</dt>
                                  <dd>
                                    {teamNumber.format(
                                      data.statistics.metrics.pointsFor,
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>PC · pontos contra</dt>
                                  <dd>
                                    {teamNumber.format(
                                      data.statistics.metrics.pointsAgainst,
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Saldo</dt>
                                  <dd>
                                    {teamNumber.format(
                                      data.statistics.metrics.difference,
                                    )}
                                  </dd>
                                </div>
                              </dl>
                            </>
                          ) : (
                            <p>Nenhum jogo publicado neste recorte.</p>
                          )}
                          <p>
                            Os participantes preservam cada ocasião, sem inferir
                            elenco atual. Pontos e médias vêm dos placares
                            oficiais; dados coletivos do PDF estão em cada jogo.
                          </p>
                        </>
                      )}
                      {data.query.section === "participantes" && (
                        <TeamParticipants
                          data={data}
                          onPage={(rosterPage) => detailChange({ rosterPage })}
                        />
                      )}
                      {data.query.section === "jogos" && (
                        <TeamGames
                          data={data}
                          onPage={(page) => detailChange({ page })}
                        />
                      )}
                    </section>
                  )}
                </>
              )
            )}
          </>
        )}
      </main>
    </>
  );
}
