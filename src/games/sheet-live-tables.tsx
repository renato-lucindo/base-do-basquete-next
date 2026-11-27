import { Fragment } from "react";
import { compareJerseys } from "../domain/jersey";
import { periodColor, periodLabel } from "../domain/scoresheet";
import type { PersistedSheet, SheetSnapshot } from "./sheet-contract";
import type { GameSnapshot } from "./contract";
import type { projectSheet } from "../scoresheet/projection";
function firstHalfClass(
  period: number | undefined,
  previous: number | undefined,
  next: number | undefined,
) {
  if (period === undefined || period > 2) return "";
  return [
    "sheet-first-half",
    previous === undefined || previous > 2 ? "sheet-half-start" : "",
    next === undefined || next > 2 ? "sheet-half-end" : "",
  ].join(" ");
}
type Projection = ReturnType<typeof projectSheet>;
export function SheetPartials({
  document: d,
  projection: p,
  game,
  period,
}: {
  document: PersistedSheet;
  projection: Projection;
  game: GameSnapshot;
  period: number;
}) {
  return (
    <div
      className="sheet-team-score"
      tabIndex={0}
      role="region"
      aria-label="Parciais"
    >
      <table aria-label="Parciais das equipes">
        <thead>
          <tr>
            <th scope="col">Equipe</th>
            {Array.from({ length: d.periods }, (_, i) => (
              <th
                key={i}
                scope="col"
                className={i + 1 === period ? "sheet-current-period" : ""}
              >
                {periodLabel(i + 1)}
              </th>
            ))}
            <th scope="col" className="bb-metric-column">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {(["home", "away"] as const).map((side) => (
            <tr key={side}>
              <th scope="row">
                {side === "home" ? "A" : "B"} · {game[side].name}
              </th>
              {p.totals.teams[side].periods.map((points, i) => (
                <td
                  key={i}
                  className={i + 1 === period ? "sheet-current-period" : ""}
                >
                  {points}
                </td>
              ))}
              <td className="sheet-black-total">
                {p.totals.teams[side].points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function SheetLiveTables({
  document: d,
  projection: p,
  game,
  name,
  disabled,
  onPlayed,
  staffNames,
  staffName,
}: {
  document: PersistedSheet;
  projection: Projection;
  game: GameSnapshot;
  name: (id: string) => string;
  disabled: boolean;
  onPlayed: (id: string, played: boolean) => void;
  staffNames?: SheetSnapshot["staff"];
  staffName: (id: string) => string;
}) {
  return (
    <div className="sheet-desktop-teams sheet-launch-teams">
      {(["home", "away"] as const).map((side) => {
        const letter = side === "home" ? "A" : "B";
        const other = side === "home" ? "away" : "home";
        const players = p.players
          .filter((r) => r.side === side)
          .sort((a, b) => compareJerseys(a.jersey, b.jersey));
        const timeouts = d.events
          .filter((event) => event.side === side && event.target === "TO")
          .sort(
            (a, b) => a.period - b.period || Number(a.code) - Number(b.code),
          );
        const timeoutsByPeriod = new Map<number, typeof timeouts>();
        for (const event of timeouts) {
          const requests = timeoutsByPeriod.get(event.period);
          if (requests) requests.push(event);
          else timeoutsByPeriod.set(event.period, [event]);
        }
        const timeoutSummary = (
          <span
            className="sheet-staff-timeouts"
            aria-label={`Tempos debitados da equipe ${letter}`}
          >
            <span className="sheet-timeout-label">Tempo Debitado:</span>
            {timeouts.length
              ? Array.from(timeoutsByPeriod, ([period, requests], index) => (
                  <span className="sheet-timeout-item" key={period}>
                    {index > 0 && <span aria-hidden="true"> · </span>}
                    {periodLabel(period)}{" "}
                    {requests.map((event, minuteIndex) => (
                      <Fragment key={event.id}>
                        {minuteIndex > 0 && ", "}
                        <strong className={`sheet-ink-${periodColor(period)}`}>
                          {event.code}′
                        </strong>
                      </Fragment>
                    ))}
                  </span>
                ))
              : d.formatVersion === 2
                ? "—"
                : "Não informados na súmula legada"}
          </span>
        );
        return (
          <section
            className="sheet-team-card"
            key={side}
            tabIndex={0}
            aria-label={`Súmula da equipe ${letter} com rolagem horizontal`}
          >
            <h4>
              Equipe {letter} · {game[side].name}
            </h4>
            <table
              className="sheet-live-table"
              aria-label={`Súmula equipe ${letter}`}
            >
              <thead>
                <tr>
                  <th scope="col">Nº</th>
                  <th scope="col">Atleta</th>
                  <th scope="col">Entrou</th>
                  {["Q1", "Q2", "Q3", "Q4 + PR"].map((q, i) => (
                    <th
                      scope="col"
                      key={q}
                      className={`bb-metric-column ${i % 2 === 0 ? "sheet-ink-red" : "sheet-ink-blue"}`}
                    >
                      {q}
                    </th>
                  ))}
                  <th scope="col" className="bb-metric-column">
                    Total
                  </th>
                  <th scope="col" colSpan={5}>
                    Faltas
                  </th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {players.map((r) => {
                  const identity = d.participants[r.rosterEntryId - 1],
                    playerName = name(identity.rosterEntryId),
                    hasActions = r.fouls.length > 0 || r.points > 0;
                  return (
                    <tr key={identity.rosterEntryId}>
                      <td>{r.jersey}</td>
                      <th scope="row" className="sheet-athlete-name">
                        <div className="sheet-athlete">
                          <span
                            className="sheet-athlete-label"
                            onMouseEnter={({ currentTarget }) => {
                              if (
                                currentTarget.scrollWidth >
                                currentTarget.clientWidth
                              )
                                currentTarget.title = playerName;
                            }}
                            onMouseLeave={({ currentTarget }) =>
                              currentTarget.removeAttribute("title")
                            }
                          >
                            {playerName}
                          </span>
                          {identity.starter && <small title="Titular">*</small>}
                          {d.staff[side].captainRosterEntryId ===
                            identity.rosterEntryId && (
                            <small title="Capitão">C</small>
                          )}
                        </div>
                      </th>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Entrou ${playerName}`}
                          disabled={disabled || identity.starter || hasActions}
                          checked={identity.played}
                          onChange={(e) =>
                            onPlayed(identity.rosterEntryId, e.target.checked)
                          }
                        />
                      </td>
                      {r.pointsByQuarter.map((points, i) => (
                        <td
                          key={i}
                          className={`bb-metric-column ${i % 2 === 0 ? "sheet-ink-red" : "sheet-ink-blue"}`}
                        >
                          {identity.played ? points : "—"}
                        </td>
                      ))}
                      <td className="sheet-black-total">
                        {identity.played ? r.points : "—"}
                      </td>
                      {Array.from({ length: 5 }, (_, i) => {
                        const f = r.fouls[i];
                        return (
                          <td
                            key={i}
                            data-period={f?.period}
                            className={`sheet-foul-cell ${f ? "sheet-ink-" + f.color : ""} ${firstHalfClass(f?.period, r.fouls[i - 1]?.period, i < 4 ? r.fouls[i + 1]?.period : undefined)}`}
                            title={
                              f
                                ? `${i + 1}ª falta · ${periodLabel(f.period)} · ${f.code}`
                                : `${i + 1}ª falta`
                            }
                            aria-label={
                              f
                                ? `${i + 1}ª falta · ${periodLabel(f.period)} · ${f.code}`
                                : `${i + 1}ª falta vazia`
                            }
                          >
                            {f?.code ?? ""}
                          </td>
                        );
                      })}
                      <td className="sheet-player-state">
                        {r.status === "eligible"
                          ? ""
                          : r.status === "excluded"
                            ? "5ª"
                            : r.status}
                      </td>
                    </tr>
                  );
                })}
                {Array.from({ length: 12 - players.length }, (_, index) => (
                  <tr
                    className="sheet-empty-player"
                    aria-hidden="true"
                    key={index}
                  >
                    {Array.from({ length: 14 }, (_, column) => (
                      <td key={column} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sheet-coach-fouls">
              {d.formatVersion === 2 ? (
                (() => {
                  const team = p.totals.teams[side];
                  const assigned = d.staff[side];
                  const coachId =
                    assigned.coachStaffEntryId ?? assigned.captainRosterEntryId;
                  const people = team.staffPeople ?? {};
                  const ids = [
                    coachId,
                    assigned.assistantStaffEntryId,
                    ...Object.keys(people),
                  ]
                    .filter((id): id is string => !!id)
                    .filter((id, index, all) => all.indexOf(id) === index)
                    .filter(
                      (id) =>
                        id === coachId ||
                        id === assigned.assistantStaffEntryId ||
                        id === team.activeCoachId ||
                        !!people[id]?.marks.length ||
                        (people[id]?.status !== "eligible" && !!people[id]),
                    );
                  return (
                    <>
                      {!coachId && (
                        <div className="sheet-staff-line">
                          <span>Técnico: Não informado</span>
                          {timeoutSummary}
                        </div>
                      )}
                      {ids.map((id) => {
                        const state = people[id];
                        const marks = [...(state?.marks ?? [])].sort(
                          (a, b) => a.period - b.period,
                        );
                        const role =
                          id === coachId
                            ? "Técnico"
                            : id === assigned.assistantStaffEntryId
                              ? "Ass. Técnico"
                              : id === assigned.captainRosterEntryId
                                ? "Capitão"
                                : "Sucessor";
                        return (
                          <div
                            key={id}
                            className={
                              role === "Ass. Técnico"
                                ? "sheet-staff-line sheet-assistant-line"
                                : "sheet-staff-line"
                            }
                          >
                            <span className="sheet-staff-identity">
                              {role}: {staffName(id)}
                              {id !== coachId && team.activeCoachId === id && (
                                <strong className="sheet-acting-coach">
                                  Técnico em exercício
                                </strong>
                              )}
                              {state?.status !== "eligible" &&
                                state?.status && (
                                  <strong className="sheet-staff-status">
                                    {state.status}
                                  </strong>
                                )}
                            </span>
                            {marks.map((mark, index) => (
                              <span
                                key={mark.id + mark.code}
                                className={`sheet-foul-mark ${`sheet-ink-${periodColor(mark.period)}`} ${firstHalfClass(mark.period, marks[index - 1]?.period, marks[index + 1]?.period)}`}
                                title={`${periodLabel(mark.period)}${mark.consequence ? " · B2 vinculada à desqualificação do assistente" : ""}`}
                              >
                                {mark.code.replace(/C$/u, "c")}
                              </span>
                            ))}
                            {id === coachId && timeoutSummary}
                          </div>
                        );
                      })}
                      {!assigned.assistantStaffEntryId &&
                        d.staff[other].assistantStaffEntryId && (
                          <div className="sheet-staff-line sheet-assistant-line">
                            Ass. Técnico:
                          </div>
                        )}
                    </>
                  );
                })()
              ) : (
                <div className="sheet-staff-line">
                  <span className="sheet-staff-identity">
                    Técnico:{" "}
                    {staffNames?.[side].coach?.name ??
                      (d.staff[side].captainRosterEntryId
                        ? name(d.staff[side].captainRosterEntryId!)
                        : "Não informado")}
                  </span>
                  {d.events
                    .filter(
                      (e) =>
                        e.side === side &&
                        (e.target === "C" || e.target === "B"),
                    )
                    .sort((a, b) => a.period - b.period)
                    .map((e, index, marks) => (
                      <span
                        key={e.id}
                        className={`sheet-foul-mark ${`sheet-ink-${periodColor(e.period)}`} ${firstHalfClass(e.period, marks[index - 1]?.period, marks[index + 1]?.period)}`}
                        title={`${periodLabel(e.period)} · ${e.target === "B" ? "Banco legado" : "Técnico"}`}
                      >
                        {e.code.replace(/C$/u, "c")}
                      </span>
                    ))}
                  {timeoutSummary}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
