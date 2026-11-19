import { FinalizeSheetPanel } from "../publication/finalize-sheet-panel";
import { flexibleCompetitionEnabled } from "../competition/features";
import { SheetPublicationPanel } from "../publication/sheet-panel";
import { PublicationHistory } from "../publication/history";
import { publicationStateSchema } from "../publication/data-contract";
import { publicResultSchema } from "../publication/pdf-contract";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { aggregate, periodLabel, type Side } from "../domain/scoresheet";
import { deleteAction } from "../scoresheet/actions";
import { authorAction } from "./sheet-event-author";
import { identifyPlayerEvents } from "./sheet-identity";
import { SheetPreparation } from "./sheet-preparation";
import { SheetLiveTables, SheetPartials } from "./sheet-live-tables";
import { SheetActionHistory } from "./sheet-action-history";
import { AdminDialog } from "../competition/admin-dialog";
import { Icon } from "../ui-system/components";
import { AdminToast } from "../ui-system/admin-toast";
import { projectSheet } from "../scoresheet/projection";
import {
  preparationContextSchema,
  type PreparationContext,
} from "./preparation-contract";
import { suggestPreparation } from "./preparation";
import { assertStartingFive } from "../scoresheet/lineup";
import { MembersWorkspace } from "../people/workspace";
import { gameSnapshotSchema, type GameSnapshot } from "./contract";
import {
  emptyPersistedSheet,
  sheetSnapshotSchema,
  sheetSaveResultSchema,
  validatePersistedSheet,
  toEngineSheet,
  type PersistedSheet,
  type SaveSheet,
  type SheetSnapshot,
} from "./sheet-contract";
import "./sheet-workspace.css";

type Props = {
  game: GameSnapshot;
  gender: "masculino" | "feminino";
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onBack: () => void;
  onBackToGames: () => void;
};
type History = {
  present: PersistedSheet;
  past: PersistedSheet[];
  future: PersistedSheet[];
};
const isTimeoutTarget = (value: string) => /^(TD|TO)$/iu.test(value.trim());
const sides = ["home", "away"] as const;
const sideName = (s: Side) => (s === "home" ? "A" : "B");
export function GameSheetWorkspace(props: Props) {
  const flexible = flexibleCompetitionEnabled(),
    PublicationPanel = flexible ? FinalizeSheetPanel : SheetPublicationPanel;
  const reasonLabelId = useId();
  const [history, setHistory] = useState<History | null>(null),
    [baseline, setBaseline] = useState(""),
    [version, setVersion] = useState(0),
    [gameVersion, setGameVersion] = useState(props.game.version),
    [snapshot, setSnapshot] = useState<SheetSnapshot | null>(null),
    [reason, setReason] = useState(""),
    [publicationLocked, setPublicationLocked] = useState(false);
  const [publicationRefresh, setPublicationRefresh] = useState(0);
  const [publication, setPublication] = useState<{
    gameId: string;
    alreadyPublished: boolean;
    hasHistory: boolean;
    resultVisible: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [context, setContext] = useState<PreparationContext | null>(null),
    [epoch, setEpoch] = useState(0),
    [auxiliary, setAuxiliary] = useState<Side | null>(null),
    [candidatesLoading, setCandidatesLoading] = useState(false),
    [preparationOpen, setPreparationOpen] = useState(true);
  const suggested = useRef(false);
  const [side, setSide] = useState<Side>("home"),
    [period, setPeriod] = useState(1),
    [target, setTarget] = useState(""),
    [code, setCode] = useState(""),
    [successor, setSuccessor] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const pending = useRef<SaveSheet | null>(null),
    initialized = useRef(false),
    auxGuard = useRef(() => true),
    publicationGuard = useRef(() => true),
    navigation = useRef<HTMLDivElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    targetRef = useRef<HTMLInputElement>(null),
    codeRef = useRef<HTMLInputElement>(null),
    periodRef = useRef<HTMLSelectElement>(null),
    editCodeRef = useRef<HTMLInputElement>(null),
    focusAfterDelete = useRef(false),
    editingRestore = useRef<{
      side: Side;
      period: number;
      target: string;
      code: string;
    } | null>(null);
  const returningToSide = useRef<Side | null>(null);
  const d = history?.present,
    dirty = !!d && JSON.stringify(d) !== baseline,
    locked = busy || uncertain || conflict || publicationLocked;
  const gameId = props.game.id;
  const hasSheet = !!d;
  const publicationForGame =
    publication?.gameId === gameId ? publication : null;

  useEffect(() => {
    if (!props.enabled || !hasSheet) return;
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const state = await api(
          `/api/games/${gameId}/publication`,
          publicationStateSchema,
          undefined,
          request.signal,
        );
        if (request.signal.aborted || state.gameId !== gameId) return;
        const availability = {
          gameId,
          alreadyPublished: !!state.published,
          hasHistory: state.history.length > 0,
          resultVisible: false,
        };
        setPublication((previous) => ({
          ...availability,
          resultVisible:
            !!state.published &&
            previous?.gameId === gameId &&
            previous.resultVisible,
        }));
        if (!state.published) return;
        const result = await api(
          `/api/public/games/${gameId}`,
          publicResultSchema,
          undefined,
          request.signal,
        ).catch(() => null);
        if (!request.signal.aborted)
          setPublication({
            ...availability,
            resultVisible: result?.id === gameId,
          });
      } catch {
        // An unavailable result must not prevent editing the administrative sheet.
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [
    props.enabled,
    hasSheet,
    gameId,
    gameVersion,
    version,
    publicationRefresh,
  ]);

  const eligibleSuccessors = useMemo(() => {
    if (!d || d.formatVersion !== 2) return [];
    const editIndex = editing
      ? d.events.findIndex((event) => event.id === editing)
      : -1;
    const events =
      editIndex < 0
        ? d.events
        : d.events.filter(
            (event, index) =>
              index !== editIndex &&
              (event.period < period ||
                (event.period === period && index < editIndex)),
          );
    const state = aggregate(toEngineSheet({ ...d, events }));
    if (state.errors.length) return [];
    const currentCoach = state.teams[side].activeCoachId;
    return d.participants.filter(
      (participant) =>
        participant.side === side &&
        participant.played &&
        participant.rosterEntryId !== currentCoach &&
        state.players.some(
          (player) =>
            player.actorId === participant.rosterEntryId &&
            player.status === "eligible",
        ),
    );
  }, [d, editing, period, side]);
  function mayLeave() {
    return (
      !busy &&
      publicationGuard.current() &&
      auxGuard.current() &&
      (!(dirty || uncertain || editing) ||
        window.confirm(
          "Há alterações não salvas ou envio não confirmado na súmula. Deseja sair?",
        ))
    );
  }
  useEffect(() => {
    props.guard.current = mayLeave;
    return () => {
      props.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!dirty && !uncertain && !editing && !publicationLocked) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain, editing, publicationLocked]);
  useEffect(() => {
    if (!props.enabled) return;
    if (!auxiliary && returningToSide.current) {
      const button = document.getElementById(
        `sheet-manage-${returningToSide.current}`,
      );
      if (button) {
        button.focus();
        returningToSide.current = null;
      }
    } else navigation.current?.focus();
  }, [props.enabled, auxiliary, !!history, !!context]);
  useEffect(() => {
    if (error && props.enabled) alert.current?.focus();
  }, [error, props.enabled]);
  useEffect(() => {
    if (!deleting && focusAfterDelete.current) {
      focusAfterDelete.current = false;
      targetRef.current?.focus();
    }
  }, [deleting]);
  function report(e: unknown) {
    if (isSessionFailure(e)) props.onSessionLost();
    else
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
  }
  function accept(
    s: SheetSnapshot | null,
    gv = props.game.version,
    preserveStage = false,
  ) {
    if (
      s &&
      (s.gameId !== props.game.id ||
        s.participants.some(
          (p) =>
            p.registrationId !==
            (p.side === "home" ? props.game.home.id : props.game.away.id),
        ))
    )
      throw Error("Os dados não correspondem a este jogo.");
    const document = identifyPlayerEvents(
      validatePersistedSheet(s?.document ?? emptyPersistedSheet(2)),
    );
    setHistory({ present: document, past: [], future: [] });
    setBaseline(JSON.stringify(document));
    setVersion(s?.version ?? 0);
    setGameVersion(s?.gameVersion ?? gv);
    setSnapshot(s);
    suggested.current = !!s;
    if (!preserveStage)
      setPreparationOpen(
        !s?.document.events.length || !!preparationProblem(s.document),
      );
    pending.current = null;
    setUncertain(false);
    setConflict(false);
    setEditing(null);
    setDeleting(null);
    setError("");
    initialized.current = true;
  }
  useEffect(() => {
    if (!props.enabled || initialized.current) return;
    let active = true;
    const controller = new AbortController();
    setBusy(true);
    void api(
      `/api/games/${props.game.id}/sheet`,
      sheetSnapshotSchema.nullable(),
      undefined,
      controller.signal,
    )
      .then((s) => {
        if (active) accept(s);
      })
      .catch((e) => {
        if (active) report(e);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [props.enabled, props.game.id, epoch]);
  useEffect(() => {
    if (!props.enabled || !history || auxiliary) return;
    let active = true;
    const controller = new AbortController();
    setCandidatesLoading(true);
    void api(
      `/api/games/${props.game.id}/sheet/preparation`,
      preparationContextSchema,
      undefined,
      controller.signal,
    )
      .then((c) => {
        if (!active) return;
        if (
          c.gameId !== props.game.id ||
          c.sides.home.registrationId !== props.game.home.id ||
          c.sides.away.registrationId !== props.game.away.id
        )
          throw Error(
            "A preparação não corresponde aos adversários deste jogo.",
          );
        setContext(c);
        if (!snapshot && !d?.participants.length && !suggested.current) {
          suggested.current = true;
          setHistory((old) =>
            old ? { ...old, present: suggestPreparation(c) } : old,
          );
        }
      })
      .catch((e) => {
        if (active) report(e);
      })
      .finally(() => {
        if (active) setCandidatesLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [props.enabled, props.game.id, !!history, auxiliary, epoch]);
  useEffect(() => {
    if (!preparationOpen && props.enabled) targetRef.current?.focus();
  }, [preparationOpen, props.enabled]);
  const focusTarget = () => {
    targetRef.current?.focus();
    targetRef.current?.select();
  };
  useEffect(() => {
    if (
      !props.enabled ||
      auxiliary ||
      locked ||
      deleting ||
      preparationOpen ||
      helpOpen
    )
      return;
    const shortcut = (e: KeyboardEvent) => {
      if (
        !e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.isComposing ||
        e.repeat
      )
        return;
      const key = e.key.toLowerCase();
      if (!["a", "b", "q", "1", "2", "3", "4"].includes(key)) return;
      e.preventDefault();
      if (key === "q") {
        periodRef.current?.focus();
        return;
      }
      if (key === "a" || key === "b") setSide(key === "a" ? "home" : "away");
      else setPeriod(Number(key));
      focusTarget();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [
    props.enabled,
    auxiliary,
    locked,
    editing,
    deleting,
    preparationOpen,
    helpOpen,
  ]);
  function mutate(next: PersistedSheet) {
    if (locked || !history) return false;
    try {
      if (snapshot?.confirmed) {
        const identities = (doc: PersistedSheet) =>
          JSON.stringify(
            doc.participants
              .map((p) => ({
                id: p.rosterEntryId,
                side: p.side,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
        if (identities(next) !== identities(snapshot.document))
          throw Error(
            "Os relacionados confirmados não podem ser alterados. Corrija somente a camisa do mesmo atleta.",
          );
      }
      const document = next.events.length ? validatePersistedSheet(next) : next;
      setHistory({
        present: document,
        past: [...history.past.slice(-49), history.present],
        future: [],
      });
      setStatus("");
      setError("");
      return true;
    } catch (e) {
      report(e);
      return false;
    }
  }
  function changeParticipant(
    id: string,
    patch: Partial<PersistedSheet["participants"][number]>,
  ) {
    if (d)
      mutate({
        ...d,
        participants: d.participants.map((p) =>
          p.rosterEntryId === id ? { ...p, ...patch } : p,
        ),
      });
  }
  function checkedTarget() {
    const value = isTimeoutTarget(target) ? "TO" : target.trim().toUpperCase();
    if (
      !d ||
      (!(d.formatVersion === 2 ? ["C", "AT", "TO"] : ["B", "C", "TO"]).includes(
        value,
      ) &&
        !d.participants.some((p) => p.side === side && p.jersey === value))
    ) {
      setError(
        d?.formatVersion === 2
          ? "Escolha uma camisa, C para técnico, AT para assistente ou TD para tempo debitado."
          : "Escolha uma camisa, B para banco, C para técnico ou TD para tempo debitado.",
      );
      return null;
    }
    setTarget(value === "TO" ? "TD" : value);
    return value;
  }
  function beginEditing(event: PersistedSheet["events"][number]) {
    editingRestore.current = { side, period, target, code };
    setError("");
    setEditing(event.id);
    setSide(event.side);
    setPeriod(event.period);
    setTarget(event.target === "TO" ? "TD" : event.target);
    setCode(event.code);
    setSuccessor(event.successorId ?? "");
  }
  function finishEditing() {
    setEditing(null);
    setSuccessor("");
    const previous = editingRestore.current;
    editingRestore.current = null;
    if (previous) {
      setSide(previous.side);
      setPeriod(previous.period);
      setTarget(previous.target);
      setCode(previous.code);
    }
  }
  function cancelEditing() {
    finishEditing();
    setError("");
  }
  function addAction() {
    if (!d || locked) return;
    const value = checkedTarget();
    if (value === null) return;
    const patch = {
      side,
      period,
      target: value,
      code: code.trim().toUpperCase(),
    };
    try {
      let next: PersistedSheet;
      if (editing) {
        const revised = authorAction(d, patch, editing, successor || null);
        next = {
          ...d,
          events: d.events.map((e) => (e.id === editing ? revised : e)),
          participants: d.participants.map((p) => ({
            ...p,
            played: p.played || (p.side === side && p.jersey === value),
          })),
        };
      } else
        next = {
          ...d,
          participants: d.participants.map((p) =>
            p.side === side && p.jersey === value ? { ...p, played: true } : p,
          ),
          events: [
            ...d.events,
            authorAction(d, patch, null, successor || undefined),
          ],
        };
      if (mutate(next)) {
        if (editing) {
          finishEditing();
          setStatus("Ação editada no rascunho");
        } else {
          setCode("");
          setSuccessor("");
          focusTarget();
        }
      }
    } catch (e) {
      report(e);
    }
  }
  function preparationProblem(doc: PersistedSheet): string | null {
    try {
      assertStartingFive(toEngineSheet(doc));
      validatePersistedSheet(doc);
      for (const s of sides) {
        if (!doc.staff[s].captainRosterEntryId)
          return `Selecione o capitão da equipe ${sideName(s)}.`;
      }
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Revise a preparação.";
    }
  }
  async function save(advance = false) {
    if (!d || busy || conflict) return;
    if (advance) {
      const problem = preparationProblem(d);
      if (problem) {
        setError(problem);
        return;
      }
      if (!dirty && !uncertain && !pending.current) {
        setPreparationOpen(false);
        return;
      }
    }
    if (editing || deleting) {
      setError("Conclua ou cancele a alteração da ação antes de salvar.");
      return;
    }
    if (
      !flexible &&
      snapshot?.confirmed &&
      !pending.current &&
      reason.trim().length < 10
    ) {
      setError("Informe o motivo da revisão da súmula (10 a 500 caracteres).");
      return;
    }
    const command = pending.current ?? {
      requestId: crypto.randomUUID(),
      gameId: props.game.id,
      gameVersion,
      baseVersion: version,
      document: d,
      confirm: false as const,
      reason,
    };
    try {
      validatePersistedSheet(command.document);
    } catch (e) {
      report(e);
      return;
    }
    pending.current = command;
    setBusy(true);
    setError("");
    try {
      await api(
        `/api/games/${props.game.id}/sheet`,
        sheetSaveResultSchema,
        command,
      );
      const s = await api(
        `/api/games/${props.game.id}/sheet`,
        sheetSnapshotSchema,
      );
      accept(s, gameVersion, true);
      setStatus("Rascunho da súmula salvo");
      if (advance) setPreparationOpen(false);
      props.onSaved();
    } catch (e) {
      if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        setConflict(e.status === 409);
      } else setUncertain(true);
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (!mayLeave()) return;
    setBusy(true);
    setError("");
    try {
      const g = await api(`/api/games/${props.game.id}`, gameSnapshotSchema);
      if (g.home.id !== props.game.home.id || g.away.id !== props.game.away.id)
        throw Error(
          "Os adversários mudaram. Volte à lista e reabra este jogo.",
        );
      accept(
        await api(`/api/games/${g.id}/sheet`, sheetSnapshotSchema.nullable()),
        g.version,
      );
      setReason("");
      setStatus("Súmula recarregada");
      setEpoch((v) => v + 1);
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const engine = useMemo(() => (d ? toEngineSheet(d) : null), [d]),
    projection = useMemo(
      () => (engine ? projectSheet(engine) : null),
      [engine],
    );
  function name(id: string) {
    return (
      snapshot?.participants.find((p) => p.rosterEntryId === id)?.person.name ??
      (context
        ? [...context.sides.home.roster, ...context.sides.away.roster].find(
            (p) => p.id === id,
          )?.person.name
        : undefined) ??
      "Atleta relacionado"
    );
  }
  function staffName(id: string) {
    for (const s of sides) {
      const current = context?.sides[s].staff.find(
        (person) => person.id === id,
      );
      if (current) return current.person.name;
      if (snapshot) {
        for (const role of ["coach", "assistant"] as const) {
          const staffId =
            role === "coach"
              ? snapshot.document.staff[s].coachStaffEntryId
              : snapshot.document.staff[s].assistantStaffEntryId;
          if (staffId === id && snapshot.staff[s][role])
            return snapshot.staff[s][role].name;
        }
      }
    }
    return d?.participants.some((person) => person.rosterEntryId === id)
      ? name(id)
      : "Responsável não identificado";
  }
  return (
    <section className="game-sheet" aria-busy={busy}>
      <AdminToast
        tone={error ? "error" : "success"}
        announce={false}
        message={props.enabled && !auxiliary && !busy ? error || status : ""}
      />
      <div
        className="sheet-navigation"
        ref={navigation}
        tabIndex={-1}
        role="group"
        aria-label="Navegação da súmula"
      >
        <div className="competition-actions sheet-navigation-links">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={props.onBackToGames}
          >
            <Icon name="back" /> Lista de jogos
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => {
              if (mayLeave()) props.onBack();
            }}
          >
            Dados do jogo
          </button>
        </div>
        <div className="sheet-status-controls">
          <p role="status" className="sheet-draft-status">
            {busy
              ? "Aguarde…"
              : uncertain
                ? "Envio da súmula não confirmado"
                : conflict
                  ? "Conflito na súmula"
                  : dirty
                    ? "Súmula não salva"
                    : status}
          </p>
        </div>
        <div className="competition-actions sheet-navigation-links">
          {d && !auxiliary && (
            <button
              type="button"
              className="sheet-text-action"
              disabled={busy || publicationLocked}
              onClick={() => void reload()}
            >
              <Icon name="refresh" /> Recarregar súmula
            </button>
          )}
          {!preparationOpen && !auxiliary && (
            <button
              type="button"
              className="sheet-info-trigger"
              onClick={() => setHelpOpen(true)}
            >
              <Icon name="info" /> Instruções
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" ref={alert} tabIndex={-1} className="access-error">
          {error}
        </p>
      )}
      {auxiliary ? (
        <>
          <button
            onClick={() => {
              if (auxGuard.current()) {
                returningToSide.current = auxiliary;
                setAuxiliary(null);
                setContext(null);
                setEpoch((v) => v + 1);
              }
            }}
          >
            Voltar à súmula
          </button>
          <MembersWorkspace
            registration={
              auxiliary === "home" ? props.game.home : props.game.away
            }
            gender={props.gender}
            enabled={props.enabled}
            canEdit
            guard={auxGuard}
            onSessionLost={props.onSessionLost}
            onSaved={() => {
              setEpoch((v) => v + 1);
              props.onSaved();
            }}
          />
        </>
      ) : d ? (
        <>
          {preparationOpen && (
            <>
              <h4 className="sheet-section-heading">
                Preparar relacionados e comissão
              </h4>
              {candidatesLoading && (
                <p role="status">Carregando elencos e comissão…</p>
              )}
              {context && (
                <SheetPreparation
                  document={d}
                  context={context}
                  game={props.game}
                  snapshot={snapshot}
                  disabled={locked || candidatesLoading}
                  onChange={mutate}
                  onError={setError}
                  onManage={setAuxiliary}
                />
              )}
              <button
                className="primary"
                disabled={locked || candidatesLoading || !context}
                onClick={() => void save(true)}
              >
                Concluir preparação e lançar ações
              </button>
            </>
          )}
          <div hidden={preparationOpen}>
            <div className="sheet-layout-pair sheet-entry-pair">
              {projection && (
                <SheetPartials
                  document={d}
                  projection={projection}
                  game={props.game}
                  period={period}
                />
              )}
              <fieldset
                aria-hidden={!!editing || undefined}
                disabled={locked || !!deleting || !!editing}
                className="sheet-input"
              >
                <legend className="sr-only">Lançar ações</legend>
                <h4 className="sheet-entry-title" aria-hidden="true">
                  Lançar ações
                </h4>
                <div className="competition-fields">
                  <label>
                    Equipe da ação
                    <select
                      aria-label="Equipe da ação"
                      value={side}
                      onChange={(e) => setSide(e.target.value as Side)}
                    >
                      <option value="home">A · {props.game.home.name}</option>
                      <option value="away">B · {props.game.away.name}</option>
                    </select>
                  </label>
                  <label>
                    Quarto ou prorrogação
                    <select
                      aria-label="Quarto ou prorrogação"
                      ref={periodRef}
                      value={period}
                      onChange={(e) => setPeriod(Number(e.target.value))}
                    >
                      {Array.from({ length: d.periods }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {periodLabel(i + 1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Camisa ou alvo
                    <input
                      ref={targetRef}
                      value={target}
                      maxLength={2}
                      autoComplete="off"
                      onChange={(e) => setTarget(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          if (checkedTarget() !== null) {
                            setError("");
                            codeRef.current?.focus();
                            codeRef.current?.select();
                          }
                        }
                      }}
                    />
                  </label>
                  <label>
                    {isTimeoutTarget(target)
                      ? "Minuto decorrido (1–10, PR: 1–5)"
                      : "Ação"}
                    <input
                      ref={codeRef}
                      value={code}
                      maxLength={3}
                      autoComplete="off"
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          addAction();
                        }
                      }}
                    />
                  </label>
                  <button type="button" className="primary" onClick={addAction}>
                    Registrar ação
                  </button>
                </div>
                {d.formatVersion === 2 &&
                  /Indique explicitamente outro atleta elegível/u.test(
                    error,
                  ) && (
                    <label className="sheet-successor-choice">
                      Indique o atleta que assumirá como técnico
                      <select
                        value={successor}
                        onChange={(e) => setSuccessor(e.target.value)}
                      >
                        <option value="">Selecione o sucessor</option>
                        {eligibleSuccessors.map((p) => (
                          <option key={p.rosterEntryId} value={p.rosterEntryId}>
                            {p.jersey} · {name(p.rosterEntryId)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                <div className="competition-actions sheet-entry-controls">
                  <button
                    aria-label="Desfazer ação ou ajuste"
                    disabled={!history.past.length || !!editing}
                    onClick={() => {
                      const last = history.past.at(-1);
                      if (last)
                        setHistory({
                          present: last,
                          past: history.past.slice(0, -1),
                          future: [...history.future, d],
                        });
                    }}
                  >
                    Desfazer
                  </button>
                  <button
                    aria-label="Refazer ação ou ajuste"
                    disabled={!history.future.length || !!editing}
                    onClick={() => {
                      const last = history.future.at(-1);
                      if (last)
                        setHistory({
                          present: last,
                          past: [...history.past, d].slice(-50),
                          future: history.future.slice(0, -1),
                        });
                    }}
                  >
                    Refazer
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setPreparationOpen(true)}
                  >
                    Revisar preparação
                  </button>
                  <label>
                    Períodos
                    <select
                      aria-label="Períodos da súmula"
                      value={d.periods}
                      onChange={(e) => {
                        const periods = Number(e.target.value);
                        if (mutate({ ...d, periods }))
                          setPeriod((p) => Math.min(p, periods));
                      }}
                    >
                      {Array.from({ length: 9 }, (_, i) => (
                        <option key={i + 4} value={i + 4}>
                          {i + 4} períodos
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>
            </div>
            <AdminDialog
              title="Instruções"
              open={helpOpen}
              busy={false}
              iconClose
              onClose={() => setHelpOpen(false)}
              className="sheet-help-dialog"
            >
              <p>
                Digite a camisa ou o alvo, pressione <kbd>Enter</kbd>, digite o
                código e pressione <kbd>Enter</kbd> para registrar.
              </p>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Alvo</th>
                    <th scope="col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Nº do jogador</th>
                    <td>
                      Cestas: <code>1</code>, <code>2</code> ou <code>3</code>.
                      Faltas: <code>P</code>, <code>T</code>, <code>U</code> ou{" "}
                      <code>D</code>.
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <code>C</code> · Técnico
                    </th>
                    <td>
                      Faltas: <code>B</code>, <code>C</code> ou <code>D</code>.
                    </td>
                  </tr>
                  {d.formatVersion === 2 ? (
                    <tr>
                      <th scope="row">
                        <code>AT</code> · Assistente
                      </th>
                      <td>
                        Falta: <code>D</code>.
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <th scope="row">
                        <code>B</code> · Banco
                      </th>
                      <td>
                        Faltas: <code>B1</code>, <code>B2</code> ou{" "}
                        <code>Bc</code>.
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th scope="row">
                      <code>TD</code> · Tempo debitado
                    </th>
                    <td>
                      Minuto do pedido: <code>1–10</code> no quarto ou{" "}
                      <code>1–5</code> na prorrogação.
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="sheet-help-note">
                <p>
                  Acrescente à sigla da falta a quantidade de lances livres
                  concedidos ou <code>c</code> para falta compensada.
                </p>
                <p>
                  Exemplos: <code>P2</code> (pessoal com 2 lances livres) ·{" "}
                  <code>Tc</code> (técnica compensada).
                </p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Atalhos de teclado</th>
                    <th scope="col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">
                      <kbd>Alt + A</kbd> / <kbd>Alt + B</kbd>
                    </th>
                    <td>Selecionar a equipe.</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <kbd>Alt + 1</kbd> a <kbd>Alt + 4</kbd>
                    </th>
                    <td>Selecionar o quarto correspondente.</td>
                  </tr>
                  <tr>
                    <th scope="row">
                      <kbd>Alt + Q</kbd>
                    </th>
                    <td>Ir para o seletor de período.</td>
                  </tr>
                </tbody>
              </table>
            </AdminDialog>
            {projection && (
              <SheetLiveTables
                document={d}
                projection={projection}
                game={props.game}
                name={name}
                staffNames={snapshot?.staff}
                staffName={staffName}
                disabled={locked}
                onPlayed={(id, played) => changeParticipant(id, { played })}
              />
            )}
            {editing && (
              <AdminDialog
                title="Editar ação da súmula"
                open={!!editing}
                busy={locked}
                onClose={cancelEditing}
                className="sheet-edit-dialog"
              >
                <p>
                  Altere os dados da ação selecionada. A mudança ficará no
                  rascunho até salvar.
                </p>
                {error && (
                  <p role="alert" className="access-error">
                    {error}
                  </p>
                )}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    addAction();
                  }}
                >
                  <fieldset className="sheet-edit-fields" disabled={locked}>
                    <legend className="sr-only">Dados da ação</legend>
                    <label>
                      Equipe da ação
                      <select
                        value={side}
                        onChange={(event) =>
                          setSide(event.target.value as Side)
                        }
                      >
                        <option value="home">A · {props.game.home.name}</option>
                        <option value="away">B · {props.game.away.name}</option>
                      </select>
                    </label>
                    <label>
                      Quarto ou prorrogação
                      <select
                        value={period}
                        onChange={(event) =>
                          setPeriod(Number(event.target.value))
                        }
                      >
                        {Array.from({ length: d.periods }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {periodLabel(i + 1)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Camisa ou alvo
                      <input
                        autoFocus
                        maxLength={2}
                        autoComplete="off"
                        value={target}
                        onChange={(event) => setTarget(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            editCodeRef.current?.focus();
                          }
                        }}
                      />
                    </label>
                    <label>
                      {isTimeoutTarget(target)
                        ? "Minuto decorrido (1–10, PR: 1–5)"
                        : "Ação"}
                      <input
                        ref={editCodeRef}
                        name="edit-code"
                        maxLength={3}
                        autoComplete="off"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                      />
                    </label>
                  </fieldset>
                  {d.formatVersion === 2 &&
                    (successor ||
                      /Indique explicitamente outro atleta elegível/u.test(
                        error,
                      )) && (
                      <label className="sheet-successor-choice">
                        Atleta sucessor, quando capitão e assistente estiverem
                        impedidos
                        <select
                          value={successor}
                          onChange={(event) => setSuccessor(event.target.value)}
                        >
                          <option value="">Selecione o sucessor</option>
                          {eligibleSuccessors.map((p) => (
                            <option
                              key={p.rosterEntryId}
                              value={p.rosterEntryId}
                            >
                              {p.jersey} · {name(p.rosterEntryId)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  <div className="competition-actions">
                    <button type="submit" className="primary" disabled={locked}>
                      Salvar edição da ação
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={locked}
                      onClick={cancelEditing}
                    >
                      Cancelar edição da ação
                    </button>
                  </div>
                </form>
              </AdminDialog>
            )}
            <AdminDialog
              title="Excluir esta ação?"
              open={!!deleting}
              busy={locked}
              onClose={() => setDeleting(null)}
              className="sheet-delete-dialog"
            >
              <p className="sheet-delete-context">
                Confirma a exclusão da ação selecionada no histórico?
              </p>
              <p>
                A participação do atleta será preservada. É possível desfazer a
                exclusão.
              </p>
              <div className="competition-actions">
                <button
                  type="button"
                  className="sheet-danger"
                  disabled={locked}
                  onClick={() => {
                    if (engine && deleting) {
                      try {
                        const next = deleteAction(engine, deleting);
                        if (mutate({ ...d, events: next.events })) {
                          focusAfterDelete.current = true;
                          setDeleting(null);
                          setStatus("Ação excluída do rascunho");
                        }
                      } catch (e) {
                        report(e);
                      }
                    }
                  }}
                >
                  Confirmar exclusão da ação
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={locked}
                  onClick={() => setDeleting(null)}
                >
                  Cancelar exclusão
                </button>
              </div>
            </AdminDialog>
          </div>
          <div className={preparationOpen ? undefined : "sheet-layout-pair"}>
            {!preparationOpen && projection && (
              <SheetActionHistory
                actions={projection.actions}
                periods={d.periods}
                disabled={locked || !!editing || !!deleting}
                onEdit={({ event }) => beginEditing(event)}
                onDelete={setDeleting}
              />
            )}
            <section
              className="sheet-save-panel"
              aria-labelledby="sheet-save-title"
            >
              <h4 className="sheet-section-heading" id="sheet-save-title">
                Salvamento e publicação
              </h4>
              {(snapshot?.confirmed ||
                publicationForGame?.alreadyPublished ||
                flexible) && (
                <label className="sheet-save-reason">
                  <span id={reasonLabelId}>
                    {flexible
                      ? "Comentário (opcional)"
                      : "Motivo da revisão da súmula"}
                  </span>
                  <textarea
                    aria-labelledby={reasonLabelId}
                    maxLength={500}
                    value={reason}
                    disabled={locked}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}
              <PublicationPanel
                key={`${props.game.id}:${gameVersion}:${version}`}
                game={props.game}
                document={d}
                sourceVersion={version}
                gameVersion={gameVersion}
                confirmed={!!snapshot?.confirmed}
                alreadyPublished={!!publicationForGame?.alreadyPublished}
                onAcknowledged={() =>
                  setPublicationRefresh((count) => count + 1)
                }
                draftAction={
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      busy ||
                      publicationLocked ||
                      conflict ||
                      !!editing ||
                      !!deleting
                    }
                    onClick={() => void save()}
                  >
                    {uncertain ? "Repetir envio da súmula" : "Salvar rascunho"}
                  </button>
                }
                reason={reason}
                onReason={setReason}
                disabled={
                  !props.enabled ||
                  busy ||
                  uncertain ||
                  conflict ||
                  !!editing ||
                  !!deleting
                }
                guard={publicationGuard}
                onLock={setPublicationLocked}
                onConflict={() => setConflict(true)}
                onSessionLost={props.onSessionLost}
                onPublished={async (result, explicitReload) => {
                  const latest = await api(
                    `/api/games/${props.game.id}/sheet`,
                    sheetSnapshotSchema,
                  );
                  if (
                    latest.gameId !== props.game.id ||
                    !latest.confirmed ||
                    latest.version < result.sourceVersion ||
                    latest.gameVersion < result.gameVersion
                  )
                    throw new ApiFailure(
                      503,
                      "A publicação foi confirmada, mas a fonte salva não pôde ser reconciliada. Recarregue a súmula publicada.",
                    );
                  if (
                    !explicitReload &&
                    (latest.version !== result.sourceVersion ||
                      latest.gameVersion !== result.gameVersion)
                  )
                    throw new ApiFailure(
                      409,
                      "A publicação foi confirmada e a súmula recebeu outras alterações. Recarregue para conferir.",
                    );
                  accept(latest);
                  setReason("");
                  setStatus("Resultado publicado");
                  props.onSaved();
                }}
              />
              <div className="competition-actions sheet-publication-links">
                {publicationForGame?.resultVisible && (
                  <a
                    href={`/resultado.html#${gameId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver resultado publicado
                  </a>
                )}
                {publicationForGame?.hasHistory && (
                  <PublicationHistory
                    inDialog
                    gameId={gameId}
                    enabled={props.enabled && !busy && !editing && !deleting}
                    onSessionLost={props.onSessionLost}
                  />
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        !busy && (
          <button onClick={() => setEpoch((v) => v + 1)}>
            Tentar carregar súmula
          </button>
        )
      )}
    </section>
  );
}
