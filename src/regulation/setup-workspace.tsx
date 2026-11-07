import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  buildCompetitionDefinition,
  competitionSetupSchema,
  defaultCompetitionSetup,
  knockoutPhaseNames,
  type CompetitionSetup,
} from "./format";
import {
  competitionSetupViewSchema,
  competitionSetupResultSchema,
  type CompetitionSetupView,
  type SaveCompetitionSetup,
} from "./setup-contract";
import { definitionKey } from "./draft-contract";
import { SetupOptions } from "./setup-options";
import { TiePanel } from "./tie-panel";
import { RegulationProjection } from "./projection";
import { LegacySetupEditor } from "./setup-legacy-editor";
import "./setup.css";
export const seriesFormatLabels = {
  single: "Jogo único",
  two_leg: "Ida e volta",
  best_of_3: "Melhor de 3",
  best_of_5: "Melhor de 5",
  best_of_7: "Melhor de 7",
};
type Props = {
  disputeId: string;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
};
const automatic = (d: CompetitionSetup) => ({
  direct: d.groupCount ? Math.floor(d.knockoutSize / d.groupCount) : 0,
  extra: d.groupCount ? d.knockoutSize % d.groupCount : 0,
});
const numberValue = (n: number) => (Number.isFinite(n) ? n : "");
function extraLabel(position: number) {
  return position === 3
    ? "terceiros"
    : position === 2
      ? "segundos"
      : `${position}º colocados`;
}
export function CompetitionSetupWorkspace(props: Props) {
  const [view, setView] = useState<CompetitionSetupView | null>(null),
    [document, setDocument] = useState<CompetitionSetup | null>(null),
    [baseline, setBaseline] = useState(""),
    [compiled, setCompiled] = useState<Awaited<
      ReturnType<typeof buildCompetitionDefinition>
    > | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [needsReload, setNeedsReload] = useState(false),
    [perRound, setPerRound] = useState(false),
    [draftLocked, setDraftLocked] = useState(false),
    [tieEditing, setTieEditing] = useState(false),
    [customGroups, setCustomGroups] = useState(false);
  const pending = useRef<SaveCompetitionSetup | null>(null),
    alive = useRef(true),
    draftGuard = useRef(() => true),
    errorRef = useRef<HTMLParagraphElement>(null),
    path = `/api/competition-setups/${props.disputeId}`;
  const dirty = !!document && definitionKey(document) !== baseline,
    locked = busy || uncertain || needsReload || !props.enabled;
  function report(e: unknown) {
    if (!alive.current) return;
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível confirmar a configuração.",
    );
    if (isSessionFailure(e)) props.onSessionLost();
  }
  function accept(next: CompetitionSetupView, preserve = false) {
    if (next.disputeId !== props.disputeId) throw Error("Contexto inesperado.");
    setView(next);
    setBaseline(definitionKey(next.document));
    if (!preserve) {
      setDocument(structuredClone(next.document));
      setPerRound(Object.keys(next.document.roundFormats).length > 0);
      setCustomGroups(![0, 1, 2, 3, 4, 8].includes(next.document.groupCount));
    }
    setConflict(false);
    setNeedsReload(false);
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!props.enabled) return;
    const controller = new AbortController();
    void api(path, competitionSetupViewSchema, undefined, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) accept(next);
      })
      .catch((e) => {
        if (!controller.signal.aborted) report(e);
      });
    return () => controller.abort();
  }, [path, props.enabled]);
  useEffect(() => {
    if (!view || !document) return;
    let current = true;
    void buildCompetitionDefinition(props.disputeId, document, {
      registrationIds: view.registrations.map((r) => r.id),
      games: view.games,
    })
      .then((value) => {
        if (current) setCompiled(value);
      })
      .catch(() => {
        if (current) setCompiled(null);
      });
    return () => {
      current = false;
    };
  }, [view, document, props.disputeId]);
  useEffect(() => {
    props.guard.current = () =>
      !busy &&
      draftGuard.current() &&
      (!(dirty || uncertain) ||
        window.confirm(
          uncertain
            ? "Há um envio sem confirmação. Deseja sair e conferir a configuração depois?"
            : "Há alterações não salvas na configuração. Deseja descartá-las e sair?",
        ));
    return () => {
      props.guard.current = () => true;
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
    if (error) errorRef.current?.focus();
  }, [error]);
  function change(f: (d: CompetitionSetup) => void) {
    if (locked || !document) return;
    setDocument((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      f(next);
      return next;
    });
    setStatus("");
    setError("");
  }
  function structure(f: (d: CompetitionSetup) => void) {
    change((d) => {
      const old = automatic(d),
        wasAutomatic =
          d.directPerGroup === old.direct &&
          JSON.stringify(d.extras) ===
            JSON.stringify(
              old.extra ? [{ position: old.direct + 1, count: old.extra }] : [],
            );
      f(d);
      if (wasAutomatic) {
        const next = automatic(d);
        d.directPerGroup = next.direct;
        d.extras = next.extra
          ? [{ position: next.direct + 1, count: next.extra }]
          : [];
      }
    });
  }
  async function reload(preserve = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      accept(await api(path, competitionSetupViewSchema), preserve);
    } catch (e) {
      report(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !view ||
      !document ||
      busy ||
      conflict ||
      needsReload ||
      tieEditing ||
      draftLocked
    )
      return;
    if (!pending.current) {
      const invalid =
        event.currentTarget.querySelector<HTMLInputElement>(":invalid");
      if (invalid) {
        let node: HTMLElement | null = invalid.parentElement;
        while (node) {
          if (node instanceof HTMLDetailsElement) node.open = true;
          node = node.parentElement;
        }
        invalid.reportValidity();
        return;
      }
      const parsed = competitionSetupSchema.safeParse(document);
      if (!parsed.success) {
        setError(
          "Preencha os campos e confira as equipes selecionadas. É possível guardar a estrutura livre incompleta como rascunho nas opções avançadas.",
        );
        return;
      }
      pending.current = {
        commandId: crypto.randomUUID(),
        disputeId: props.disputeId,
        expectedVersion: view.version,
        expectedContextFingerprint: view.contextFingerprint,
        document: parsed.data,
      };
    }
    setBusy(true);
    setError("");
    const c = pending.current;
    try {
      const receipt = await api(path, competitionSetupResultSchema, c);
      if (
        receipt.commandId !== c.commandId ||
        receipt.disputeId !== c.disputeId ||
        receipt.version !== c.expectedVersion + 1
      )
        throw new ApiFailure(
          503,
          "Não foi possível conferir a resposta. Repita o mesmo envio.",
        );
      if (!alive.current) return;
      pending.current = null;
      setUncertain(false);
      setBaseline(definitionKey(c.document));
      setDocument(structuredClone(c.document));
      setView({
        ...view,
        version: receipt.version,
        savedAt: receipt.savedAt,
        document: c.document,
      });
      setStatus("Configuração salva");
      setNeedsReload(true);
      props.onSaved();
      try {
        accept(await api(path, competitionSetupViewSchema));
      } catch {
        if (alive.current)
          setError(
            "Configuração salva. Recarregue os dados para atualizar o resumo.",
          );
      }
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof ApiFailure && [400, 409, 413].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        setConflict(e.status === 409);
      } else setUncertain(true);
      report(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  if (!view || !document)
    return (
      <section className="competition-setup">
        <h3 className="sr-only">Formato e classificação</h3>
        {error ? (
          <>
            <p role="alert" ref={errorRef} tabIndex={-1}>
              {error}
            </p>
            <button type="button" onClick={() => void reload()}>
              Recarregar configuração
            </button>
          </>
        ) : (
          <p role="status">Carregando configuração…</p>
        )}
      </section>
    );
  const definition = compiled?.definition ?? view.definition,
    names = new Map(view.registrations.map((r) => [r.id, r.name])),
    rounds = Object.keys(knockoutPhaseNames)
      .map(Number)
      .filter((n) => n <= document.knockoutSize)
      .sort((a, b) => b - a),
    custom = document.mode === "custom";
  return (
    <section className="competition-setup" aria-label="Formato e classificação">
      <h3 className="sr-only">Formato e classificação</h3>
      {error && (
        <p role="alert" ref={errorRef} tabIndex={-1} className="setup-error">
          {error}
        </p>
      )}
      {(conflict || needsReload) && (
        <button
          type="button"
          className="setup-link"
          disabled={busy}
          onClick={() => void reload(conflict)}
        >
          Recarregar dados
        </button>
      )}
      <form onSubmit={(event) => void save(event)} noValidate>
        <div className="setup-layout">
          <div className="setup-editor">
            {custom && (
              <div className="setup-notice">
                <p>
                  O formato existente foi preservado. Você pode editá-lo nas
                  opções avançadas.
                </p>
                <button
                  type="button"
                  className="setup-link"
                  disabled={locked || draftLocked}
                  onClick={() =>
                    change((d) => {
                      const next = defaultCompetitionSetup();
                      next.occurrenceRules = d.occurrenceRules;
                      Object.assign(d, next);
                    })
                  }
                >
                  Usar formato simples
                </button>
              </div>
            )}
            <fieldset
              disabled={locked || custom || draftLocked}
              className="setup-section"
            >
              <legend>Fase classificatória</legend>
              <div className="setup-fields">
                <label className="setup-field">
                  Organização
                  <select
                    value={customGroups ? "custom" : document.groupCount}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setCustomGroups(true);
                        return;
                      }
                      setCustomGroups(false);
                      structure((d) => {
                        d.groupCount = Number(e.target.value);
                      });
                    }}
                  >
                    <option value="1">Grupo único</option>
                    {[2, 3, 4, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} grupos
                      </option>
                    ))}
                    <option value="custom">Outro número de grupos</option>
                    <option value="0">Sem fase classificatória</option>
                  </select>
                </label>
                {document.groupCount > 0 && (
                  <label className="setup-field">
                    Turnos
                    <select
                      value={document.turns}
                      onChange={(e) =>
                        change((d) => {
                          d.turns = Number(e.target.value) as 1 | 2;
                        })
                      }
                    >
                      <option value="1">Turno único</option>
                      <option value="2">Ida e volta</option>
                    </select>
                  </label>
                )}
                {customGroups && (
                  <label className="setup-field">
                    Quantidade de grupos
                    <input
                      type="number"
                      required
                      min={1}
                      max={32}
                      value={numberValue(document.groupCount)}
                      onChange={(e) =>
                        structure((d) => {
                          d.groupCount = e.target.valueAsNumber;
                        })
                      }
                    />
                  </label>
                )}
              </div>
              {document.groupCount === 1 && (
                <p className="setup-hint">
                  As equipes cadastradas entram no grupo automaticamente.
                </p>
              )}
              {document.groupCount > 1 && document.knockoutSize > 0 && (
                <div className="setup-vacancies">
                  <label className="setup-field">
                    Classificados por grupo
                    <input
                      type="number"
                      required
                      min={0}
                      max={1000}
                      value={numberValue(document.directPerGroup)}
                      onChange={(e) =>
                        change((d) => {
                          d.directPerGroup = e.target.valueAsNumber;
                        })
                      }
                    />
                  </label>
                  <label className="setup-field">
                    Vagas extras
                    <input
                      type="number"
                      required
                      min={0}
                      max={1000}
                      value={numberValue(document.extras[0]?.count ?? 0)}
                      onChange={(e) =>
                        change((d) => {
                          const count = e.target.valueAsNumber;
                          d.extras =
                            count === 0
                              ? d.extras.slice(1)
                              : [
                                  {
                                    position:
                                      d.extras[0]?.position ??
                                      d.directPerGroup + 1,
                                    count,
                                  },
                                  ...d.extras.slice(1),
                                ];
                        })
                      }
                    />
                  </label>
                  <p className="setup-hint">
                    {document.extras[0] &&
                    Number.isFinite(document.extras[0].count)
                      ? `${document.extras[0].count} melhores ${extraLabel(document.extras[0].position)}`
                      : "Sem vagas extras"}
                  </p>
                </div>
              )}
            </fieldset>
            <fieldset
              disabled={locked || custom || draftLocked}
              className="setup-section"
            >
              <legend>Eliminatórias</legend>
              <div className="setup-fields">
                <label className="setup-field">
                  Começar em
                  <select
                    value={document.knockoutSize}
                    onChange={(e) =>
                      structure((d) => {
                        d.knockoutSize = Number(
                          e.target.value,
                        ) as CompetitionSetup["knockoutSize"];
                      })
                    }
                  >
                    {[2, 4, 8, 16, 32, 64].map((n) => (
                      <option key={n} value={n}>
                        {knockoutPhaseNames[n]} · {n} equipes
                      </option>
                    ))}
                    <option value="0">Sem eliminatórias</option>
                  </select>
                </label>
                {document.knockoutSize > 0 && (
                  <label className="setup-field">
                    {perRound ? "Formato padrão" : "Formato das séries"}
                    <select
                      value={document.seriesFormat}
                      onChange={(e) =>
                        change((d) => {
                          d.seriesFormat = e.target
                            .value as CompetitionSetup["seriesFormat"];
                          d.roundFormats = {};
                        })
                      }
                    >
                      {Object.entries(seriesFormatLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                )}
              </div>
              {document.knockoutSize > 0 && (
                <div className="setup-inline-actions">
                  <span className="setup-hint">
                    {document.groupCount === 1
                      ? `Classificam-se os ${document.knockoutSize} primeiros.`
                      : document.groupCount === 0
                        ? "Escolha os participantes nas opções manuais."
                        : `${Number.isFinite(document.directPerGroup) ? document.directPerGroup : 0} por grupo + ${document.extras.reduce((n, e) => n + (Number.isFinite(e.count) ? e.count : 0), 0)} vagas extras.`}
                  </span>
                  {rounds.length > 1 && (
                    <button
                      type="button"
                      className="setup-link"
                      aria-expanded={perRound}
                      onClick={() => {
                        setPerRound(!perRound);
                        if (perRound)
                          change((d) => {
                            d.roundFormats = {};
                          });
                      }}
                    >
                      {perRound ? "Usar o mesmo em todas" : "Definir por fase"}
                    </button>
                  )}
                </div>
              )}
              {perRound && (
                <div className="setup-fields setup-round-formats">
                  {rounds.map((n) => (
                    <label key={n} className="setup-field">
                      {knockoutPhaseNames[n]}
                      <select
                        aria-label={`Formato: ${knockoutPhaseNames[n]}`}
                        value={
                          document.roundFormats[String(n)] ??
                          document.seriesFormat
                        }
                        onChange={(e) =>
                          change((d) => {
                            d.roundFormats[String(n)] = e.target
                              .value as CompetitionSetup["seriesFormat"];
                          })
                        }
                      >
                        {Object.entries(seriesFormatLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <details className="setup-advanced-disclosure">
              <summary>Opções avançadas</summary>
              <fieldset className="setup-advanced" disabled={locked}>
                <legend className="sr-only">Opções avançadas</legend>
                {custom ? (
                  <LegacySetupEditor
                    disputeId={props.disputeId}
                    baseRegulationVersion={view.legacyRegulationVersion}
                    guard={draftGuard}
                    onLock={setDraftLocked}
                    definition={document.customDefinition!}
                    disabled={locked}
                    onSessionLost={props.onSessionLost}
                    onChange={(definition) =>
                      change((d) => {
                        d.customDefinition = definition;
                      })
                    }
                  />
                ) : (
                  <SetupOptions
                    document={document}
                    view={view}
                    definition={definition}
                    change={change}
                    disabled={locked}
                  />
                )}
                <details>
                  <summary>Desempates e classificação atual</summary>
                  {dirty && (
                    <p className="setup-hint">
                      Salve as alterações de formato para atualizar esta
                      classificação.
                    </p>
                  )}
                  <fieldset
                    className="setup-tie-controls regulation"
                    disabled={locked || dirty}
                  >
                    <legend className="sr-only">Desempates</legend>
                    <TiePanel
                      value={view.projection}
                      definition={view.definition}
                      names={names}
                      onEditingChange={setTieEditing}
                      change={(fn) => {
                        const next = structuredClone(view.definition);
                        fn(next);
                        change((d) => {
                          if (d.mode === "custom") d.customDefinition = next;
                          else {
                            d.tieDecisions = next.tieDecisions ?? [];
                            d.tieNotes = next.tieNotes ?? [];
                          }
                        });
                      }}
                    />
                  </fieldset>
                  <RegulationProjection
                    value={view.projection}
                    definition={view.definition}
                    names={names}
                    title="Classificação atual"
                  />
                </details>
                {!custom && (
                  <details>
                    <summary>Estrutura livre</summary>
                    <p className="setup-hint">
                      Para formatos fora dos modelos, você pode montar fases e
                      confrontos manualmente.
                    </p>
                    <button
                      type="button"
                      className="setup-link"
                      onClick={() =>
                        change((d) => {
                          d.mode = "custom";
                          d.customDefinition = {
                            registrationIds: view.registrations.map(
                              (r) => r.id,
                            ),
                            occurrenceRules: d.occurrenceRules,
                            groupPhases: [],
                            knockoutPhases: [],
                            series: [],
                          };
                        })
                      }
                    >
                      Configurar estrutura livre
                    </button>
                  </details>
                )}
              </fieldset>
            </details>
          </div>
          <aside className="setup-summary" aria-label="Resumo do formato">
            <h4>Como fica a disputa</h4>
            {definition.groupPhases.map((p) =>
              p.groups.length === 1 ? (
                <div key={p.phaseId} className="setup-stage">
                  <h5>{p.groups[0].name}</h5>
                  <span>
                    {document.turns === 1 ? "Turno único" : "Ida e volta"}
                  </span>
                  <p>Todos contra todos.</p>
                  {document.knockoutSize > 0 && (
                    <strong className="setup-seeds">
                      {document.knockoutSize} classificados
                    </strong>
                  )}
                </div>
              ) : (
                <div key={p.phaseId} className="setup-stage">
                  <h5>{p.groups.length} grupos</h5>
                  <span>
                    {document.turns === 1 ? "Turno único" : "Ida e volta"}
                  </span>
                  <p>
                    {document.directPerGroup} por grupo
                    {document.extras.length
                      ? ` + ${document.extras.reduce((n, e) => n + e.count, 0)} vagas extras`
                      : ""}
                    .
                  </p>
                </div>
              ),
            )}
            {definition.knockoutPhases.map((phase, index) => {
              const series = definition.series.filter(
                (s) => s.phaseId === phase.id,
              );
              return (
                <div className="setup-stage" key={phase.id}>
                  <h5>{phase.name}</h5>
                  <span>
                    {series[0]
                      ? seriesFormatLabels[series[0].format]
                      : "A definir"}
                  </span>
                  {index === 0 ? (
                    <div className="setup-pairings">
                      {series.slice(0, 4).map((s) => (
                        <span key={s.id}>
                          {s.home.kind === "qualification_rank"
                            ? `${s.home.position}º`
                            : s.home.kind === "registration"
                              ? names.get(s.home.registrationId)
                              : "A definir"}{" "}
                          ×{" "}
                          {s.away.kind === "qualification_rank"
                            ? `${s.away.position}º`
                            : s.away.kind === "registration"
                              ? names.get(s.away.registrationId)
                              : "A definir"}
                        </span>
                      ))}
                      {series.length > 4 && (
                        <small>Mais {series.length - 4} confrontos</small>
                      )}
                    </div>
                  ) : (
                    <p>Vencedores da fase anterior.</p>
                  )}
                </div>
              );
            })}
            <div className="setup-automatic">
              <h5>Classificação automática</h5>
              <p>Resultados atualizados ao finalizar o jogo.</p>
            </div>
            {compiled?.warnings.map((warning, i) => (
              <p key={i} className="setup-hint setup-pending">
                {warning}
              </p>
            ))}
          </aside>
        </div>
        <footer className="setup-savebar">
          <p role="status">
            {busy
              ? "Salvando…"
              : uncertain
                ? "Envio não confirmado"
                : status ||
                  (dirty
                    ? "Alterações não salvas"
                    : view.version
                      ? "Configuração salva"
                      : "Padrão aplicado")}
          </p>
          <div>
            {dirty && !uncertain && (
              <button
                type="button"
                className="setup-link"
                disabled={locked || draftLocked}
                onClick={() => {
                  setDocument(structuredClone(view.document));
                  setStatus("");
                  setError("");
                }}
              >
                Descartar
              </button>
            )}
            <button
              type="submit"
              className="setup-save"
              disabled={
                busy ||
                needsReload ||
                conflict ||
                tieEditing ||
                draftLocked ||
                !props.enabled ||
                (!dirty && !uncertain)
              }
            >
              {uncertain ? "Repetir envio" : "Salvar"}
            </button>
          </div>
        </footer>
      </form>
      <p className="setup-hint">
        Pendências de organização não impedem o lançamento ou a finalização dos
        jogos.
      </p>
    </section>
  );
}
