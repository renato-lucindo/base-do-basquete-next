import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  registrationListingSchema,
  type RegistrationSnapshot,
} from "../teams/contract";
import { gameListingSchema, type GameSnapshot } from "../games/contract";
import {
  regulationDefinitionSchema,
  regulationSaveResultSchema,
  type RegulationDefinition,
  type SaveRegulation,
} from "./persistence-contract";
import {
  regulationViewSchema,
  regulationPreviewResultSchema,
  regulationVersionViewSchema,
  type RegulationView,
  type RegulationPreviewResult,
} from "./view-contract";
import { DefinitionEditor } from "./definition-editor";
import { createDefaultDefinition, hasCustomRules } from "./defaults";
import { AdminToast } from "../competition/admin-toast";
import { RegulationProjection } from "./projection";
import { AchievementPanel } from "../achievements/panel";
import { StandingsPublicationPanel } from "./publication-panel";
import { TiePanel } from "./tie-panel";
import {
  draftDocumentSchema,
  definitionKey,
  regulationDraftSchema,
  regulationDraftResultSchema,
  type RegulationDraft,
  type SaveRegulationDraft,
} from "./draft-contract";
import "./screen.css";
type VersionView = ReturnType<typeof regulationVersionViewSchema.parse>;
const empty = createDefaultDefinition;

async function loadRegistrationCatalog(
  disputeId: string,
  view: RegulationView,
  signal?: AbortSignal,
) {
  if (view.disputeId !== disputeId) throw new Error("Contexto inesperado.");
  const rows: RegistrationSnapshot[] = [];
  for (let offset = 0; offset < 1000; offset += 20) {
    const page = await api(
      `/api/registrations?disputeId=${disputeId}&q=&offset=${offset}`,
      registrationListingSchema,
      undefined,
      signal,
    );
    if (page.items.some((r) => r.disputeId !== disputeId))
      throw new Error("Inscrições de outro contexto foram recusadas.");
    rows.push(...page.items);
    if (!page.hasMore) break;
    if (offset === 980)
      throw new Error("O catálogo excede o limite desta operação.");
  }
  const ids = new Set(rows.map((r) => r.id));
  if (
    ids.size !== rows.length ||
    view.registrationIds.some((id) => !ids.has(id))
  )
    throw new Error("O catálogo mudou durante a leitura. Carregue novamente.");
  return rows;
}
type Props = {
  disputeId: string;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
};
export function RegulationWorkspace({
  disputeId,
  enabled,
  guard,
  onSessionLost,
  onSaved,
}: Props) {
  const [view, setView] = useState<RegulationView | null>(null),
    [showAchievements, setShowAchievements] = useState(false),
    [draft, setDraft] = useState<RegulationDefinition>(empty),
    [baseline, setBaseline] = useState(""),
    [registrations, setRegistrations] = useState<RegistrationSnapshot[]>([]),
    [games, setGames] = useState<GameSnapshot[]>([]),
    [hasMoreGames, setHasMoreGames] = useState(false),
    [showGames, setShowGames] = useState(false),
    [gameQuery, setGameQuery] = useState(""),
    [gameOffset, setGameOffset] = useState(0),
    [gamesLoading, setGamesLoading] = useState(false),
    [loading, setLoading] = useState(true),
    [loadAttempt, setLoadAttempt] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [proposal, setProposal] = useState<RegulationPreviewResult | null>(null),
    [reason, setReason] = useState(""),
    [impact, setImpact] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [readPending, setReadPending] = useState(false),
    [history, setHistory] = useState<RegulationView["history"]>([]),
    [historyOffset, setHistoryOffset] = useState(0),
    [historyMore, setHistoryMore] = useState(false),
    [wantedVersion, setWantedVersion] = useState(0),
    [versionView, setVersionView] = useState<VersionView | null>(null),
    [versionLoading, setVersionLoading] = useState(false);
  const pending = useRef<{ command: SaveRegulation; ack: boolean } | null>(
      null,
    ),
    alive = useRef(true),
    historyEpoch = useRef(0),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    panel = useRef<HTMLElement>(null);
  const achievementGuard = useRef(() => true);
  const [storedDraft, setStoredDraft] = useState<RegulationDraft | null>(null),
    [draftVersion, setDraftVersion] = useState<number | null>(null),
    [savedDraftBaseline, setSavedDraftBaseline] = useState(""),
    [draftMessage, setDraftMessage] = useState(""),
    [draftUncertain, setDraftUncertain] = useState(false);
  const draftPending = useRef<SaveRegulationDraft | null>(null);
  const [tieEditing, setTieEditing] = useState(false);
  const publicationGuard = useRef(() => true);
  const [publicationLocked, setPublicationLocked] = useState(false);
  const currentKey = definitionKey(draft);
  const dirty = !!view && currentKey !== baseline,
    locked =
      busy || !!pending.current || !!draftPending.current || publicationLocked,
    unsaved = dirty && currentKey !== savedDraftBaseline;
  const names = new Map(registrations.map((r) => [r.id, r.name]));
  const path = `/api/regulations/${disputeId}`;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      historyEpoch.current++;
    };
  }, []);
  useEffect(() => {
    guard.current = () =>
      !busy &&
      (!(unsaved || tieEditing || pending.current || draftPending.current) ||
        window.confirm(
          "Há alterações no regulamento ou um envio não confirmado. Sair desta edição?",
        )) &&
      achievementGuard.current() &&
      publicationGuard.current();
    return () => {
      guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!unsaved && !tieEditing && !pending.current && !draftPending.current)
      return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved, uncertain, readPending, busy, draftUncertain, tieEditing]);
  useEffect(() => {
    if (error && enabled) alert.current?.focus();
  }, [error, enabled]);
  function failure(e: unknown) {
    if (isSessionFailure(e)) onSessionLost();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível concluir. Tente novamente.",
    );
  }
  function accept(v: RegulationView, preserve = false) {
    setView(v);
    if (!preserve) {
      setDraft(structuredClone(v.definition ?? empty()));
      setSavedDraftBaseline("");
      setDraftMessage("");
    }
    setBaseline(definitionKey(v.definition ?? empty()));
    setHistory(v.history);
    setHistoryMore(v.hasMore);
    setHistoryOffset(0);
    setProposal(null);
    setImpact(false);
    setReason("");
  }
  useEffect(() => {
    if (!enabled || view) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const v = await api(path, regulationViewSchema, undefined, c.signal),
          rows = await loadRegistrationCatalog(disputeId, v, c.signal);
        if (c.signal.aborted) return;
        try {
          const stored = await api(
            path + "/draft",
            regulationDraftSchema.nullable(),
            undefined,
            c.signal,
          );
          if (c.signal.aborted) return;
          if (stored && stored.disputeId !== disputeId)
            throw Error("Rascunho fora desta disputa.");
          setRegistrations(rows);
          accept(v);
          setStoredDraft(stored);
          setDraftVersion(stored?.version ?? 0);
          if (stored?.baseRegulationVersion === v.version) {
            setDraft(stored.document.definition);
            setSavedDraftBaseline(definitionKey(stored.document.definition));
            setDraftMessage("Rascunho recuperado. Ainda não publicado.");
          }
        } catch (e) {
          if (!c.signal.aborted) {
            setRegistrations(rows);
            accept(v);
            setDraftMessage(
              "Não foi possível carregar o rascunho. Recarregue antes de salvar um rascunho.",
            );
            if (isSessionFailure(e)) onSessionLost();
          }
        }
        heading.current?.parentElement?.focus();
      } catch (e) {
        if (!c.signal.aborted) failure(e);
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    })();
    return () => c.abort();
  }, [enabled, view, disputeId, loadAttempt]);
  useEffect(() => {
    if (!enabled || !showGames) return;
    const c = new AbortController();
    setGamesLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/api/games?disputeId=${disputeId}&q=${encodeURIComponent(gameQuery)}&offset=${gameOffset}`,
        gameListingSchema,
        undefined,
        c.signal,
      )
        .then((v) => {
          if (!c.signal.aborted) {
            if (v.items.some((g) => g.disputeId !== disputeId))
              throw new Error("Jogo fora desta disputa.");
            setGames(v.items);
            setHasMoreGames(v.hasMore);
          }
        })
        .catch((e) => {
          if (!c.signal.aborted) failure(e);
        })
        .finally(() => {
          if (!c.signal.aborted) setGamesLoading(false);
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [enabled, showGames, gameQuery, gameOffset, disputeId]);
  function change(f: (d: RegulationDefinition) => void) {
    if (locked) return;
    setDraft((old) => {
      const next = structuredClone(old);
      f(next);
      const validDecisions = (next.tieDecisions ?? []).filter((d) =>
        next.groupPhases.some(
          (p) =>
            p.phaseId === d.phaseId &&
            p.groups.some(
              (g) =>
                g.id === d.groupId &&
                d.order.every((id) => g.registrationIds.includes(id)),
            ),
        ),
      );
      if (validDecisions.length !== (next.tieDecisions?.length ?? 0)) {
        next.tieDecisions = validDecisions;
        next.tieNotes = next.tieNotes?.filter((n) =>
          validDecisions.some((d) => d.id === n.id),
        );
      }
      if (
        view?.version === 0 ||
        next.groupPhases.some((p) => p.rules.calculationPolicy === "fiba-2026")
      ) {
        next.customized = hasCustomRules(next);
        if (!next.customized) delete next.customReason;
      }
      return next;
    });
    setProposal(null);
    setImpact(false);
    setStatus("");
    setDraftMessage("");
  }
  async function saveDraft() {
    if (!view || busy || tieEditing || draftVersion === null) return;
    if (!draftPending.current) {
      const doc = draftDocumentSchema.safeParse(
        JSON.parse(JSON.stringify({ definition: draft })),
      );
      if (!doc.success) {
        setError("Confira os campos do rascunho antes de salvar.");
        return;
      }
      draftPending.current = {
        commandId: crypto.randomUUID(),
        disputeId,
        expectedVersion: draftVersion,
        baseRegulationVersion: view.version,
        document: doc.data,
      };
    }
    setBusy(true);
    setError("");
    try {
      const c = draftPending.current,
        r = await api(path + "/draft", regulationDraftResultSchema, c);
      if (
        r.commandId !== c.commandId ||
        r.disputeId !== disputeId ||
        r.version !== c.expectedVersion + 1 ||
        r.baseRegulationVersion !== c.baseRegulationVersion
      )
        throw new ApiFailure(503, "Não foi possível confirmar o rascunho.");
      if (!alive.current) return;
      setDraftVersion(r.version);
      setDraft(structuredClone(c.document.definition));
      setSavedDraftBaseline(definitionKey(c.document.definition));
      setStoredDraft(null);
      setDraftMessage("Rascunho salvo. Ainda não publicado.");
      draftPending.current = null;
      setDraftUncertain(false);
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiFailure && (e.status === 400 || e.status === 409)) {
          draftPending.current = null;
          setDraftUncertain(false);
          setDraftVersion(null);
        } else setDraftUncertain(true);
        failure(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function reloadDraft() {
    if (busy || draftPending.current) return;
    setBusy(true);
    setError("");
    try {
      const stored = await api(
        path + "/draft",
        regulationDraftSchema.nullable(),
      );
      if (stored && stored.disputeId !== disputeId)
        throw Error("Rascunho fora desta disputa.");
      const current = await api(path, regulationViewSchema);
      const rows = await loadRegistrationCatalog(disputeId, current);
      if (!alive.current) return;
      setRegistrations(rows);
      accept(current, true);
      setStoredDraft(stored);
      setDraftVersion(stored?.version ?? 0);
      setDraftMessage(
        "Rascunho recarregado. Sua edição foi preservada para conferência.",
      );
    } catch (e) {
      if (alive.current) failure(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function confer() {
    if (!view || locked || tieEditing) return;
    const parsed = regulationDefinitionSchema.safeParse(draft);
    if (draft.customized && !draft.customReason?.trim()) {
      setError("Informe a justificativa das regras personalizadas.");
      panel.current
        ?.querySelector<HTMLTextAreaElement>("textarea[required]")
        ?.focus();
      return;
    }
    if (
      (draft.tieDecisions ?? []).some(
        (d) => !draft.tieNotes?.some((n) => n.id === d.id && n.comment.trim()),
      )
    ) {
      setError("Informe a justificativa do desempate administrativo.");
      return;
    }
    if (!parsed.success) {
      setError(
        "Complete nomes, pontuação e inscrições. Confira referências, grupos e jogos atribuídos.",
      );
      panel.current
        ?.querySelector<HTMLInputElement>("input:invalid,select:invalid")
        ?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const r = await api(path + "/preview", regulationPreviewResultSchema, {
        expectedVersion: view.version,
        expectedContextFingerprint: view.contextFingerprint,
        definition: parsed.data,
      });
      if (
        r.disputeId !== disputeId ||
        r.baseVersion !== view.version ||
        r.contextFingerprint !== view.contextFingerprint
      )
        throw new ApiFailure(
          503,
          "Não foi possível conferir a resposta da prévia.",
        );
      if (!alive.current) return;
      setDraft(r.definition);
      setProposal(r);
      setConflict(false);
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiFailure && e.status === 409) setConflict(true);
        failure(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function reload(preserve: boolean) {
    setBusy(true);
    setError("");
    try {
      const v = await api(path, regulationViewSchema);
      const rows = await loadRegistrationCatalog(disputeId, v);
      if (!alive.current) return;
      const own = pending.current?.command.expectedVersion;
      setRegistrations(rows);
      accept(v, preserve);
      pending.current = null;
      setUncertain(false);
      setReadPending(false);
      setConflict(false);
      if (own !== undefined) {
        setStatus(
          v.version > own + 1
            ? "Regulamento salvo. Há uma revisão posterior para conferir."
            : "Regulamento salvo.",
        );
        onSaved();
      }
    } catch (e) {
      if (alive.current) {
        if (pending.current?.ack) setReadPending(true);
        failure(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (!view || busy || tieEditing) return;
    if (!pending.current) {
      if (!proposal) return;
      if (proposal.hasPublishedResults && (!impact || reason.trim().length < 3))
        return;
      pending.current = {
        ack: false,
        command: {
          commandId: crypto.randomUUID(),
          disputeId,
          expectedVersion: proposal.baseVersion,
          expectedContextFingerprint: proposal.contextFingerprint,
          definition: structuredClone(proposal.definition),
          reason: reason.trim(),
          acknowledgeImpact: impact,
        },
      };
    }
    if (pending.current.ack) {
      await reload(false);
      return;
    }
    setBusy(true);
    setError("");
    setUncertain(false);
    try {
      const c = pending.current.command,
        r = await api(path, regulationSaveResultSchema, c);
      if (
        r.commandId !== c.commandId ||
        r.disputeId !== disputeId ||
        r.version !== c.expectedVersion + 1 ||
        r.contextFingerprint !== c.expectedContextFingerprint
      )
        throw new ApiFailure(503, "Não foi possível confirmar o envio.");
      pending.current.ack = true;
      await reload(false);
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiFailure && (e.status === 400 || e.status === 409)) {
          pending.current = null;
          setProposal(null);
          setConflict(e.status === 409);
        } else setUncertain(true);
        failure(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function openVersion(n: number) {
    const epoch = ++historyEpoch.current;
    setWantedVersion(n);
    setVersionView(null);
    setVersionLoading(true);
    try {
      const v = await api(path + `/versions/${n}`, regulationVersionViewSchema);
      if (v.disputeId !== disputeId || v.version !== n)
        throw new Error("Versão não corresponde ao pedido.");
      if (alive.current && epoch === historyEpoch.current) setVersionView(v);
    } catch (e) {
      if (alive.current && epoch === historyEpoch.current) failure(e);
    } finally {
      if (alive.current && epoch === historyEpoch.current)
        setVersionLoading(false);
    }
  }
  async function historyPage(offset: number) {
    if (busy) return;
    setBusy(true);
    try {
      const v = await api(path + `?offset=${offset}`, regulationViewSchema);
      if (v.disputeId !== disputeId) throw new Error("Contexto inesperado.");
      if (alive.current) {
        setHistory(v.history);
        setHistoryMore(v.hasMore);
        setHistoryOffset(offset);
      }
    } catch (e) {
      if (alive.current) failure(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const tieProjection = proposal?.after ?? (!dirty ? view?.preview : null);
  const hasTiePanel = tieProjection?.groupPhases.some((p) =>
    p.groups.some(
      (g) =>
        g.standings.unresolvedTies.length ||
        (g.appliedTieDecisionIds?.length ?? 0) ||
        (g.staleTieDecisionIds?.length ?? 0),
    ),
  );
  if (showAchievements)
    return (
      <AchievementPanel
        disputeId={disputeId}
        enabled={enabled}
        guard={achievementGuard}
        onSessionLost={onSessionLost}
        onSaved={onSaved}
        onClose={() => {
          setShowAchievements(false);
          requestAnimationFrame(() => heading.current?.parentElement?.focus());
        }}
      />
    );
  return (
    <section className="regulation" ref={panel}>
      <AdminToast
        message={
          enabled && !busy && !uncertain && !readPending && !dirty ? status : ""
        }
      />
      <div className="competition-title" tabIndex={-1}>
        <h3 ref={heading} className="sr-only">
          Regulamento da disputa
        </h3>
        <button
          type="button"
          disabled={!view || locked || dirty || tieEditing || !enabled}
          onClick={() => setShowAchievements(true)}
        >
          Colocações e honrarias
        </button>
      </div>
      {dirty && (
        <p>
          Salve as regras ou descarte sua edição antes de abrir as premiações.
        </p>
      )}
      {error && (
        <p className="access-error" role="alert" ref={alert} tabIndex={-1}>
          {error}
        </p>
      )}
      <p role="status">
        {busy
          ? "Conferindo…"
          : readPending
            ? "Gravação confirmada; atualização pendente."
            : uncertain
              ? "Envio não confirmado. Preserve o mesmo pedido para retomar."
              : status ||
                (!view
                  ? loading
                    ? "Carregando regulamento…"
                    : "Não foi possível carregar."
                  : dirty
                    ? unsaved
                      ? "Alterações não salvas."
                      : "Rascunho salvo. Regulamento ainda não confirmado."
                    : view.version
                      ? "Regulamento salvo."
                      : "Regulamento ainda não configurado.")}
      </p>
      {!view && !loading && (
        <button
          onClick={() => {
            setLoading(true);
            setLoadAttempt((n) => n + 1);
          }}
        >
          Tentar novamente
        </button>
      )}
      {view && (
        <>
          <fieldset
            disabled={locked || tieEditing || !enabled}
            className="reg-editor"
          >
            <legend>Organização da disputa</legend>
            <DefinitionEditor
              definition={draft}
              registrations={registrations}
              games={showGames ? games : []}
              change={change}
            />
            <div className="reg-actions">
              <button type="button" onClick={() => setShowGames((v) => !v)}>
                {showGames
                  ? "Ocultar jogos para atribuir"
                  : "Ver jogos para atribuir"}
              </button>
            </div>
            <div className="reg-actions">
              <button
                type="button"
                disabled={draftVersion === null}
                onClick={() => void saveDraft()}
              >
                Salvar rascunho
              </button>
            </div>
            {showGames && (
              <div>
                <p>
                  Inclua os adversários no grupo antes de atribuir o jogo.
                  Horários em Brasília.
                </p>
                <label>
                  Buscar jogos
                  <input
                    value={gameQuery}
                    maxLength={120}
                    onChange={(e) => {
                      setGameQuery(e.target.value);
                      setGameOffset(0);
                    }}
                  />
                </label>
                {gamesLoading && <p>Carregando jogos…</p>}
                <div className="reg-actions">
                  <button
                    type="button"
                    disabled={!gameOffset || gamesLoading}
                    onClick={() => setGameOffset((n) => n - 20)}
                  >
                    Jogos anteriores
                  </button>
                  <button
                    type="button"
                    disabled={!hasMoreGames || gamesLoading}
                    onClick={() => setGameOffset((n) => n + 20)}
                  >
                    Próximos jogos
                  </button>
                </div>
              </div>
            )}
            <h4>3. Revisão e publicação</h4>
            <p>
              Confira a classificação antes de salvar. A publicação pública
              exige sua confirmação e pode ocorrer antes do primeiro resultado.
            </p>
            <button type="button" data-reg-review onClick={() => void confer()}>
              Conferir impacto
            </button>
          </fieldset>
          {draftMessage && <p role="status">{draftMessage}</p>}
          {draftVersion === null && !draftPending.current && (
            <button disabled={busy} onClick={() => void reloadDraft()}>
              Recarregar rascunho
            </button>
          )}
          {draftUncertain && (
            <button
              disabled={busy || !enabled}
              onClick={() => void saveDraft()}
            >
              Repetir envio do rascunho
            </button>
          )}
          {storedDraft && (
            <button
              disabled={locked || !enabled}
              onClick={() => {
                if (
                  unsaved &&
                  !window.confirm("Substituir sua edição pelo rascunho salvo?")
                )
                  return;
                setDraft(structuredClone(storedDraft.document.definition));
                setProposal(null);
                setImpact(false);
                setStatus("");
                setSavedDraftBaseline(
                  definitionKey(storedDraft.document.definition),
                );
                setDraftMessage(
                  storedDraft.baseRegulationVersion === view.version
                    ? "Rascunho recuperado. Ainda não publicado."
                    : "Rascunho de uma versão anterior recuperado. Confira as diferenças antes de salvar.",
                );
              }}
            >
              Usar rascunho salvo
            </button>
          )}
          {(storedDraft || !!draftVersion) && (
            <button
              disabled={locked || tieEditing || !enabled}
              onClick={() => {
                if (
                  unsaved &&
                  !window.confirm(
                    "Substituir sua edição pelo regulamento confirmado?",
                  )
                )
                  return;
                setDraft(structuredClone(view.definition ?? empty()));
                setProposal(null);
                setImpact(false);
                setStatus("");
                setDraftMessage(
                  "Regulamento confirmado carregado. Salve um rascunho para manter esta escolha na próxima visita.",
                );
              }}
            >
              Usar regulamento confirmado
            </button>
          )}
          {conflict && (
            <button disabled={busy} onClick={() => void reload(true)}>
              Recarregar dados para nova prévia
            </button>
          )}
          {proposal && (
            <section className="reg-review">
              <h3>Conferência da alteração</h3>
              {proposal.before && view.definition && (
                <RegulationProjection
                  value={proposal.before}
                  definition={view.definition}
                  names={names}
                  title="Antes da alteração"
                />
              )}
              <RegulationProjection
                value={proposal.after}
                definition={proposal.definition}
                names={names}
                title="Depois da alteração"
              />
              <fieldset disabled={locked || !enabled}>
                <legend>Confirmar regulamento</legend>
                <label>
                  Motivo da alteração
                  <textarea
                    required={proposal.hasPublishedResults}
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                {proposal.hasPublishedResults && (
                  <label className="reg-check">
                    <input
                      type="checkbox"
                      checked={impact}
                      onChange={(e) => setImpact(e.target.checked)}
                    />
                    Conferi o impacto nos resultados e cruzamentos
                  </label>
                )}
              </fieldset>
              {!pending.current && (
                <button
                  disabled={
                    busy ||
                    tieEditing ||
                    !enabled ||
                    (proposal.hasPublishedResults &&
                      (!impact || reason.trim().length < 3))
                  }
                  onClick={() => void save()}
                >
                  Confirmar e salvar regulamento
                </button>
              )}
            </section>
          )}
          {tieProjection && hasTiePanel && (
            <fieldset disabled={locked || !enabled}>
              <legend className="sr-only">Decisões de classificação</legend>
              <TiePanel
                value={tieProjection}
                definition={draft}
                names={names}
                onEditingChange={setTieEditing}
                change={(f) => {
                  change(f);
                  setDraftMessage(
                    "Alteração do desempate preparada. Confira o impacto antes de salvar.",
                  );
                  requestAnimationFrame(() =>
                    panel.current
                      ?.querySelector<HTMLButtonElement>(
                        "button[data-reg-review]",
                      )
                      ?.focus(),
                  );
                }}
              />
            </fieldset>
          )}
          {pending.current && (
            <button disabled={busy || !enabled} onClick={() => void save()}>
              {pending.current.ack
                ? "Recarregar confirmação"
                : "Repetir envio do regulamento"}
            </button>
          )}
          {view.preview && view.definition && (
            <RegulationProjection
              value={view.preview}
              definition={view.definition}
              names={names}
              title="Classificação atual"
            />
          )}
          <StandingsPublicationPanel
            key={disputeId}
            disputeId={disputeId}
            enabled={
              enabled &&
              !dirty &&
              !busy &&
              !pending.current &&
              !draftPending.current &&
              !tieEditing &&
              !readPending &&
              !!view.version
            }
            guard={publicationGuard}
            onSessionLost={onSessionLost}
            onLockChange={setPublicationLocked}
          />
          <section>
            <h3>Histórico do regulamento</h3>
            {!history.length && <p>Nenhuma versão nesta página.</p>}
            <ul>
              {history.map((h) => (
                <li key={h.version}>
                  <button
                    disabled={busy || versionLoading}
                    onClick={() => void openVersion(h.version)}
                  >
                    Ver versão {h.version}
                  </button>
                  <p>
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Sao_Paulo",
                    }).format(new Date(h.savedAt))}
                    {h.reason ? ` · ${h.reason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            <div className="reg-actions">
              <button
                disabled={!historyOffset || busy}
                onClick={() => void historyPage(historyOffset - 20)}
              >
                Versões anteriores
              </button>
              <button
                disabled={!historyMore || busy}
                onClick={() => void historyPage(historyOffset + 20)}
              >
                Mais versões
              </button>
            </div>
            {wantedVersion > 0 && (
              <section>
                <h3>Versão {wantedVersion} do regulamento</h3>
                <button
                  onClick={() => {
                    historyEpoch.current++;
                    setWantedVersion(0);
                    setVersionView(null);
                    setVersionLoading(false);
                  }}
                >
                  Fechar versão
                </button>
                {versionLoading && <p>Carregando versão…</p>}
                {versionView && (
                  <>
                    <p>{versionView.reason}</p>
                    <RegulationProjection
                      value={versionView.preview}
                      definition={versionView.definition}
                      names={names}
                      title="Classificação nessa versão"
                    />
                  </>
                )}
              </section>
            )}
          </section>
        </>
      )}
    </section>
  );
}
