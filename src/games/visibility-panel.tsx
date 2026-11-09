import { useEffect, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import type { GameSnapshot } from "./contract";
import {
  gameVisibilityResultSchema,
  gameVisibilityStateSchema,
  saveGameVisibilitySchema,
  type GameVisibilityState,
} from "./visibility-contract";

export function GameVisibilityPanel(p: {
  game: GameSnapshot;
  enabled: boolean;
  onSaved: () => void;
  onSessionLost: () => void;
}) {
  const [state, setState] = useState<GameVisibilityState | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const path = `/api/games/${p.game.id}/visibility`;

  useEffect(() => {
    const controller = new AbortController();
    setState(null);
    setUncertain(false);
    setReason("");
    setError("");
    void api(path, gameVisibilityStateSchema, undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          if (
            result.gameId !== p.game.id ||
            result.disputeId !== p.game.disputeId
          )
            throw Error("O estado retornado não corresponde ao jogo.");
          setState(result);
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            e instanceof Error
              ? e.message
              : "Não foi possível consultar a publicação.",
          );
          if (isSessionFailure(e)) p.onSessionLost();
        }
      });
    return () => controller.abort();
  }, [path, p.game.id, p.game.disputeId]);

  async function save() {
    if (!state || !p.enabled || busy || uncertain || reason.trim().length < 3)
      return;
    const target = state.visibility === "published" ? "draft" : "published";
    if (
      !window.confirm(
        target === "draft"
          ? "Retirar este jogo do público e dos cálculos? A súmula e o resultado serão preservados."
          : "Publicar novamente este jogo e considerar seus resultados nas consultas aplicáveis?",
      )
    )
      return;
    const command = saveGameVisibilitySchema.parse({
      commandId: crypto.randomUUID(),
      gameId: p.game.id,
      expectedVersion: state.version,
      expectedGameVersion: state.gameVersion,
      expectedPublicationVersion: state.publicationVersion,
      visibility: target,
      reason,
    });
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api(path, gameVisibilityResultSchema, command);
      if (
        result.commandId !== command.commandId ||
        result.gameId !== p.game.id ||
        result.version !== state.version + 1 ||
        result.visibility !== target
      )
        throw Error("Não foi possível validar a confirmação do servidor.");
      const next = await api(path, gameVisibilityStateSchema);
      if (
        next.gameId !== p.game.id ||
        next.version !== result.version ||
        next.visibility !== result.visibility
      )
        throw Error(
          "A confirmação foi recebida, mas a leitura ainda não foi reconciliada.",
        );
      setState(next);
      setReason("");
      setNotice(
        target === "draft"
          ? "Jogo mantido como rascunho privado. Histórico e súmula preservados."
          : "Jogo publicado novamente.",
      );
      p.onSaved();
    } catch (e) {
      if (isSessionFailure(e)) p.onSessionLost();
      if (!(e instanceof ApiFailure && [400, 409].includes(e.status))) {
        setUncertain(true);
        setError(
          "Não foi possível confirmar o estado após o envio. Reabra o jogo para conferir antes de repetir.",
        );
      } else {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível atualizar a publicação.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="game-officiating" aria-label="Visibilidade do jogo">
      <h4>Publicação do jogo</h4>
      {!state ? (
        <p role="status">{error || "Consultando situação da publicação…"}</p>
      ) : (
        <>
          <p role="status">
            {state.visibility === "draft" ? "Rascunho privado" : "Publicado"}
            {state.publicationVersion > 0
              ? " · Resultado histórico preservado"
              : ""}
          </p>
          <p>
            O rascunho permanece salvo com sua súmula e resultados, mas não
            aparece no catálogo público nem participa dos cálculos enquanto
            estiver privado.
          </p>
          <label>
            Motivo da alteração
            <textarea
              value={reason}
              rows={2}
              minLength={3}
              maxLength={2000}
              disabled={!p.enabled || busy || uncertain}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: Semifinal cadastrada antes de terminar a fase classificatória"
            />
          </label>
          <button
            type="button"
            disabled={
              !p.enabled || busy || uncertain || reason.trim().length < 3
            }
            onClick={() => void save()}
          >
            {busy
              ? "Salvando…"
              : state.visibility === "draft"
                ? "Publicar jogo"
                : "Mover para rascunho"}
          </button>
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
        </>
      )}
    </section>
  );
}
