import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { saveResultSchema } from "../competition/contract";
import { saveGameSchema, type SaveGame } from "../games/contract";
import type { CompetitionSetup } from "./format";
import {
  competitionSetupViewSchema,
  type CompetitionSetupView,
} from "./setup-contract";
import { generateRegularSchedule } from "./regular-schedule";
import "./regular-schedule.css";

type Row = { command: SaveGame; groupIndex: number; saved: boolean };
type Props = {
  setup: CompetitionSetup;
  view: CompetitionSetupView;
  dirty: boolean;
  disabled: boolean;
  guard: { current: () => boolean };
  onLock: (value: boolean) => void;
  onSessionLost: () => void;
  onSaved: () => Promise<void>;
};
export function RegularScheduleEditor(props: Props) {
  const { view, setup } = props;
  const [enabled, setEnabled] = useState(false),
    [count, setCount] = useState(String(view.registrations.length)),
    [rows, setRows] = useState<Row[]>([]),
    [sourceKey, setSourceKey] = useState(""),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const alive = useRef(true),
    sending = useRef(false),
    alert = useRef<HTMLParagraphElement>(null),
    pending = useRef<SaveGame | null>(null),
    names = new Map(view.registrations.map((r) => [r.id, r.name])),
    key = JSON.stringify([
      setup.mode,
      setup.groupCount,
      setup.turns,
      setup.memberships,
      view.registrations.map((r) => r.id),
      count,
    ]),
    stale = !!rows.length && key !== sourceKey,
    unsaved = rows.some((r) => !r.saved),
    savedCount = rows.filter((r) => r.saved).length,
    locked = busy || uncertain || props.disabled;
  function mayLeave() {
    return (
      !busy &&
      (!unsaved ||
        window.confirm(
          "Há confrontos não salvos ou um envio não confirmado. Deseja descartá-los e sair?",
        ))
    );
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    props.guard.current = mayLeave;
    props.onLock(busy || uncertain);
    return () => {
      props.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  function generate() {
    if (locked || (unsaved && !mayLeave())) return;
    setError("");
    setStatus("");
    try {
      const games = [
        ...new Map(
          [
            ...view.games,
            ...rows.filter((r) => r.saved).map((r) => r.command.game),
          ].map((g) => [g.id, g]),
        ).values(),
      ];
      const pairings = generateRegularSchedule({
        setup,
        registrationIds: view.registrations.map((r) => r.id),
        teamCount: count.trim() ? Number(count) : NaN,
        games,
      });
      setRows(
        pairings.map((p) => ({
          saved: false,
          groupIndex: p.groupIndex,
          command: {
            commandId: crypto.randomUUID(),
            expectedVersion: 0,
            game: {
              id: crypto.randomUUID(),
              disputeId: view.disputeId,
              homeRegistrationId: p.homeRegistrationId,
              awayRegistrationId: p.awayRegistrationId,
              stageKind: "round_robin",
              round: p.round,
              knockoutStage: null,
              number: null,
              date: null,
              time: null,
              venue: null,
            },
          },
        })),
      );
      setSourceKey(key);
      setPage(0);
      if (!pairings.length)
        setStatus("Todos os confrontos deste formato já estão cadastrados.");
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  async function save() {
    if (
      sending.current ||
      props.disabled ||
      (!uncertain && (props.dirty || stale))
    )
      return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      if (!pending.current && savedCount === 0) {
        const fresh = await api(
          `/api/competition-setups/${view.disputeId}`,
          competitionSetupViewSchema,
        );
        if (
          fresh.version !== view.version ||
          fresh.contextFingerprint !== view.contextFingerprint
        )
          throw new ApiFailure(
            409,
            "O formato ou os jogos mudaram. Recarregue os dados antes de gerar novamente.",
          );
      }
      for (const row of rows) {
        if (row.saved) continue;
        pending.current ??= saveGameSchema.parse(row.command);
        const command = pending.current;
        setUncertain(true);
        const result = await api("/api/games", saveResultSchema, command);
        if (result.id !== command.game.id || result.version !== 1)
          throw new ApiFailure(
            503,
            "Não foi possível conferir o envio. Repita o mesmo comando.",
          );
        pending.current = null;
        if (!alive.current) return;
        setUncertain(false);
        setRows((current) =>
          current.map((r) =>
            r.command.game.id === command.game.id ? { ...r, saved: true } : r,
          ),
        );
      }
      if (alive.current) {
        setStatus(`${rows.length} confrontos salvos`);
        await props.onSaved();
      }
    } catch (failure) {
      if (!alive.current) return;
      if (
        failure instanceof ApiFailure &&
        [400, 403, 409, 413].includes(failure.status)
      ) {
        pending.current = null;
        setUncertain(false);
      }
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar os confrontos.",
      );
      if (isSessionFailure(failure)) props.onSessionLost();
    } finally {
      sending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <div className="regular-schedule">
      <label className="regular-schedule-toggle">
        <input
          type="checkbox"
          checked={enabled}
          disabled={locked}
          onChange={(e) => {
            if (!e.target.checked && !mayLeave()) return;
            setEnabled(e.target.checked);
            if (!e.target.checked) {
              setRows([]);
              setError("");
              setStatus("");
            }
          }}
        />
        Gerar confrontos da fase regular automaticamente
      </label>
      {enabled && (
        <>
          <div className="regular-schedule-controls">
            <label className="setup-field">
              Quantidade de equipes
              <input
                type="number"
                name="scheduleTeamCount"
                autoComplete="off"
                value={count}
                disabled={locked}
                onChange={(e) => {
                  setCount(e.target.value);
                  setError("");
                }}
              />
            </label>
            <button type="button" disabled={locked} onClick={generate}>
              Gerar confrontos
            </button>
          </div>
          {error && (
            <p role="alert" ref={alert} tabIndex={-1} className="setup-error">
              {error}
            </p>
          )}
          {rows.length > 0 && (
            <section aria-label="Confrontos gerados">
              {stale && (
                <p className="setup-hint">
                  O formato mudou. Gere novamente para atualizar os confrontos.
                </p>
              )}
              <div
                className="regular-schedule-list"
                role="region"
                aria-label="Tabela de confrontos"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Rodada</th>
                      <th scope="col">Mandante</th>
                      <th scope="col">Visitante</th>
                      <th scope="col">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(page * 20, page * 20 + 20).map((row) => (
                      <tr key={row.command.game.id}>
                        <td>
                          {row.command.game.round}
                          {setup.groupCount > 1 && (
                            <span>
                              {setup.groupNames[row.groupIndex] ??
                                `Grupo ${row.groupIndex + 1}`}
                            </span>
                          )}
                        </td>
                        <td>
                          {names.get(row.command.game.homeRegistrationId)}
                        </td>
                        <td>
                          {names.get(row.command.game.awayRegistrationId)}
                        </td>
                        <td>{row.saved ? "Salvo" : "Não salvo"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 20 && (
                <nav
                  className="regular-schedule-pages"
                  aria-label="Páginas dos confrontos"
                >
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Anteriores
                  </button>
                  <span>
                    {page + 1} de {Math.ceil(rows.length / 20)}
                  </span>
                  <button
                    type="button"
                    disabled={(page + 1) * 20 >= rows.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Próximos
                  </button>
                </nav>
              )}
              {props.dirty && (
                <p className="setup-hint">
                  Salve o formato para cadastrar os confrontos.
                </p>
              )}
              <div className="regular-schedule-footer">
                <p role="status">
                  {busy
                    ? "Salvando confrontos…"
                    : status ||
                      `${savedCount} de ${rows.length} confrontos salvos`}
                </p>
                {unsaved && (
                  <button
                    type="button"
                    className="primary"
                    disabled={
                      busy ||
                      props.disabled ||
                      (!uncertain && (props.dirty || stale))
                    }
                    onClick={() => void save()}
                  >
                    {uncertain
                      ? "Repetir envio dos confrontos"
                      : "Salvar confrontos"}
                  </button>
                )}
              </div>
            </section>
          )}
          {!rows.length && status && <p role="status">{status}</p>}
        </>
      )}
    </div>
  );
}
