import { useEffect, useState } from "react";
import { PublicGamesTable } from "../public-ui/games-table";
import { api } from "../competition/api";
import { publicStandingsSchema, type PublicStandings } from "./public-contract";
import { teamDetailLink } from "../team-statistics/navigation";
import { ScrollableTable } from "../statistics/reference/scrollable-table";
import {
  TooltipProvider,
  useNameTooltip,
} from "../statistics/reference/tooltip";
import { recentGroupResults } from "./recent-results";
import { RecentResultsCell } from "./recent-results-cell";
import "../statistics/reference.css";
import "./public-standings.css";

const standingsNumber = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
const standingsColumns = [
  ["Pos.", "Posição"],
  ["Equipe", null],
  ["J", "Jogos"],
  ["V", "Vitórias"],
  ["D", "Derrotas"],
  ["Aprov.", "Aproveitamento"],
  ["PP", "Pontos pró"],
  ["PC", "Pontos contra"],
  ["SLD", "Saldo de pontos"],
  ["Últimos jogos", null],
] as const;

function StandingsHeader({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  const tip = useNameTooltip(description);
  return (
    <button
      type="button"
      className="standings-header-help"
      aria-label={`${label}: ${description}`}
      {...tip}
    >
      {label}
    </button>
  );
}

export function usePublicStandings(disputeId: string | null) {
  const [state, setState] = useState<{
    id: string | null;
    data: PublicStandings | null;
    loading: boolean;
    error: string;
  }>({ id: null, data: null, loading: false, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    if (!disputeId) return () => c.abort();
    setState({ id: disputeId, data: null, loading: true, error: "" });
    void api(
      `/api/public/standings/${disputeId}`,
      publicStandingsSchema.nullable(),
      undefined,
      c.signal,
    )
      .then((data) => {
        if (data && data.disputeId !== disputeId)
          throw Error("Disputa inesperada.");
        if (!c.signal.aborted)
          setState({ id: disputeId, data, loading: false, error: "" });
      })
      .catch(() => {
        if (!c.signal.aborted)
          setState({
            id: disputeId,
            data: null,
            loading: false,
            error:
              "Não foi possível carregar a classificação. Tente novamente.",
          });
      });
    return () => c.abort();
  }, [disputeId, attempt]);
  return {
    ...(state.id === disputeId
      ? state
      : { data: null, loading: !!disputeId, error: "" }),
    retry: () => setAttempt((n) => n + 1),
  };
}

export function PublicStandingsTables({
  value,
  publishedRegistrationIds,
}: {
  value: PublicStandings;
  publishedRegistrationIds?: ReadonlySet<string>;
}) {
  const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const selected = params.get("fase");
  const phases = [
    ...value.definition.groupPhases.map((p) => ({
      id: p.phaseId,
      name: p.name,
    })),
    ...value.definition.knockoutPhases,
  ];
  const active = phases.some((p) => p.id === selected)
    ? selected
    : phases[0]?.id;
  const phase = value.definition.groupPhases.find((p) => p.phaseId === active);
  const group =
    phase?.groups.find((g) => g.id === params.get("grupo")) ?? phase?.groups[0];
  const selectionLink = (phaseId: string, groupId?: string) => {
    const query = new URLSearchParams(params);
    query.set("secao", "classificacao");
    query.set("fase", phaseId);
    if (groupId) query.set("grupo", groupId);
    else query.delete("grupo");
    return `#${value.disputeId}?${query}`;
  };
  const canonical = active ? selectionLink(active, group?.id) : null;
  useEffect(() => {
    if (canonical && window.location.hash !== canonical)
      window.history.replaceState(window.history.state, "", canonical);
  }, [canonical]);
  const names = new Map(value.registrations.map((r) => [r.id, r.name]));
  const compactNames = new Map(
    value.registrations.map((r) => [
      r.id,
      r.team.abbreviation?.trim() || r.name,
    ]),
  );
  const label = (id: string | null) =>
    id ? (names.get(id) ?? "Equipe confirmada") : "A definir";
  const compactLabel = (id: string) => compactNames.get(id) ?? label(id);
  return (
    <section
      className="public-standings public-site statistics-public"
      aria-label="Classificação publicada"
    >
      <TooltipProvider>
        {!!value.organizationPendingGameIds?.length && (
          <p role="status">
            {value.organizationPendingGameIds.length} jogo(s) aguardam
            associação a um grupo ou confronto. Os resultados continuam
            disponíveis em Jogos.
          </p>
        )}
        {phases.length > 1 && (
          <nav
            className="public-phase-navigation"
            aria-label="Fases da classificação"
          >
            {phases.map((p) => (
              <a
                key={p.id}
                href={selectionLink(
                  p.id,
                  value.definition.groupPhases.find((n) => n.phaseId === p.id)
                    ?.groups[0]?.id,
                )}
                aria-current={p.id === active ? "page" : undefined}
              >
                {p.name}
              </a>
            ))}
          </nav>
        )}
        {value.projection.groupPhases
          .filter((p) => p.phaseId === active)
          .map((p) => (
            <section key={p.phaseId}>
              <h2 className="sr-only">
                {phases.find((n) => n.id === p.phaseId)?.name}
              </h2>
              {phase && phase.groups.length > 1 && (
                <label className="standings-group-control">
                  Grupo
                  <select
                    name="grupo"
                    value={group?.id}
                    onChange={(e) => {
                      window.location.hash = selectionLink(
                        p.phaseId,
                        e.target.value,
                      );
                    }}
                  >
                    {phase.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {p.groups
                .filter((g) => g.groupId === group?.id)
                .map((g) => {
                  const recent = recentGroupResults(
                    value.games,
                    g.standings.lineage.map((l) => l.gameId),
                  );
                  return (
                    <section key={g.groupId}>
                      <h3 className="sr-only">
                        {
                          value.definition.groupPhases
                            .find((n) => n.phaseId === p.phaseId)
                            ?.groups.find((n) => n.id === g.groupId)?.name
                        }
                      </h3>
                      {g.standings.status === "empty" && (
                        <p>
                          Sem resultados aplicados. Equipes confirmadas com zero
                          jogos; posições a definir.
                        </p>
                      )}
                      {!!g.pendingGameIds.length && (
                        <p>
                          {g.pendingGameIds.length} jogo(s) aguardando resultado
                          ou revisão.
                        </p>
                      )}
                      {!!g.excludedGameIds.length && (
                        <p>
                          {g.excludedGameIds.length} jogo(s) desconsiderado(s)
                          por decisão confirmada.
                        </p>
                      )}
                      <div className="reference-explorer standings-explorer">
                        <ScrollableTable
                          key={`${p.phaseId}:${g.groupId}`}
                          label={`Classificação do ${group?.name ?? "grupo"}`}
                        >
                          <table className="statistics-table">
                            <caption className="sr-only">
                              Classificação por resultados confirmados
                            </caption>
                            <thead>
                              <tr>
                                {standingsColumns.map(
                                  ([label, description]) => (
                                    <th
                                      scope="col"
                                      key={label}
                                      className={
                                        label === "Equipe"
                                          ? "standings-team"
                                          : label === "Últimos jogos"
                                            ? "standings-recent"
                                            : undefined
                                      }
                                    >
                                      {description ? (
                                        <StandingsHeader
                                          label={label}
                                          description={description}
                                        />
                                      ) : (
                                        label
                                      )}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {[...g.standings.rows]
                                .sort(
                                  (a, b) =>
                                    (a.position ?? Infinity) -
                                    (b.position ?? Infinity),
                                )
                                .map((r) => (
                                  <tr key={r.registrationId}>
                                    <td>
                                      {r.position ?? "—"}
                                      {r.tied && r.position !== null
                                        ? " (empate)"
                                        : ""}
                                    </td>
                                    <th scope="row" className="standings-team">
                                      {publishedRegistrationIds?.has(
                                        r.registrationId,
                                      ) ? (
                                        <a
                                          href={teamDetailLink(
                                            value.disputeId,
                                            value.registrations.find(
                                              (v) => v.id === r.registrationId,
                                            )!.team.id,
                                            r.registrationId,
                                          )}
                                        >
                                          {label(r.registrationId)}
                                        </a>
                                      ) : (
                                        label(r.registrationId)
                                      )}
                                    </th>
                                    <td>{r.games}</td>
                                    <td>{r.wins}</td>
                                    <td>{r.losses}</td>
                                    <td>
                                      {r.games
                                        ? `${standingsNumber.format((100 * r.wins) / r.games)}%`
                                        : "—"}
                                    </td>
                                    <td>{r.pointsFor ?? "—"}</td>
                                    <td>{r.pointsAgainst ?? "—"}</td>
                                    <td>{r.difference ?? "—"}</td>
                                    <td>
                                      <RecentResultsCell
                                        results={
                                          recent.get(r.registrationId) ?? []
                                        }
                                        teamName={label(r.registrationId)}
                                        label={label}
                                        compactLabel={compactLabel}
                                      />
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </ScrollableTable>
                        <section
                          className="table-legend reference-legend"
                          aria-label="Legenda da classificação"
                        >
                          <h2>Legenda</h2>
                          <dl>
                            {standingsColumns.map(([label, description]) =>
                              description ? (
                                <div key={label}>
                                  <dt>{label}</dt>
                                  <dd>{description}</dd>
                                </div>
                              ) : null,
                            )}
                          </dl>
                        </section>
                      </div>
                      {!!g.standings.tieSteps.length && (
                        <details>
                          <summary>Critérios de desempate aplicados</summary>
                          <ol>
                            {g.standings.tieSteps.map((s, i) => (
                              <li key={i}>
                                {
                                  {
                                    wins: "Vitórias",
                                    point_difference: "Saldo de pontos",
                                    points_for: "Pontos a favor",
                                    head_to_head_points:
                                      "Pontos nos confrontos diretos",
                                    head_to_head_difference:
                                      "Saldo nos confrontos diretos",
                                    head_to_head_for:
                                      "Pontos a favor nos confrontos diretos",
                                  }[s.criterion]
                                }
                                :{" "}
                                {s.values
                                  .map(
                                    (v) =>
                                      `${label(v.registrationId)}: ${v.value ?? "não informado"}`,
                                  )
                                  .join("; ")}
                                {s.blocked &&
                                  ". Cobertura insuficiente para resolver o empate."}
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}
                    </section>
                  );
                })}
            </section>
          ))}
        {value.projection.series
          .filter((n) => n.phaseId === active)
          .map((n) => (
            <article key={n.id} className="public-series">
              <h2>
                {value.definition.series.find((s) => s.id === n.id)?.name}
              </h2>
              <p>
                {label(n.home.registrationId)} × {label(n.away.registrationId)}
              </p>
              <p>
                {n.status === "conflict"
                  ? "Confronto em revisão após alteração dos resultados."
                  : n.result?.winnerRegistrationId
                    ? `Vencedor da série: ${label(n.result.winnerRegistrationId)}`
                    : n.status === "tied"
                      ? "Empate agregado: decisão pendente."
                      : "Aguardando definição ou resultados."}
              </p>
              {n.result?.totals && (
                <p>
                  Placar competitivo: {n.result.totals.homePoints} ×{" "}
                  {n.result.totals.awayPoints}
                </p>
              )}
            </article>
          ))}
        {!phases.length && (
          <p>Nenhuma fase configurada nesta versão pública.</p>
        )}
      </TooltipProvider>
    </section>
  );
}

export function PublicSchedule({ value }: { value: PublicStandings }) {
  const names = new Map(value.registrations.map((r) => [r.id, r.name]));
  return (
    <PublicGamesTable
      games={value.games.map((g) => ({
        id: g.id,
        disputeId: value.disputeId,
        home: names.get(g.homeRegistrationId) ?? "Equipe confirmada",
        away: names.get(g.awayRegistrationId) ?? "Equipe confirmada",
        date: g.date,
        time: g.time,
        venue: g.venue,
        score: g.score
          ? { home: g.score.homePoints, away: g.score.awayPoints }
          : null,
        published: g.state === "played",
        status:
          g.state === "awarded"
            ? "Decisão administrativa"
            : g.state === "excluded"
              ? "Desconsiderado"
              : g.state === "conflict"
                ? "Em revisão"
                : "Aguardando resultado",
      }))}
    />
  );
}
