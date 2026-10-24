import { aggregate } from "../domain/scoresheet";
import { PublicationHistory } from "./history";
import { toEngineSheet } from "../games/sheet-contract";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { gameSnapshotSchema, type GameSnapshot } from "../games/contract";
import {
  validatePersistedSheet,
  type PersistedSheet,
} from "../games/sheet-contract";
import { prepareManualPublication } from "./manual";
import type { PublishSheet } from "./contract";
import {
  publicationStateSchema,
  publicationSheetResultSchema,
  type PublicationState,
} from "./data-contract";
type Ack = z.infer<typeof publicationSheetResultSchema>;
type Props = {
  game: GameSnapshot;
  document: PersistedSheet;
  sourceVersion: number;
  gameVersion: number;
  confirmed: boolean;
  reason: string;
  onReason: (v: string) => void;
  disabled: boolean;
  guard: { current: () => boolean };
  onLock: (v: boolean) => void;
  onConflict: () => void;
  onSessionLost: () => void;
  onPublished: (r: Ack, explicitReload: boolean) => Promise<void>;
};
export function SheetPublicationPanel(p: Props) {
  const [state, setState] = useState<PublicationState | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [ack, setAck] = useState<Ack | null>(null),
    [fallback, setFallback] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<PublishSheet | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    epoch = useRef(0);
  const blocked = busy || uncertain || ack !== null;
  const totals = aggregate(toEngineSheet(p.document));
  useEffect(() => {
    p.onLock(blocked);
  }, [blocked, p.onLock]);
  useEffect(() => {
    p.guard.current = () =>
      !busy &&
      (!(uncertain || ack) ||
        window.confirm(
          "Há uma publicação sem reconciliação concluída. Deseja sair e conferir depois?",
        ));
  }, [p.guard, busy, uncertain, ack]);
  useEffect(
    () => () => {
      epoch.current++;
      p.guard.current = () => true;
      p.onLock(false);
    },
    [p.guard, p.onLock],
  );
  useEffect(() => {
    if (error) alert.current?.focus();
    else if (state) heading.current?.focus();
  }, [error, state]);
  function report(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível concluir a publicação.",
    );
  }
  async function prepare() {
    if (p.disabled || blocked) return;
    setError("");
    try {
      validatePersistedSheet(p.document, true);
    } catch {
      setError(
        "Confira cinco titulares, um capitão por equipe e o fechamento da súmula antes de publicar.",
      );
      return;
    }
    const n = ++epoch.current;
    setBusy(true);
    try {
      const [s, g] = await Promise.all([
        api(`/api/games/${p.game.id}/publication`, publicationStateSchema),
        api(`/api/games/${p.game.id}`, gameSnapshotSchema),
      ]);
      if (n !== epoch.current) return;
      if (
        s.gameId !== p.game.id ||
        g.id !== p.game.id ||
        g.version !== p.gameVersion ||
        g.home.id !== p.game.home.id ||
        g.away.id !== p.game.away.id
      )
        throw new ApiFailure(
          409,
          "O jogo mudou. Recarregue a súmula antes de publicar.",
        );
      setState(s);
      setFallback(false);
    } catch (e) {
      if (n === epoch.current) {
        if (e instanceof ApiFailure && e.status === 409) p.onConflict();
        report(e);
      }
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  }
  async function finish(r: Ack, explicit = false) {
    await p.onPublished(r, explicit);
    setAck(null);
    pending.current = null;
    setUncertain(false);
    setState(null);
  }
  async function publish() {
    if (p.disabled || busy || !state || ack) return;
    setError("");
    let command = pending.current;
    if (!command) {
      try {
        command = prepareManualPublication(
          {
            requestId: crypto.randomUUID(),
            gameId: p.game.id,
            gameVersion: p.gameVersion,
            basePublicationVersion: state.version,
            source: {
              kind: "sheet",
              baseSheetVersion: p.sourceVersion,
              document: structuredClone(p.document),
            },
            reason: p.reason,
            fallback,
          },
          undefined,
          state.requiresFallback,
        ).command;
      } catch {
        setError(
          "Confira o fechamento, a decisão de fonte e o motivo da publicação.",
        );
        return;
      }
    }
    pending.current = command;
    setBusy(true);
    try {
      const r = await api(
        `/api/games/${p.game.id}/publication/sheet`,
        publicationSheetResultSchema,
        command,
      );
      if (
        r.requestId !== command.requestId ||
        r.gameId !== command.gameId ||
        r.version !== command.basePublicationVersion + 1 ||
        r.gameVersion !== command.gameVersion + 1 ||
        r.sourceVersion !== command.source.baseSheetVersion + 1
      )
        throw new ApiFailure(
          503,
          "Não foi possível confirmar a publicação. Repita o mesmo envio.",
        );
      setAck(r);
      pending.current = null;
      setUncertain(false);
      await finish(r);
    } catch (e) {
      if (!pending.current) {
        report(e);
      } else if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        if (e.status === 409) p.onConflict();
        report(e);
      } else {
        setUncertain(true);
        report(e);
      }
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!ack || busy || p.disabled) return;
    setBusy(true);
    setError("");
    try {
      await finish(ack, true);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const needsReason =
      !!state && (p.confirmed || state.version > 0 || state.requiresFallback),
    ready =
      !!state &&
      (!state.requiresFallback || fallback) &&
      (!needsReason || p.reason.trim().length >= 10);
  return (
    <section
      aria-label="Publicação deste jogo"
      className="sheet-publication"
      aria-busy={busy}
    >
      <button disabled={p.disabled || blocked} onClick={() => void prepare()}>
        {p.confirmed ? "Salvar e republicar" : "Confirmar e publicar"}
      </button>
      {error && (
        <p role="alert" ref={alert} tabIndex={-1}>
          {error}
        </p>
      )}
      {state && (
        <>
          <h4 ref={heading} tabIndex={-1}>
            Conferir publicação deste jogo
          </h4>
          <p aria-label="Placar a publicar">
            {p.game.home.name} {totals.teams.home.points} ×{" "}
            {totals.teams.away.points} {p.game.away.name}
          </p>
          <p>
            {state.version
              ? `Versão pública atual: ${state.version}.`
              : "Este jogo ainda não foi publicado."}{" "}
            Confira o resultado, os cinco titulares e o capitão de cada equipe.
          </p>
          {state.requiresFallback && (
            <label>
              <input
                type="checkbox"
                checked={fallback}
                disabled={blocked || p.disabled}
                onChange={(e) => setFallback(e.target.checked)}
              />{" "}
              Usar súmula manual em vez do PDF
            </label>
          )}
          {!p.confirmed && needsReason && (
            <label>
              Motivo da publicação
              <textarea
                maxLength={500}
                value={p.reason}
                disabled={blocked || p.disabled}
                onChange={(e) => p.onReason(e.target.value)}
              />
            </label>
          )}
          {needsReason && (
            <p>Informe o motivo (10 a 500 caracteres) antes de publicar.</p>
          )}
          {ack ? (
            <>
              <p>Publicação confirmada. Falta recarregar a fonte salva.</p>
              <button
                disabled={busy || p.disabled}
                onClick={() => void recover()}
              >
                Recarregar súmula publicada
              </button>
            </>
          ) : (
            <button
              disabled={busy || p.disabled || (!uncertain && !ready)}
              onClick={() => void publish()}
            >
              {uncertain
                ? "Repetir publicação"
                : state.version
                  ? "Republicar este jogo"
                  : "Publicar este jogo"}
            </button>
          )}
          {!blocked && (
            <button disabled={p.disabled} onClick={() => void prepare()}>
              Recarregar estado da publicação
            </button>
          )}
        </>
      )}
      {(p.confirmed || state?.published || ack) && (
        <p>
          <a
            href={`/resultado.html#${p.game.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver resultado publicado
          </a>
        </p>
      )}
      <PublicationHistory
        gameId={p.game.id}
        enabled={!p.disabled && !busy}
        onSessionLost={p.onSessionLost}
      />
    </section>
  );
}
