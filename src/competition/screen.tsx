import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiFailure, isSessionFailure } from "./api";
import { RegulationWorkspace } from "../regulation/workspace";
import { CompetitionSetupWorkspace } from "../regulation/setup-workspace";
import { flexibleCompetitionEnabled } from "./features";
import { TeamsWorkspace } from "../teams/screen";
import { GamesWorkspace } from "../games/workspace";
import { PdfSourcesWorkspace } from "../boxscore/workspace";
import { AdminDialog } from "./admin-dialog";
import { AdminToast } from "../ui-system/admin-toast";
import { CategoryFields } from "./category-fields";
import {
  disputeAdministrationListSchema,
  disputeLockLabels,
  saveCompetitionAdministrationSchema,
  type DisputeAdministration,
  type SaveCompetitionAdministration,
} from "./administration-contract";
import { DisputeControls } from "./dispute-controls";
import { DisputeCatalog } from "./catalog";
import {
  competitionSchema,
  snapshotSchema,
  saveCompetitionSchema,
  saveResultSchema,
  type Competition,
  type CompetitionSnapshot,
  type SaveCompetition,
} from "./contract";
import "./screen.css";
import "./compact.css";

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
  onCompactChange?: (value: boolean) => void;
};
type Pending = {
  fingerprint: string;
  command: SaveCompetition | SaveCompetitionAdministration;
};
const allIds = (draft: Competition) =>
  new Set([
    draft.id,
    ...draft.seasons.flatMap((s) => [s.id, ...s.disputes.map((d) => d.id)]),
  ]);
const newDispute = () => ({
  id: crypto.randomUUID(),
  gender: "masculino" as const,
  category: "Adulto",
  division: null,
});
const currentYear = () =>
  Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
    }).format(new Date()),
  );

export function CompetitionWorkspace({
  enabled,
  guard,
  onSessionLost,
  onCompactChange,
}: Props) {
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [administration, setAdministration] = useState<DisputeAdministration[]>(
    [],
  );
  const [administrationError, setAdministrationError] = useState("");
  const [administrationRefresh, setAdministrationRefresh] = useState(0);
  const [testIds, setTestIds] = useState<string[]>([]);
  const [renameReason, setRenameReason] = useState("");
  const [selected, setSelected] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<{
    kind: "season" | "dispute";
    seasonId: string;
    disputeId?: string;
  } | null>(null);
  const [tab, setTab] = useState<
    "info" | "teams" | "games" | "pdfs" | "regulation"
  >("info");
  const teamsGuard = useRef<() => boolean>(() => true);
  const gamesGuard = useRef<() => boolean>(() => true);
  const pdfGuard = useRef<() => boolean>(() => true);
  const regulationGuard = useRef<() => boolean>(() => true);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const pending = useRef<Pending | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const catalogGuard = useRef<() => boolean>(() => true);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const restored = useRef(false);
  const dirty =
    !!editor &&
    (JSON.stringify(editor.draft) !== editor.baseline || testIds.length > 0);
  const administrationId = editor?.version ? editor.draft.id : null;
  const administrationVersion = editor?.version;
  useEffect(() => {
    if (!enabled || !administrationId) return;
    const controller = new AbortController();
    setAdministrationError("");
    void api(
      "/api/competition-administration/" + administrationId,
      disputeAdministrationListSchema,
      undefined,
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) setAdministration(value);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setAdministrationError(
            failure instanceof ApiFailure
              ? failure.message
              : "A situação das disputas está indisponível.",
          );
      });
    return () => controller.abort();
  }, [
    enabled,
    administrationId,
    administrationVersion,
    administrationRefresh,
    tab,
  ]);
  const activeTestIds = testIds.filter((id) =>
    editor?.draft.seasons.some((s) => s.disputes.some((d) => d.id === id)),
  );
  const needsRenameReason =
    !!editor?.version &&
    editor.draft.name.trim().replace(/\s+/gu, " ") !==
      (JSON.parse(editor.baseline) as Competition).name &&
    administration.some((d) => d.wasPublic);
  const stateOf = (id: string) =>
    administration.find((d) => d.disputeId === id);
  useEffect(() => {
    if (!editor) return;
    const ids = editor.draft.seasons.flatMap((s) =>
      s.disputes.map((d) => d.id),
    );
    if (!ids.includes(selected)) setSelected(ids[0] ?? "");
  }, [editor, selected]);

  function mayLeave() {
    return (
      catalogGuard.current() &&
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
    if (enabled && editor) nameRef.current?.focus();
  }, [editor?.draft.id]);
  useEffect(() => {
    if (error && enabled) errorRef.current?.focus();
  }, [error, enabled]);

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
    setNotice("");
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
    setTestIds([]);
    setRenameReason("");
    if (editor?.draft.id !== draft.id) setAdministration([]);
    setPendingRemoval(null);
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
  function back() {
    if (!mayLeave()) return;
    setPendingRemoval(null);
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
    if (needsRenameReason && renameReason.trim().length < 3) {
      setError("Informe o motivo da alteração do nome público.");
      return;
    }
    const base = {
      commandId: crypto.randomUUID(),
      expectedVersion: editor.version,
      competition: editor.draft,
    };
    const parsed =
      activeTestIds.length || needsRenameReason || renameReason.trim()
        ? saveCompetitionAdministrationSchema.safeParse({
            ...base,
            testDisputeIds: activeTestIds,
            renameReason: renameReason.trim() || null,
          })
        : saveCompetitionSchema.safeParse(base);
    if (!parsed.success) {
      setError(
        "Confira nome, anos, categorias e divisões. Anos e disputas não podem se repetir.",
      );
      return;
    }
    const fingerprint = JSON.stringify({ ...parsed.data, commandId: null });
    if (!pending.current || pending.current.fingerprint !== fingerprint)
      pending.current = { fingerprint, command: parsed.data };
    setSaving(true);
    setError("");
    try {
      const result = await api(
        "testDisputeIds" in pending.current.command
          ? "/api/competition-administration/competition"
          : "/api/competitions",
        saveResultSchema,
        pending.current.command,
      );
      accept(
        await api(`/api/competitions/${result.id}`, snapshotSchema),
        selected,
      );
      setRefresh((n) => n + 1);
      setNotice("Campeonato salvo");
    } catch (failure) {
      if (isSessionFailure(failure)) {
        onSessionLost();
        return;
      }
      if (failure instanceof ApiFailure && failure.status === 409) {
        setConflict(failure.code !== "championship_rename_reason_required");
        if (failure.code === "championship_rename_reason_required") {
          setAdministrationRefresh((n) => n + 1);
        }
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
  const seasonToRemove = editor?.draft.seasons.find(
    (season) => season.id === pendingRemoval?.seasonId,
  );
  const disputeToRemove = seasonToRemove?.disputes.find(
    (dispute) => dispute.id === pendingRemoval?.disputeId,
  );
  const removalDescription =
    pendingRemoval?.kind === "season"
      ? `Temporada ${seasonToRemove?.year ?? ""}: todas as disputas dessa temporada sairão do rascunho.`
      : `Disputa ${disputeToRemove?.category || "sem categoria"}: remover do rascunho?`;
  const compact = enabled && (!editor || tab !== "pdfs");
  useEffect(() => {
    onCompactChange?.(compact);
  }, [compact, onCompactChange]);
  return (
    <section
      className={`competition-workspace${compact ? " compact-pilot" : ""}`}
      aria-busy={opening || saving}
    >
      <AdminToast
        tone={error ? "error" : "success"}
        announce={!error}
        message={enabled && !saving && !opening ? error || notice : ""}
      />
      {error && (
        <p ref={errorRef} tabIndex={-1} role="alert" className="access-error">
          {error}
        </p>
      )}
      {opening && <p role="status">Abrindo campeonato…</p>}
      <div hidden={!!editor}>
        <DisputeCatalog
          enabled={enabled && !editor}
          refresh={refresh}
          opening={opening}
          open={(id, dispute) => void openCompetition(id, dispute)}
          guard={catalogGuard}
          onSessionLost={onSessionLost}
        />
      </div>
      {editor && (
        <>
          <div className="competition-context-header">
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
            {context && !compact && (
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
          </div>
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
              {flexibleCompetitionEnabled()
                ? "Formato e classificação"
                : "Regulamento"}
            </button>
            {context && editor.savedIds.has(context.id) && (
              <a
                className="competition-public-link"
                href={`/estatisticas.html#${context.id}?scope=all`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Estatísticas publicadas
              </a>
            )}
            {context && editor.savedIds.has(context.id) && (
              <a
                className="competition-public-link"
                href={`/equipes.html#${context.id}?scope=all`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Equipes publicadas
              </a>
            )}
          </nav>
          {context && editor.savedIds.has(context.id) && (
            <div hidden={tab !== "regulation"}>
              {flexibleCompetitionEnabled() ? (
                <CompetitionSetupWorkspace
                  key={context.id}
                  disputeId={context.id}
                  enabled={enabled && tab === "regulation"}
                  guard={regulationGuard}
                  onSessionLost={onSessionLost}
                  onSaved={() => setRefresh((n) => n + 1)}
                />
              ) : (
                <RegulationWorkspace
                  key={context.id}
                  disputeId={context.id}
                  enabled={enabled && tab === "regulation"}
                  guard={regulationGuard}
                  onSessionLost={onSessionLost}
                  onSaved={() => setRefresh((n) => n + 1)}
                />
              )}
            </div>
          )}
          <div className="competition-info" hidden={tab !== "info"}>
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
            <form
              className="competition-editor-form"
              onSubmit={(event) => void save(event)}
            >
              <fieldset
                disabled={saving || uncertain || opening}
                className="competition-form"
              >
                <legend>Informações do campeonato</legend>
                <label>
                  Nome do campeonato
                  <input
                    ref={nameRef}
                    name="competition-name"
                    autoComplete="off"
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
                {needsRenameReason && (
                  <label>
                    Motivo da alteração do nome
                    <textarea
                      name="renameReason"
                      autoComplete="off"
                      value={renameReason}
                      onChange={(event) => setRenameReason(event.target.value)}
                      required
                      minLength={3}
                      maxLength={2000}
                    />
                  </label>
                )}
                {administrationError && (
                  <p role="status" className="error-text">
                    {administrationError}{" "}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setAdministrationRefresh((n) => n + 1)}
                    >
                      Tentar novamente
                    </button>
                  </p>
                )}
                {editor.draft.seasons.map((season, si) => (
                  <fieldset key={season.id} className="competition-season">
                    <legend>Temporada {season.year || si + 1}</legend>
                    <div className="competition-title">
                      <label>
                        Ano
                        <input
                          aria-label={`Ano da temporada ${si + 1}`}
                          type="number"
                          name={`season-${si + 1}-year`}
                          autoComplete="off"
                          min={1}
                          max={9999}
                          required
                          disabled={season.disputes.some(
                            (dispute) => stateOf(dispute.id)?.lockReason,
                          )}
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
                              setPendingRemoval({
                                kind: "season",
                                seasonId: season.id,
                              })
                            }
                          >
                            Remover temporada {si + 1}
                          </button>
                        )}
                    </div>
                    {season.disputes.map((dispute, di) => {
                      const state = stateOf(dispute.id);
                      const locked = !!state?.lockReason;
                      return (
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
                                disabled={locked}
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
                            <CategoryFields
                              suffix={`${si + 1}.${di + 1}`}
                              label={dispute.category}
                              disabled={locked}
                              onChange={(value) =>
                                change((draft) => {
                                  draft.seasons[si].disputes[di].category =
                                    value;
                                })
                              }
                            />
                            <label>
                              Divisão (opcional)
                              <input
                                aria-label={`Divisão da disputa ${si + 1}.${di + 1}`}
                                maxLength={80}
                                disabled={locked}
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
                          {state?.lockReason && (
                            <p>{disputeLockLabels[state.lockReason]}</p>
                          )}
                          {state ? (
                            <DisputeControls
                              state={state}
                              disabled={dirty || saving}
                              onSessionLost={onSessionLost}
                              onReload={() =>
                                setAdministrationRefresh((n) => n + 1)
                              }
                              onSaved={(updated) => {
                                setAdministration((rows) =>
                                  rows.map((row) =>
                                    row.disputeId === updated.disputeId
                                      ? updated
                                      : row,
                                  ),
                                );
                                setNotice("Disputa atualizada");
                              }}
                            />
                          ) : (
                            !editor.savedIds.has(dispute.id) && (
                              <label className="competition-radio">
                                <input
                                  type="checkbox"
                                  checked={testIds.includes(dispute.id)}
                                  onChange={(event) =>
                                    setTestIds((ids) =>
                                      event.target.checked
                                        ? [...ids, dispute.id]
                                        : ids.filter((id) => id !== dispute.id),
                                    )
                                  }
                                />
                                Disputa de teste
                              </label>
                            )
                          )}
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
                                    setPendingRemoval({
                                      kind: "dispute",
                                      seasonId: season.id,
                                      disputeId: dispute.id,
                                    })
                                  }
                                >
                                  Remover disputa {si + 1}.{di + 1}
                                </button>
                              )}
                          </div>
                        </fieldset>
                      );
                    })}
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
            <AdminDialog
              title={
                pendingRemoval?.kind === "season"
                  ? "Remover temporada?"
                  : "Remover disputa?"
              }
              open={!!pendingRemoval}
              busy={saving || uncertain || opening}
              onClose={() => setPendingRemoval(null)}
              className="competition-removal-dialog"
            >
              <p>{removalDescription}</p>
              <p>
                Nada será enviado ao servidor até clicar em Salvar campeonato.
              </p>
              <div className="competition-actions">
                <button
                  type="button"
                  disabled={saving || uncertain || opening}
                  onClick={() => {
                    if (!pendingRemoval) return;
                    const removal = pendingRemoval;
                    if (
                      (removal.kind === "season" &&
                        editor.savedIds.has(removal.seasonId)) ||
                      (removal.kind === "dispute" &&
                        !!removal.disputeId &&
                        editor.savedIds.has(removal.disputeId))
                    )
                      return;
                    change((draft) => {
                      const seasonIndex = draft.seasons.findIndex(
                        (season) => season.id === removal.seasonId,
                      );
                      if (seasonIndex < 0) return;
                      if (removal.kind === "season") {
                        if (draft.seasons.length > 1)
                          draft.seasons.splice(seasonIndex, 1);
                      } else {
                        const disputes = draft.seasons[seasonIndex].disputes;
                        const disputeIndex = disputes.findIndex(
                          (dispute) => dispute.id === removal.disputeId,
                        );
                        if (disputeIndex >= 0 && disputes.length > 1)
                          disputes.splice(disputeIndex, 1);
                      }
                    });
                    setPendingRemoval(null);
                  }}
                >
                  Confirmar remoção
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={saving || uncertain || opening}
                  onClick={() => setPendingRemoval(null)}
                >
                  Cancelar remoção
                </button>
              </div>
            </AdminDialog>
          </div>
          {context && editor.savedIds.has(context.id) && (
            <div hidden={tab !== "teams"}>
              <TeamsWorkspace
                key={context.id}
                disputeId={context.id}
                globalsReadOnly={stateOf(context.id)?.isTest}
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
                contextLabel={
                  savedCompetition?.seasons
                    .flatMap((s) =>
                      s.disputes.map((d) => ({
                        id: d.id,
                        label:
                          savedCompetition.name +
                          " · " +
                          s.year +
                          " · " +
                          d.category +
                          " · " +
                          (d.gender === "feminino" ? "Feminino" : "Masculino") +
                          (d.division ? " · " + d.division : ""),
                      })),
                    )
                    .find((d) => d.id === context.id)?.label
                }
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
