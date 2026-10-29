import { useEffect, useRef, useState, type FormEvent } from "react";
import type { z } from "zod";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { saveResultSchema } from "../competition/contract";
import {
  emptyPerson,
  personSchema,
  personSnapshotSchema,
  personListingSchema,
  savePersonSchema,
  type PersonSnapshot,
  type SavePerson,
} from "./contract";
import {
  rosterListingSchema,
  rosterSnapshotSchema,
  saveRosterSchema,
  type SaveRoster,
  type RosterSnapshot,
} from "./roster-contract";
import {
  staffListingSchema,
  staffSnapshotSchema,
  saveStaffSchema,
  type SaveStaff,
  type StaffSnapshot,
} from "./staff-contract";
import { PersonFields } from "./person-fields";
import { PersonPicker } from "./person-picker";
import { AdminDialog } from "../competition/admin-dialog";
import { AdminToast } from "../competition/admin-toast";
import { ProfilePublicationPanel } from "../player-profile/publication-panel";
import { TransferPanel } from "./transfer-panel";
import { RosterReusePanel } from "./roster-reuse-panel";
import { TextImportWorkspace } from "../text-import/workspace";
import type { RegistrationSnapshot } from "../teams/contract";
import "./workspace.css";
type Target = "athlete" | "head" | "assistant" | "none";
type Summary = RosterSnapshot["person"];
type Editor =
  | {
      kind: "person";
      command: SavePerson;
      target: Target;
      originalAthlete: boolean;
      originalCoach: boolean;
      needsPersonSave: boolean;
      roster?: { command: SaveRoster; initialJersey: string | null };
    }
  | { kind: "roster"; command: SaveRoster; person: Summary; wasActive: boolean }
  | { kind: "staff"; command: SaveStaff; person: Summary; wasActive: boolean };
type Props = {
  registration: RegistrationSnapshot;
  gender: "masculino" | "feminino";
  enabled: boolean;
  canEdit: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
};
const summary = (p: PersonSnapshot): Summary => ({
  id: p.id,
  name: p.name,
  nickname: p.nickname,
  publicBirthYear: p.publicBirthYear,
});
export function MembersWorkspace({
  registration,
  gender,
  enabled,
  canEdit,
  guard,
  onSessionLost,
  onSaved,
}: Props) {
  const [importing, setImporting] = useState(false);
  const [reusing, setReusing] = useState(false);
  const reuseGuard = useRef<() => boolean>(() => true);
  const [profiling, setProfiling] = useState<string | null>(null);
  const profileGuard = useRef<() => boolean>(() => true);
  const [transferring, setTransferring] = useState<RosterSnapshot | null>(null);
  const transferGuard = useRef<() => boolean>(() => true);
  const importGuard = useRef<() => boolean>(() => true);
  const [roster, setRoster] = useState<z.infer<typeof rosterListingSchema>>({
    items: [],
    hasMore: false,
  });
  const [staff, setStaff] = useState<z.infer<typeof staffListingSchema>>({
    items: [],
    hasMore: false,
  });
  const [candidates, setCandidates] = useState<
    z.infer<typeof personListingSchema>
  >({ items: [], hasMore: false });
  const [history, setHistory] = useState(false),
    [rosterOffset, setRosterOffset] = useState(0),
    [staffOffset, setStaffOffset] = useState(0);
  const [target, setTarget] = useState<Target | null>(null),
    [query, setQuery] = useState(""),
    [searchOffset, setSearchOffset] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null),
    [baseline, setBaseline] = useState("");
  const [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [searchLoading, setSearchLoading] = useState(false);
  const [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [duplicate, setDuplicate] = useState(false);
  const [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    form = useRef<HTMLFormElement>(null),
    search = useRef<HTMLInputElement>(null);
  const jerseyChanged =
    editor?.kind === "person" &&
    editor.roster &&
    editor.roster.initialJersey !== editor.roster.command.entry.jersey;
  const rosterNeedsSave =
    editor?.kind === "person" &&
    editor.roster &&
    (editor.roster.command.expectedVersion === 0 || jerseyChanged);
  const dirty =
    !!editor &&
    (JSON.stringify(editor.command) !== baseline || !!jerseyChanged);
  const [partialSaved, setPartialSaved] = useState(false);
  const acknowledged = useRef(
    new Map<string, { id: string; version: number }>(),
  );
  const unconfirmed = useRef(new Set<string>());
  useEffect(() => {
    if (!profiling) heading.current?.focus();
  }, [profiling]);
  function mayLeave() {
    return (
      importGuard.current() &&
      reuseGuard.current() &&
      transferGuard.current() &&
      profileGuard.current() &&
      (!(busy || dirty || uncertain) ||
        (!busy &&
          window.confirm(
            "Há alterações não salvas ou um envio não confirmado. Deseja sair desta edição?",
          )))
    );
  }
  useEffect(() => {
    guard.current = mayLeave;
    return () => {
      guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!dirty && !uncertain) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain]);
  useEffect(() => {
    if (!enabled) return;
    if (editor)
      form.current
        ?.querySelector<HTMLInputElement>(
          "input:not([type=checkbox]):not(:disabled)",
        )
        ?.focus();
    else if (target) search.current?.focus();
    else heading.current?.focus();
  }, [editor?.command.commandId, target, enabled, importing]);
  useEffect(() => {
    if (error && enabled) alert.current?.focus();
  }, [error, enabled]);
  function report(failure: unknown) {
    if (isSessionFailure(failure)) onSessionLost();
    else
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível concluir. Tente novamente.",
      );
  }
  useEffect(() => {
    if (!enabled || importing) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const args = `registrationId=${registration.id}&activeOnly=${history ? 0 : 1}`;
    void Promise.all([
      api(
        `/api/roster?${args}&offset=${rosterOffset}`,
        rosterListingSchema,
        undefined,
        controller.signal,
      ),
      api(
        `/api/staff?${args}&offset=${staffOffset}`,
        staffListingSchema,
        undefined,
        controller.signal,
      ),
    ])
      .then(([a, b]) => {
        if (active) {
          setRoster(a);
          setStaff(b);
        }
      })
      .catch((failure) => {
        if (active) report(failure);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    enabled,
    registration.id,
    history,
    rosterOffset,
    staffOffset,
    refresh,
    importing,
  ]);
  useEffect(() => {
    if (!enabled || !target || query.trim().length < 2) {
      setCandidates({ items: [], hasMore: false });
      setSearchLoading(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setSearchLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/api/people?q=${encodeURIComponent(query.trim())}&kind=all&offset=${searchOffset}`,
        personListingSchema,
        undefined,
        controller.signal,
      )
        .then((value) => {
          if (active) setCandidates(value);
        })
        .catch((failure) => {
          if (active) report(failure);
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, target, query, searchOffset, refresh]);
  function begin(value: Editor) {
    acknowledged.current.clear();
    unconfirmed.current.clear();
    setPartialSaved(false);
    setEditor(value);
    setBaseline(JSON.stringify(value.command));
    setTarget(null);
    setUncertain(false);
    setConflict(false);
    setDuplicate(false);
    setError("");
    setStatus("");
  }
  function cancel() {
    if (!mayLeave()) return;
    setEditor(null);
    setTarget(null);
    setError("");
    setUncertain(false);
    setConflict(false);
    setDuplicate(false);
    setStatus("");
  }
  function chooseTarget(value: Target) {
    if (!mayLeave()) return;
    setEditor(null);
    setTarget(value);
    setQuery("");
    setCandidates({ items: [], hasMore: false });
    setSearchOffset(0);
    setUncertain(false);
    setConflict(false);
    setError("");
    setStatus("");
  }
  function personEditor(
    p: PersonSnapshot | undefined,
    wanted: Target,
    rosterEntry?: RosterSnapshot,
  ) {
    const draft = p
      ? (() => {
          const { version, savedAt, ...value } = p;
          void version;
          void savedAt;
          return personSchema.parse(value);
        })()
      : emptyPerson(crypto.randomUUID());
    if (!p) draft.name = query.trim().replace(/\s+/gu, " ");
    if (wanted === "athlete" && !draft.athlete)
      draft.athlete = {
        sex: gender === "feminino" ? "female" : "male",
        birthDate: null,
        federationRegistration: null,
      };
    if (wanted === "head" || wanted === "assistant") draft.coach = true;
    begin({
      kind: "person",
      target: wanted,
      originalAthlete: !!p?.athlete,
      originalCoach: p?.coach ?? false,
      needsPersonSave:
        !p ||
        p.coach !== draft.coach ||
        (p.athlete === null) !== (draft.athlete === null),
      ...(rosterEntry?.active
        ? {
            roster: {
              initialJersey: rosterEntry.jersey,
              command: {
                commandId: crypto.randomUUID(),
                expectedVersion: rosterEntry.version,
                entry: {
                  id: rosterEntry.id,
                  registrationId: rosterEntry.registrationId,
                  personId: rosterEntry.personId,
                  jersey: rosterEntry.jersey,
                  active: true,
                },
              },
            },
          }
        : wanted === "athlete"
          ? {
              roster: {
                initialJersey: null,
                command: {
                  commandId: crypto.randomUUID(),
                  expectedVersion: 0,
                  entry: {
                    id: crypto.randomUUID(),
                    registrationId: registration.id,
                    personId: draft.id,
                    jersey: null,
                    active: true,
                  },
                },
              },
            }
          : {}),
      command: {
        commandId: crypto.randomUUID(),
        expectedVersion: p?.version ?? 0,
        disputeId: wanted === "none" ? null : registration.disputeId,
        confirmHomonym: false,
        person: draft,
      },
    });
  }
  function membership(p: PersonSnapshot, wanted: Target) {
    if (wanted === "athlete")
      begin({
        kind: "roster",
        person: summary(p),
        wasActive: true,
        command: {
          commandId: crypto.randomUUID(),
          expectedVersion: 0,
          entry: {
            id: crypto.randomUUID(),
            registrationId: registration.id,
            personId: p.id,
            jersey: null,
            active: true,
          },
        },
      });
    else if (wanted === "head" || wanted === "assistant")
      begin({
        kind: "staff",
        person: summary(p),
        wasActive: true,
        command: {
          commandId: crypto.randomUUID(),
          expectedVersion: 0,
          entry: {
            id: crypto.randomUUID(),
            registrationId: registration.id,
            personId: p.id,
            role: wanted,
            active: true,
          },
        },
      });
  }
  async function usePerson(
    id: string,
    wanted: Target,
    rosterEntry?: RosterSnapshot,
  ) {
    setBusy(true);
    setError("");
    try {
      const p = await api(`/api/people/${id}`, personSnapshotSchema);
      if (
        wanted === "none" ||
        (wanted === "athlete" && !p.athlete) ||
        (wanted !== "athlete" && !p.coach)
      )
        personEditor(p, wanted, rosterEntry);
      else membership(p, wanted);
    } catch (failure) {
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  function editRoster(r: RosterSnapshot, end = false) {
    if (!mayLeave()) return;
    begin({
      kind: "roster",
      person: r.person,
      wasActive: r.active,
      command: {
        commandId: crypto.randomUUID(),
        expectedVersion: r.version,
        entry: {
          id: r.id,
          registrationId: r.registrationId,
          personId: r.personId,
          jersey: r.jersey,
          active: end ? false : r.active,
        },
      },
    });
  }
  function editStaff(r: StaffSnapshot) {
    if (!mayLeave()) return;
    begin({
      kind: "staff",
      person: r.person,
      wasActive: r.active,
      command: {
        commandId: crypto.randomUUID(),
        expectedVersion: r.version,
        entry: {
          id: r.id,
          registrationId: r.registrationId,
          personId: r.personId,
          role: r.role,
          active: false,
        },
      },
    });
  }
  async function persist(
    path: string,
    command: SavePerson | SaveRoster | SaveStaff,
  ) {
    const known = acknowledged.current.get(command.commandId);
    if (known) return known;
    unconfirmed.current.add(command.commandId);
    try {
      const result = await api(path, saveResultSchema, command);
      const expectedId =
        "person" in command ? command.person.id : command.entry.id;
      if (
        result.id !== expectedId ||
        result.version !== command.expectedVersion + 1
      )
        throw new Error("A resposta não corresponde ao cadastro enviado.");
      acknowledged.current.set(command.commandId, result);
      unconfirmed.current.delete(command.commandId);
      return result;
    } catch (failure) {
      // A validation rejection is definitive; transport failures can hide a commit.
      if (failure instanceof ApiFailure && failure.status === 400)
        unconfirmed.current.delete(command.commandId);
      throw failure;
    }
  }
  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!editor || busy || conflict) return;
    const valid =
      editor.kind === "person"
        ? savePersonSchema.safeParse(editor.command)
        : editor.kind === "roster"
          ? saveRosterSchema.safeParse(editor.command)
          : saveStaffSchema.safeParse(editor.command);
    if (
      !valid.success ||
      (editor.kind === "person" &&
        editor.roster &&
        !saveRosterSchema.safeParse(editor.roster.command).success)
    ) {
      setError(
        editor.kind === "person"
          ? "Revise os dados da pessoa e a camisa (0, 00 ou 1–99)."
          : "Informe camisa válida: 0, 00 ou 1–99.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      if (editor.kind === "person") {
        const result =
          editor.needsPersonSave || JSON.stringify(editor.command) !== baseline
            ? await persist("/api/people", editor.command)
            : {
                id: editor.command.person.id,
                version: editor.command.expectedVersion,
              };
        const p = await api(`/api/people/${result.id}`, personSnapshotSchema);
        if (p.id !== editor.command.person.id)
          throw new Error("Não foi possível confirmar o cadastro solicitado.");
        if (editor.roster && rosterNeedsSave) {
          const receipt = await persist("/api/roster", editor.roster.command);
          const row = await api(
            `/api/roster/${receipt.id}`,
            rosterSnapshotSchema,
          );
          if (
            row.id !== editor.roster.command.entry.id ||
            row.personId !== p.id ||
            row.registrationId !== registration.id
          )
            throw new Error(
              "Não foi possível confirmar a camisa desta inscrição.",
            );
        }
        if (editor.target === "none" || editor.roster) {
          setEditor(null);
          setStatus(
            editor.target === "athlete" ? "Vínculo salvo." : "Pessoa salva.",
          );
          setPartialSaved(false);
          setUncertain(false);
          setConflict(false);
        } else membership(p, editor.target);
      } else {
        const path = editor.kind === "roster" ? "/api/roster" : "/api/staff";
        const result = await persist(path, editor.command);
        const value =
          editor.kind === "roster"
            ? await api(`${path}/${result.id}`, rosterSnapshotSchema)
            : await api(`${path}/${result.id}`, staffSnapshotSchema);
        if (
          value.registrationId !== registration.id ||
          value.personId !== editor.command.entry.personId
        )
          throw new Error(
            "A resposta não corresponde à inscrição selecionada.",
          );
        setEditor(null);
        setUncertain(false);
        setConflict(false);
        setStatus("Vínculo salvo.");
      }
      setRefresh((v) => v + 1);
      onSaved();
    } catch (failure) {
      if (
        failure instanceof ApiFailure &&
        failure.code === "identity_confirmation_required"
      ) {
        setDuplicate(true);
        setUncertain(false);
        setConflict(false);
      } else if (failure instanceof ApiFailure && failure.status === 409) {
        setConflict(true);
        setUncertain(false);
      } else
        setUncertain(
          !(failure instanceof ApiFailure && failure.status === 400),
        );
      report(failure);
      if (
        editor.kind === "person" &&
        rosterNeedsSave &&
        acknowledged.current.has(editor.command.commandId)
      ) {
        setPartialSaved(true);
        setError(
          `Os dados globais da pessoa já foram salvos. Falta concluir a confirmação da camisa nesta inscrição. ${failure instanceof Error ? failure.message : "Tente novamente."}`,
        );
        if (!(failure instanceof ApiFailure && failure.status === 409))
          setUncertain(true);
      }
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (!editor || busy || !mayLeave()) return;
    setBusy(true);
    setError("");
    try {
      if (editor.kind === "person") {
        let rosterEntry: RosterSnapshot | undefined;
        const command = editor.roster?.command;
        if (
          command &&
          (command.expectedVersion > 0 ||
            acknowledged.current.has(command.commandId) ||
            unconfirmed.current.has(command.commandId))
        ) {
          const path = `/api/roster/${command.entry.id}`;
          try {
            rosterEntry = await api(path, rosterSnapshotSchema);
          } catch (failure) {
            if (!(
              command.expectedVersion === 0 &&
              unconfirmed.current.has(command.commandId) &&
              failure instanceof ApiFailure &&
              failure.status === 404 &&
              failure.code === "context_not_found"
            ))
              throw failure;
            // A read can precede a delayed commit. Replay the original intent first.
            await persist("/api/roster", command);
            rosterEntry = await api(path, rosterSnapshotSchema);
          }
        }
        if (
          rosterEntry &&
          (rosterEntry.id !== command?.entry.id ||
            rosterEntry.personId !== editor.command.person.id ||
            rosterEntry.registrationId !== registration.id)
        )
          throw new Error("O vínculo não corresponde a esta inscrição.");
        personEditor(
          await api(
            `/api/people/${editor.command.person.id}`,
            personSnapshotSchema,
          ),
          editor.target,
          rosterEntry,
        );
      } else if (editor.kind === "roster") {
        const r = await api(
          `/api/roster/${editor.command.entry.id}`,
          rosterSnapshotSchema,
        );
        begin({
          kind: "roster",
          person: r.person,
          wasActive: r.active,
          command: {
            commandId: crypto.randomUUID(),
            expectedVersion: r.version,
            entry: {
              id: r.id,
              registrationId: r.registrationId,
              personId: r.personId,
              jersey: r.jersey,
              active: r.active,
            },
          },
        });
      } else {
        const r = await api(
          `/api/staff/${editor.command.entry.id}`,
          staffSnapshotSchema,
        );
        begin({
          kind: "staff",
          person: r.person,
          wasActive: r.active,
          command: {
            commandId: crypto.randomUUID(),
            expectedVersion: r.version,
            entry: {
              id: r.id,
              registrationId: r.registrationId,
              personId: r.personId,
              role: r.role,
              active: r.active,
            },
          },
        });
      }
    } catch (failure) {
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || !canEdit;
  const feedback = (
    <>
      {error && (
        <p ref={alert} tabIndex={-1} role="alert" className="access-error">
          {error}
        </p>
      )}
      {error && target && (
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            setError("");
            setRefresh((value) => value + 1);
            search.current?.focus();
          }}
        >
          Tentar novamente
        </button>
      )}
      <p role="status">
        {busy
          ? "Aguarde…"
          : uncertain
            ? "Envio não confirmado"
            : conflict
              ? "Conflito de versão"
              : dirty
                ? "Não salvo"
                : status}
      </p>
    </>
  );
  if (profiling)
    return (
      <ProfilePublicationPanel
        key={profiling}
        personId={profiling}
        enabled={enabled && canEdit}
        guard={profileGuard}
        onSessionLost={onSessionLost}
        onSaved={onSaved}
        onClose={() => {
          setProfiling(null);
          setRefresh((v) => v + 1);
        }}
      />
    );
  if (transferring)
    return (
      <TransferPanel
        key={transferring.id}
        source={transferring}
        enabled={enabled && canEdit}
        guard={transferGuard}
        onSessionLost={onSessionLost}
        onSaved={() => {
          setRefresh((v) => v + 1);
          onSaved();
        }}
        onClose={() => {
          setTransferring(null);
          setRefresh((v) => v + 1);
        }}
      />
    );
  if (importing)
    return (
      <TextImportWorkspace
        disputeId={registration.disputeId}
        gender={gender}
        registration={registration}
        enabled={enabled}
        canEdit={canEdit}
        guard={importGuard}
        onSessionLost={onSessionLost}
        onSaved={() => {
          setRefresh((v) => v + 1);
          onSaved();
        }}
        onClose={() => setImporting(false)}
      />
    );
  if (reusing)
    return (
      <RosterReusePanel
        key={registration.id}
        registration={registration}
        enabled={enabled && canEdit}
        guard={reuseGuard}
        onSessionLost={onSessionLost}
        onSaved={() => {
          setRefresh((v) => v + 1);
          onSaved();
        }}
        onClose={() => setReusing(false)}
      />
    );
  return (
    <section className="members-workspace">
      <AdminToast
        message={
          enabled && !busy && !uncertain && !conflict && !dirty ? status : ""
        }
      />
      <div className="competition-title">
        <h4 ref={heading} tabIndex={-1}>
          Elenco de {registration.name}
        </h4>
        <button disabled={disabled} onClick={() => chooseTarget("athlete")}>
          Adicionar atleta
        </button>
        <button
          disabled={disabled}
          onClick={() => {
            if (!mayLeave()) return;
            setEditor(null);
            setTarget(null);
            setError("");
            setUncertain(false);
            setConflict(false);
            setImporting(true);
          }}
        >
          Importar elenco
        </button>
        <button
          disabled={disabled}
          onClick={() => {
            if (!mayLeave()) return;
            setEditor(null);
            setTarget(null);
            setError("");
            setReusing(true);
          }}
        >
          Reaproveitar atletas
        </button>
      </div>
      {!target && !editor && feedback}
      {(target || editor) && (
        <AdminDialog
          title={`${target === "athlete" || editor?.kind === "roster" || (editor?.kind === "person" && editor.target === "athlete") ? "Adicionar atleta" : target === "head" ? "Adicionar técnico" : target === "assistant" ? "Adicionar assistente" : "Cadastro de pessoa"} · ${registration.name}`}
          open={enabled}
          busy={busy}
          onClose={cancel}
          className={`member-dialog${target ? " member-dialog-search" : ""}`}
        >
          {feedback}
          {target && (
            <section aria-label="Localizar pessoa">
              <div className="competition-actions">
                <button
                  disabled={disabled}
                  onClick={() => personEditor(undefined, target)}
                >
                  {target === "athlete"
                    ? "Cadastrar novo atleta"
                    : "Criar nova pessoa"}
                </button>
                <button className="secondary" disabled={busy} onClick={cancel}>
                  Cancelar busca
                </button>
              </div>
              <PersonPicker
                query={query}
                onQuery={(value) => {
                  setQuery(value);
                  setSearchOffset(0);
                }}
                items={candidates.items}
                loading={searchLoading}
                disabled={disabled}
                offset={searchOffset}
                hasMore={candidates.hasMore}
                onPage={setSearchOffset}
                onUse={(id) => void usePerson(id, target)}
                inputRef={search}
              />
            </section>
          )}
          {editor && (
            <form
              ref={form}
              className="teams-inline member-editor"
              onSubmit={(e) => void save(e)}
            >
              <h4
                className={
                  editor.kind === "person" && editor.command.expectedVersion > 0
                    ? "admin-visually-hidden"
                    : undefined
                }
              >
                {editor.kind === "person"
                  ? editor.command.expectedVersion
                    ? "Editar cadastro global da pessoa"
                    : "Nova pessoa"
                  : editor.command.entry.active
                    ? "Vínculo na inscrição"
                    : "Encerrar vínculo"}
              </h4>
              {editor.kind === "person" &&
                editor.command.expectedVersion > 0 && (
                  <p className="person-editor-note">
                    Este cadastro identifica a mesma pessoa em todas as equipes
                    e funções. Alterações não criam outra identidade.
                  </p>
                )}
              <fieldset
                className="competition-form"
                disabled={disabled || uncertain || partialSaved}
              >
                {editor.kind === "person" ? (
                  <>
                    <PersonFields
                      person={editor.command.person}
                      originalAthlete={editor.originalAthlete}
                      originalCoach={editor.originalCoach}
                      requiredRole={
                        editor.target === "athlete"
                          ? "athlete"
                          : editor.target === "none"
                            ? null
                            : "coach"
                      }
                      contextual={editor.command.disputeId !== null}
                      gender={gender}
                      contextFields={
                        editor.roster && (
                          <div className="person-context-field">
                            <label htmlFor={`person-jersey-${registration.id}`}>
                              Camisa
                            </label>
                            <input
                              id={`person-jersey-${registration.id}`}
                              aria-describedby={`person-jersey-context-${registration.id}`}
                              name="jersey"
                              autoComplete="off"
                              inputMode="numeric"
                              pattern="00|0|[1-9][0-9]?"
                              maxLength={2}
                              value={editor.roster.command.entry.jersey ?? ""}
                              onChange={(e) =>
                                setEditor((v) =>
                                  v?.kind === "person" && v.roster
                                    ? {
                                        ...v,
                                        roster: {
                                          ...v.roster,
                                          command: {
                                            ...v.roster.command,
                                            entry: {
                                              ...v.roster.command.entry,
                                              jersey: e.target.value || null,
                                            },
                                          },
                                        },
                                      }
                                    : v,
                                )
                              }
                            />
                            <small
                              id={`person-jersey-context-${registration.id}`}
                            >
                              Inscrição: {registration.name}
                            </small>
                          </div>
                        )
                      }
                      change={(person) =>
                        setEditor((v) =>
                          v?.kind === "person"
                            ? { ...v, command: { ...v.command, person } }
                            : v,
                        )
                      }
                    />
                    {duplicate && (
                      <label className="member-checkbox">
                        <input
                          type="checkbox"
                          checked={editor.command.confirmHomonym}
                          onChange={(e) =>
                            setEditor((v) =>
                              v?.kind === "person"
                                ? {
                                    ...v,
                                    command: {
                                      ...v.command,
                                      commandId: crypto.randomUUID(),
                                      confirmHomonym: e.target.checked,
                                    },
                                  }
                                : v,
                            )
                          }
                        />
                        Confirmo que é outra pessoa com o mesmo nome
                      </label>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      Pessoa: <strong>{editor.person.name}</strong> · Inscrição:{" "}
                      {registration.name}
                    </p>
                    {editor.kind === "roster" &&
                      editor.command.entry.active && (
                        <label>
                          Camisa
                          <input
                            inputMode="numeric"
                            pattern="00|0|[1-9][0-9]?"
                            maxLength={2}
                            value={editor.command.entry.jersey ?? ""}
                            onChange={(e) =>
                              setEditor((v) =>
                                v?.kind === "roster"
                                  ? {
                                      ...v,
                                      command: {
                                        ...v.command,
                                        entry: {
                                          ...v.command.entry,
                                          jersey: e.target.value || null,
                                        },
                                      },
                                    }
                                  : v,
                              )
                            }
                          />
                        </label>
                      )}
                    {editor.kind === "staff" && (
                      <p>
                        Função:{" "}
                        {editor.command.entry.role === "head"
                          ? "Técnico"
                          : "Ass. Técnico"}
                      </p>
                    )}
                    {!editor.command.entry.active && (
                      <p>
                        Encerrar conserva o vínculo anterior no histórico. Esta
                        operação não transfere automaticamente para outra
                        inscrição.
                      </p>
                    )}
                    {!editor.wasActive && (
                      <p>
                        Este vínculo já foi encerrado e não pode ser reaberto
                        nesta edição.
                      </p>
                    )}
                  </>
                )}
              </fieldset>
              <div className="competition-actions">
                <button
                  type="submit"
                  disabled={
                    disabled ||
                    uncertain ||
                    partialSaved ||
                    conflict ||
                    (editor.kind !== "person" && !editor.wasActive) ||
                    (duplicate &&
                      editor.kind === "person" &&
                      !editor.command.confirmHomonym)
                  }
                >
                  {editor.kind === "person"
                    ? "Salvar pessoa"
                    : "Salvar vínculo"}
                </button>
                {uncertain && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save()}
                  >
                    Repetir o mesmo envio
                  </button>
                )}
                {(conflict || partialSaved) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reload()}
                  >
                    Recarregar cadastro
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={cancel}
                >
                  Cancelar edição
                </button>
              </div>
            </form>
          )}
        </AdminDialog>
      )}
      <label className="member-checkbox">
        <input
          type="checkbox"
          checked={history}
          onChange={(e) => {
            setHistory(e.target.checked);
            setRosterOffset(0);
            setStaffOffset(0);
          }}
        />
        Mostrar vínculos encerrados
      </label>
      {loading ? (
        <p role="status">Carregando elenco e comissão…</p>
      ) : (
        <>
          {roster.items.length ? (
            <div
              className="member-table-scroll"
              tabIndex={0}
              role="region"
              aria-label={`Tabela de atletas de ${registration.name}`}
            >
              <table>
                <caption>Atletas de {registration.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Camisa</th>
                    <th scope="col">Atleta</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.items.map((r) => (
                    <tr key={r.id} data-testid="roster-row">
                      <td>{r.jersey ?? "Sem camisa"}</td>
                      <td>
                        {r.person.name}
                        {!r.active && <small> · Encerrado</small>}
                        {r.person.nickname && (
                          <small> · {r.person.nickname}</small>
                        )}
                      </td>
                      <td>
                        <div className="competition-actions">
                          <button
                            className="secondary"
                            disabled={disabled}
                            aria-label={`Perfil público de ${r.person.name}`}
                            onClick={() => {
                              if (mayLeave()) {
                                setEditor(null);
                                setTarget(null);
                                setProfiling(r.personId);
                              }
                            }}
                          >
                            Perfil público
                          </button>
                          <button
                            className="secondary"
                            disabled={disabled}
                            aria-label={`${r.active ? "Transferir ou retornar" : "Retornar"} ${r.person.name}`}
                            onClick={() => {
                              if (mayLeave()) {
                                setEditor(null);
                                setTarget(null);
                                setTransferring(r);
                              }
                            }}
                          >
                            {r.active
                              ? "Transferir ou retornar"
                              : "Retornar ou transferir"}
                          </button>
                          <button
                            className="secondary"
                            disabled={disabled}
                            aria-label={`Editar pessoa ${r.person.name}`}
                            onClick={() => {
                              if (mayLeave())
                                void usePerson(r.personId, "none", r);
                            }}
                          >
                            Editar pessoa
                          </button>
                          {r.active && (
                            <button
                              className="secondary"
                              disabled={disabled}
                              aria-label={`Encerrar vínculo de ${r.person.name}`}
                              onClick={() => editRoster(r, true)}
                            >
                              Encerrar vínculo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Nenhum atleta neste elenco.</p>
          )}
          <Pages
            offset={rosterOffset}
            hasMore={roster.hasMore}
            change={setRosterOffset}
          />
          <div className="competition-title">
            <h5>Comissão técnica</h5>
            <div className="competition-actions">
              <button
                disabled={
                  disabled ||
                  staff.items.some((s) => s.active && s.role === "head")
                }
                onClick={() => chooseTarget("head")}
              >
                Adicionar técnico
              </button>
              <button
                disabled={
                  disabled ||
                  staff.items.some((s) => s.active && s.role === "assistant")
                }
                onClick={() => chooseTarget("assistant")}
              >
                Adicionar assistente
              </button>
            </div>
          </div>
          <p>
            O capitão e o técnico que atuará no jogo serão confirmados na
            preparação da súmula.
          </p>
          {staff.items.length ? (
            <ul className="competition-list">
              {staff.items.map((s) => (
                <li key={s.id}>
                  <strong>
                    {s.role === "head" ? "Técnico" : "Ass. Técnico"}:{" "}
                  </strong>
                  <span>{s.person.name}</span>
                  {!s.active && <small> · Encerrado</small>}
                  <div className="competition-actions">
                    <button
                      className="secondary"
                      disabled={disabled}
                      aria-label={`Editar pessoa ${s.person.name}`}
                      onClick={() => {
                        if (mayLeave()) void usePerson(s.personId, "none");
                      }}
                    >
                      Editar pessoa
                    </button>
                    {s.active && (
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => editStaff(s)}
                      >
                        Encerrar {s.role === "head" ? "técnico" : "assistente"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhum técnico vinculado a esta inscrição.</p>
          )}
          <Pages
            offset={staffOffset}
            hasMore={staff.hasMore}
            change={setStaffOffset}
          />
        </>
      )}
      {error && !target && !editor && !conflict && !uncertain && (
        <button
          className="secondary"
          onClick={() => {
            setError("");
            setRefresh((v) => v + 1);
          }}
        >
          Tentar novamente
        </button>
      )}
    </section>
  );
}
function Pages({
  offset,
  hasMore,
  change,
}: {
  offset: number;
  hasMore: boolean;
  change: (n: number) => void;
}) {
  return (
    <div className="competition-actions">
      {offset > 0 && (
        <button
          className="secondary"
          onClick={() => change(Math.max(0, offset - 20))}
        >
          Página anterior
        </button>
      )}
      {hasMore && (
        <button className="secondary" onClick={() => change(offset + 20)}>
          Próxima página
        </button>
      )}
    </div>
  );
}
