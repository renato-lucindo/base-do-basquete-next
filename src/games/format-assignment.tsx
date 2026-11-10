import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  competitionSetupViewSchema,
  competitionSetupResultSchema,
  type CompetitionSetupView,
  type SaveCompetitionSetup,
} from "../regulation/setup-contract";
import { SetupPicker } from "../regulation/setup-picker";

/** Optional organization follows a successful game save; it never rolls that game back. */
export function GameFormatAssignment(p: {
  disputeId: string;
  gameId: string;
  disabled: boolean;
  action: { current: () => Promise<string> };
  onDirty: (v: boolean) => void;
  onSessionLost: () => void;
}) {
  const [view, setView] = useState<CompetitionSetupView | null>(null),
    [target, setTarget] = useState(""),
    [slot, setSlot] = useState(1),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [retrying, setRetrying] = useState(false);
  const pending = useRef<SaveCompetitionSetup | null>(null),
    alive = useRef(true);
  const path = `/api/competition-setups/${p.disputeId}`;
  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    void api(path, competitionSetupViewSchema, undefined, controller.signal)
      .then((v) => {
        if (controller.signal.aborted) return;
        setView(v);
        const a = v.document.assignments.find((a) => a.gameId === p.gameId);
        setTarget(
          a?.kind === "group"
            ? `g:${a.groupId}`
            : a?.kind === "series"
              ? `s:${a.seriesId}`
              : a?.kind === "unassigned"
                ? "none"
                : "",
        );
        setSlot(a?.kind === "series" ? a.slot : 1);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (isSessionFailure(e)) p.onSessionLost();
        setError(
          "A organização está indisponível. Você pode salvar o jogo normalmente.",
        );
      });
    return () => {
      alive.current = false;
      controller.abort();
      p.action.current = async () => "";
      p.onDirty(false);
    };
  }, [path, p.gameId]);
  useEffect(() => {
    p.onDirty(dirty);
    p.action.current = save;
  });
  async function save() {
    if (!dirty) return "";
    try {
      if (!pending.current) {
        const v = await api(path, competitionSetupViewSchema),
          d = structuredClone(v.document);
        d.assignments = d.assignments.filter((a) => a.gameId !== p.gameId);
        if (target === "none")
          d.assignments.push({ kind: "unassigned", gameId: p.gameId });
        else if (target.startsWith("g:"))
          d.assignments.push({
            kind: "group",
            gameId: p.gameId,
            groupId: target.slice(2),
          });
        else if (target.startsWith("s:"))
          d.assignments.push({
            kind: "series",
            gameId: p.gameId,
            seriesId: target.slice(2),
            slot,
          });
        pending.current = {
          commandId: crypto.randomUUID(),
          disputeId: p.disputeId,
          expectedVersion: v.version,
          expectedContextFingerprint: v.contextFingerprint,
          document: d,
        };
      }
      const c = pending.current,
        r = await api(path, competitionSetupResultSchema, c);
      if (
        r.commandId !== c.commandId ||
        r.disputeId !== c.disputeId ||
        r.version !== c.expectedVersion + 1
      )
        throw new ApiFailure(503, "Associação sem confirmação.");
      pending.current = null;
      if (alive.current) {
        setDirty(false);
        setError("");
      }
      return "";
    } catch (e) {
      if (e instanceof ApiFailure && [400, 409, 413].includes(e.status))
        pending.current = null;
      if (isSessionFailure(e)) p.onSessionLost();
      const message =
        "Jogo salvo. A associação ao formato não foi confirmada; confira ou repita a associação.";
      if (alive.current) setError(message);
      return message;
    }
  }
  return (
    <details className="game-officiating">
      <summary>Grupo ou confronto · opcional</summary>
      <p>Os jogos podem ser lançados e finalizados sem esta associação.</p>
      {error && <p role="status">{error}</p>}
      {view && (
        <fieldset disabled={p.disabled || retrying || pending.current !== null}>
          <SetupPicker
            label="Associar ao formato"
            value={target}
            empty="Automático"
            options={[
              { value: "none", label: "Manter sem associação" },
              ...view.definition.groupPhases.flatMap((p) =>
                p.groups.map((g) => ({ value: `g:${g.id}`, label: g.name })),
              ),
              ...view.definition.series.map((s) => ({
                value: `s:${s.id}`,
                label: s.name,
              })),
            ]}
            onChange={(v) => {
              setTarget(v);
              setDirty(true);
            }}
          />
          {target.startsWith("s:") && (
            <label>
              Partida na série
              <select
                value={slot}
                onChange={(e) => {
                  setSlot(Number(e.target.value));
                  setDirty(true);
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
      )}
      {!!error && dirty && (
        <button
          type="button"
          disabled={p.disabled || retrying}
          onClick={() => {
            setRetrying(true);
            void save().finally(() => {
              if (alive.current) setRetrying(false);
            });
          }}
        >
          Repetir associação
        </button>
      )}
    </details>
  );
}
