import { useEffect, useRef, useState } from "react";
import { AdminDialog } from "../competition/admin-dialog";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  initialProfileCandidatesSchema,
  playerProfileAckSchema,
  type ConfirmPlayerProfile,
  type PlayerProfileProposal,
} from "./contract";
import { profileCardLines } from "./profile-card";

type BatchItem = {
  proposal: PlayerProfileProposal;
  command: ConfirmPlayerProfile;
  status: "pending" | "published" | "review";
};

export function InitialProfileBatch({
  enabled,
  guard,
  onClose,
  onSessionLost,
}: {
  enabled: boolean;
  guard: { current: () => boolean };
  onClose: () => void;
  onSessionLost: () => void;
}) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const stopped = useRef(false);
  const pending = items.filter((item) => item.status === "pending").length;
  const published = items.filter((item) => item.status === "published").length;
  const needsReview = items.length - pending - published;
  useEffect(() => {
    guard.current = () => !busy;
    return () => {
      guard.current = () => true;
    };
  }, [guard, busy]);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const candidates: BatchItem[] = [];
      let next: string | null = null;
      do {
        const page: { items: PlayerProfileProposal[]; next: string | null } =
          await api(
            `/api/people/profile-batch${next ? `?after=${next}` : ""}`,
            initialProfileCandidatesSchema,
          );
        for (const proposal of page.items) {
          candidates.push({
            proposal,
            command: {
              commandId: crypto.randomUUID(),
              personId: proposal.personId,
              expectedPersonVersion: proposal.personVersion,
              expectedPublicationVersion: 0,
              reason: "Primeira publicação em lote",
              acknowledgeImpact: true,
              initialBatch: true,
            },
            status: "pending",
          });
        }
        next = page.next;
      } while (next);
      setItems(candidates);
      setLoaded(true);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível listar as fichas.",
      );
      if (isSessionFailure(failure)) onSessionLost();
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError("");
    stopped.current = false;
    try {
      for (const item of items) {
        if (stopped.current) break;
        if (item.status !== "pending") continue;
        const { command } = item;
        let status: BatchItem["status"] = "published";
        try {
          const ack = await api(
            `/api/people/${command.personId}/profile`,
            playerProfileAckSchema,
            command,
          );
          if (
            ack.commandId !== command.commandId ||
            ack.personId !== command.personId ||
            ack.personVersion !== command.expectedPersonVersion ||
            ack.version !== 1
          )
            throw new ApiFailure(503, "Não foi possível conferir o recibo.");
        } catch (failure) {
          if (
            !(failure instanceof ApiFailure) ||
            ![400, 404, 409, 413].includes(failure.status)
          )
            throw failure;
          status = "review";
        }
        setItems((current) =>
          current.map((entry) =>
            entry.command.commandId === command.commandId
              ? { ...entry, status }
              : entry,
          ),
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Publicação interrompida.",
      );
      if (isSessionFailure(failure)) onSessionLost();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      open={enabled}
      title="Publicar fichas de jogadores"
      busy={busy}
      onClose={onClose}
      footer={
        loaded ? (
          <button
            type="button"
            disabled={busy || !pending}
            onClick={() => void publish()}
          >
            {published || needsReview || error
              ? "Retomar fichas pendentes"
              : `Publicar ${pending} fichas`}
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => void load()}>
            Carregar fichas para conferência
          </button>
        )
      }
    >
      {error && <p role="alert">{error}</p>}
      {busy && loaded && (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            stopped.current = true;
          }}
        >
          Pausar após o envio atual
        </button>
      )}
      {loaded && (
        <>
          <p role="status">
            {published} publicadas · {pending} pendentes · {needsReview} para
            nova conferência
          </p>
          {!items.length && (
            <p>Nenhuma ficha elegível para primeira publicação.</p>
          )}
          {!!items.length && (
            <ul className="profile-review-lines">
              {items.map(({ proposal, status }) => (
                <li key={proposal.personId}>
                  <strong>{proposal.person.name}</strong>
                  {proposal.person.nickname && ` · ${proposal.person.nickname}`}
                  <div>
                    {profileCardLines(proposal.person, null).join(" · ")}
                  </div>
                  {status === "review" && (
                    <small>
                      Cadastro ou elegibilidade mudou. Carregue a lista
                      novamente para revisar.
                    </small>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!busy && !pending && !!needsReview && (
            <button
              type="button"
              className="secondary"
              onClick={() => void load()}
            >
              Recarregar fichas para conferência
            </button>
          )}
        </>
      )}
    </AdminDialog>
  );
}
