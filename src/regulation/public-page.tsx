import { useEffect, useState } from "react";
import { PublicGamesTable } from "../public-ui/games-table";
import { publicScheduleRows } from "../public-ui/games-model";
import type { CatalogGame } from "../public-ui/catalog-contract";
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
import { standingsSelection } from "./public-bracket-model";
import { PublicBracket } from "./public-bracket";
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
  const { stage, phase, group, knockoutAvailable } = standingsSelection(
    value,
    params,
  );
  const active = stage === "classificatoria" ? phase?.phaseId : null;
  const phases = value.definition.groupPhases;
  const selectionLink = (phaseId?: string, groupId?: string) => {
    const query = new URLSearchParams(params);
    query.set("secao", "classificacao");
    query.set("etapa", phaseId ? "classificatoria" : "eliminatoria");
    if (phaseId) query.set("fase", phaseId);
    else query.delete("fase");
    if (groupId) query.set("grupo", groupId);
    else query.delete("grupo");
    return `#${value.disputeId}?${query}`;
  };
  const canonical =
    stage === "eliminatoria"
      ? selectionLink()
      : active
        ? selectionLink(active, group?.id)
        : null;
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
        {knockoutAvailable && (
          <nav
            className="public-phase-navigation segmented"
            aria-label="Etapas da classificação"
          >
            {!!phases.length && (
              <a
                href={selectionLink(phase?.phaseId, group?.id)}
                aria-current={stage === "classificatoria" ? "page" : undefined}
              >
                Fase Regular
              </a>
            )}
            <a
              href={selectionLink()}
              aria-current={stage === "eliminatoria" ? "page" : undefined}
            >
              Eliminatórias
            </a>
          </nav>
        )}
        {stage === "eliminatoria" && <PublicBracket value={value} />}
        {value.projection.groupPhases
          .filter((p) => p.phaseId === active)
          .map((p) => (
            <section key={p.phaseId}>
              <h2 className="sr-only">
                {phases.find((n) => n.phaseId === p.phaseId)?.name}
              </h2>
              {phase && (phase.groups.length > 1 || phases.length > 1) && (
                <label className="standings-group-control">
                  Grupo
                  <select
                    name="grupo"
                    value={group?.id}
                    onChange={(e) => {
                      const selectedPhase = phases.find((n) =>
                        n.groups.some((g) => g.id === e.target.value),
                      )!;
                      window.location.hash = selectionLink(
                        selectedPhase.phaseId,
                        e.target.value,
                      );
                    }}
                  >
                    {phases.length > 1
                      ? phases.map((n) => (
                          <optgroup key={n.phaseId} label={n.name}>
                            {n.groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      : phase.groups.map((g) => (
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
        {!phases.length && !knockoutAvailable && (
          <p>
            {value.definition.knockoutPhases.length
              ? "Os confrontos da eliminatória ainda não foram definidos."
              : "Nenhuma fase configurada nesta versão pública."}
          </p>
        )}
      </TooltipProvider>
    </section>
  );
}

export function PublicSchedule({
  value,
  publishedGames,
}: {
  value: PublicStandings;
  publishedGames: CatalogGame[];
}) {
  return <PublicGamesTable games={publicScheduleRows(value, publishedGames)} />;
}
