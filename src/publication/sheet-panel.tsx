import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { z } from "zod";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { gameSnapshotSchema, type GameSnapshot } from "../games/contract";
import {
  validatePersistedSheet,
  persistedSheetSchema,
  type PersistedSheet,
} from "../games/sheet-contract";
import { prepareManualPublication } from "./manual";
import type { PublishSheet } from "./contract";
import { deriveSheetTeamStatistics } from "./sheet-team-statistics";
import {
  gdReviewReady,
  initialGDReview,
  publishedGD,
} from "./collective-review";
import {
  publicationStateSchema,
  publicationVersionSchema,
  publicationSheetResultSchema,
  type PublicationState,
} from "./data-contract";
type Ack = z.infer<typeof publicationSheetResultSchema>;
export type SheetPublicationProps = {
  game: GameSnapshot;
  document: PersistedSheet;
  sourceVersion: number;
  gameVersion: number;
  confirmed: boolean;
  alreadyPublished: boolean;
  draftAction: ReactNode;
  onAcknowledged: () => void;
  reason: string;
  onReason: (v: string) => void;
  disabled: boolean;
  guard: { current: () => boolean };
  onLock: (v: boolean) => void;
  onConflict: () => void;
  onSessionLost: () => void;
  onPublished: (r: Ack, explicitReload: boolean) => Promise<void>;
};
export function SheetPublicationPanel(p: SheetPublicationProps) {
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [ack, setAck] = useState<Ack | null>(null),
    [choice, setChoice] = useState<PublicationState | null>(null),
    [fallback, setFallback] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<PublishSheet | null>(null),
    alert = useRef<HTMLParagraphElement>(null),
    sourceChoice = useRef<HTMLInputElement>(null),
    epoch = useRef(0);
  const blocked = busy || uncertain || ack !== null;
  const revision = p.confirmed || p.alreadyPublished;
  const reasonError = "Informe o motivo da revisão (10 a 500 caracteres).";
  const reasonLabelId = useId();
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
    else if (choice?.requiresFallback) sourceChoice.current?.focus();
  }, [error, choice]);
  function report(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível concluir a publicação.",
    );
  }
  async function buildCommand(n: number) {
    if (revision && p.reason.trim().length < 10) {
      setError(reasonError);
      return;
    }
    try {
      validatePersistedSheet(p.document, true);
    } catch {
      setError(
        "Confira cinco titulares, um capitão por equipe e o fechamento da súmula antes de publicar.",
      );
      return;
    }
    const [state, game] = await Promise.all([
      api(`/api/games/${p.game.id}/publication`, publicationStateSchema),
      api(`/api/games/${p.game.id}`, gameSnapshotSchema),
    ]);
    if (n !== epoch.current) return;
    if (
      state.gameId !== p.game.id ||
      game.id !== p.game.id ||
      game.version !== p.gameVersion ||
      game.home.id !== p.game.home.id ||
      game.away.id !== p.game.away.id
    )
      throw new ApiFailure(
        409,
        "O jogo mudou. Recarregue a súmula antes de publicar.",
      );

    if (
      state.requiresFallback &&
      (!fallback || choice?.version !== state.version)
    ) {
      setChoice(state);
      setFallback(false);
      return;
    }
    if (
      (state.version > 0 || state.requiresFallback) &&
      p.reason.trim().length < 10
    ) {
      setChoice(state);
      setError(
        state.requiresFallback && !revision
          ? "Informe o motivo da publicação (10 a 500 caracteres)."
          : reasonError,
      );
      return;
    }

    let previous: ReturnType<typeof publishedGD> | undefined;
    if (
      state.published?.source.kind === "sheet" &&
      state.published.source.version === p.sourceVersion
    ) {
      const frozen = await api(
        `/api/games/${p.game.id}/publication/versions/${state.version}`,
        publicationVersionSchema,
      );
      if (n !== epoch.current) return;
      if (
        frozen.gameId !== p.game.id ||
        frozen.version !== state.version ||
        frozen.sourceKind !== "sheet" ||
        frozen.sourceVersion !== p.sourceVersion ||
        JSON.stringify(frozen.snapshot) !== JSON.stringify(state.published)
      )
        throw new ApiFailure(
          409,
          "A publicação mudou. Recarregue a súmula antes de publicar.",
        );
      if (
        JSON.stringify(persistedSheetSchema.parse(frozen.document)) ===
        JSON.stringify(persistedSheetSchema.parse(p.document))
      )
        previous = publishedGD(state.published);
    }
    const collective = deriveSheetTeamStatistics(p.document);
    const teamReview = initialGDReview(collective, previous);
    if (!gdReviewReady(teamReview, collective))
      throw Error("Não foi possível calcular os totais coletivos da súmula.");

    return prepareManualPublication(
      {
        requestId: crypto.randomUUID(),
        gameId: p.game.id,
        gameVersion: p.gameVersion,
        basePublicationVersion: state.version,
        source: {
          kind: "sheet",
          baseSheetVersion: p.sourceVersion,
          document: structuredClone(p.document),
          teamReview: {
            home: {
              disqualifications: Number(teamReview.home.total),
              foulsReceived: collective.home.foulsReceived,
            },
            away: {
              disqualifications: Number(teamReview.away.total),
              foulsReceived: collective.away.foulsReceived,
            },
          },
        },
        reason: p.reason,
        fallback: state.requiresFallback && fallback,
      },
      undefined,
      state.requiresFallback,
    ).command;
  }
  async function finish(r: Ack, explicit = false) {
    await p.onPublished(r, explicit);
    setAck(null);
    setUncertain(false);
    setChoice(null);
    setFallback(false);
  }
  async function publish() {
    if (p.disabled || busy || ack) return;
    const n = ++epoch.current;
    let acknowledged = false;
    setError("");
    setBusy(true);
    try {
      const command = pending.current ?? (await buildCommand(n));
      if (!command || n !== epoch.current) return;
      pending.current = command;
      const r = await api(
        `/api/games/${p.game.id}/publication/sheet`,
        publicationSheetResultSchema,
        command,
      );
      if (n !== epoch.current) return;
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
      acknowledged = true;
      setAck(r);
      p.onAcknowledged();
      pending.current = null;
      setUncertain(false);
      await finish(r);
    } catch (e) {
      if (n !== epoch.current) return;
      if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        if (e.status === 409 && !acknowledged) p.onConflict();
      } else if (pending.current) {
        setUncertain(true);
      }
      report(e);
    } finally {
      if (n === epoch.current) setBusy(false);
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
  return (
    <section
      aria-label="Publicação deste jogo"
      className="sheet-publication"
      aria-busy={busy}
    >
      {choice?.requiresFallback && (
        <label>
          <input
            ref={sourceChoice}
            type="checkbox"
            checked={fallback}
            disabled={blocked || p.disabled}
            onChange={(e) => setFallback(e.target.checked)}
          />{" "}
          Usar súmula manual em vez do PDF
        </label>
      )}
      {choice && !revision && (
        <label className="sheet-save-reason">
          <span id={reasonLabelId}>Motivo da publicação</span>
          <textarea
            aria-labelledby={reasonLabelId}
            maxLength={500}
            value={p.reason}
            disabled={blocked || p.disabled}
            onChange={(e) => p.onReason(e.target.value)}
          />
        </label>
      )}
      <div className="competition-actions sheet-save-commands">
        {p.draftAction}
        <button
          type="button"
          className="primary"
          disabled={
            p.disabled ||
            busy ||
            (!uncertain && !ack && !!choice?.requiresFallback && !fallback)
          }
          onClick={() => void (ack ? recover() : publish())}
        >
          {ack
            ? "Recarregar súmula publicada"
            : uncertain
              ? "Repetir publicação"
              : revision
                ? "Salvar e republicar"
                : "Salvar e publicar"}
        </button>
      </div>
      {error && (
        <p role="alert" ref={alert} tabIndex={-1}>
          {error}
        </p>
      )}
    </section>
  );
}
