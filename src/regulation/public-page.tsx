import { useEffect, useState } from "react";
import { api } from "../competition/api";
import { publicStandingsSchema, type PublicStandings } from "./public-contract";
import { publicDetailLink } from "../public-ui/navigation";
import { teamDetailLink } from "../team-statistics/navigation";

const standingsNumber = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
const standingsColumns = [
  ["Pos.", "Posição na classificação; empates permanecem explícitos"],
  ["Equipe", "Equipe inscrita nesta disputa"],
  ["J", "Jogos contabilizados"],
  ["V", "Vitórias"],
  ["D", "Derrotas"],
  ["Aprov.", "Aproveitamento de vitórias: V / J × 100; indefinido sem jogos"],
  ["PP", "Pontos pró"],
  ["PC", "Pontos contra"],
  ["SLD", "Saldo de pontos: PP − PC"],
] as const;

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
  const selected = new URLSearchParams(
    window.location.hash.split("?")[1] ?? "",
  ).get("fase");
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
  const names = new Map(value.registrations.map((r) => [r.id, r.name]));
  const label = (id: string | null) =>
    id ? (names.get(id) ?? "Equipe confirmada") : "A definir";
  return (
    <section className="public-standings" aria-label="Classificação publicada">
      <p className="public-source">
        Publicação v{value.publicationVersion} · Regulamento v
        {value.regulationVersion} · Classificação provisória
      </p>
      <p>
        Resultados publicados atualizam esta consulta. Empates e pendências não
        confirmam colocações finais.
      </p>
      {phases.length > 1 && (
        <nav
          className="public-phase-navigation"
          aria-label="Fases da classificação"
        >
          {phases.map((p) => (
            <a
              key={p.id}
              href={`#${value.disputeId}?secao=classificacao&fase=${p.id}`}
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
            <h2>{phases.find((n) => n.id === p.phaseId)?.name}</h2>
            {p.groups.map((g) => (
              <section key={g.groupId}>
                <h3>
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
                    {g.pendingGameIds.length} jogo(s) aguardando resultado ou
                    revisão.
                  </p>
                )}
                {!!g.excludedGameIds.length && (
                  <p>
                    {g.excludedGameIds.length} jogo(s) desconsiderado(s) por
                    decisão confirmada.
                  </p>
                )}
                <div
                  className="public-standings-table"
                  role="region"
                  aria-label={`Classificação do ${value.definition.groupPhases.find((n) => n.phaseId === p.phaseId)?.groups.find((n) => n.id === g.groupId)?.name ?? "grupo"}`}
                  tabIndex={0}
                >
                  <table>
                    <caption>Classificação por resultados confirmados</caption>
                    <thead>
                      <tr>
                        {standingsColumns.map(([label, description]) => (
                          <th scope="col" key={label} title={description}>
                            <abbr title={description}>{label}</abbr>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...g.standings.rows]
                        .sort(
                          (a, b) =>
                            (a.position ?? Infinity) - (b.position ?? Infinity),
                        )
                        .map((r) => (
                          <tr key={r.registrationId}>
                            <td>
                              {r.position ?? "—"}
                              {r.tied && r.position !== null ? " (empate)" : ""}
                            </td>
                            <th scope="row">
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
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="public-table-legend">
                  J: jogos computados · V: vitórias · D: derrotas · Aprov.: V/J
                  × 100 · PP/PC: pontos pró/contra · SLD: PP − PC. —: posição ou
                  valor indefinido. O aproveitamento não representa os pontos de
                  classificação do regulamento.
                </p>
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
            ))}
          </section>
        ))}
      {value.projection.series
        .filter((n) => n.phaseId === active)
        .map((n) => (
          <article key={n.id} className="public-series">
            <h2>{value.definition.series.find((s) => s.id === n.id)?.name}</h2>
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
      {!phases.length && <p>Nenhuma fase configurada nesta versão pública.</p>}
    </section>
  );
}

export function PublicSchedule({ value }: { value: PublicStandings }) {
  const names = new Map(value.registrations.map((r) => [r.id, r.name]));
  const games = [...value.games].sort(
    (a, b) =>
      (a.date ?? "9999").localeCompare(b.date ?? "9999") ||
      (a.time ?? "99").localeCompare(b.time ?? "99") ||
      a.id.localeCompare(b.id),
  );
  if (!games.length)
    return <p>Nenhum jogo vinculado ao regulamento publicado.</p>;
  return (
    <ul className="public-games">
      {games.map((g) => {
        const score = g.score
          ? `${g.score.homePoints} × ${g.score.awayPoints}`
          : g.state === "awarded"
            ? "Decisão administrativa"
            : g.state === "excluded"
              ? "Desconsiderado"
              : g.state === "conflict"
                ? "Em revisão"
                : "Aguardando resultado";
        const content = (
          <>
            <span>{names.get(g.homeRegistrationId)}</span>
            <strong>{score}</strong>
            <span>{names.get(g.awayRegistrationId)}</span>
          </>
        );
        return (
          <li key={g.id}>
            <time dateTime={g.date ?? undefined}>
              {g.date
                ? g.date.split("-").reverse().join("/")
                : "Data a definir"}{" "}
              · {g.time ?? "Horário a definir"}
            </time>
            {g.state === "played" ? (
              <a
                href={publicDetailLink(
                  `/resultado.html#${g.id}`,
                  value.disputeId,
                )}
              >
                {content}
              </a>
            ) : (
              <div className="public-game-pending">{content}</div>
            )}
            <small>{g.venue ?? "Local a definir"}</small>
          </li>
        );
      })}
    </ul>
  );
}
