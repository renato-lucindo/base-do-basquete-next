import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { gameSnapshotSchema } from "../games/contract";
import { prepareFinalSheet } from "./finalization";
import {
  publicationStateSchema,
  publicationSheetResultSchema,
  type PublicationState,
} from "./data-contract";
import type { PublishSheet } from "./contract";
import type { SheetPublicationProps } from "./sheet-panel";
import { PublicationHistory } from "./history";

type Ack = ReturnType<typeof publicationSheetResultSchema.parse>;
export function FinalizeSheetPanel(p: SheetPublicationProps) {
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [ack, setAck] = useState<Ack | null>(null),
    [error, setError] = useState(""),
    [choice, setChoice] = useState<PublicationState | null>(null),
    [manual, setManual] = useState(false);
  const pending = useRef<PublishSheet | null>(null),
    alert = useRef<HTMLParagraphElement>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      p.guard.current = () => true;
      p.onLock(false);
    };
  }, [p.guard, p.onLock]);
  useEffect(() => {
    p.onLock(busy || uncertain || ack !== null);
    p.guard.current = () =>
      !busy &&
      (!(uncertain || ack) ||
        window.confirm(
          "Há um envio sem confirmação. Deseja sair e conferir o resultado depois?",
        ));
  });
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  function report(e: unknown) {
    if (!alive.current) return;
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error ? e.message : "Não foi possível finalizar o jogo.",
    );
  }
  async function finish() {
    if (p.disabled || busy) return;
    setBusy(true);
    setError("");
    try {
      if (ack) {
        await p.onPublished(ack, true);
        if (alive.current) setAck(null);
        return;
      }
      if (!pending.current) {
        const [s, g] = await Promise.all([
          api(`/api/games/${p.game.id}/publication`, publicationStateSchema),
          api(`/api/games/${p.game.id}`, gameSnapshotSchema),
        ]);
        if (!alive.current) return;
        if (
          s.gameId !== p.game.id ||
          g.id !== p.game.id ||
          g.version !== p.gameVersion ||
          g.home.id !== p.game.home.id ||
          g.away.id !== p.game.away.id
        )
          throw new ApiFailure(
            409,
            "O jogo mudou. Recarregue a súmula para conferir.",
          );
        if (s.requiresFallback && (!manual || choice?.version !== s.version)) {
          setChoice(s);
          setManual(false);
          return;
        }
        pending.current = prepareFinalSheet({
          requestId: crypto.randomUUID(),
          gameId: p.game.id,
          gameVersion: p.gameVersion,
          basePublicationVersion: s.version,
          source: {
            kind: "sheet",
            baseSheetVersion: p.sourceVersion,
            document: structuredClone(p.document),
          },
          reason: p.reason,
          fallback: s.requiresFallback && manual,
        });
      }
      const c = pending.current;
      const r = await api(
        `/api/games/${p.game.id}/publication/finalize-sheet`,
        publicationSheetResultSchema,
        c,
      );
      if (
        r.gameId !== c.gameId ||
        r.requestId !== c.requestId ||
        r.version !== c.basePublicationVersion + 1 ||
        r.gameVersion !== c.gameVersion + 1 ||
        r.sourceVersion !== c.source.baseSheetVersion + 1
      )
        throw new ApiFailure(
          503,
          "Envio sem confirmação. Repita o mesmo envio.",
        );
      pending.current = null;
      if (!alive.current) return;
      setAck(r);
      setUncertain(false);
      await p.onPublished(r, false);
      if (alive.current) {
        setAck(null);
        setChoice(null);
      }
    } catch (e) {
      if (e instanceof ApiFailure && [400, 409, 413].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        if (e.status === 409) p.onConflict();
      } else if (pending.current) setUncertain(true);
      report(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section
      className="sheet-publication"
      aria-label="Finalizar jogo"
      aria-busy={busy}
    >
      <p>
        O resultado e a classificação são atualizados ao salvar a finalização.
      </p>
      {error && (
        <p role="alert" ref={alert} tabIndex={-1}>
          {error}
        </p>
      )}
      {choice && (
        <label>
          <input
            type="checkbox"
            checked={manual}
            disabled={busy || uncertain || !!ack}
            onChange={(e) => setManual(e.target.checked)}
          />{" "}
          Usar a súmula manual em vez do PDF deste jogo
        </label>
      )}
      <button
        disabled={
          p.disabled || busy || (!!choice && !manual && !uncertain && !ack)
        }
        onClick={() => void finish()}
      >
        {ack
          ? "Recuperar resultado salvo"
          : uncertain
            ? "Repetir finalização"
            : p.confirmed
              ? "Salvar correção e atualizar resultado"
              : "Finalizar jogo"}
      </button>
      {(p.confirmed || ack) && (
        <p>
          <a
            href={`/resultado.html#${p.game.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver resultado
          </a>
        </p>
      )}
      <details>
        <summary>Histórico do resultado</summary>
        <PublicationHistory
          gameId={p.game.id}
          enabled={!p.disabled && !busy}
          onSessionLost={p.onSessionLost}
        />
      </details>
    </section>
  );
}
