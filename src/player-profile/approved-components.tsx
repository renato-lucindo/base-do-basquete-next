import { useState, useEffect } from "react";
import type { PublicCareer } from "./public-model";
import type { ConfirmedPlayerGame } from "./participation-contract";
import { metricLabel } from "./public-model";
import { STATISTICS_METRICS } from "../statistics/metrics";
import { publicDetailLink } from "../public-ui/navigation";
import {
  RECORD_METRICS,
  rankCareerGames,
  groupPlacements,
  groupHonors,
  teamTrajectory,
  profileDate,
  type RecordMetric,
} from "./presentation";

function Context({
  context,
}: {
  context: PublicCareer["history"][number]["context"];
}) {
  return (
    <>
      {context.name} · {context.year} · {context.category}
      {context.division ? ` · ${context.division}` : ""}
    </>
  );
}
export function MatchTeams({ game }: { game: ConfirmedPlayerGame }) {
  return (
    <>
      <a
        href={publicDetailLink(
          `/equipe.html#${game.game.home.team.id}?registrationId=${game.game.home.registrationId}`,
          game.fact.disputeId,
        )}
      >
        {game.game.home.name}
      </a>
      <span> × </span>
      <a
        href={publicDetailLink(
          `/equipe.html#${game.game.away.team.id}?registrationId=${game.game.away.registrationId}`,
          game.fact.disputeId,
        )}
      >
        {game.game.away.name}
      </a>
    </>
  );
}
export function TeamTrajectory({ career }: { career: PublicCareer }) {
  const passages = teamTrajectory(career.history);
  return (
    <details className="player-team-history">
      <summary id="historico">Ver histórico de equipes</summary>
      <ol className="player-trajectory">
        {passages.map((p, i) => (
          <li key={`${p.team.id}/${i}`}>
            <span>
              {p.firstYear}
              {p.firstYear !== p.lastYear ? `–${p.lastYear}` : ""}
            </span>
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
      {!passages.length && (
        <p>Nenhuma equipe registrada nas participações publicadas.</p>
      )}
    </details>
  );
}
export function CareerHonors({ career }: { career: PublicCareer }) {
  const collective = groupPlacements(career.page.teamPlacements),
    individual = groupHonors(career.page.honors);
  return (
    <aside className="player-honors" aria-labelledby="conquistas">
      <h2 id="conquistas" tabIndex={-1}>
        Conquistas e honrarias
      </h2>
      {!collective.length && !individual.length ? (
        <p>Nenhuma conquista publicada.</p>
      ) : (
        <div className="player-award-columns">
          <section
            className="player-collective"
            aria-label="Conquistas coletivas"
          >
            <h3>Conquistas coletivas</h3>
            {collective.map((g) => (
              <div className="player-medal-group" key={g.position}>
                <span
                  className="player-medal"
                  role="img"
                  aria-label={`${g.position}º lugar`}
                >
                  {({ 1: "🥇", 2: "🥈", 3: "🥉" } as Record<number, string>)[
                    g.position
                  ] ?? `${g.position}º`}
                </span>
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
                            <Context context={e.context} />
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
            <h3>Honrarias individuais</h3>
            {individual.map((g) => (
              <details key={g.id}>
                <summary>
                  <strong>{g.title}</strong>
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
                      <Context context={e.context} />
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
export function CareerRecords({ career }: { career: PublicCareer }) {
  const [expanded, setExpanded] = useState<RecordMetric[]>([]),
    [compact, setCompact] = useState(
      () => matchMedia("(max-width:700px)").matches,
    );
  useEffect(() => {
    const m = matchMedia("(max-width:700px)");
    const update = () => setCompact(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return (
    <section className="player-records" aria-labelledby="recordes">
      <h2 id="recordes" tabIndex={-1}>
        Recordes da carreira
      </h2>
      <table aria-label="Recordes da carreira">
        <colgroup>
          <col className="player-record-metric-col" />
          <col className="player-record-value-col" />
          {!compact && <col className="player-record-date-col" />}
          <col />
          <col className="player-record-action-col" />
        </colgroup>
        <thead>
          <tr>
            <th id="record-mark" colSpan={2} scope="colgroup">
              Marca
            </th>
            <th id="record-date" scope="col" className="player-record-date">
              Data
            </th>
            <th id="record-match" scope="col">
              Confronto
            </th>
            <th id="record-action" scope="col">
              <span className="player-sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        {RECORD_METRICS.map((metric) => {
          const ranking = rankCareerGames(career.games, metric),
            open = expanded.includes(metric),
            label = metricLabel(metric),
            rows = open ? ranking : ranking.slice(0, 1);
          return (
            <tbody key={metric} data-metric={metric}>
              {!ranking.length ? (
                <tr>
                  <th scope="row" id={`record-${metric}`} headers="record-mark">
                    {label}
                  </th>
                  <td
                    className="player-record-value"
                    headers={`record-${metric} record-mark`}
                  >
                    —
                  </td>
                  <td className="player-record-date">—</td>
                  <td>Nenhuma marca registrada.</td>
                  <td />
                </tr>
              ) : (
                rows.map((g, i) => (
                  <tr
                    key={g.fact.gameId}
                    className={
                      i === 0 ? "player-record-main" : "player-record-ranking"
                    }
                    data-game={g.fact.gameId}
                    id={`rank-${metric}-${i}`}
                  >
                    {i === 0 ? (
                      <th
                        scope="row"
                        id={`record-${metric}`}
                        headers="record-mark"
                      >
                        <abbr title={STATISTICS_METRICS[metric].name}>
                          {label}
                        </abbr>
                      </th>
                    ) : (
                      <td headers={`record-${metric} record-mark`}>{i + 1}º</td>
                    )}
                    <td
                      className="player-record-value"
                      headers={`record-${metric} record-mark`}
                    >
                      <a
                        aria-label={`${g.fact.scoring![metric]} ${label}, ver jogo de ${profileDate(g.game.date)}`}
                        href={publicDetailLink(
                          `/resultado.html#${g.fact.gameId}`,
                          g.fact.disputeId,
                        )}
                      >
                        {g.fact.scoring![metric]}
                      </a>
                    </td>
                    <td
                      className="player-record-date"
                      headers={`record-${metric} record-date`}
                    >
                      {profileDate(g.game.date)}
                    </td>
                    <td
                      className="player-record-match"
                      headers={`record-${metric} record-match`}
                    >
                      <MatchTeams game={g} />
                      <small>
                        <span className="player-record-mobile-date">
                          {profileDate(g.game.date)} ·{" "}
                        </span>
                        <Context context={g.fact.context} />
                      </small>
                    </td>
                    <td headers={`record-${metric} record-action`}>
                      {i === 0 && ranking.length > 1 && (
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={
                            open
                              ? ranking
                                  .slice(1)
                                  .map((_, j) => `rank-${metric}-${j + 1}`)
                                  .join(" ")
                              : undefined
                          }
                          aria-label={`${open ? "Recolher" : "Ver"} top 5 de ${label}`}
                          onClick={() =>
                            setExpanded((previous) =>
                              previous.includes(metric)
                                ? previous.filter((m) => m !== metric)
                                : [...previous, metric],
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
