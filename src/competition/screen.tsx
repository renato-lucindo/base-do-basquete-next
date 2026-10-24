import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiFailure, isSessionFailure } from "./api";
import { RegulationWorkspace } from "../regulation/workspace";
import { TeamsWorkspace } from "../teams/screen";
import { GamesWorkspace } from "../games/workspace";
import { PdfSourcesWorkspace } from "../boxscore/workspace";
import {
  competitionSchema,
  listingSchema,
  snapshotSchema,
  saveCompetitionSchema,
  saveResultSchema,
  type Competition,
  type CompetitionSnapshot,
  type CompetitionListing,
  type SaveCompetition,
} from "./contract";
import "./screen.css";

type Editor = {
  draft: Competition;
  version: number;
  baseline: string;
  savedIds: Set<string>;
  savedAt?: string;
};
type Props = {
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
};
type Pending = { fingerprint: string; command: SaveCompetition };
const emptyList: CompetitionListing = {
  items: [],
  recents: [],
  hasMore: false,
};
const allIds = (draft: Competition) =>
  new Set([
    draft.id,
    ...draft.seasons.flatMap((s) => [s.id, ...s.disputes.map((d) => d.id)]),
  ]);
const newDispute = () => ({
  id: crypto.randomUUID(),
  gender: "masculino" as const,
  category: "",
  division: null,
});
const currentYear = () =>
  Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(new Date()),
  );

export function CompetitionWorkspace({ enabled, guard, onSessionLost }: Props) {
  const [list, setList] = useState(emptyList);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState<
    "info" | "teams" | "games" | "pdfs" | "regulation"
  >("info");
  const teamsGuard = useRef<() => boolean>(() => true);
  const gamesGuard = useRef<() => boolean>(() => true);
  const pdfGuard = useRef<() => boolean>(() => true);
  const regulationGuard = useRef<() => boolean>(() => true);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const pending = useRef<Pending | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const restored = useRef(false);
  const dirty = !!editor && JSON.stringify(editor.draft) !== editor.baseline;
  useEffect(() => {
    if (!editor) return;
    const ids = editor.draft.seasons.flatMap((s) =>
      s.disputes.map((d) => d.id),
    );
    if (!ids.includes(selected)) setSelected(ids[0] ?? "");
  }, [editor, selected]);

  function mayLeave() {
    return (
      teamsGuard.current() &&
      gamesGuard.current() &&
      pdfGuard.current() &&
      regulationGuard.current() &&
      (!(dirty || uncertain) ||
        window.confirm(
          "Há alterações não salvas ou um envio não confirmado. Deseja sair desta edição?",
        ))
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
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain]);
  useEffect(() => {
    if (enabled) {
      if (editor) nameRef.current?.focus();
      else headingRef.current?.focus();
    }
  }, [editor?.draft.id]);
  useEffect(() => {
    if (error && enabled) errorRef.current?.focus();
  }, [error, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/api/competitions?q=${encodeURIComponent(query)}&offset=${offset}`,
        listingSchema,
        undefined,
        controller.signal,
      )
        .then((value) => {
          if (active) setList(value);
        })
        .catch((failure) => {
          if (active) {
            if (isSessionFailure(failure)) onSessionLost();
            else
              setError(
                "Não foi possível carregar os campeonatos. Tente novamente.",
              );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query, offset, refresh]);
  useEffect(() => {
    if (!enabled || restored.current) return;
    restored.current = true;
    const match =
      /^#campeonato\/([0-9a-f-]{36})(?:\/([0-9a-f-]{36}))?(\/(?:equipes|regulamento|jogos(?:\/pdfs)?))?$/i.exec(
        location.hash,
      );
    if (match)
      void openCompetition(
        match[1],
        match[2],
        match[3] === "/regulamento"
          ? "regulation"
          : match[3] === "/jogos/pdfs"
            ? "pdfs"
            : match[3] === "/jogos"
              ? "games"
              : match[3]
                ? "teams"
                : "info",
      );
  }, [enabled]);

  function change(edit: (draft: Competition) => void) {
    if (saving || uncertain) return;
    setEditor((value) => {
      if (!value) return value;
      const draft = structuredClone(value.draft);
      edit(draft);
      return { ...value, draft };
    });
  }
  function accept(
    snapshot: CompetitionSnapshot,
    wanted?: string,
    targetTab = tab,
  ) {
    const draft = competitionSchema.parse(snapshotWithoutMetadata(snapshot));
    setEditor({
      draft,
      version: snapshot.version,
      baseline: JSON.stringify(draft),
      savedIds: allIds(draft),
      savedAt: snapshot.savedAt,
    });
    const ids = draft.seasons.flatMap((s) => s.disputes.map((d) => d.id));
    const target = wanted && ids.includes(wanted) ? wanted : ids[0];
    setSelected(target);
    setTab(targetTab);
    setRoute(draft.id, target, targetTab);
    pending.current = null;
    setUncertain(false);
    setConflict(false);
    setError("");
  }
  async function openCompetition(
    id: string,
    wanted?: string,
    targetTab: "info" | "teams" | "games" | "pdfs" | "regulation" = "info",
  ) {
    if (!mayLeave()) return;
    setOpening(true);
    setError("");
    try {
      accept(
        await api(`/api/competitions/${id}`, snapshotSchema),
        wanted,
        targetTab,
      );
    } catch (failure) {
      if (isSessionFailure(failure)) onSessionLost();
      else
        setError(
          failure instanceof ApiFailure
            ? failure.message
            : "Não foi possível abrir o campeonato. Tente novamente.",
        );
    } finally {
      setOpening(false);
    }
  }
  function start() {
    if (!mayLeave()) return;
    const dispute = newDispute();
    const draft: Competition = {
      id: crypto.randomUUID(),
      name: "",
      seasons: [
        { id: crypto.randomUUID(), year: currentYear(), disputes: [dispute] },
      ],
    };
    setEditor({
      draft,
      version: 0,
      baseline: JSON.stringify(draft),
      savedIds: new Set(),
    });
    setSelected(dispute.id);
    setTab("info");
    setError("");
    setUncertain(false);
    setConflict(false);
    pending.current = null;
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#novo-campeonato`,
    );
  }
  function back() {
    if (!mayLeave()) return;
    setEditor(null);
    setError("");
    setUncertain(false);
    setConflict(false);
    pending.current = null;
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    setRefresh((n) => n + 1);
  }
  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!editor || saving || conflict) return;
    const parsed = saveCompetitionSchema.safeParse({
      commandId: crypto.randomUUID(),
      expectedVersion: editor.version,
      competition: editor.draft,
    });
    if (!parsed.success) {
      setError(
        "Confira nome, anos, categorias e divisões. Anos e disputas não podem se repetir.",
      );
      return;
    }
    const fingerprint = JSON.stringify({
      expectedVersion: parsed.data.expectedVersion,
      competition: parsed.data.competition,
    });
    if (!pending.current || pending.current.fingerprint !== fingerprint)
      pending.current = { fingerprint, command: parsed.data };
    setSaving(true);
    setError("");
    try {
      const result = await api(
        "/api/competitions",
        saveResultSchema,
        pending.current.command,
      );
      accept(
        await api(`/api/competitions/${result.id}`, snapshotSchema),
        selected,
      );
      setRefresh((n) => n + 1);
    } catch (failure) {
      if (isSessionFailure(failure)) {
        onSessionLost();
        return;
      }
      if (failure instanceof ApiFailure && failure.status === 409) {
        setConflict(true);
        setUncertain(false);
        setError(failure.message);
      } else if (failure instanceof ApiFailure && failure.status === 400) {
        pending.current = null;
        setUncertain(false);
        setError(failure.message);
      } else {
        setUncertain(true);
        setError(
          "Não foi possível confirmar o envio. Repita o mesmo envio antes de alterar os dados.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const savedCompetition = editor
    ? (JSON.parse(editor.baseline) as Competition)
    : undefined;
  const contextSource = tab !== "info" ? savedCompetition : editor?.draft;
  const context = contextSource?.seasons
    .flatMap((s) =>
      s.disputes.map((d) => ({
        id: d.id,
        label: `${s.year} · ${d.gender === "feminino" ? "Feminino" : "Masculino"} · ${d.category || "Categoria não informada"}${d.division ? ` · ${d.division}` : ""}`,
      })),
    )
    .find((d) => d.id === selected);
  return (
    <section className="competition-workspace" aria-busy={opening || saving}>
      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="access-error">
          {error}
        </p>
      )}
      {opening && <p role="status">Abrindo campeonato…</p>}
      {!editor ? (
        <>
          <div className="competition-title">
            <h2 ref={headingRef} tabIndex={-1}>
              Campeonatos
            </h2>
            <button onClick={start} disabled={opening}>
              Novo campeonato
            </button>
          </div>
          <label className="competition-search">
            Buscar campeonato, ano ou disputa
            <input
              value={query}
              maxLength={120}
              onChange={(event) => {
                setQuery(event.target.value);
                setOffset(0);
              }}
            />
          </label>
          {loading ? (
            <p role="status">Carregando campeonatos…</p>
          ) : (
            <>
              {list.recents.length > 0 && (
                <section aria-labelledby="recentes">
                  <h3 id="recentes">Recentes</h3>
                  <CompetitionRows
                    items={list.recents}
                    open={(id) => void openCompetition(id)}
                    disabled={opening}
                  />
                </section>
              )}
              <section aria-labelledby="todos-campeonatos">
                <h3 id="todos-campeonatos">Todos os campeonatos</h3>
                {list.items.length ? (
                  <CompetitionRows
                    items={list.items}
                    open={(id) => void openCompetition(id)}
                    disabled={opening}
                  />
                ) : (
                  <p>
                    {query
                      ? "Nenhum campeonato encontrado."
                      : "Ainda não há campeonatos cadastrados."}
                  </p>
                )}
                <div className="competition-actions">
                  {offset > 0 && (
                    <button
                      className="secondary"
                      onClick={() => setOffset((n) => Math.max(0, n - 20))}
                    >
                      Página anterior
                    </button>
                  )}
                  {list.hasMore && (
                    <button
                      className="secondary"
                      onClick={() => setOffset((n) => n + 20)}
                    >
                      Próxima página
                    </button>
                  )}
                </div>
              </section>
            </>
          )}
          {error && (
            <button
              className="secondary"
              onClick={() => {
                setError("");
                setRefresh((n) => n + 1);
              }}
            >
              Tentar novamente
            </button>
          )}
        </>
      ) : (
        <>
          <div className="competition-title">
            <h2>
              {editor.version
                ? editor.draft.name || "Campeonato"
                : "Novo campeonato"}
            </h2>
            <button
              className="secondary"
              onClick={back}
              disabled={saving || opening}
            >
              Voltar aos campeonatos
            </button>
          </div>
          {context && (
            <p className="competition-context" aria-live="polite">
              <strong>Disputa selecionada:</strong> {context.label}
              {!editor.savedIds.has(context.id) && " · ainda não salva"}
            </p>
          )}
          {editor.version > 0 && (
            <label className="competition-destination">
              Disputa de trabalho
              <select
                aria-label="Disputa de trabalho"
                value={selected}
                onChange={(event) => {
                  if (!teamsGuard.current()) return;
                  if (
                    !gamesGuard.current() ||
                    !pdfGuard.current() ||
                    !regulationGuard.current()
                  )
                    return;
                  setSelected(event.target.value);
                  setRoute(editor.draft.id, event.target.value, tab);
                }}
              >
                {contextSource?.seasons.flatMap((s) =>
                  s.disputes.map((d) => (
                    <option
                      key={d.id}
                      value={d.id}
                      disabled={!editor.savedIds.has(d.id)}
                    >
                      {s.year} ·{" "}
                      {d.gender === "feminino" ? "Feminino" : "Masculino"} ·{" "}
                      {d.category}
                      {d.division ? ` · ${d.division}` : ""}
                      {!editor.savedIds.has(d.id) ? " · ainda não salva" : ""}
                    </option>
                  )),
                )}
              </select>
            </label>
          )}
          <nav className="competition-tabs" aria-label="Áreas do campeonato">
            <button
              className="secondary"
              aria-current={tab === "info" ? "page" : undefined}
              onClick={() => {
                setTab("info");
                if (editor.version) setRoute(editor.draft.id, selected, "info");
              }}
            >
              Informações
            </button>
            <button
              className="secondary"
              disabled={!context || !editor.savedIds.has(context.id)}
              aria-current={tab === "teams" ? "page" : undefined}
              onClick={() => {
                setTab("teams");
                setRoute(editor.draft.id, selected, "teams");
              }}
            >
              Equipes e elencos
            </button>
            <button
              className="secondary"
              disabled={!context || !editor.savedIds.has(context.id)}
              aria-current={tab === "games" ? "page" : undefined}
              onClick={() => {
                setTab("games");
                setRoute(editor.draft.id, selected, "games");
              }}
            >
              Jogos
            </button>
            <button
              className="secondary"
              disabled={!context || !editor.savedIds.has(context.id)}
              aria-current={tab === "regulation" ? "page" : undefined}
              onClick={() => {
                setTab("regulation");
                setRoute(editor.draft.id, selected, "regulation");
              }}
            >
              Regulamento
            </button>
          </nav>
          {context && editor.savedIds.has(context.id) && (
            <div hidden={tab !== "regulation"}>
              <RegulationWorkspace
                key={context.id}
                disputeId={context.id}
                enabled={enabled && tab === "regulation"}
                guard={regulationGuard}
                onSessionLost={onSessionLost}
                onSaved={() => setRefresh((n) => n + 1)}
              />
            </div>
          )}
          <div hidden={tab !== "info"}>
            <p role="status" data-testid="competition-save-state">
              {saving
                ? "Salvando…"
                : uncertain
                  ? "Envio não confirmado"
                  : conflict
                    ? "Conflito de versão"
                    : dirty || !editor.version
                      ? "Não salvo"
                      : `Salvo${editor.savedAt ? ` em ${formatDate(editor.savedAt)}` : ""}`}
            </p>
            <form onSubmit={(event) => void save(event)}>
              <fieldset
                disabled={saving || uncertain || opening}
                className="competition-form"
              >
                <legend>Informações do campeonato</legend>
                <label>
                  Nome do campeonato
                  <input
                    ref={nameRef}
                    required
                    maxLength={120}
                    value={editor.draft.name}
                    onChange={(event) =>
                      change((d) => {
                        d.name = event.target.value;
                      })
                    }
                  />
                </label>
                {editor.draft.seasons.map((season, si) => (
                  <fieldset key={season.id} className="competition-season">
                    <legend>Temporada {season.year || si + 1}</legend>
                    <div className="competition-title">
                      <label>
                        Ano
                        <input
                          aria-label={`Ano da temporada ${si + 1}`}
                          type="number"
                          min={1}
                          max={9999}
                          required
                          value={season.year || ""}
                          onChange={(event) =>
                            change((d) => {
                              d.seasons[si].year = Number(event.target.value);
                            })
                          }
                        />
                      </label>
                      {!editor.savedIds.has(season.id) &&
                        editor.draft.seasons.length > 1 && (
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              change((d) => {
                                d.seasons.splice(si, 1);
                              })
                            }
                          >
                            Remover temporada {si + 1}
                          </button>
                        )}
                    </div>
                    {season.disputes.map((dispute, di) => (
                      <fieldset
                        key={dispute.id}
                        className={`competition-dispute${selected === dispute.id ? " selected" : ""}`}
                      >
                        <legend>
                          Disputa {si + 1}.{di + 1}
                        </legend>
                        <div className="competition-fields">
                          <label>
                            Naipe
                            <select
                              aria-label={`Naipe da disputa ${si + 1}.${di + 1}`}
                              value={dispute.gender}
                              onChange={(event) =>
                                change((d) => {
                                  d.seasons[si].disputes[di].gender = event
                                    .target.value as "masculino" | "feminino";
                                })
                              }
                            >
                              <option value="masculino">Masculino</option>
                              <option value="feminino">Feminino</option>
                            </select>
                          </label>
                          <label>
                            Categoria
                            <input
                              aria-label={`Categoria da disputa ${si + 1}.${di + 1}`}
                              required
                              maxLength={80}
                              value={dispute.category}
                              onChange={(event) =>
                                change((d) => {
                                  d.seasons[si].disputes[di].category =
                                    event.target.value;
                                })
                              }
                            />
                          </label>
                          <label>
                            Divisão (opcional)
                            <input
                              aria-label={`Divisão da disputa ${si + 1}.${di + 1}`}
                              maxLength={80}
                              value={dispute.division ?? ""}
                              onChange={(event) =>
                                change((d) => {
                                  d.seasons[si].disputes[di].division =
                                    event.target.value;
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="competition-actions">
                          <label className="competition-radio">
                            <input
                              type="radio"
                              name="working-dispute"
                              checked={selected === dispute.id}
                              onChange={() => {
                                if (!teamsGuard.current()) return;
                                setSelected(dispute.id);
                                if (
                                  editor.version &&
                                  editor.savedIds.has(dispute.id)
                                )
                                  setRoute(editor.draft.id, dispute.id, tab);
                              }}
                            />
                            Usar esta disputa
                          </label>
                          {!editor.savedIds.has(dispute.id) &&
                            season.disputes.length > 1 && (
                              <button
                                type="button"
                                className="secondary"
                                onClick={() =>
                                  change((d) => {
                                    d.seasons[si].disputes.splice(di, 1);
                                  })
                                }
                              >
                                Remover disputa {si + 1}.{di + 1}
                              </button>
                            )}
                        </div>
                      </fieldset>
                    ))}
                    <button
                      type="button"
                      className="secondary"
                      disabled={season.disputes.length >= 64}
                      onClick={() =>
                        change((d) => {
                          d.seasons[si].disputes.push(newDispute());
                        })
                      }
                    >
                      Adicionar disputa à temporada {si + 1}
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="secondary"
                  disabled={editor.draft.seasons.length >= 32}
                  onClick={() =>
                    change((d) => {
                      let year = currentYear();
                      while (d.seasons.some((s) => s.year === year))
                        year = (year % 9999) + 1;
                      d.seasons.push({
                        id: crypto.randomUUID(),
                        year,
                        disputes: [newDispute()],
                      });
                    })
                  }
                >
                  Adicionar temporada
                </button>
              </fieldset>
              <div className="competition-actions competition-save">
                <button type="submit" disabled={saving || opening || conflict}>
                  {saving
                    ? "Salvando…"
                    : uncertain
                      ? "Repetir envio"
                      : "Salvar campeonato"}
                </button>
                {(conflict || uncertain) && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={saving || opening}
                    onClick={() =>
                      void openCompetition(editor.draft.id, selected)
                    }
                  >
                    Recarregar versão salva
                  </button>
                )}
              </div>
            </form>
          </div>
          {context && editor.savedIds.has(context.id) && (
            <div hidden={tab !== "teams"}>
              <TeamsWorkspace
                key={context.id}
                disputeId={context.id}
                gender={
                  savedCompetition?.seasons
                    .flatMap((s) => s.disputes)
                    .find((d) => d.id === context.id)?.gender ?? "masculino"
                }
                enabled={enabled && tab === "teams"}
                guard={teamsGuard}
                onSessionLost={onSessionLost}
                onSaved={() => setRefresh((v) => v + 1)}
              />
            </div>
          )}
          {context && editor.savedIds.has(context.id) && savedCompetition && (
            <div hidden={tab !== "pdfs"}>
              <PdfSourcesWorkspace
                key={context.id}
                defaultDisputeId={context.id}
                initialContexts={savedCompetition.seasons.flatMap((s) =>
                  s.disputes.map((d) => ({
                    id: d.id,
                    gender: d.gender,
                    label: `${savedCompetition.name} · ${s.year} · ${d.gender === "feminino" ? "Feminino" : "Masculino"} · ${d.category}${d.division ? " · " + d.division : ""}`,
                  })),
                )}
                enabled={enabled && tab === "pdfs"}
                guard={pdfGuard}
                onSessionLost={onSessionLost}
                onSaved={() => setRefresh((v) => v + 1)}
                onBack={() => {
                  setTab("games");
                  setRoute(editor.draft.id, selected, "games");
                }}
              />
            </div>
          )}
          {context && editor.savedIds.has(context.id) && (
            <div hidden={tab !== "games"}>
              <GamesWorkspace
                key={context.id}
                disputeId={context.id}
                gender={
                  savedCompetition?.seasons
                    .flatMap((s) => s.disputes)
                    .find((d) => d.id === context.id)?.gender ?? "masculino"
                }
                enabled={enabled && tab === "games"}
                guard={gamesGuard}
                onSessionLost={onSessionLost}
                onSaved={() => setRefresh((v) => v + 1)}
                onImportPdfs={() => {
                  setTab("pdfs");
                  setRoute(editor.draft.id, selected, "pdfs");
                }}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CompetitionRows({
  items,
  open,
  disabled,
}: {
  items: CompetitionListing["items"];
  open: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <ul className="competition-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            className="competition-open"
            aria-label={`Abrir ${item.name}`}
            disabled={disabled}
            onClick={() => open(item.id)}
          >
            {item.name}
          </button>
          <p>
            {item.contexts
              .map(
                (c) =>
                  `${c.year} · ${c.gender === "feminino" ? "Feminino" : "Masculino"} · ${c.category}${c.division ? ` · ${c.division}` : ""}`,
              )
              .join(" / ")}
          </p>
          <small>Último trabalho salvo: {formatDate(item.savedAt)}</small>
        </li>
      ))}
    </ul>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
function snapshotWithoutMetadata(value: CompetitionSnapshot): Competition {
  return { id: value.id, name: value.name, seasons: value.seasons };
}
function setRoute(
  id: string,
  dispute: string,
  tab: "info" | "teams" | "games" | "pdfs" | "regulation" = "info",
) {
  const next = `${location.pathname}${location.search}#campeonato/${id}/${dispute}${tab === "regulation" ? "/regulamento" : tab === "pdfs" ? "/jogos/pdfs" : tab === "games" ? "/jogos" : tab === "teams" ? "/equipes" : ""}`;
  history.replaceState(
    next === location.pathname + location.search + location.hash
      ? history.state
      : null,
    "",
    next,
  );
}
