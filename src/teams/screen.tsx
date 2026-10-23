import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { saveResultSchema } from "../competition/contract";
import { MembersWorkspace } from "../people/workspace";
import {
  teamListingSchema,
  registrationListingSchema,
  teamSnapshotSchema,
  registrationSnapshotSchema,
  saveTeamSchema,
  saveRegistrationSchema,
  type SaveTeam,
  type SaveRegistration,
  type TeamSnapshot,
  type RegistrationSnapshot,
} from "./contract";
import "./screen.css";

type Edit =
  | { kind: "team"; command: SaveTeam; afterCreate: boolean }
  | { kind: "registration"; command: SaveRegistration; team: TeamSnapshot };
type Props = {
  disputeId: string;
  gender: "masculino" | "feminino";
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
};
export function TeamsWorkspace({
  disputeId,
  gender,
  enabled,
  guard,
  onSessionLost,
  onSaved,
}: Props) {
  const [list, setList] = useState({
    items: [] as RegistrationSnapshot[],
    hasMore: false,
  });
  const [globals, setGlobals] = useState({
    items: [] as TeamSnapshot[],
    hasMore: false,
  });
  const [query, setQuery] = useState(""),
    [globalQuery, setGlobalQuery] = useState("");
  const [offset, setOffset] = useState(0),
    [globalOffset, setGlobalOffset] = useState(0);
  const [loading, setLoading] = useState(true),
    [finding, setFinding] = useState(false),
    [globalLoading, setGlobalLoading] = useState(false);
  const [refresh, setRefresh] = useState(0),
    [expanded, setExpanded] = useState("");
  const [editor, setEditor] = useState<Edit | null>(null),
    [baseline, setBaseline] = useState("");
  const membersGuard = useRef<() => boolean>(() => true);
  const [membersEpoch, setMembersEpoch] = useState(0);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false);
  const [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const heading = useRef<HTMLHeadingElement>(null),
    input = useRef<HTMLInputElement>(null),
    alert = useRef<HTMLParagraphElement>(null);
  const dirty = !!editor && JSON.stringify(editor.command) !== baseline;
  function mayLeave() {
    return (
      membersGuard.current() &&
      (!(dirty || uncertain || busy) ||
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
    if (editor) input.current?.focus();
    else heading.current?.focus();
  }, [editor?.kind, editor?.command.commandId, enabled]);
  useEffect(() => {
    if (error && enabled) alert.current?.focus();
  }, [error, enabled]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/api/registrations?disputeId=${disputeId}&q=${encodeURIComponent(query)}&offset=${offset}`,
        registrationListingSchema,
        undefined,
        controller.signal,
      )
        .then((value) => {
          if (active) setList(value);
        })
        .catch((failure) => {
          if (active) report(failure);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, disputeId, query, offset, refresh]);
  useEffect(() => {
    if (!enabled || !finding) return;
    let active = true;
    const controller = new AbortController();
    setGlobalLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/api/teams?q=${encodeURIComponent(globalQuery)}&offset=${globalOffset}`,
        teamListingSchema,
        undefined,
        controller.signal,
      )
        .then((value) => {
          if (active) setGlobals(value);
        })
        .catch((failure) => {
          if (active) report(failure);
        })
        .finally(() => {
          if (active) setGlobalLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, finding, globalQuery, globalOffset, refresh]);
  function report(failure: unknown) {
    if (isSessionFailure(failure)) onSessionLost();
    else
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível concluir. Tente novamente.",
      );
  }
  function edit(value: Edit) {
    setMembersEpoch((v) => v + 1);
    setEditor(value);
    setBaseline(JSON.stringify(value.command));
    setUncertain(false);
    setConflict(false);
    setError("");
    setStatus("");
  }
  function add() {
    if (!mayLeave()) return;
    setMembersEpoch((v) => v + 1);
    setEditor(null);
    setFinding(true);
    setGlobalQuery("");
    setGlobalOffset(0);
    setUncertain(false);
    setConflict(false);
    setError("");
    setStatus("");
  }
  function choose(team: TeamSnapshot) {
    setFinding(false);
    edit({
      kind: "registration",
      team,
      command: {
        commandId: crypto.randomUUID(),
        expectedVersion: 0,
        registration: {
          id: crypto.randomUUID(),
          disputeId,
          teamId: team.id,
          name: team.name,
        },
      },
    });
  }
  function cancel() {
    if (!mayLeave()) return;
    setEditor(null);
    setFinding(false);
    setUncertain(false);
    setConflict(false);
    setError("");
    heading.current?.focus();
  }
  function changeName(value: string) {
    setEditor((e) =>
      e
        ? e.kind === "team"
          ? {
              ...e,
              command: {
                ...e.command,
                team: { ...e.command.team, name: value },
              },
            }
          : {
              ...e,
              command: {
                ...e.command,
                registration: { ...e.command.registration, name: value },
              },
            }
        : e,
    );
  }
  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!editor || busy || conflict) return;
    const valid =
      editor.kind === "team"
        ? saveTeamSchema.safeParse(editor.command)
        : saveRegistrationSchema.safeParse(editor.command);
    if (!valid.success) {
      setError(
        "Informe um nome com até 120 caracteres e sigla com até 12 caracteres.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      if (editor.kind === "team") {
        const result = await api(
          "/api/teams",
          saveResultSchema,
          editor.command,
        );
        const team = await api(`/api/teams/${result.id}`, teamSnapshotSchema);
        if (editor.afterCreate) choose(team);
        else {
          setEditor(null);
          setUncertain(false);
          setConflict(false);
          setStatus(
            "Equipe global salva. Nomes públicos das inscrições preservados.",
          );
        }
      } else {
        const result = await api(
          "/api/registrations",
          saveResultSchema,
          editor.command,
        );
        const reg = await api(
          `/api/registrations/${result.id}`,
          registrationSnapshotSchema,
        );
        if (reg.disputeId !== disputeId)
          throw new Error("A resposta não corresponde à disputa selecionada.");
        setEditor(null);
        setUncertain(false);
        setConflict(false);
        setStatus("Inscrição salva.");
      }
      setRefresh((v) => v + 1);
      onSaved();
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.status === 409) {
        setConflict(true);
        setUncertain(false);
      } else
        setUncertain(
          !(failure instanceof ApiFailure && failure.status === 400),
        );
      report(failure);
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (!editor || busy || !mayLeave()) return;
    setBusy(true);
    setError("");
    try {
      if (editor.kind === "team") {
        const t = await api(
          `/api/teams/${editor.command.team.id}`,
          teamSnapshotSchema,
        );
        edit({
          kind: "team",
          afterCreate: editor.afterCreate,
          command: {
            commandId: crypto.randomUUID(),
            expectedVersion: t.version,
            team: { id: t.id, name: t.name, abbreviation: t.abbreviation },
          },
        });
      } else {
        const r = await api(
          `/api/registrations/${editor.command.registration.id}`,
          registrationSnapshotSchema,
        );
        edit({
          kind: "registration",
          team: r.team,
          command: {
            commandId: crypto.randomUUID(),
            expectedVersion: r.version,
            registration: {
              id: r.id,
              disputeId: r.disputeId,
              teamId: r.teamId,
              name: r.name,
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
  return (
    <section className="teams-workspace" aria-busy={busy}>
      <div className="competition-title">
        <h3 ref={heading} tabIndex={-1}>
          Equipes e elencos
        </h3>
        <button onClick={add} disabled={busy}>
          Adicionar inscrição
        </button>
      </div>
      <p>
        Uma equipe pode ter várias inscrições nesta disputa, com nomes públicos
        e elencos próprios.
      </p>
      {error && (
        <p ref={alert} tabIndex={-1} role="alert" className="access-error">
          {error}
        </p>
      )}
      <p role="status">
        {busy
          ? "Salvando…"
          : uncertain
            ? "Envio não confirmado"
            : conflict
              ? "Conflito de versão"
              : dirty
                ? "Não salvo"
                : status}
      </p>
      {finding && !editor && (
        <section className="teams-inline" aria-label="Localizar equipe global">
          <h4>Localizar ou criar equipe</h4>
          <p>
            Selecione a identidade global. O nome público será definido na
            inscrição.
          </p>
          <label>
            Buscar equipe global
            <input
              value={globalQuery}
              maxLength={120}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                setGlobalOffset(0);
              }}
            />
          </label>
          {globalLoading ? (
            <p role="status">Buscando equipes…</p>
          ) : (
            <>
              <ul className="competition-list">
                {globals.items.map((t) => (
                  <li key={t.id}>
                    <strong>{t.name}</strong>{" "}
                    {t.abbreviation && `(${t.abbreviation})`}{" "}
                    <small>· {t.id.slice(-8)}</small>
                    <div>
                      <button
                        className="secondary"
                        onClick={() => choose(t)}
                        aria-label={`Selecionar ${t.name}`}
                      >
                        Selecionar equipe
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {!globals.items.length && <p>Nenhuma equipe encontrada.</p>}
              <Pagination
                offset={globalOffset}
                hasMore={globals.hasMore}
                setOffset={setGlobalOffset}
              />
            </>
          )}
          <div className="competition-actions">
            <button
              onClick={() => {
                setFinding(false);
                edit({
                  kind: "team",
                  afterCreate: true,
                  command: {
                    commandId: crypto.randomUUID(),
                    expectedVersion: 0,
                    team: {
                      id: crypto.randomUUID(),
                      name: globalQuery,
                      abbreviation: null,
                    },
                  },
                });
              }}
            >
              Criar equipe global
            </button>
            <button className="secondary" onClick={cancel}>
              Cancelar
            </button>
          </div>
        </section>
      )}
      {editor && (
        <form className="teams-inline" onSubmit={(e) => void save(e)}>
          <h4>
            {editor.kind === "team"
              ? editor.command.expectedVersion
                ? "Editar equipe global"
                : "Nova equipe global"
              : editor.command.expectedVersion
                ? "Editar inscrição"
                : "Nova inscrição"}
          </h4>
          {editor.kind === "team" ? (
            <p>
              O cadastro global identifica a equipe em todas as disputas.
              Alterar este nome não altera os nomes públicos das inscrições.
            </p>
          ) : (
            <p>
              Equipe global: <strong>{editor.team.name}</strong>. O nome público
              abaixo vale para esta inscrição.
            </p>
          )}
          <fieldset disabled={busy || uncertain} className="competition-form">
            <label>
              {editor.kind === "team"
                ? "Nome da equipe global"
                : "Nome público da inscrição"}
              <input
                ref={input}
                required
                maxLength={120}
                value={
                  editor.kind === "team"
                    ? editor.command.team.name
                    : editor.command.registration.name
                }
                onChange={(e) => changeName(e.target.value)}
              />
            </label>
            {editor.kind === "team" && (
              <label>
                Sigla (opcional)
                <input
                  maxLength={12}
                  value={editor.command.team.abbreviation ?? ""}
                  onChange={(e) =>
                    setEditor((v) =>
                      v?.kind === "team"
                        ? {
                            ...v,
                            command: {
                              ...v.command,
                              team: {
                                ...v.command.team,
                                abbreviation: e.target.value,
                              },
                            },
                          }
                        : v,
                    )
                  }
                />
              </label>
            )}
            <button type="submit" disabled={conflict}>
              {editor.kind === "team"
                ? "Salvar equipe global"
                : "Salvar inscrição"}
            </button>
          </fieldset>
          <div className="competition-actions">
            {uncertain && (
              <button type="button" disabled={busy} onClick={() => void save()}>
                Repetir o mesmo envio
              </button>
            )}
            {conflict && (
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
      <label className="competition-search">
        Buscar inscrição ou equipe
        <input
          value={query}
          maxLength={120}
          onChange={(e) => {
            if (!membersGuard.current()) return;
            setQuery(e.target.value);
            setOffset(0);
            setExpanded("");
          }}
        />
      </label>
      {loading && <p role="status">Carregando inscrições…</p>}
      {
        <>
          <ul className="competition-list">
            {list.items.map((r) => (
              <li key={r.id}>
                <button
                  className="competition-open"
                  aria-expanded={expanded === r.id}
                  aria-controls={`registration-${r.id}`}
                  aria-label={`${expanded === r.id ? "Recolher" : "Expandir"} ${r.name}`}
                  onClick={() => {
                    if (membersGuard.current())
                      setExpanded((v) => (v === r.id ? "" : r.id));
                  }}
                >
                  {r.name}
                </button>
                <p>
                  Equipe global: {r.team.name}
                  {r.team.abbreviation ? ` · ${r.team.abbreviation}` : ""}{" "}
                  <small>· Inscrição {r.id.slice(-8)}</small>
                </p>
                <div id={`registration-${r.id}`} hidden={expanded !== r.id}>
                  <div className="competition-actions">
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        if (!mayLeave()) return;
                        setFinding(false);
                        edit({
                          kind: "registration",
                          team: r.team,
                          command: {
                            commandId: crypto.randomUUID(),
                            expectedVersion: r.version,
                            registration: {
                              id: r.id,
                              disputeId: r.disputeId,
                              teamId: r.teamId,
                              name: r.name,
                            },
                          },
                        });
                      }}
                    >
                      Editar inscrição
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        if (!mayLeave()) return;
                        setFinding(false);
                        edit({
                          kind: "team",
                          afterCreate: false,
                          command: {
                            commandId: crypto.randomUUID(),
                            expectedVersion: r.team.version,
                            team: {
                              id: r.team.id,
                              name: r.team.name,
                              abbreviation: r.team.abbreviation,
                            },
                          },
                        });
                      }}
                    >
                      Editar equipe global
                    </button>
                  </div>
                  {expanded === r.id && (
                    <MembersWorkspace
                      key={`${r.id}:${membersEpoch}`}
                      registration={r}
                      gender={gender}
                      enabled={enabled}
                      canEdit={!editor && !finding && !busy}
                      guard={membersGuard}
                      onSessionLost={onSessionLost}
                      onSaved={() => {
                        setRefresh((v) => v + 1);
                        onSaved();
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {!loading && !list.items.length && (
            <p>
              {query
                ? "Nenhuma inscrição encontrada."
                : "Nenhuma inscrição nesta disputa."}
            </p>
          )}
          <Pagination
            offset={offset}
            hasMore={list.hasMore}
            setOffset={(n) => {
              if (membersGuard.current()) {
                setExpanded("");
                setOffset(n);
              }
            }}
          />
        </>
      }
      {error && !uncertain && !conflict && (
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
function Pagination({
  offset,
  hasMore,
  setOffset,
}: {
  offset: number;
  hasMore: boolean;
  setOffset: (v: number) => void;
}) {
  return (
    <div className="competition-actions">
      {offset > 0 && (
        <button
          className="secondary"
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          Página anterior
        </button>
      )}
      {hasMore && (
        <button className="secondary" onClick={() => setOffset(offset + 20)}>
          Próxima página
        </button>
      )}
    </div>
  );
}
