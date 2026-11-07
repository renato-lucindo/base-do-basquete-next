import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  registrationListingSchema,
  type RegistrationSnapshot,
} from "../teams/contract";
import { gameListingSchema, type GameSnapshot } from "../games/contract";
import type { RegulationDefinition } from "./persistence-contract";
import { DefinitionEditor } from "./definition-editor";
import {
  draftDocumentSchema,
  regulationDraftSchema,
  regulationDraftResultSchema,
  type RegulationDraft,
  type SaveRegulationDraft,
} from "./draft-contract";
import "./screen.css";
export function LegacySetupEditor({
  disputeId,
  definition,
  disabled,
  onChange,
  onSessionLost,
  baseRegulationVersion,
  guard,
  onLock,
}: {
  disputeId: string;
  baseRegulationVersion: number;
  guard: { current: () => boolean };
  onLock: (locked: boolean) => void;
  definition: RegulationDefinition;
  disabled: boolean;
  onChange: (definition: RegulationDefinition) => void;
  onSessionLost: () => void;
}) {
  const [rows, setRows] = useState<{
      registrations: RegistrationSnapshot[];
      games: GameSnapshot[];
    } | null>(null),
    [draft, setDraft] = useState<RegulationDraft | null>(null),
    [version, setVersion] = useState<number | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [reloadEpoch, setReloadEpoch] = useState(0);
  const pending = useRef<SaveRegulationDraft | null>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      guard.current = () => true;
      onLock(false);
    };
  }, [guard, onLock]);
  useEffect(() => {
    onLock(busy || uncertain);
    guard.current = () =>
      !busy &&
      (!uncertain ||
        window.confirm(
          "Há um envio de rascunho sem confirmação. Deseja sair e conferir depois?",
        ));
  });
  useEffect(() => {
    if (!uncertain) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uncertain]);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const registrations: RegistrationSnapshot[] = [],
        games: GameSnapshot[] = [];
      for (let offset = 0; offset < 1000; offset += 20) {
        const page = await api(
          `/api/registrations?disputeId=${disputeId}&q=&offset=${offset}`,
          registrationListingSchema,
          undefined,
          controller.signal,
        );
        registrations.push(...page.items);
        if (!page.hasMore) break;
      }
      for (let offset = 0; offset < 10000; offset += 20) {
        const page = await api(
          `/api/games?disputeId=${disputeId}&q=&offset=${offset}`,
          gameListingSchema,
          undefined,
          controller.signal,
        );
        games.push(...page.items);
        if (!page.hasMore) break;
      }
      if (
        registrations.some((r) => r.disputeId !== disputeId) ||
        games.some((g) => g.disputeId !== disputeId)
      )
        throw Error("Contexto inesperado.");
      const stored = await api(
        `/api/regulations/${disputeId}/draft`,
        regulationDraftSchema.nullable(),
        undefined,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setRows({ registrations, games });
        setDraft(stored);
        setVersion(stored?.version ?? 0);
        setConflict(false);
      }
    })().catch((e) => {
      if (controller.signal.aborted) return;
      if (isSessionFailure(e)) onSessionLost();
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar a estrutura.",
      );
    });
    return () => controller.abort();
  }, [disputeId, reloadEpoch]);
  async function saveDraft() {
    if (version === null || busy || conflict) return;
    setBusy(true);
    setError("");
    try {
      pending.current ??= {
        commandId: crypto.randomUUID(),
        disputeId,
        expectedVersion: version,
        baseRegulationVersion,
        document: draftDocumentSchema.parse(
          JSON.parse(JSON.stringify({ definition })),
        ),
      };
      const c = pending.current;
      const r = await api(
        `/api/regulations/${disputeId}/draft`,
        regulationDraftResultSchema,
        c,
      );
      if (
        r.commandId !== c.commandId ||
        r.disputeId !== disputeId ||
        r.version !== c.expectedVersion + 1 ||
        r.baseRegulationVersion !== c.baseRegulationVersion
      )
        throw new ApiFailure(
          503,
          "Envio sem confirmação. Repita o mesmo rascunho.",
        );
      pending.current = null;
      if (!alive.current) return;
      setUncertain(false);
      setVersion(r.version);
      setReloadEpoch((n) => n + 1);
      setStatus(
        "Rascunho privado salvo. A configuração aplicada permanece em uso.",
      );
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof ApiFailure && [400, 409, 413].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        setConflict(e.status === 409);
      } else if (pending.current) setUncertain(true);
      if (isSessionFailure(e)) onSessionLost();
      setError(
        e instanceof Error ? e.message : "Não foi possível salvar o rascunho.",
      );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <details open className="setup-legacy regulation">
      <summary>Formato personalizado</summary>
      {error && <p role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
      {conflict && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError("");
            setReloadEpoch((n) => n + 1);
          }}
        >
          Recarregar versão do rascunho, preservando edição
        </button>
      )}
      {rows ? (
        <fieldset disabled={disabled || busy}>
          <fieldset disabled={uncertain}>
            <legend className="sr-only">Editar estrutura livre</legend>
            <DefinitionEditor
              optionalComment
              definition={definition}
              registrations={rows.registrations}
              games={rows.games}
              change={(f) => {
                const next = structuredClone(definition);
                f(next);
                onChange(next);
              }}
            />
          </fieldset>
          <div className="setup-inline-actions">
            <button
              type="button"
              disabled={busy || version === null || conflict}
              className="setup-link"
              onClick={() => void saveDraft()}
            >
              {uncertain
                ? "Repetir envio do rascunho"
                : "Salvar rascunho privado"}
            </button>
            {draft && (
              <button
                type="button"
                className="setup-link"
                disabled={uncertain}
                onClick={() => onChange(draft.document.definition)}
              >
                Recuperar rascunho privado
              </button>
            )}
          </div>
        </fieldset>
      ) : (
        <p role="status">Carregando equipes e jogos…</p>
      )}
    </details>
  );
}
