import { useId, useRef, useState } from "react";
import { AdminDialog } from "./admin-dialog";
import { api, ApiFailure, isSessionFailure } from "./api";
import {
  disputeAdministrationSchema,
  disputeStatusLabels,
  type DisputeAdministration,
  type DisputeAdministrationCommand,
} from "./administration-contract";

type Action = DisputeAdministrationCommand["action"];
export function DisputeControls({
  state,
  disabled,
  onSaved,
  onReload,
  onSessionLost,
}: {
  state: DisputeAdministration;
  disabled: boolean;
  onSaved: (state: DisputeAdministration) => void;
  onReload: () => void;
  onSessionLost: () => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<DisputeAdministrationCommand | null>(null);
  const reasonId = useId();
  const closed = state.status === "completed" || state.status === "cancelled";
  const publicDispute = state.visibility === "public";
  const visibility = publicDispute ? "private" : "public";
  const labels = {
    complete: "Concluir disputa",
    cancel: "Cancelar disputa",
    reopen: "Reabrir disputa",
    set_visibility: publicDispute ? "Tornar privada" : "Tornar pública",
  };
  const messages = {
    complete:
      "Inscrições, jogos e demais alterações esportivas ficarão bloqueados até a reabertura.",
    cancel:
      "Os resultados confirmados serão preservados. Jogos pendentes sairão da agenda pública.",
    reopen:
      "A disputa voltará à situação anterior e aceitará alterações esportivas.",
    set_visibility: publicDispute
      ? "O público perderá acesso à disputa e a seus dados, inclusive por links diretos."
      : "A disputa aparecerá no catálogo e na busca. Conteúdo elegível ficará disponível.",
  };
  const requiredReason = action === "cancel" || action === "reopen";
  const open = (next: Action) => {
    setError("");
    setReason("");
    request.current = null;
    setAction(next);
  };
  async function confirm() {
    if (!action || busy || (requiredReason && reason.trim().length < 3)) return;
    const currentReason = reason.trim() || null;
    if (
      !request.current ||
      request.current.reason !== currentReason ||
      request.current.expectedVersion !== state.version
    ) {
      request.current = {
        commandId: crypto.randomUUID(),
        disputeId: state.disputeId,
        expectedVersion: state.version,
        action,
        visibility: action === "set_visibility" ? visibility : null,
        reason: currentReason,
      };
    }
    setBusy(true);
    setError("");
    try {
      const saved = await api(
        "/api/competition-administration/dispute",
        disputeAdministrationSchema,
        request.current,
      );
      onSaved(saved);
      setAction(null);
    } catch (failure) {
      if (isSessionFailure(failure)) onSessionLost();
      setError(
        failure instanceof ApiFailure
          ? failure.message
          : "Não foi possível confirmar. Tente novamente.",
      );
      if (failure instanceof ApiFailure && failure.code === "version_conflict")
        onReload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="competition-actions">
        <span>
          {disputeStatusLabels[state.status]} ·{" "}
          {state.isTest
            ? "Teste · Privada"
            : publicDispute
              ? "Pública"
              : "Privada"}
        </span>
        {!state.isTest ? (
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            onClick={() => open("set_visibility")}
          >
            {labels.set_visibility}
          </button>
        ) : (
          <a
            href={"/publico.html?previa=" + state.disputeId}
            target="_blank"
            rel="noopener"
          >
            Abrir prévia
          </a>
        )}
        {state.status === "in_progress" && (
          <button
            type="button"
            className="secondary"
            disabled={disabled}
            onClick={() => open("complete")}
          >
            {labels.complete}
          </button>
        )}
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          onClick={() => open(closed ? "reopen" : "cancel")}
        >
          {closed ? labels.reopen : labels.cancel}
        </button>
      </div>
      {action && (
        <AdminDialog
          open
          title={labels[action]}
          busy={busy}
          onClose={() => setAction(null)}
          footer={
            <button
              type="button"
              className="primary"
              disabled={busy || (requiredReason && reason.trim().length < 3)}
              onClick={() => void confirm()}
            >
              {busy ? "Salvando…" : labels[action]}
            </button>
          }
        >
          <p>{messages[action]}</p>
          {requiredReason && (
            <label htmlFor={reasonId}>
              Motivo
              <textarea
                id={reasonId}
                name="reason"
                autoComplete="off"
                required
                minLength={3}
                maxLength={2000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={busy}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </AdminDialog>
      )}
    </>
  );
}
