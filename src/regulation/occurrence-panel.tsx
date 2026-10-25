import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { registrationListingSchema } from "../teams/contract";
import type { GameSnapshot } from "../games/contract";
import {
  gameOccurrenceStateSchema,
  gameOccurrenceSaveResultSchema,
  saveGameOccurrenceSchema,
  type GameOccurrenceState,
  type SaveGameOccurrence,
} from "./occurrence-contract";
import {
  decisionPreviewResultSchema,
  type DecisionPreviewResult,
} from "./decision-view-contract";
import { RegulationProjection } from "./projection";
import { DecisionHistory } from "./decision-history";
import "./screen.css";
const labels = {
  postponed: "Adiamento",
  interrupted: "Interrupção",
  cancelled: "Cancelamento",
  wo: "W.O.",
  administrative: "Decisão administrativa",
  remove: "Retirar ocorrência",
};
type Kind = keyof typeof labels | "";
type Fields = {
  kind: Kind;
  winner: string;
  decision: string;
  homePoints: string;
  awayPoints: string;
  hasScore: boolean;
  homeScore: string;
  awayScore: string;
  reason: string;
};
const blank = (): Fields => ({
  kind: "",
  winner: "",
  decision: "",
  homePoints: "",
  awayPoints: "",
  hasScore: false,
  homeScore: "",
  awayScore: "",
  reason: "",
});
function fields(s: GameOccurrenceState): Fields {
  const f = blank(),
    e = s.head?.effect;
  if (!e) return f;
  f.kind = e.kind;
  if (e.kind === "wo") f.winner = e.winnerRegistrationId;
  if (e.kind === "administrative") {
    f.decision = e.decision.kind;
    if (e.decision.kind === "award") {
      const d = e.decision;
      f.winner = d.winnerRegistrationId;
      f.homePoints = String(d.homeLeaguePoints);
      f.awayPoints = String(d.awayLeaguePoints);
      f.hasScore = !!d.score;
      f.homeScore = d.score ? String(d.score.homePoints) : "";
      f.awayScore = d.score ? String(d.score.awayPoints) : "";
    }
  }
  return f;
}
type Props = {
  game: GameSnapshot;
  enabled: boolean;
  guard: { current: () => boolean };
  onLockedChange: (locked: boolean) => void;
  onSessionLost: () => void;
  onSaved: () => void;
};
export function GameOccurrencePanel(props: Props) {
  const [open, setOpen] = useState(false),
    [view, setView] = useState<GameOccurrenceState | null>(null),
    [draft, setDraft] = useState<Fields>(blank),
    [baseline, setBaseline] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [conflict, setConflict] = useState(false),
    [impact, setImpact] = useState(false),
    [proposal, setProposal] = useState<{
      command: SaveGameOccurrence;
      value: DecisionPreviewResult;
    } | null>(null),
    [names, setNames] = useState<Map<string, string>>(new Map());
  const pending = useRef<{ command: SaveGameOccurrence; ack: boolean } | null>(
      null,
    ),
    alive = useRef(true),
    newId = useRef(crypto.randomUUID()),
    alert = useRef<HTMLParagraphElement>(null);
  const dirty = !!view && JSON.stringify(draft) !== baseline,
    locked = busy || !!pending.current,
    path = `/api/games/${props.game.id}/occurrence`;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    props.onLockedChange(locked);
    return () => props.onLockedChange(false);
  }, [locked, props.onLockedChange]);
  const mayLeave = () =>
    !busy &&
    (!(dirty || pending.current) ||
      window.confirm(
        "Há uma decisão não salva ou envio não confirmado. Sair desta edição?",
      ));
  useEffect(() => {
    props.guard.current = mayLeave;
    return () => {
      props.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!dirty && !pending.current) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, locked]);
  useEffect(() => {
    if (error && props.enabled) alert.current?.focus();
  }, [error, props.enabled]);
  function fail(e: unknown) {
    if (isSessionFailure(e)) props.onSessionLost();
    setError(
      e instanceof Error ? e.message : "Não foi possível concluir a decisão.",
    );
  }
  async function load(preserve = false) {
    setBusy(true);
    setError("");
    try {
      const s = await api(path, gameOccurrenceStateSchema);
      if (s.gameId !== props.game.id || s.disputeId !== props.game.disputeId)
        throw new Error("A resposta não corresponde ao jogo aberto.");
      const rows = new Map<string, string>();
      for (let offset = 0; offset < 1000; offset += 20) {
        const page = await api(
          `/api/registrations?disputeId=${s.disputeId}&q=&offset=${offset}`,
          registrationListingSchema,
        );
        for (const r of page.items) {
          if (r.disputeId !== s.disputeId || rows.has(r.id))
            throw new Error("O catálogo mudou. Recarregue para conferir.");
          rows.set(r.id, r.name);
        }
        if (!page.hasMore) break;
        if (offset === 980)
          throw new Error("Catálogo excede o limite desta operação.");
      }
      if (!alive.current) return;
      const confirmed = pending.current?.ack;
      setView(s);
      setNames(rows);
      setBaseline(JSON.stringify(fields(s)));
      if (!preserve) setDraft(fields(s));
      pending.current = null;
      setProposal(null);
      setImpact(false);
      setConflict(false);
      if (confirmed) {
        setStatus("Decisão do jogo salva.");
        props.onSaved();
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function change<K extends keyof Fields>(key: K, value: Fields[K]) {
    if (locked) return;
    setDraft((v) => ({ ...v, [key]: value }));
    setProposal(null);
    setImpact(false);
    setStatus("");
  }
  function command(): SaveGameOccurrence | null {
    if (!view || !draft.kind) return null;
    let effect: SaveGameOccurrence["effect"];
    if (draft.kind === "remove") effect = null;
    else if (draft.kind === "wo")
      effect = { kind: "wo", winnerRegistrationId: draft.winner };
    else if (draft.kind === "administrative") {
      if (draft.decision === "exclude")
        effect = { kind: "administrative", decision: { kind: "exclude" } };
      else if (
        draft.decision === "award" &&
        draft.homePoints !== "" &&
        draft.awayPoints !== "" &&
        (!draft.hasScore || (draft.homeScore !== "" && draft.awayScore !== ""))
      )
        effect = {
          kind: "administrative",
          decision: {
            kind: "award",
            winnerRegistrationId: draft.winner,
            homeLeaguePoints: Number(draft.homePoints),
            awayLeaguePoints: Number(draft.awayPoints),
            score: draft.hasScore
              ? {
                  homePoints: Number(draft.homeScore),
                  awayPoints: Number(draft.awayScore),
                }
              : null,
          },
        };
      else return null;
    } else effect = { kind: draft.kind };
    const r = saveGameOccurrenceSchema.safeParse({
      commandId: crypto.randomUUID(),
      disputeId: props.game.disputeId,
      gameId: props.game.id,
      occurrenceId: view.head?.id ?? newId.current,
      expectedVersion: view.head?.version ?? 0,
      expectedGameVersion: view.gameVersion,
      expectedPublicationVersion: view.publicationVersion,
      expectedRegulationVersion: view.regulationVersion,
      expectedContextFingerprint: view.contextFingerprint,
      effect,
      reason: draft.reason,
      acknowledgeImpact: false,
    });
    return r.success ? r.data : null;
  }
  async function confer() {
    if (locked) return;
    const c = command();
    if (!c) {
      setError(
        "Escolha a situação, complete os efeitos e informe o motivo da nova decisão.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const p = await api(path + "/preview", decisionPreviewResultSchema, c);
      if (
        p.kind !== "game_occurrence" ||
        p.targetId !== c.gameId ||
        p.disputeId !== c.disputeId ||
        p.commandId !== c.commandId ||
        p.baseVersion !== c.expectedVersion ||
        p.contextFingerprint !== c.expectedContextFingerprint
      )
        throw new Error("Não foi possível conferir a resposta da prévia.");
      if (alive.current) {
        setProposal({ command: c, value: p });
        setImpact(false);
      }
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiFailure && e.status === 409) setConflict(true);
        fail(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (busy || !view) return;
    if (!pending.current) {
      if (!proposal || (proposal.value.requiresImpact && !impact)) return;
      pending.current = {
        command: { ...proposal.command, acknowledgeImpact: impact },
        ack: false,
      };
    }
    if (pending.current.ack) {
      await load();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const c = pending.current.command,
        r = await api(path, gameOccurrenceSaveResultSchema, c);
      if (
        r.commandId !== c.commandId ||
        r.disputeId !== c.disputeId ||
        r.gameId !== c.gameId ||
        r.occurrenceId !== c.occurrenceId ||
        r.version !== c.expectedVersion + 1 ||
        r.contextFingerprint !== c.expectedContextFingerprint
      )
        throw new ApiFailure(503, "Confirmação do envio indisponível.");
      pending.current.ack = true;
      await load();
    } catch (e) {
      if (alive.current) {
        if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
          pending.current = null;
          setProposal(null);
          setConflict(e.status === 409);
        }
        fail(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const winner = () => (
    <label>
      Vencedor da decisão
      <select
        value={draft.winner}
        onChange={(e) => change("winner", e.target.value)}
      >
        <option value="">Selecione</option>
        <option value={props.game.home.id}>{props.game.home.name}</option>
        <option value={props.game.away.id}>{props.game.away.name}</option>
      </select>
    </label>
  );
  const summary = (v: DecisionPreviewResult["affected"]["before"][number]) =>
    v.state === "played" && v.outcome?.kind === "played"
      ? `${v.outcome.publication.homePoints} × ${v.outcome.publication.awayPoints}`
      : v.state === "awarded" && v.outcome?.kind === "awarded"
        ? `Decisão para ${names.get(v.outcome.award.winnerRegistrationId) ?? "inscrição selecionada"}; placar ${v.outcome.award.score ? `${v.outcome.award.score.homePoints} × ${v.outcome.award.score.awayPoints}` : "não informado"}`
        : ({
            pending: "Pendente",
            excluded: "Desconsiderado na classificação",
            conflict: "Revisão pendente",
          }[v.state as "pending" | "excluded" | "conflict"] ??
          "Sem resultado competitivo");
  return (
    <section className="regulation">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            if (!mayLeave()) return;
            setOpen(false);
            setView(null);
            pending.current = null;
            setProposal(null);
            setStatus("");
          } else {
            setOpen(true);
            void load();
          }
        }}
      >
        Situação e decisões do jogo
      </button>
      {open && (
        <>
          <h4>Situação do jogo e efeitos competitivos</h4>
          <p>
            A decisão preserva agenda, súmula e fontes. Adiamento e interrupção
            permitem continuar o trabalho existente.
          </p>
          {error && (
            <p role="alert" tabIndex={-1} ref={alert} className="access-error">
              {error}
            </p>
          )}
          <p role="status">
            {busy
              ? "Conferindo decisão…"
              : pending.current
                ? pending.current.ack
                  ? "Gravação confirmada; leitura pendente."
                  : "Envio não confirmado. Repita o mesmo pedido."
                : status ||
                  (!view
                    ? "Carregando situação…"
                    : dirty
                      ? "Decisão não salva."
                      : "Confira a situação antes de alterar.")}
          </p>
          {!view && !busy && (
            <button onClick={() => void load()}>
              Recarregar situação do jogo
            </button>
          )}
          {view && (
            <>
              {view.head && (
                <p>
                  Versão {view.head.version} ·{" "}
                  {view.head.effect
                    ? labels[view.head.effect.kind]
                    : "Ocorrência retirada"}{" "}
                  · {view.head.reason}
                </p>
              )}
              {view.head &&
                (view.head.gameVersion !== view.gameVersion ||
                  view.head.publicationVersion !== view.publicationVersion) && (
                  <p>
                    A fonte mudou depois desta decisão. Revise o efeito antes de
                    continuar.
                  </p>
                )}
              <fieldset disabled={locked || !props.enabled}>
                <legend>Nova decisão do jogo</legend>
                <label>
                  Tipo da ocorrência
                  <select
                    value={draft.kind}
                    onChange={(e) => change("kind", e.target.value as Kind)}
                  >
                    <option value="">Selecione</option>
                    {Object.entries(labels).map(([key, label]) => (
                      <option
                        key={key}
                        value={key}
                        disabled={key === "remove" && !view.head}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {draft.kind === "wo" && (
                  <>
                    <p>
                      Vencedor e penalidade usam a regra explícita da aba
                      Regulamento.
                    </p>
                    {winner()}
                  </>
                )}
                {draft.kind === "administrative" && (
                  <>
                    <label>
                      Efeito administrativo
                      <select
                        value={draft.decision}
                        onChange={(e) => change("decision", e.target.value)}
                      >
                        <option value="">Selecione</option>
                        <option value="exclude">
                          Desconsiderar resultado competitivo
                        </option>
                        <option value="award">
                          Atribuir vencedor e pontos
                        </option>
                      </select>
                    </label>
                    {draft.decision === "award" && (
                      <>
                        {winner()}
                        <div className="reg-columns">
                          <label>
                            Pontos de classificação mandante
                            <input
                              type="number"
                              min={-1000000}
                              max={1000000}
                              value={draft.homePoints}
                              onChange={(e) =>
                                change("homePoints", e.target.value)
                              }
                            />
                          </label>
                          <label>
                            Pontos de classificação visitante
                            <input
                              type="number"
                              min={-1000000}
                              max={1000000}
                              value={draft.awayPoints}
                              onChange={(e) =>
                                change("awayPoints", e.target.value)
                              }
                            />
                          </label>
                        </div>
                        <label className="reg-check">
                          <input
                            type="checkbox"
                            checked={draft.hasScore}
                            onChange={(e) =>
                              change("hasScore", e.target.checked)
                            }
                          />
                          Informar placar administrativo
                        </label>
                        {draft.hasScore && (
                          <div className="reg-columns">
                            <label>
                              Placar administrativo mandante
                              <input
                                type="number"
                                min={0}
                                max={2147483647}
                                value={draft.homeScore}
                                onChange={(e) =>
                                  change("homeScore", e.target.value)
                                }
                              />
                            </label>
                            <label>
                              Placar administrativo visitante
                              <input
                                type="number"
                                min={0}
                                max={2147483647}
                                value={draft.awayScore}
                                onChange={(e) =>
                                  change("awayScore", e.target.value)
                                }
                              />
                            </label>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                <label>
                  Motivo da ocorrência
                  <textarea
                    value={draft.reason}
                    minLength={3}
                    maxLength={2000}
                    onChange={(e) => change("reason", e.target.value)}
                  />
                </label>
                <button type="button" onClick={() => void confer()}>
                  Conferir decisão
                </button>
              </fieldset>
              {conflict && (
                <button disabled={busy} onClick={() => void load(true)}>
                  Recarregar situação preservando edição
                </button>
              )}
              {proposal && (
                <section className="reg-review">
                  <h4>Conferência da decisão</h4>
                  <p>
                    Antes:{" "}
                    {proposal.value.affected.before.map(summary).join("; ")}
                  </p>
                  <p>
                    Depois:{" "}
                    {proposal.value.affected.after.map(summary).join("; ")}
                  </p>
                  {proposal.value.definition && (
                    <details>
                      <summary>
                        Impacto na classificação e nos confrontos
                      </summary>
                      {proposal.value.before && (
                        <RegulationProjection
                          title="Classificação antes da decisão"
                          names={names}
                          definition={proposal.value.definition}
                          value={proposal.value.before}
                        />
                      )}
                      {proposal.value.after && (
                        <RegulationProjection
                          title="Classificação depois da decisão"
                          names={names}
                          definition={proposal.value.definition}
                          value={proposal.value.after}
                        />
                      )}
                    </details>
                  )}
                  {proposal.value.requiresImpact && (
                    <label className="reg-check">
                      <input
                        disabled={locked || !props.enabled}
                        type="checkbox"
                        checked={impact}
                        onChange={(e) => setImpact(e.target.checked)}
                      />
                      Conferi o impacto desta decisão
                    </label>
                  )}
                  {!pending.current && (
                    <button
                      disabled={
                        busy ||
                        !props.enabled ||
                        (proposal.value.requiresImpact && !impact)
                      }
                      onClick={() => void save()}
                    >
                      Confirmar decisão do jogo
                    </button>
                  )}
                </section>
              )}
              {pending.current && (
                <button
                  disabled={busy || !props.enabled}
                  onClick={() => void save()}
                >
                  {pending.current.ack
                    ? "Recarregar decisão confirmada"
                    : "Repetir decisão do jogo"}
                </button>
              )}
              <DecisionHistory
                key={view.head?.version ?? 0}
                kind="occurrence"
                path={path}
                disputeId={view.disputeId}
                targetId={view.gameId}
                head={view.head}
                history={view.history}
                hasMore={view.hasMore}
                enabled={!locked && props.enabled}
                names={names}
                onSessionLost={props.onSessionLost}
                onConflict={() => {
                  setConflict(true);
                  setProposal(null);
                }}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
