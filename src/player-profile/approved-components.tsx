import { useEffect, useState } from "react";
import type { PublicCareer } from "./public-model";
import type { ConfirmedPlayerGame } from "./participation-contract";
import { metricLabel } from "./public-model";
import { api } from "../competition/api";
import { publicResultSchema } from "../publication/pdf-contract";
import { publicDetailLink } from "../public-ui/navigation";
import { STATISTICS_METRICS } from "../statistics/metrics";
import { useNameTooltip } from "../statistics/reference/tooltip";
import {
  RECORD_METRICS,
  rankCareerGames,
  groupPlacements,
  groupHonors,
  teamTrajectory,
  profileDate,
  type RecordMetric,
} from "./presentation";

export const scoreKey = (g: ConfirmedPlayerGame) =>
  [
    g.fact.gameId,
    g.fact.disputeId,
    g.fact.publicationVersion,
    g.fact.publishedAt,
  ].join("/");
/** Scores must match the participation's exact publication. */
export function useGameScores(games: ConfirmedPlayerGame[]) {
  const [scores, setScores] = useState<Record<string, string>>({});
  const signature = games.map(scoreKey).join("|");
  useEffect(() => {
    const controller = new AbortController();
    let cursor = 0;
    async function read() {
      while (cursor < games.length && !controller.signal.aborted) {
        const game = games[cursor++];
        try {
          const result = await api(
            `/api/public/games/${game.fact.gameId}`,
            publicResultSchema,
            undefined,
            controller.signal,
          );
          if (
            !controller.signal.aborted &&
            result.id === game.fact.gameId &&
            result.disputeId === game.fact.disputeId &&
            result.version === game.fact.publicationVersion &&
            result.publishedAt === game.fact.publishedAt
          )
            setScores((previous) => ({
              ...previous,
              [scoreKey(game)]:
                `${result.facts.teams.home.points} × ${result.facts.teams.away.points}`,
            }));
        } catch {
          /* Unavailable is never replaced with zero. */
        }
      }
    }
    void Promise.all([read(), read(), read()]);
    return () => controller.abort();
    // The signature contains the complete publication identity.
  }, [signature]);
  return scores;
}
export function MetricTerm({
  metric,
  onClick,
}: {
  metric: RecordMetric | "foulsCommitted" | "games";
  onClick?: () => void;
}) {
  const name = metric === "games" ? "Jogos" : STATISTICS_METRICS[metric].name;
  const tip = useNameTooltip(name);
  return (
    <button
      type="button"
      className="player-term"
      {...tip}
      onClick={(event) => {
        tip.onClick(event);
        onClick?.();
      }}
      aria-label={
        onClick
          ? `Ordenar por ${metric === "games" ? "J" : metricLabel(metric)} (${name})`
          : `${metric === "games" ? "J" : metricLabel(metric)}: ${name}`
      }
    >
      {metric === "games" ? "J" : metricLabel(metric)}
    </button>
  );
}
export function MatchTeams({
  game,
  score,
}: {
  game: ConfirmedPlayerGame;
  score?: string;
}) {
  const name = (side: "home" | "away") => (
    <span className="player-match-team">
      <span className="player-team-short">
        {game.game[side].team.abbreviation || game.game[side].name}
      </span>
      <span className="player-team-full">{game.game[side].name}</span>
    </span>
  );
  return (
    <span className="player-matchup">
      {name("home")}
      <span className="player-match-score">{score ?? "—"}</span>
      {name("away")}
    </span>
  );
}
export function GameContext({ game }: { game: ConfirmedPlayerGame }) {
  return (
    <span className="player-game-context">
      {game.fact.context.name} · {game.fact.context.category}
      {game.fact.context.division ? ` · ${game.fact.context.division}` : ""}
    </span>
  );
}
export const gameHref = (game: ConfirmedPlayerGame) =>
  publicDetailLink(`/resultado.html#${game.fact.gameId}`, game.fact.disputeId);
export function ProfileGames({
  games,
  scores,
  label,
}: {
  games: ConfirmedPlayerGame[];
  scores: Record<string, string>;
  label: string;
}) {
  if (!games.length)
    return <p className="player-empty">Nenhum jogo encontrado.</p>;
  return (
    <div
      className="player-games-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="player-games-table" aria-label={label}>
        <colgroup>
          <col className="player-game-date-col" />
          <col />
          <col className="player-game-points-col" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Confronto</th>
            <th scope="col">
              <MetricTerm metric="points" />
            </th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.fact.gameId} data-game={g.fact.gameId}>
              <td>{profileDate(g.game.date)}</td>
              <td>
                <a className="player-game-link" href={gameHref(g)}>
                  <MatchTeams game={g} score={scores[scoreKey(g)]} />
                  <GameContext game={g} />
                  {!g.fact.played && <small>Não participou</small>}
                </a>
              </td>
              <td className="player-game-points">
                {g.fact.played ? (g.fact.scoring?.points ?? "—") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function TeamTrajectory({ career }: { career: PublicCareer }) {
  const passages = teamTrajectory(career.history).reverse();
  return (
    <section className="player-team-history" aria-labelledby="historico">
      <h2 id="historico">Histórico de equipes</h2>
      {passages.length ? (
        <ol className="player-trajectory">
          {passages.map((p, i) => (
            <li key={`${p.team.id}/${i}`}>
              <time>
                {p.firstYear}
                {p.firstYear !== p.lastYear ? `–${p.lastYear}` : ""}
              </time>
              <span className="player-trajectory-point" aria-hidden="true" />
              <a
                href={publicDetailLink(
                  `/equipe.html#${p.team.id}?registrationId=${p.history.registration.registrationId}`,
                  p.history.disputeId,
                )}
              >
                {p.team.name}
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="player-empty">Nenhuma equipe registrada.</p>
      )}
    </section>
  );
}
function AwardIcon({ position }: { position: number }) {
  // Remix Icon trophy-fill / medal-fill. License linked in the design documentation.
  const trophy =
    "M13.0049 16.9409V19.0027H18.0049V21.0027H6.00488V19.0027H11.0049V16.9409C7.05857 16.4488 4.00488 13.0824 4.00488 9.00275V3.00275H20.0049V9.00275C20.0049 13.0824 16.9512 16.4488 13.0049 16.9409ZM1.00488 5.00275H3.00488V9.00275H1.00488V5.00275ZM21.0049 5.00275H23.0049V9.00275H21.0049V5.00275Z";
  const medal =
    "M12 7.00002C16.4183 7.00002 20 10.5817 20 15C20 19.4183 16.4183 23 12 23C7.58172 23 4 19.4183 4 15C4 10.5817 7.58172 7.00002 12 7.00002ZM12 10.5L10.6775 13.1797L7.72025 13.6094L9.86012 15.6953L9.35497 18.6406L12 17.25L14.645 18.6406L14.1399 15.6953L16.2798 13.6094L13.3225 13.1797L12 10.5ZM13 1.99902L18 2.00002V5.00002L16.6366 6.13758C15.5305 5.55773 14.3025 5.17887 13.0011 5.04951L13 1.99902ZM11 1.99902L10.9997 5.04943C9.6984 5.17866 8.47046 5.55738 7.36441 6.13706L6 5.00002V2.00002L11 1.99902Z";
  return (
    <span
      className={`player-medal player-medal-${position}`}
      role="img"
      aria-label={`${position}º lugar`}
    >
      {position <= 3 ? (
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={position === 1 ? trophy : medal} />
        </svg>
      ) : (
        `${position}º`
      )}
    </span>
  );
}
export function CareerHonors({
  career,
  prefix = "",
}: {
  career: PublicCareer;
  prefix?: string;
}) {
  const collective = groupPlacements(career.page.teamPlacements),
    individual = groupHonors(career.page.honors);
  return (
    <aside className="player-honors" aria-labelledby={`${prefix}conquistas`}>
      <h2 id={`${prefix}conquistas`}>Conquistas e honrarias</h2>
      {!collective.length && !individual.length ? (
        <p className="player-empty">Nenhuma conquista publicada.</p>
      ) : (
        <div className="player-award-columns">
          <section
            className="player-collective"
            aria-label="Conquistas coletivas"
          >
            <h3>Coletivas</h3>
            {collective.map((g) => (
              <div className="player-medal-group" key={g.position}>
                <AwardIcon position={g.position} />
                <div>
                  {g.competitions.map((c) => (
                    <details key={c.id}>
                      <summary>
                        {c.name}{" "}
                        <span>
                          (
                          {c.editions.length > 1
                            ? `${c.editions.length}x`
                            : c.editions[0].context.year}
                          )
                        </span>
                      </summary>
                      <ul>
                        {c.editions.map((e) => (
                          <li
                            key={`${e.disputeId}/${e.registration.registrationId}`}
                          >
                            {e.context.year} · {e.context.category}
                            <small>
                              <a
                                href={publicDetailLink(
                                  `/equipe.html#${e.registration.teamId}?registrationId=${e.registration.registrationId}`,
                                  e.disputeId,
                                )}
                              >
                                {e.registration.name}
                              </a>
                            </small>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </section>
          <section
            className="player-individual"
            aria-label="Honrarias individuais"
          >
            <h3>Individuais</h3>
            {individual.map((g) => (
              <details key={g.id}>
                <summary>
                  {g.title}
                  <span className="player-award-competition">
                    {g.name} (
                    {g.editions.length > 1
                      ? `${g.editions.length}x`
                      : g.editions[0].context.year}
                    )
                  </span>
                </summary>
                <ul>
                  {g.editions.map((e) => (
                    <li key={`${e.disputeId}/${e.honor.id}`}>
                      {e.context.year} · {e.context.category}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        </div>
      )}
    </aside>
  );
}
export function CareerRecords({
  career,
  scores,
  expanded,
  onChange,
}: {
  career: PublicCareer;
  scores: Record<string, string>;
  expanded: RecordMetric[];
  onChange: (expanded: RecordMetric[]) => void;
}) {
  return (
    <section className="player-records" aria-labelledby="recordes" tabIndex={0}>
      <h2 id="recordes">Recordes da carreira</h2>
      <table aria-label="Recordes da carreira">
        <colgroup>
          <col className="player-record-metric-col" />
          <col className="player-record-value-col" />
          <col className="player-record-date-col" />
          <col />
          <col className="player-record-action-col" />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={2} scope="colgroup">
              Marca
            </th>
            <th scope="col">Data</th>
            <th scope="col">Confronto</th>
            <th scope="col">
              <span className="player-sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        {RECORD_METRICS.map((metric) => {
          const covered = rankCareerGames(career.games, metric),
            ranking = covered.filter((game) => game.fact.scoring![metric] > 0),
            open = expanded.includes(metric),
            label = metricLabel(metric);
          return (
            <tbody key={metric} data-metric={metric}>
              {!ranking.length ? (
                <tr>
                  <th scope="row">{label}</th>
                  <td>—</td>
                  <td>—</td>
                  <td className="player-record-empty">
                    {covered.length
                      ? "Nenhuma marca positiva."
                      : "Nenhuma marca registrada."}
                  </td>
                  <td />
                </tr>
              ) : (
                (open ? ranking : ranking.slice(0, 1)).map((g, i) => (
                  <tr
                    key={g.fact.gameId}
                    data-game={g.fact.gameId}
                    className={
                      i === 0 ? "player-record-main" : "player-record-ranking"
                    }
                  >
                    <th scope="row">{i === 0 ? label : `${i + 1}º`}</th>
                    <td className="player-record-value">
                      <a
                        href={gameHref(g)}
                        aria-label={`${g.fact.scoring![metric]} ${label}, ver jogo de ${profileDate(g.game.date)}`}
                      >
                        {g.fact.scoring![metric]}
                      </a>
                    </td>
                    <td className="player-record-date">
                      {profileDate(g.game.date)}
                    </td>
                    <td className="player-record-match">
                      <a href={gameHref(g)} className="player-record-game">
                        <MatchTeams game={g} score={scores[scoreKey(g)]} />
                        <GameContext game={g} />
                      </a>
                    </td>
                    <td>
                      {i === 0 && ranking.length > 1 && (
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`${open ? "Recolher" : "Ver"} top 5 de ${label}`}
                          onClick={() =>
                            onChange(
                              open
                                ? expanded.filter((m) => m !== metric)
                                : [...expanded, metric],
                            )
                          }
                        >
                          {open ? "Recolher" : "Ver top 5"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          );
        })}
      </table>
    </section>
  );
}
