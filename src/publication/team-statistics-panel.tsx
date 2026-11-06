import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  publicationStateSchema,
  publicationVersionSchema,
  type PublicationVersion,
} from "./data-contract";
import { persistedSheetSchema } from "../games/sheet-contract";
import { deriveSheetTeamStatistics } from "./sheet-team-statistics";
import {
  CollectiveReview,
  gdReviewReady,
  initialGDReview,
  publishedGD,
  type GDReview,
} from "./collective-review";
import {
  reviseTeamStatisticsSchema,
  teamStatisticsRevisionAckSchema,
  type ReviseTeamStatistics,
} from "./team-statistics-contract";
type Props = {
  gameId: string;
  disabled: boolean;
  onLock: (v: boolean) => void;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onUpdated: () => void;
};
export function TeamStatisticsPanel(p: Props) {
  const [version, setVersion] = useState<PublicationVersion | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [reason, setReason] = useState("");
  const [review, setReview] = useState<GDReview>({
    home: { total: "", confirmed: false },
    away: { total: "", confirmed: false },
  });
  const pending = useRef<ReviseTeamStatistics | null>(null),
    controller = useRef<AbortController | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null);
  const document =
    version?.sourceKind === "sheet"
      ? persistedSheetSchema.parse(version.document)
      : null;
  const facts = document ? deriveSheetTeamStatistics(document) : null;
  useEffect(() => {
    p.onLock(busy || uncertain);
  }, [busy, uncertain, p.onLock]);
  useEffect(() => {
    p.guard.current = () =>
      !busy &&
      (!(uncertain || dirty) ||
        window.confirm(
          uncertain
            ? "Há uma revisão sem resposta confirmada. Deseja sair e conferir depois?"
            : "Há uma conferência não publicada. Deseja descartar as alterações e sair?",
        ));
  }, [busy, uncertain, dirty, p.guard]);
  useEffect(() => {
    if (!dirty && !uncertain && !busy) return;
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty, uncertain, busy]);
  useEffect(
    () => () => {
      controller.current?.abort();
      p.guard.current = () => true;
      p.onLock(false);
    },
    [p.guard, p.onLock],
  );
  useEffect(() => {
    if (error) alert.current?.focus();
    else if (version) heading.current?.focus();
  }, [error, version]);
  function report(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error ? e.message : "Não foi possível concluir a revisão.",
    );
  }
  async function prepare() {
    if (p.disabled || busy || uncertain) return;
    if (
      dirty &&
      !window.confirm(
        "Descartar a conferência ainda não publicada e recarregar?",
      )
    )
      return;
    setDirty(false);
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setError("");
    setSuccess("");
    setVersion(null);
    setReason("");
    try {
      const state = await api(
        `/api/games/${p.gameId}/publication`,
        publicationStateSchema,
        undefined,
        c.signal,
      );
      if (
        state.gameId !== p.gameId ||
        !state.published ||
        state.published.source.kind !== "sheet"
      )
        throw Error("Esta revisão exige uma súmula já publicada.");
      const v = await api(
        `/api/games/${p.gameId}/publication/versions/${state.version}`,
        publicationVersionSchema,
        undefined,
        c.signal,
      );
      if (
        v.gameId !== p.gameId ||
        v.version !== state.version ||
        v.sourceKind !== "sheet" ||
        JSON.stringify(v.snapshot) !== JSON.stringify(state.published)
      )
        throw Error("A publicação mudou. Recarregue a conferência.");
      const f = deriveSheetTeamStatistics(
        persistedSheetSchema.parse(v.document),
      );
      if (c.signal.aborted) return;
      setReview(initialGDReview(f, publishedGD(v.snapshot)));
      setVersion(v);
    } catch (e) {
      if (!c.signal.aborted) report(e);
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }
  async function publish() {
    if (p.disabled || busy || !version || !facts) return;
    if (
      !pending.current &&
      (!gdReviewReady(review, facts) || reason.trim().length < 10)
    )
      return;
    const command =
      pending.current ??
      reviseTeamStatisticsSchema.parse({
        requestId: crypto.randomUUID(),
        gameId: p.gameId,
        basePublicationVersion: version.version,
        disqualifications: {
          home: Number(review.home.total),
          away: Number(review.away.total),
        },
        reason,
      });
    pending.current = command;
    setBusy(true);
    setError("");
    try {
      const r = await api(
        `/api/games/${p.gameId}/publication/team-statistics`,
        teamStatisticsRevisionAckSchema,
        command,
      );
      if (
        r.requestId !== command.requestId ||
        r.gameId !== command.gameId ||
        r.version !== command.basePublicationVersion + 1 ||
        r.sourceVersion !== version.sourceVersion
      )
        throw new ApiFailure(
          503,
          "Não foi possível confirmar a revisão. Repita o mesmo envio.",
        );
      pending.current = null;
      setUncertain(false);
      setVersion(null);
      setDirty(false);
      setSuccess(
        `Estatísticas publicadas na versão ${r.version}. A súmula atual foi preservada.`,
      );
      p.onUpdated();
    } catch (e) {
      if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        if (e.status === 409) setVersion(null);
      } else setUncertain(true);
      report(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="team-statistics-review"
      aria-label="Revisão das estatísticas publicadas"
      aria-busy={busy}
    >
      <button
        type="button"
        disabled={p.disabled || busy || uncertain}
        onClick={() => void prepare()}
      >
        Conferir estatísticas publicadas
      </button>
      {error && (
        <p ref={alert} role="alert" tabIndex={-1}>
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      {version && facts && (
        <>
          <h4 tabIndex={-1} ref={heading}>
            Conferir estatísticas da versão {version.version}
          </h4>
          <p>
            Esta revisão usa a súmula publicada e preserva as alterações da
            súmula atual.
          </p>
          <CollectiveReview
            facts={facts}
            review={review}
            onChange={(v) => {
              setReview(v);
              setDirty(true);
            }}
            disabled={busy || uncertain || p.disabled}
            names={{
              home: version.snapshot.game.home.name,
              away: version.snapshot.game.away.name,
            }}
          />
          <label>
            Motivo da revisão das estatísticas publicadas
            <textarea
              name="team-statistics-revision-reason"
              autoComplete="off"
              maxLength={500}
              minLength={10}
              value={reason}
              disabled={busy || uncertain || p.disabled}
              onChange={(e) => {
                setReason(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <button
            type="button"
            disabled={
              p.disabled ||
              busy ||
              (!uncertain &&
                (!gdReviewReady(review, facts) || reason.trim().length < 10))
            }
            onClick={() => void publish()}
          >
            {uncertain ? "Repetir revisão" : "Publicar estatísticas conferidas"}
          </button>
          {!busy && !uncertain && (
            <button
              type="button"
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Descartar a conferência ainda não publicada?")
                ) {
                  setVersion(null);
                  setDirty(false);
                }
              }}
            >
              Cancelar conferência
            </button>
          )}
        </>
      )}
    </section>
  );
}
