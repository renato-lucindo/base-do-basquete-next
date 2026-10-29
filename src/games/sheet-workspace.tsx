import { SheetPublicationPanel } from "../publication/sheet-panel";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { aggregate, periodLabel, type Side } from "../domain/scoresheet";
import { deleteAction } from "../scoresheet/actions";
import { authorAction } from "./sheet-event-author";
import { SheetPreparation } from "./sheet-preparation";
import { SheetLiveTables } from "./sheet-live-tables";
import { SheetActionHistory } from "./sheet-action-history";
import { AdminDialog } from "../competition/admin-dialog";
import { AdminToast } from "../competition/admin-toast";
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
};
type History = {
  present: PersistedSheet;
  past: PersistedSheet[];
  future: PersistedSheet[];
};
const sides = ["home", "away"] as const;
const sideName = (s: Side) => (s === "home" ? "A" : "B");
export function GameSheetWorkspace(props: Props) {
  const [history, setHistory] = useState<History | null>(null),
    [baseline, setBaseline] = useState(""),
    [version, setVersion] = useState(0),
    [gameVersion, setGameVersion] = useState(props.game.version),
    [snapshot, setSnapshot] = useState<SheetSnapshot | null>(null),
    [reason, setReason] = useState(""),
    [publicationLocked, setPublicationLocked] = useState(false);
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
  const pending = useRef<SaveSheet | null>(null),
    initialized = useRef(false),
    auxGuard = useRef(() => true),
    publicationGuard = useRef(() => true),
    heading = useRef<HTMLHeadingElement>(null),
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
    } else heading.current?.focus();
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
    const document = validatePersistedSheet(
      s?.document ?? emptyPersistedSheet(2),
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
    if (!props.enabled || auxiliary || locked || deleting || preparationOpen)
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
  }, [props.enabled, auxiliary, locked, editing, deleting, preparationOpen]);
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
                jersey: p.jersey,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
        if (identities(next) !== identities(snapshot.document))
          throw Error(
            "Os relacionados e as camisas confirmados não podem ser alterados.",
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
    const value = target.trim().toUpperCase();
    if (
      !d ||
      (!(d.formatVersion === 2 ? ["C", "AT"] : ["B", "C"]).includes(value) &&
        !d.participants.some((p) => p.side === side && p.jersey === value))
    ) {
      setError(
        d?.formatVersion === 2
          ? "Escolha uma camisa, C para técnico ou AT para assistente."
          : "Escolha uma camisa, B para banco ou C para técnico.",
      );
      return null;
    }
    setTarget(value);
    return value;
  }
  function beginEditing(event: PersistedSheet["events"][number]) {
    editingRestore.current = { side, period, target, code };
    setError("");
    setEditing(event.id);
    setSide(event.side);
    setPeriod(event.period);
    setTarget(event.target);
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
    if (snapshot?.confirmed && !pending.current && reason.trim().length < 10) {
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
      <AdminToast message={props.enabled && !auxiliary ? status : ""} />
      <h3 ref={heading} tabIndex={-1}>
        Relacionados e súmula
      </h3>
      <p>
        {props.game.home.name} × {props.game.away.name}.{" "}
        {snapshot?.confirmed
          ? "Súmula confirmada; novas alterações ficam privadas até republicar."
          : "Rascunho privado; salvar não publica o resultado."}
      </p>
      {error && (
        <p role="alert" ref={alert} tabIndex={-1} className="access-error">
          {error}
        </p>
      )}
      <p role="status">
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
          <div className="sheet-step-bar">
            <strong>
              {preparationOpen ? "1. Preparar equipes" : "2. Lançar e conferir"}
            </strong>
            {!preparationOpen && (
              <button
                disabled={locked || !!editing || !!deleting}
                onClick={() => setPreparationOpen(true)}
              >
                Revisar preparação
              </button>
            )}
          </div>
          {preparationOpen && (
            <>
              <h4>Preparar relacionados e comissão</h4>
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
                disabled={locked || candidatesLoading || !context}
                onClick={() => void save(true)}
              >
                Concluir preparação e lançar ações
              </button>
            </>
          )}
          <div hidden={preparationOpen}>
            {!editing && (
              <fieldset
                hidden={!!editing}
                disabled={locked || !!deleting || !!editing}
                className="sheet-input"
              >
                <legend>Lançar ações</legend>
                <p>
                  Camisa + Enter + ação + Enter. Alt+A/B: equipe · Alt+1–4:
                  quarto · Alt+Q: escolher período.{" "}
                  {d.formatVersion === 2
                    ? "C: técnico · AT: assistente."
                    : "B: banco · C: técnico."}
                </p>
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
                    Ação
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
                <div className="competition-actions">
                  <button onClick={addAction}>Registrar ação</button>
                  <button
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
                    Desfazer ação ou ajuste
                  </button>
                  <button
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
                    Refazer ação ou ajuste
                  </button>
                </div>
                <label>
                  Períodos da súmula
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
                <details>
                  <summary>Códigos aceitos</summary>
                  <p>
                    1: lance livre convertido · 2/3: cestas. Atleta: P, T1, U,
                    D; P/U/D aceitam sufixos1/2/3/C, T aceita1/C.{" "}
                    {d.formatVersion === 2
                      ? "Técnico: B1/BC, C1/CC ou D/D1/D2/D3/DC. Assistente: D/D1/D2/D3/DC (B2 automática vinculada)."
                      : "Banco: B1/B2/BC. Técnico: C1/CC ou D/D1/D2/D3/DC."}{" "}
                    C no sufixo indica falta compensada.
                  </p>
                </details>
              </fieldset>
            )}
            {projection && (
              <SheetLiveTables
                document={d}
                projection={projection}
                game={props.game}
                period={period}
                name={name}
                staffNames={snapshot?.staff}
                staffName={staffName}
                disabled={locked}
                onPlayed={(id, played) => changeParticipant(id, { played })}
              />
            )}
            {projection && (
              <SheetActionHistory
                actions={projection.actions}
                periods={d.periods}
                disabled={locked || !!editing || !!deleting}
                onEdit={({ event }) => beginEditing(event)}
                onDelete={setDeleting}
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
                      Ação
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
                    <button type="submit" disabled={locked}>
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
          {snapshot?.confirmed && (
            <label>
              Motivo da revisão da súmula
              <textarea
                maxLength={500}
                value={reason}
                disabled={locked}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          <div className="competition-actions">
            <button
              disabled={
                busy || publicationLocked || conflict || !!editing || !!deleting
              }
              onClick={() => void save()}
            >
              {uncertain
                ? "Repetir envio da súmula"
                : "Salvar rascunho da súmula"}
            </button>
            <button
              disabled={busy || publicationLocked}
              onClick={() => void reload()}
            >
              Recarregar súmula
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (mayLeave()) props.onBack();
              }}
            >
              Voltar aos dados do jogo
            </button>
          </div>
          <SheetPublicationPanel
            key={`${props.game.id}:${gameVersion}:${version}`}
            game={props.game}
            document={d}
            sourceVersion={version}
            gameVersion={gameVersion}
            confirmed={!!snapshot?.confirmed}
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
