import { useRef, useState } from "react";
import { AdminDialog } from "../competition/admin-dialog";
import {
  confirmPlayerProfileSchema,
  type PlayerProfileMetadata,
} from "../player-profile/contract";
import {
  profileCardLines,
  profileDraftAge,
} from "../player-profile/profile-card";

export function ProfileSaveReview({
  draft,
  publicationVersion,
  busy,
  onClose,
  onSave,
}: {
  draft: { metadata: PlayerProfileMetadata; date: string | null };
  publicationVersion: number | null;
  busy: boolean;
  onClose: () => void;
  onSave: (reason: string | null) => void;
}) {
  const onlySave = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");
  const { metadata, date } = draft;
  const lines = profileCardLines(
    metadata,
    profileDraftAge(metadata.publicBirthYear, date),
  );
  const ready =
    publicationVersion !== null &&
    confirmPlayerProfileSchema.safeParse({
      commandId: metadata.id,
      personId: metadata.id,
      expectedPersonVersion: 1,
      expectedPublicationVersion: publicationVersion,
      reason,
      acknowledgeImpact: true,
    }).success;
  return (
    <AdminDialog
      title="Publicar os dados do perfil?"
      open
      busy={busy}
      onClose={onClose}
      closeLabel="Voltar à edição"
      initialFocus={onlySave}
      footer={
        <>
          <button
            ref={onlySave}
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => onSave(null)}
          >
            Só salvar
          </button>
          <button
            type="button"
            disabled={busy || !ready}
            onClick={() => onSave(reason)}
          >
            Salvar e publicar
          </button>
        </>
      }
    >
      <p>
        <strong>{metadata.name}</strong>
        {metadata.nickname && ` · ${metadata.nickname}`}
      </p>
      {!!lines.length && (
        <ul className="profile-review-lines">
          {lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
      {publicationVersion === null && (
        <p role="status">
          {busy
            ? "Consultando a publicação atual…"
            : "Publicação indisponível. Você pode só salvar."}
        </p>
      )}
      {publicationVersion !== null && publicationVersion > 0 && (
        <label className="profile-review-reason">
          Motivo da revisão
          <textarea
            value={reason}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      )}
    </AdminDialog>
  );
}
