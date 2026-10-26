import { periodLabel } from "../domain/scoresheet";
import type { PersistedSheet, SheetSnapshot } from "./sheet-contract";
import type { GameSnapshot } from "./contract";
import type { projectSheet } from "../scoresheet/projection";
type Projection = ReturnType<typeof projectSheet>;
export function SheetLiveTables({
  document: d,
  projection: p,
  game,
  period,
  name,
  disabled,
  onPlayed,
  staffNames,
}: {
  document: PersistedSheet;
  projection: Projection;
  game: GameSnapshot;
  period: number;
  name: (id: string) => string;
  disabled: boolean;
  onPlayed: (id: string, played: boolean) => void;
  staffNames?: SheetSnapshot["staff"];
}) {
  return (
    <>
      <div className="sheet-team-score">
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
              <th scope="col">Total</th>
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
        <p>
          Parcial selecionada {periodLabel(period)}:{" "}
          {p.totals.teams.home.periods[period - 1] ?? 0} ×{" "}
          {p.totals.teams.away.periods[period - 1] ?? 0}
        </p>
      </div>
      <div className="sheet-desktop-teams">
        {(["home", "away"] as const).map((side) => {
          const letter = side === "home" ? "A" : "B";
          return (
            <section className="sheet-team-card" key={side}>
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
                    {["Q1", "Q2", "Q3", "Q4 + OT"].map((q, i) => (
                      <th
                        scope="col"
                        key={q}
                        className={
                          i % 2 === 0 ? "sheet-ink-red" : "sheet-ink-blue"
                        }
                      >
                        {q}
                      </th>
                    ))}
                    <th scope="col">Total</th>
                    <th scope="col" colSpan={5}>
                      Faltas
                    </th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {p.players
                    .filter((r) => r.side === side)
                    .sort(
                      (a, b) =>
                        Number(a.jersey) - Number(b.jersey) ||
                        a.jersey.length - b.jersey.length,
                    )
                    .map((r) => {
                      const identity = d.participants[r.rosterEntryId - 1],
                        playerName = name(identity.rosterEntryId),
                        hasActions = r.fouls.length > 0 || r.points > 0;
                      return (
                        <tr key={identity.rosterEntryId}>
                          <td>{r.jersey}</td>
                          <th
                            scope="row"
                            className="sheet-athlete-name"
                            title={playerName}
                          >
                            {playerName}
                            {identity.starter && (
                              <small title="Titular"> *</small>
                            )}
                            {d.staff[side].captainRosterEntryId ===
                              identity.rosterEntryId && (
                              <small title="Capitão"> C</small>
                            )}
                          </th>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Entrou ${playerName}`}
                              disabled={
                                disabled || identity.starter || hasActions
                              }
                              checked={identity.played}
                              onChange={(e) =>
                                onPlayed(
                                  identity.rosterEntryId,
                                  e.target.checked,
                                )
                              }
                            />
                          </td>
                          {r.pointsByQuarter.map((points, i) => (
                            <td
                              key={i}
                              className={
                                i % 2 === 0 ? "sheet-ink-red" : "sheet-ink-blue"
                              }
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
                                className={`sheet-foul-cell ${f ? "sheet-ink-" + f.color : ""} ${f?.firstHalf ? "sheet-first-half" : ""}`}
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
                </tbody>
              </table>
              <div className="sheet-coach-fouls">
                {(["C", "B"] as const).map((target) => (
                  <div key={target}>
                    <span>
                      {target === "C"
                        ? `Técnico: ${staffNames?.[side].coach?.name ?? (d.staff[side].captainRosterEntryId ? name(d.staff[side].captainRosterEntryId!) : "Não informado")}`
                        : "Banco"}{" "}
                    </span>
                    {d.events
                      .filter((e) => e.side === side && e.target === target)
                      .map((e) => (
                        <span
                          key={e.id}
                          className={`sheet-foul-mark ${e.period % 2 === 1 && e.period <= 4 ? "sheet-ink-red" : "sheet-ink-blue"} ${e.period <= 2 ? "sheet-first-half" : ""}`}
                          title={periodLabel(e.period)}
                        >
                          {e.code.replace(/C$/u, "c")}
                        </span>
                      ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
