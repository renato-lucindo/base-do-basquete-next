import { SheetPublicationPanel } from "../publication/sheet-panel";
import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  aggregate,
  periodColor,
  periodLabel,
  type Side,
} from "../domain/scoresheet";
import {
  orderedActions,
  editAction,
  deleteAction,
} from "../scoresheet/actions";
import { MembersWorkspace } from "../people/workspace";
import {
  rosterListingSchema,
  type RosterSnapshot,
} from "../people/roster-contract";
import {
  staffListingSchema,
  type StaffSnapshot,
} from "../people/staff-contract";
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
const orderShirts = (
  a: { jersey: string | null },
  b: { jersey: string | null },
) =>
  a.jersey === null
    ? 1
    : b.jersey === null
      ? -1
      : Number(a.jersey) - Number(b.jersey) ||
        a.jersey.length - b.jersey.length;
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
  const [roster, setRoster] = useState<RosterSnapshot[]>([]),
    [staff, setStaff] = useState<StaffSnapshot[]>([]),
    [epoch, setEpoch] = useState(0),
    [pages, setPages] = useState({
      home: { roster: 0, staff: 0 },
      away: { roster: 0, staff: 0 },
    }),
    [more, setMore] = useState({
      home: { roster: false, staff: false },
      away: { roster: false, staff: false },
    }),
    [shirts, setShirts] = useState<Record<string, string>>({}),
    [auxiliary, setAuxiliary] = useState<Side | null>(null),
    [candidatesLoading, setCandidatesLoading] = useState(false),
    [preparationOpen, setPreparationOpen] = useState(true);
  const [side, setSide] = useState<Side>("home"),
    [period, setPeriod] = useState(1),
    [target, setTarget] = useState(""),
    [code, setCode] = useState(""),
    [order, setOrder] = useState<"entry" | "period">("entry"),
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
    deleteHeading = useRef<HTMLHeadingElement>(null);
  const auxiliaryTriggers = useRef<
      Partial<Record<Side, HTMLButtonElement | null>>
    >({}),
    returningToSide = useRef<Side | null>(null);
  const d = history?.present,
    dirty = !!d && JSON.stringify(d) !== baseline,
    locked = busy || uncertain || conflict || publicationLocked;
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
    if (!dirty && !uncertain && !editing) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain, editing]);
  useEffect(() => {
    if (!props.enabled) return;
    if (!auxiliary && returningToSide.current) {
      auxiliaryTriggers.current[returningToSide.current]?.focus();
      returningToSide.current = null;
    } else heading.current?.focus();
  }, [props.enabled, auxiliary, !!history]);
  useEffect(() => {
    if (error && props.enabled) alert.current?.focus();
  }, [error, props.enabled]);
  useEffect(() => {
    deleteHeading.current?.focus();
  }, [deleting]);
  function report(e: unknown) {
    if (isSessionFailure(e)) props.onSessionLost();
    else
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
  }
  function accept(s: SheetSnapshot | null, gv = props.game.version) {
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
      s?.document ?? emptyPersistedSheet(),
    );
    setHistory({ present: document, past: [], future: [] });
    setBaseline(JSON.stringify(document));
    setVersion(s?.version ?? 0);
    setGameVersion(s?.gameVersion ?? gv);
    setSnapshot(s);
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
    let remaining = 2;
    setCandidatesLoading(true);
    const controller = new AbortController();
    for (const s of sides) {
      const reg = s === "home" ? props.game.home.id : props.game.away.id;
      void Promise.all([
        api(
          `/api/roster?registrationId=${reg}&activeOnly=1&offset=${pages[s].roster}`,
          rosterListingSchema,
          undefined,
          controller.signal,
        ),
        api(
          `/api/staff?registrationId=${reg}&activeOnly=1&offset=${pages[s].staff}`,
          staffListingSchema,
          undefined,
          controller.signal,
        ),
      ])
        .then(([r, t]) => {
          if (!active) return;
          setRoster((old) => [
            ...new Map([...old, ...r.items].map((x) => [x.id, x])).values(),
          ]);
          setStaff((old) => [
            ...new Map([...old, ...t.items].map((x) => [x.id, x])).values(),
          ]);
          setMore((old) => ({
            ...old,
            [s]: { roster: r.hasMore, staff: t.hasMore },
          }));
        })
        .catch((e) => {
          if (active) report(e);
        })
        .finally(() => {
          if (active && --remaining === 0) setCandidatesLoading(false);
        });
    }
    return () => {
      active = false;
      controller.abort();
    };
  }, [props.enabled, props.game.id, !!history, auxiliary, pages, epoch]);
  const focusTarget = () => {
    targetRef.current?.focus();
    targetRef.current?.select();
  };
  useEffect(() => {
    if (!props.enabled || auxiliary || locked || deleting) return;
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
  }, [props.enabled, auxiliary, locked, editing, deleting]);
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
      const document = validatePersistedSheet(next);
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
  function changeStaff(s: Side, patch: Partial<PersistedSheet["staff"][Side]>) {
    if (d)
      mutate({ ...d, staff: { ...d.staff, [s]: { ...d.staff[s], ...patch } } });
  }
  function checkedTarget() {
    const value = target.trim().toUpperCase();
    if (
      !d ||
      (!["B", "C"].includes(value) &&
        !d.participants.some((p) => p.side === side && p.jersey === value))
    ) {
      setError(
        "Escolha a camisa de um relacionado desta equipe, B para banco ou C para técnico.",
      );
      return null;
    }
    setTarget(value);
    return value;
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
        const engine = editAction(toEngineSheet(d), editing, patch);
        next = {
          ...d,
          events: engine.events,
          participants: d.participants.map((p, i) => ({
            ...p,
            played: engine.roster[i].played,
          })),
        };
      } else
        next = {
          ...d,
          participants: d.participants.map((p) =>
            p.side === side && p.jersey === value ? { ...p, played: true } : p,
          ),
          events: [...d.events, { id: crypto.randomUUID(), ...patch }],
        };
      if (mutate(next)) {
        setCode("");
        setEditing(null);
        focusTarget();
      }
    } catch (e) {
      report(e);
    }
  }
  async function save() {
    if (!d || busy || conflict) return;
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
      accept(s);
      setStatus("Rascunho da súmula salvo");
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
  const engine = d ? toEngineSheet(d) : null,
    totals = engine ? aggregate(engine) : null;
  function name(id: string) {
    return (
      snapshot?.participants.find((p) => p.rosterEntryId === id)?.person.name ??
      roster.find((p) => p.id === id)?.person.name ??
      "Atleta relacionado"
    );
  }
  return (
    <section className="game-sheet" aria-busy={busy}>
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
                setRoster((rows) => rows.map((r) => ({ ...r, active: false })));
                setStaff((rows) => rows.map((r) => ({ ...r, active: false })));
                setPages({
                  home: { roster: 0, staff: 0 },
                  away: { roster: 0, staff: 0 },
                });
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
          <details
            open={preparationOpen}
            onToggle={(e) => setPreparationOpen(e.currentTarget.open)}
          >
            <summary>Preparar relacionados e comissão</summary>
            <fieldset disabled={locked} className="sheet-preparation">
              <legend>Relacionados e comissão deste jogo</legend>
              {candidatesLoading && (
                <p role="status">Carregando elencos e comissão…</p>
              )}
              {sides.map((s) => {
                const reg = s === "home" ? props.game.home : props.game.away,
                  rows = d.participants
                    .filter((p) => p.side === s)
                    .sort(orderShirts),
                  candidates = roster
                    .filter((r) => r.registrationId === reg.id && r.active)
                    .sort(orderShirts);
                return (
                  <section key={s} className="sheet-team">
                    <h4>
                      Equipe {sideName(s)} · {reg.name}
                    </h4>
                    <p>
                      {rows.length}/12 relacionados ·{" "}
                      {rows.filter((p) => p.starter).length}/5 titulares.
                      Selecione os titulares; eles não são inferidos do elenco.
                    </p>
                    <details>
                      <summary>Selecionar atletas do elenco</summary>
                      {!candidatesLoading && candidates.length === 0 && (
                        <p>
                          Nenhum atleta ativo carregado. Cadastre ou importe no
                          elenco desta equipe.
                        </p>
                      )}
                      {candidates.map((m) => {
                        const selected = rows.some(
                            (p) => p.rosterEntryId === m.id,
                          ),
                          shirt = shirts[m.id] ?? m.jersey ?? "";
                        return (
                          <div key={m.id} className="sheet-candidate">
                            <label className="sheet-check">
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={snapshot?.confirmed}
                                aria-label={`Relacionar ${m.person.name}`}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (!/^(00|0|[1-9][0-9]?)$/u.test(shirt)) {
                                      setError(
                                        "Informe uma camisa válida para relacionar o atleta.",
                                      );
                                      return;
                                    }
                                    mutate({
                                      ...d,
                                      participants: [
                                        ...d.participants,
                                        {
                                          rosterEntryId: m.id,
                                          side: s,
                                          jersey: shirt,
                                          played: false,
                                          starter: false,
                                        },
                                      ],
                                    });
                                  } else
                                    mutate({
                                      ...d,
                                      participants: d.participants.filter(
                                        (p) => p.rosterEntryId !== m.id,
                                      ),
                                      staff: {
                                        ...d.staff,
                                        [s]: {
                                          ...d.staff[s],
                                          captainRosterEntryId:
                                            d.staff[s].captainRosterEntryId ===
                                            m.id
                                              ? null
                                              : d.staff[s].captainRosterEntryId,
                                        },
                                      },
                                    });
                                }}
                              />
                              {m.person.name}
                            </label>
                            {!selected && (
                              <label>
                                Camisa para {m.person.name}
                                <input
                                  value={shirt}
                                  maxLength={2}
                                  inputMode="numeric"
                                  onChange={(e) =>
                                    setShirts((old) => ({
                                      ...old,
                                      [m.id]: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                      <button
                        disabled={candidatesLoading || !more[s].roster}
                        onClick={() =>
                          setPages((old) => ({
                            ...old,
                            [s]: { ...old[s], roster: old[s].roster + 20 },
                          }))
                        }
                      >
                        Mais atletas {sideName(s)}
                      </button>
                    </details>
                    <ul className="sheet-roster">
                      {rows.map((p) => (
                        <li key={p.rosterEntryId}>
                          <strong>
                            #{p.jersey} · {name(p.rosterEntryId)}
                          </strong>
                          <label>
                            Camisa de {name(p.rosterEntryId)}
                            <input
                              value={p.jersey}
                              disabled={snapshot?.confirmed}
                              maxLength={2}
                              inputMode="numeric"
                              onChange={(e) =>
                                changeParticipant(p.rosterEntryId, {
                                  jersey: e.target.value,
                                })
                              }
                            />
                          </label>
                          <div className="sheet-checks">
                            <label className="sheet-check">
                              <input
                                type="checkbox"
                                aria-label={`Participou ${name(p.rosterEntryId)}`}
                                checked={p.played}
                                onChange={(e) =>
                                  changeParticipant(p.rosterEntryId, {
                                    played: e.target.checked,
                                  })
                                }
                              />
                              Participou
                            </label>
                            <label className="sheet-check">
                              <input
                                type="checkbox"
                                aria-label={`Titular ${name(p.rosterEntryId)}`}
                                checked={p.starter}
                                onChange={(e) =>
                                  changeParticipant(p.rosterEntryId, {
                                    starter: e.target.checked,
                                    played: e.target.checked || p.played,
                                  })
                                }
                              />
                              Titular
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="competition-form">
                      <label>
                        Capitão {sideName(s)}
                        <select
                          aria-label={`Capitão ${sideName(s)}`}
                          value={d.staff[s].captainRosterEntryId ?? ""}
                          onChange={(e) =>
                            changeStaff(s, {
                              captainRosterEntryId: e.target.value || null,
                            })
                          }
                        >
                          <option value="">Selecione o capitão</option>
                          {rows.map((p) => (
                            <option
                              key={p.rosterEntryId}
                              value={p.rosterEntryId}
                            >
                              #{p.jersey} · {name(p.rosterEntryId)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Técnico {sideName(s)}
                        <select
                          aria-label={`Técnico ${sideName(s)}`}
                          value={d.staff[s].coachStaffEntryId ?? ""}
                          onChange={(e) =>
                            changeStaff(s, {
                              coachStaffEntryId: e.target.value || null,
                              ...(!e.target.value
                                ? { assistantStaffEntryId: null }
                                : {}),
                            })
                          }
                        >
                          <option value="">Capitão assume como técnico</option>
                          {d.staff[s].coachStaffEntryId &&
                            !staff.some(
                              (t) =>
                                t.id === d.staff[s].coachStaffEntryId &&
                                t.active,
                            ) && (
                              <option value={d.staff[s].coachStaffEntryId!}>
                                {snapshot?.staff[s].coach?.name ??
                                  "Técnico deste jogo"}
                              </option>
                            )}
                          {staff
                            .filter(
                              (t) =>
                                t.registrationId === reg.id &&
                                t.active &&
                                t.role === "head",
                            )
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.person.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      {d.staff[s].coachStaffEntryId && (
                        <label>
                          Ass. Técnico {sideName(s)}
                          <select
                            aria-label={`Ass. Técnico ${sideName(s)}`}
                            value={d.staff[s].assistantStaffEntryId ?? ""}
                            onChange={(e) =>
                              changeStaff(s, {
                                assistantStaffEntryId: e.target.value || null,
                              })
                            }
                          >
                            <option value="">Sem assistente</option>
                            {d.staff[s].assistantStaffEntryId &&
                              !staff.some(
                                (t) =>
                                  t.id === d.staff[s].assistantStaffEntryId &&
                                  t.active,
                              ) && (
                                <option
                                  value={d.staff[s].assistantStaffEntryId!}
                                >
                                  {snapshot?.staff[s].assistant?.name ??
                                    "Assistente deste jogo"}
                                </option>
                              )}
                            {staff
                              .filter(
                                (t) =>
                                  t.registrationId === reg.id &&
                                  t.active &&
                                  t.role === "assistant",
                              )
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.person.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <div className="competition-actions">
                      <button
                        disabled={candidatesLoading || !more[s].staff}
                        onClick={() =>
                          setPages((old) => ({
                            ...old,
                            [s]: { ...old[s], staff: old[s].staff + 20 },
                          }))
                        }
                      >
                        Mais comissão {sideName(s)}
                      </button>
                      <button
                        ref={(el) => {
                          auxiliaryTriggers.current[s] = el;
                        }}
                        onClick={() => setAuxiliary(s)}
                      >
                        Editar elenco {sideName(s)} aqui
                      </button>
                    </div>
                  </section>
                );
              })}
            </fieldset>
            <button
              disabled={locked}
              onClick={() => {
                setPreparationOpen(false);
                focusTarget();
              }}
            >
              Concluir preparação e lançar ações
            </button>
          </details>
          <fieldset disabled={locked || !!deleting} className="sheet-input">
            <legend>
              {editing ? "Editar ação selecionada" : "Lançar ações"}
            </legend>
            <p>
              Camisa + Enter + ação + Enter. Alt+A/B: equipe · Alt+1–4: quarto ·
              Alt+Q: escolher período. Alvos B: banco, C: técnico.
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
            <div className="competition-actions">
              <button onClick={addAction}>
                {editing ? "Salvar edição da ação" : "Registrar ação"}
              </button>
              {editing && (
                <button
                  onClick={() => {
                    setEditing(null);
                    setCode("");
                    focusTarget();
                  }}
                >
                  Cancelar edição da ação
                </button>
              )}
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
                1: lance livre convertido · 2/3: cestas. Atleta: P, T1, U, D;
                P/U/D aceitam sufixos1/2/3/C, T aceita1/C. Banco: B1/B2/BC.
                Técnico: C1/CC ou D/D1/D2/D3/DC. C no sufixo indica falta
                compensada.
              </p>
            </details>
          </fieldset>
          <h4>Ações registradas</h4>
          <label>
            Ordem das ações
            <select
              aria-label="Ordem das ações"
              value={order}
              onChange={(e) => setOrder(e.target.value as "entry" | "period")}
            >
              <option value="entry">Ordem de lançamento</option>
              <option value="period">Quarto Q1 → Q2 → Q3 → Q4 → OT</option>
            </select>
          </label>
          {!d.events.length ? (
            <p>Sem ações registradas.</p>
          ) : (
            <>
              <p>
                Prévia da súmula: {props.game.home.name}{" "}
                {totals?.teams.home.points} × {totals?.teams.away.points}{" "}
                {props.game.away.name}
              </p>
              <ol className="sheet-actions">
                {engine &&
                  orderedActions(engine, order).map(({ event, sequence }) => (
                    <li
                      key={event.id}
                      className={`sheet-period-${periodColor(event.period)}`}
                    >
                      <span>
                        {sequence}. {periodLabel(event.period)} ·{" "}
                        {sideName(event.side)} · {event.target} · {event.code}
                      </span>
                      <div className="competition-actions">
                        <button
                          disabled={locked || !!editing || !!deleting}
                          aria-label={`Editar ação ${sequence}`}
                          onClick={() => {
                            setEditing(event.id);
                            setSide(event.side);
                            setPeriod(event.period);
                            setTarget(event.target);
                            setCode(event.code);
                            targetRef.current?.focus();
                          }}
                        >
                          Editar
                        </button>
                        <button
                          disabled={locked || !!editing || !!deleting}
                          aria-label={`Excluir ação ${sequence}`}
                          onClick={() => setDeleting(event.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </li>
                  ))}
              </ol>
            </>
          )}
          {deleting && (
            <div className="sheet-delete">
              <h4 ref={deleteHeading} tabIndex={-1}>
                Excluir esta ação?
              </h4>
              <p>
                A participação do atleta será preservada. É possível desfazer a
                exclusão.
              </p>
              <button
                disabled={locked}
                onClick={() => {
                  if (engine) {
                    try {
                      const next = deleteAction(engine, deleting);
                      if (mutate({ ...d, events: next.events })) {
                        setDeleting(null);
                        focusTarget();
                      }
                    } catch (e) {
                      report(e);
                    }
                  }
                }}
              >
                Confirmar exclusão da ação
              </button>
              <button onClick={() => setDeleting(null)}>
                Cancelar exclusão
              </button>
            </div>
          )}
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
