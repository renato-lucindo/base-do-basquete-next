import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  achievementDraftSchema,
  type AchievementDraft,
  type PlacementSource,
} from "./contract";
import { achievementCandidateListingSchema } from "./context-contract";
import {
  saveAchievementDraftSchema,
  achievementDraftAckSchema,
  type SaveAchievementDraft,
} from "./draft-contract";
import {
  confirmAchievementsSchema,
  achievementConfirmationAckSchema,
  achievementPublicationVersionSchema,
  publicAchievementsSchema,
  type ConfirmAchievements,
  type PublicAchievements,
} from "./publication-contract";
import {
  achievementWorkspaceSchema,
  achievementSuggestionViewSchema,
  achievementDraftVersionViewSchema,
  type AchievementWorkspace,
} from "./view-contract";
import "../regulation/screen.css";
import "./screen.css";
type Props = {
  disputeId: string;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onClose: () => void;
};
type Editable = {
  positions: Record<string, string>;
  honors: AchievementDraft["honors"];
  source: PlacementSource | null;
  mode: "manual" | "group" | "series";
};
type Person = AchievementWorkspace["selectedPeople"][number];
type Pending =
  | {
      kind: "save";
      command: SaveAchievementDraft;
      ack: ReturnType<typeof achievementDraftAckSchema.parse> | null;
    }
  | {
      kind: "confirm";
      command: ConfirmAchievements;
      ack: ReturnType<typeof achievementConfirmationAckSchema.parse> | null;
    };
type CandidatePage = ReturnType<typeof achievementCandidateListingSchema.parse>;
type Detail =
  | {
      kind: "draft";
      value: ReturnType<typeof achievementDraftVersionViewSchema.parse>;
    }
  | {
      kind: "confirmation";
      value: ReturnType<typeof achievementPublicationVersionSchema.parse>;
    };
const empty = (): Editable => ({
  positions: {},
  honors: [],
  source: null,
  mode: "manual",
});
function editable(v: AchievementWorkspace): Editable {
  const positions = Object.fromEntries(v.registrations.map((r) => [r.id, ""]));
  for (const g of v.draft.draft?.placements ?? [])
    for (const id of g.registrationIds) positions[id] = String(g.position);
  return {
    positions,
    honors: structuredClone(v.draft.draft?.honors ?? []),
    source: structuredClone(v.draft.source),
    mode: v.draft.source?.kind ?? "manual",
  };
}
const time = (v: string) =>
  new Date(v).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
export function AchievementPanel(p: Props) {
  const [view, setView] = useState<AchievementWorkspace | null>(null),
    [edit, setEdit] = useState<Editable>(empty),
    [baseline, setBaseline] = useState(""),
    [people, setPeople] = useState<Person[]>([]),
    [loading, setLoading] = useState(true),
    [loadAttempt, setLoadAttempt] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [conflict, setConflict] = useState(false),
    [reason, setReason] = useState(""),
    [checked, setChecked] = useState(false),
    [suggestion, setSuggestion] = useState<ReturnType<
      typeof achievementSuggestionViewSchema.parse
    > | null>(null),
    [queries, setQueries] = useState<Record<string, string>>({}),
    [candidates, setCandidates] = useState<Record<string, CandidatePage>>({}),
    [candidateOffsets, setCandidateOffsets] = useState<Record<string, number>>(
      {},
    ),
    [draftHistory, setDraftHistory] = useState<
      AchievementWorkspace["draft"]["history"]
    >([]),
    [pubHistory, setPubHistory] = useState<
      AchievementWorkspace["publication"]["history"]
    >([]),
    [draftOffset, setDraftOffset] = useState(0),
    [pubOffset, setPubOffset] = useState(0),
    [draftMore, setDraftMore] = useState(false),
    [pubMore, setPubMore] = useState(false),
    [detail, setDetail] = useState<Detail | null>(null),
    [published, setPublished] = useState<PublicAchievements | null>(null);
  const pending = useRef<Pending | null>(null),
    firstPosition = useRef<HTMLInputElement>(null),
    nextHonorFocus = useRef<string | null>(null),
    running = useRef(false),
    alive = useRef(true),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    result = useRef<HTMLParagraphElement>(null),
    detailHeading = useRef<HTMLHeadingElement>(null),
    lastDetailButton = useRef<HTMLButtonElement | null>(null);
  const path = `/api/achievements/${p.disputeId}`,
    dirty = !!view && JSON.stringify(edit) !== baseline,
    locked = busy || !!pending.current || !p.enabled;
  const names = new Map(view?.registrations.map((r) => [r.id, r.name])),
    personNames = new Map(people.map((r) => [r.personId, r.name]));
  const mayLeave = () =>
    !running.current &&
    (!(dirty || reason.trim() || checked || pending.current) ||
      window.confirm(
        "Há premiações não salvas ou um envio não confirmado. Sair desta edição?",
      ));
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    p.guard.current = mayLeave;
    return () => {
      p.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!dirty && !reason.trim() && !checked && !pending.current) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy, status, reason, checked]);
  useEffect(() => {
    if (p.enabled) heading.current?.focus();
  }, [p.enabled]);
  useEffect(() => {
    if (error && p.enabled) alert.current?.focus();
  }, [error, p.enabled]);
  useEffect(() => {
    if (detail) detailHeading.current?.focus();
  }, [detail]);
  function fail(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível concluir. Tente novamente.",
    );
  }
  function begin() {
    if (running.current || !p.enabled) return false;
    running.current = true;
    setBusy(true);
    setError("");
    return true;
  }
  function end() {
    running.current = false;
    if (alive.current) setBusy(false);
  }
  function accept(v: AchievementWorkspace, preserve = false) {
    if (v.disputeId !== p.disputeId)
      throw Error("Área de outra disputa recusada.");
    const next = editable(v);
    setView(v);
    setBaseline(JSON.stringify(next));
    if (!preserve) setEdit(next);
    setPeople((old) => [
      ...new Map(
        [...old, ...v.selectedPeople].map((x) => [x.personId, x]),
      ).values(),
    ]);
    setDraftHistory(v.draft.history);
    setPubHistory(v.publication.history);
    setDraftOffset(0);
    setPubOffset(0);
    setDraftMore(v.draft.hasMore);
    setPubMore(v.publication.hasMore);
    setSuggestion(null);
    setChecked(false);
    setReason("");
    setConflict(false);
    setDetail(null);
  }
  useEffect(() => {
    if (!p.enabled || view) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api(path, achievementWorkspaceSchema, undefined, controller.signal)
      .then((v) => {
        if (!controller.signal.aborted) {
          accept(v);
          heading.current?.focus();
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) fail(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [p.enabled, loadAttempt, view === null, p.disputeId]);
  function change(fn: (value: Editable) => void) {
    if (locked) return;
    setEdit((old) => {
      const value = structuredClone(old);
      fn(value);
      return value;
    });
    setSuggestion(null);
    setChecked(false);
    setError("");
    setStatus("");
  }
  function document(): AchievementDraft {
    if (!view) throw Error("Carregue as premiações antes de editar.");
    if (edit.mode !== "manual" && !edit.source)
      throw Error("Escolha o grupo ou os confrontos da sugestão.");
    const groups = new Map<number, string[]>();
    for (const [id, raw] of Object.entries(edit.positions)) {
      if (raw === "") continue;
      const position = Number(raw);
      if (
        !/^\d+$/u.test(raw) ||
        !Number.isSafeInteger(position) ||
        position < 1 ||
        position > 1000 ||
        !names.has(id)
      )
        throw Error(
          "Confira posições de 1 a 1000 para inscrições desta disputa.",
        );
      groups.set(position, [...(groups.get(position) ?? []), id]);
    }
    const parsed = achievementDraftSchema.safeParse({
      disputeId: p.disputeId,
      placements: [...groups]
        .sort((a, b) => a[0] - b[0])
        .map(([position, registrationIds]) => ({ position, registrationIds })),
      honors: edit.honors,
    });
    if (!parsed.success)
      throw Error(
        "Confira títulos de 2 a 80 caracteres e pelo menos um destinatário por honraria, sem repetições.",
      );
    return parsed.data;
  }
  async function finish(item: Pending) {
    const v = await api(path, achievementWorkspaceSchema);
    if (!alive.current) return;
    if (
      v.disputeId !== p.disputeId ||
      !item.ack ||
      (item.kind === "save"
        ? v.draft.version < item.ack.version
        : v.publication.version < item.ack.version)
    )
      throw Error(
        "A gravação foi confirmada, mas a leitura ainda não alcançou essa versão. Retome a atualização.",
      );
    accept(v);
    pending.current = null;
    setStatus(
      item.kind === "save"
        ? "Rascunho de premiações salvo."
        : "Premiações confirmadas.",
    );
    p.onSaved();
    result.current?.focus();
  }
  async function send(item: Pending) {
    if (!item.ack) {
      if (item.kind === "save")
        item.ack = await api(path, achievementDraftAckSchema, item.command);
      else
        item.ack = await api(
          `${path}/confirm`,
          achievementConfirmationAckSchema,
          item.command,
        );
    }
    await finish(item);
  }
  function mutationFailure(e: unknown) {
    if (e instanceof ApiFailure && [400, 409, 413, 415].includes(e.status)) {
      pending.current = null;
      if (e.status === 409) setConflict(true);
    }
    setStatus(
      pending.current?.ack
        ? "Gravação confirmada; atualização pendente."
        : pending.current
          ? "Envio não confirmado. Preserve o mesmo pedido para retomar."
          : "",
    );
    fail(e);
  }
  async function save() {
    if (pending.current || !view || !begin()) return;
    try {
      const parsed = saveAchievementDraftSchema.safeParse({
        commandId: crypto.randomUUID(),
        expectedVersion: view.draft.version,
        expectedContextFingerprint: view.contextFingerprint,
        source: edit.source,
        draft: document(),
      });
      if (!parsed.success)
        throw Error(
          "Confira a origem da sugestão e os dados do rascunho antes de salvar.",
        );
      const item: Pending = { kind: "save", command: parsed.data, ack: null };
      pending.current = item;
      await send(item);
    } catch (e) {
      if (alive.current) mutationFailure(e);
    } finally {
      end();
    }
  }
  async function confirm() {
    if (pending.current || !view || !begin()) return;
    try {
      if (dirty || !checked || view.draft.needsReview || !view.draft.version)
        throw Error(
          "Salve o rascunho revisado e confira os destinatários antes de confirmar.",
        );
      const c = confirmAchievementsSchema.safeParse({
        commandId: crypto.randomUUID(),
        disputeId: p.disputeId,
        expectedDraftVersion: view.draft.version,
        expectedPublicationVersion: view.publication.version,
        expectedContextFingerprint: view.contextFingerprint,
        reason,
        acknowledgeImpact: checked,
      });
      if (!c.success)
        throw Error("Informe o motivo da revisão com 3 a 2000 caracteres.");
      const item: Pending = { kind: "confirm", command: c.data, ack: null };
      pending.current = item;
      await send(item);
    } catch (e) {
      if (alive.current) mutationFailure(e);
    } finally {
      end();
    }
  }
  async function resume() {
    const item = pending.current;
    if (!item || !begin()) return;
    try {
      await send(item);
    } catch (e) {
      if (alive.current) mutationFailure(e);
    } finally {
      end();
    }
  }
  async function refresh() {
    if (pending.current || !begin()) return;
    try {
      const v = await api(path, achievementWorkspaceSchema);
      if (alive.current) {
        accept(v, true);
        setStatus(
          "Contexto atualizado. Sua edição foi preservada; confira antes de salvar.",
        );
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      end();
    }
  }
  async function preview() {
    if (!view || pending.current || !begin()) return;
    try {
      if (edit.mode !== "manual" && !edit.source)
        throw Error("Escolha o grupo ou os confrontos da sugestão.");
      const v = await api(
        `${path}/suggestion`,
        achievementSuggestionViewSchema,
        {
          disputeId: p.disputeId,
          expectedContextFingerprint: view.contextFingerprint,
          source: edit.source,
        },
      );
      if (
        v.disputeId !== p.disputeId ||
        v.contextFingerprint !== view.contextFingerprint
      )
        throw Error("A fonte mudou. Atualize o contexto.");
      if (alive.current) setSuggestion(v);
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiFailure && e.status === 409) setConflict(true);
        fail(e);
      }
    } finally {
      end();
    }
  }
  async function search(honorId: string, more = false) {
    if (!view || pending.current || !begin()) return;
    const offset = more ? (candidateOffsets[honorId] ?? 0) + 20 : 0;
    try {
      const value = await api(
        `${path}/athletes?q=${encodeURIComponent(queries[honorId] ?? "")}&offset=${offset}`,
        achievementCandidateListingSchema,
      );
      if (value.disputeId !== p.disputeId)
        throw Error("Atletas de outra disputa recusados.");
      if (alive.current) {
        setCandidates((old) => ({
          ...old,
          [honorId]: {
            ...value,
            items: more
              ? [...(old[honorId]?.items ?? []), ...value.items]
              : value.items,
          },
        }));
        setCandidateOffsets((old) => ({ ...old, [honorId]: offset }));
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      end();
    }
  }
  async function history(
    kind: "draft" | "confirmation",
    wanted: number,
    button: HTMLButtonElement,
  ) {
    if (pending.current || !begin()) return;
    lastDetailButton.current = button;
    try {
      if (kind === "draft") {
        const value = await api(
          `${path}/drafts/${wanted}`,
          achievementDraftVersionViewSchema,
        );
        if (value.disputeId !== p.disputeId || value.version !== wanted)
          throw Error("Versão de outro contexto recusada.");
        if (alive.current) setDetail({ kind, value });
      } else {
        const value = await api(
          `${path}/confirmations/${wanted}`,
          achievementPublicationVersionSchema,
        );
        if (value.disputeId !== p.disputeId || value.version !== wanted)
          throw Error("Confirmação de outro contexto recusada.");
        if (alive.current) setDetail({ kind, value });
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      end();
    }
  }
  async function moreHistory(kind: "draft" | "confirmation") {
    if (!view || pending.current || !begin()) return;
    const offset = (kind === "draft" ? draftOffset : pubOffset) + 20;
    try {
      const v = await api(
        `${path}?draftOffset=${kind === "draft" ? offset : draftOffset}&publicationOffset=${kind === "confirmation" ? offset : pubOffset}`,
        achievementWorkspaceSchema,
      );
      if (
        v.disputeId !== p.disputeId ||
        v.contextFingerprint !== view.contextFingerprint ||
        v.draft.version !== view.draft.version ||
        v.publication.version !== view.publication.version
      ) {
        setConflict(true);
        throw Error(
          "Os dados mudaram durante a consulta. Atualize o contexto preservando sua edição.",
        );
      }
      if (alive.current) {
        if (kind === "draft") {
          setDraftHistory((old) => [...old, ...v.draft.history]);
          setDraftMore(v.draft.hasMore);
          setDraftOffset(offset);
        } else {
          setPubHistory((old) => [...old, ...v.publication.history]);
          setPubMore(v.publication.hasMore);
          setPubOffset(offset);
        }
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      end();
    }
  }
  async function showPublic() {
    if (pending.current || !begin()) return;
    try {
      const v = await api(
        `/api/public/achievements/${p.disputeId}`,
        publicAchievementsSchema,
      );
      if (v.disputeId !== p.disputeId)
        throw Error("Premiação de outra disputa recusada.");
      if (alive.current) setPublished(v);
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      end();
    }
  }
  const canConfirm =
    !!view &&
    view.draft.version > 0 &&
    !view.draft.needsReview &&
    !dirty &&
    !conflict &&
    !locked;
  return (
    <section className="regulation achievements">
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => {
          if (mayLeave()) p.onClose();
        }}
      >
        Voltar às regras
      </button>
      <h2 ref={heading} tabIndex={-1}>
        Colocações e honrarias
      </h2>
      <p>
        Confira as colocações e os atletas premiados nesta disputa. Salvar
        mantém o rascunho privado; a confirmação publica somente estas
        premiações.
      </p>
      {error && (
        <p role="alert" className="access-error" ref={alert} tabIndex={-1}>
          {error}
        </p>
      )}
      <p role="status" ref={result} tabIndex={-1}>
        {busy
          ? "Conferindo…"
          : status ||
            (!view
              ? loading
                ? "Carregando premiações…"
                : "Não foi possível carregar as premiações."
              : dirty
                ? "Alterações não salvas."
                : view.draft.version
                  ? "Rascunho de premiações salvo."
                  : "Rascunho ainda não salvo.")}
      </p>
      {!view && !loading && (
        <button onClick={() => setLoadAttempt((n) => n + 1)}>
          Tentar carregar premiações
        </button>
      )}
      {pending.current && (
        <button disabled={busy || !p.enabled} onClick={() => void resume()}>
          {pending.current.ack
            ? "Retomar atualização das premiações"
            : "Repetir envio de premiações"}
        </button>
      )}
      {view && (
        <>
          {(conflict ||
            view.draft.needsReview ||
            view.publication.sourceChanged ||
            view.publication.draftChanged) && (
            <div className="reg-review">
              <p>
                {conflict
                  ? "Os dados mudaram. Sua edição continua preservada."
                  : view.draft.needsReview || view.publication.sourceChanged
                    ? "A fonte mudou desde a conferência. Revise e salve antes de confirmar novamente."
                    : "Há um rascunho diferente da última confirmação. A premiação confirmada permanece como estava."}
              </p>
              <button disabled={locked} onClick={() => void refresh()}>
                Atualizar contexto preservando edição
              </button>
            </div>
          )}
          <fieldset className="achievement-source" disabled={locked}>
            <legend>Sugestão de colocações</legend>
            <label>
              Origem da sugestão
              <select
                aria-label="Origem da sugestão"
                value={edit.mode}
                onChange={(e) =>
                  change((d) => {
                    d.mode = e.target.value as Editable["mode"];
                    d.source = null;
                  })
                }
              >
                <option value="manual">Preenchimento manual</option>
                <option value="group">Classificação de um grupo</option>
                <option value="series">Final e disputa de bronze</option>
              </select>
            </label>
            {edit.mode === "group" && (
              <label>
                Grupo para sugerir colocações
                <select
                  aria-label="Grupo para sugerir colocações"
                  value={
                    edit.source?.kind === "group"
                      ? `${edit.source.phaseId}:${edit.source.groupId}`
                      : ""
                  }
                  onChange={(e) =>
                    change((d) => {
                      const g = view.sourceOptions.groups.find(
                        (g) => `${g.phaseId}:${g.groupId}` === e.target.value,
                      );
                      d.source = g
                        ? {
                            kind: "group",
                            phaseId: g.phaseId,
                            groupId: g.groupId,
                          }
                        : null;
                    })
                  }
                >
                  <option value="">Escolha um grupo</option>
                  {view.sourceOptions.groups.map((g) => (
                    <option
                      key={`${g.phaseId}:${g.groupId}`}
                      value={`${g.phaseId}:${g.groupId}`}
                    >
                      {g.phaseName} · {g.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {edit.mode === "series" && (
              <>
                <label>
                  Confronto da final
                  <select
                    aria-label="Confronto da final"
                    value={
                      edit.source?.kind === "series"
                        ? edit.source.finalSeriesId
                        : ""
                    }
                    onChange={(e) =>
                      change((d) => {
                        d.source = e.target.value
                          ? {
                              kind: "series",
                              finalSeriesId: e.target.value,
                              bronzeSeriesId:
                                d.source?.kind === "series"
                                  ? d.source.bronzeSeriesId
                                  : null,
                            }
                          : null;
                      })
                    }
                  >
                    <option value="">Escolha a final</option>
                    {view.sourceOptions.series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Confronto do bronze
                  <select
                    aria-label="Confronto do bronze"
                    disabled={edit.source?.kind !== "series"}
                    value={
                      edit.source?.kind === "series"
                        ? (edit.source.bronzeSeriesId ?? "")
                        : ""
                    }
                    onChange={(e) =>
                      change((d) => {
                        if (d.source?.kind === "series")
                          d.source.bronzeSeriesId = e.target.value || null;
                      })
                    }
                  >
                    <option value="">Sem bronze escolhido</option>
                    {view.sourceOptions.series.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <button type="button" onClick={() => void preview()}>
              Conferir sugestão
            </button>
          </fieldset>
          {suggestion && (
            <section className="reg-review">
              <h3>Sugestão para conferir</h3>
              {suggestion.suggestion.placements.length > 0 && (
                <ul>
                  {suggestion.suggestion.placements.map((g) => (
                    <li key={g.position}>
                      {g.position}º ·{" "}
                      {g.registrationIds
                        .map((id) => names.get(id) ?? "Inscrição")
                        .join(" / ")}
                    </li>
                  ))}
                </ul>
              )}
              {suggestion.suggestion.needs && (
                <p>
                  Não há sugestão completa. Confira a fonte, os resultados,
                  empates e confrontos pendentes. Nenhuma posição foi confirmada
                  automaticamente.
                </p>
              )}
              <button
                disabled={locked || !suggestion.suggestion.ready}
                onClick={() => {
                  change((d) => {
                    d.positions = Object.fromEntries(
                      view.registrations.map((r) => [r.id, ""]),
                    );
                    for (const g of suggestion.suggestion.placements)
                      for (const id of g.registrationIds)
                        d.positions[id] = String(g.position);
                  });
                  requestAnimationFrame(() => firstPosition.current?.focus());
                }}
              >
                Usar estas colocações no rascunho
              </button>
            </section>
          )}
          <fieldset disabled={locked}>
            <legend>Colocações para conferir</legend>
            <p>
              Deixe em branco as inscrições sem colocação. Posições iguais
              representam colocação compartilhada.
            </p>
            <div className="achievement-positions">
              {view.registrations.map((r, index) => {
                const name =
                  view.registrations.filter((v) => v.name === r.name).length > 1
                    ? `${r.name} · inscrição ${index + 1}`
                    : r.name;
                return (
                  <label key={r.id}>
                    Posição de {name}
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      inputMode="numeric"
                      ref={index === 0 ? firstPosition : undefined}
                      value={edit.positions[r.id] ?? ""}
                      onChange={(e) =>
                        change((d) => {
                          d.positions[r.id] = e.target.value;
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset disabled={locked}>
            <legend>Honrarias individuais</legend>
            {edit.honors.map((h, index) => (
              <fieldset key={h.id}>
                <legend>Honraria {index + 1}</legend>
                <label>
                  Título da honraria {index + 1}
                  <input
                    maxLength={160}
                    ref={(node) => {
                      if (node && nextHonorFocus.current === h.id) {
                        node.focus();
                        nextHonorFocus.current = null;
                      }
                    }}
                    value={h.title}
                    onChange={(e) =>
                      change((d) => {
                        d.honors[index].title = e.target.value;
                      })
                    }
                  />
                </label>
                <ul className="achievement-recipients">
                  {h.personIds.map((id) => (
                    <li key={id}>
                      <span>{personNames.get(id) ?? "Atleta selecionado"}</span>
                      <button
                        className="secondary"
                        onClick={() =>
                          change((d) => {
                            d.honors[index].personIds = d.honors[
                              index
                            ].personIds.filter((v) => v !== id);
                          })
                        }
                      >
                        Remover {personNames.get(id) ?? "atleta"} da honraria{" "}
                        {index + 1}
                      </button>
                    </li>
                  ))}
                </ul>
                <label>
                  Buscar atleta para honraria {index + 1}
                  <input
                    value={queries[h.id] ?? ""}
                    maxLength={240}
                    onChange={(e) => {
                      setQueries((old) => ({ ...old, [h.id]: e.target.value }));
                      setCandidates((old) => {
                        const next = { ...old };
                        delete next[h.id];
                        return next;
                      });
                    }}
                  />
                </label>
                <button onClick={() => void search(h.id)}>
                  Buscar destinatários da honraria {index + 1}
                </button>
                {candidates[h.id] && (
                  <div>
                    <p>
                      {candidates[h.id].items.length
                        ? "Escolha a identidade pelo nome e contexto."
                        : "Nenhum atleta encontrado neste histórico."}
                    </p>
                    <ul>
                      {candidates[h.id].items.map((v, n) => (
                        <li key={v.personId}>
                          <button
                            disabled={h.personIds.includes(v.personId)}
                            onClick={() => {
                              setPeople((old) => [
                                ...new Map(
                                  [
                                    ...old,
                                    {
                                      personId: v.personId,
                                      version: v.version,
                                      name: v.name,
                                      nickname: v.nickname,
                                      publicBirthYear: v.publicBirthYear,
                                    },
                                  ].map((p) => [p.personId, p]),
                                ).values(),
                              ]);
                              change((d) => {
                                if (
                                  !d.honors[index].personIds.includes(
                                    v.personId,
                                  )
                                )
                                  d.honors[index].personIds.push(v.personId);
                              });
                            }}
                          >
                            Selecionar {v.name}
                            {v.nickname ? ` (${v.nickname})` : ""}
                            {v.publicBirthYear
                              ? ` · ${v.publicBirthYear}`
                              : ""}{" "}
                            para honraria {index + 1} ·{" "}
                            {v.registrationIds
                              .map(
                                (id) => names.get(id) ?? "Inscrição histórica",
                              )
                              .join(" / ")}{" "}
                            · opção {n + 1}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {candidates[h.id].hasMore && (
                      <button onClick={() => void search(h.id, true)}>
                        Mais destinatários da honraria {index + 1}
                      </button>
                    )}
                  </div>
                )}
                <button
                  className="secondary"
                  onClick={() =>
                    change((d) => {
                      d.honors.splice(index, 1);
                    })
                  }
                >
                  Remover honraria {index + 1}
                </button>
              </fieldset>
            ))}
            <button
              disabled={edit.honors.length >= 1000}
              onClick={() => {
                const id = crypto.randomUUID();
                nextHonorFocus.current = id;
                change((d) => {
                  d.honors.push({
                    id,
                    title: "",
                    personIds: [],
                  });
                });
              }}
            >
              Adicionar honraria
            </button>
          </fieldset>
          <div className="reg-actions">
            <button
              disabled={
                locked ||
                conflict ||
                (!dirty && view.draft.version > 0 && !view.draft.needsReview)
              }
              onClick={() => void save()}
            >
              Salvar rascunho de premiações
            </button>
          </div>
          <fieldset disabled={!canConfirm}>
            <legend>
              {view.publication.version
                ? "Revisar confirmação"
                : "Confirmar premiações"}
            </legend>
            <p>
              Confira as colocações compartilhadas, títulos e identidades. Só
              esta confirmação torna estas premiações públicas.
            </p>
            {view.publication.version > 0 && (
              <label>
                Motivo da revisão das premiações
                <textarea
                  aria-label="Motivo da revisão das premiações"
                  value={reason}
                  maxLength={4000}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            <label className="reg-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              Conferi as colocações e os destinatários
            </label>
            <button
              disabled={
                !checked ||
                (view.publication.version > 0 &&
                  Array.from(reason.trim()).length < 3)
              }
              onClick={() => void confirm()}
            >
              {view.publication.version
                ? "Confirmar revisão das premiações"
                : "Confirmar e publicar premiações"}
            </button>
          </fieldset>
          <section>
            <h3>Confirmação atual</h3>
            <p>
              {view.publication.version
                ? `Versão confirmada ${view.publication.version}.`
                : "Nenhuma premiação confirmada."}
            </p>
            {view.publication.version > 0 && (
              <button disabled={locked} onClick={() => void showPublic()}>
                Ver premiações confirmadas
              </button>
            )}
            {published && <PublicAchievementSummary value={published} />}
          </section>
          <section>
            <h3>Histórico de rascunhos</h3>
            <ol>
              {draftHistory.map((h) => (
                <li key={h.version}>
                  <button
                    disabled={locked}
                    onClick={(e) =>
                      void history("draft", h.version, e.currentTarget)
                    }
                  >
                    Ver rascunho {h.version}
                  </button>{" "}
                  · {time(h.savedAt)}
                </li>
              ))}
            </ol>
            {draftMore && (
              <button
                disabled={locked}
                onClick={() => void moreHistory("draft")}
              >
                Mais rascunhos de premiações
              </button>
            )}
          </section>
          <section>
            <h3>Histórico de confirmações</h3>
            <ol>
              {pubHistory.map((h) => (
                <li key={h.version}>
                  <button
                    disabled={locked}
                    onClick={(e) =>
                      void history("confirmation", h.version, e.currentTarget)
                    }
                  >
                    Ver confirmação {h.version}
                  </button>{" "}
                  · {time(h.confirmedAt)}
                  {h.reason ? ` · ${h.reason}` : ""}
                </li>
              ))}
            </ol>
            {pubMore && (
              <button
                disabled={locked}
                onClick={() => void moreHistory("confirmation")}
              >
                Mais confirmações de premiações
              </button>
            )}
          </section>
          {detail && (
            <section className="reg-review">
              <h3 ref={detailHeading} tabIndex={-1}>
                {detail.kind === "draft" ? "Rascunho" : "Confirmação"}{" "}
                {detail.value.version}
              </h3>
              {detail.kind === "confirmation" ? (
                <>
                  <p>{detail.value.reason}</p>
                  <PublicAchievementSummary value={detail.value.snapshot} />
                </>
              ) : (
                <>
                  <ul>
                    {detail.value.draft.placements.map((g) => (
                      <li key={g.position}>
                        {g.position}º ·{" "}
                        {g.registrationIds
                          .map(
                            (id) =>
                              detail.value.registrations.find(
                                (r) => r.id === id,
                              )?.name ?? "Inscrição",
                          )
                          .join(" / ")}
                      </li>
                    ))}
                  </ul>
                  <ul>
                    {detail.value.draft.honors.map((h) => (
                      <li key={h.id}>
                        {h.title} · {h.personIds.length} destinatário(s)
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <button
                onClick={() => {
                  setDetail(null);
                  lastDetailButton.current?.focus();
                }}
              >
                Fechar versão de premiações
              </button>
            </section>
          )}
        </>
      )}
    </section>
  );
}
function PublicAchievementSummary({ value }: { value: PublicAchievements }) {
  return (
    <div className="achievement-confirmed">
      <p>
        {value.context.name} · {value.context.year} · {value.context.category} ·
        confirmado em {time(value.confirmedAt)}
      </p>
      <ul>
        {value.placements.map((g) => (
          <li key={g.position}>
            {g.position}º · {g.registrations.map((r) => r.name).join(" / ")}
          </li>
        ))}
      </ul>
      <ul>
        {value.honors.map((h) => (
          <li key={h.id}>
            <strong>{h.title}</strong> ·{" "}
            {h.athletes
              .map((p) => p.name + (p.nickname ? ` (${p.nickname})` : ""))
              .join(" / ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
