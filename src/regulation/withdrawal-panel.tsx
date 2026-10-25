import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  registrationListingSchema,
  type RegistrationSnapshot,
} from "../teams/contract";
import { gameSnapshotSchema, type GameSnapshot } from "../games/contract";
import {
  registrationWithdrawalStateSchema,
  registrationWithdrawalSaveResultSchema,
  saveRegistrationWithdrawalSchema,
  type RegistrationWithdrawalState,
  type SaveRegistrationWithdrawal,
} from "./withdrawal-contract";
import {
  decisionPreviewResultSchema,
  type DecisionPreviewResult,
} from "./decision-view-contract";
import { DecisionHistory } from "./decision-history";
import { RegulationProjection } from "./projection";
import "./screen.css";
type Policy = "" | "keep_results" | "exclude_results" | "return";
type Props = {
  registration: RegistrationSnapshot;
  enabled: boolean;
  guard: { current: () => boolean };
  beforeOpen: () => boolean;
  onLockedChange: (locked: boolean) => void;
  onSessionLost: () => void;
  onSaved: () => void;
};
const gameLabel = (g: GameSnapshot) =>
  `${g.home.name} × ${g.away.name}${g.number ? ` · jogo ${g.number}` : ""}${g.date ? ` · ${g.date.split("-").reverse().join("/")}` : ""}`;
export function RegistrationWithdrawalPanel(p: Props) {
  const [open, setOpen] = useState(false),
    [view, setView] = useState<RegistrationWithdrawalState | null>(null),
    [policy, setPolicy] = useState<Policy>(""),
    [reason, setReason] = useState(""),
    [baseline, setBaseline] = useState(""),
    [listChecked, setListChecked] = useState(false),
    [impact, setImpact] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [conflict, setConflict] = useState(false),
    [names, setNames] = useState<Map<string, string>>(new Map()),
    [gameNames, setGameNames] = useState<Map<string, string>>(new Map()),
    [relationOffset, setRelationOffset] = useState(0),
    [impactOffset, setImpactOffset] = useState(0),
    [proposal, setProposal] = useState<{
      command: SaveRegistrationWithdrawal;
      value: DecisionPreviewResult;
    } | null>(null);
  const pending = useRef<{
      command: SaveRegistrationWithdrawal;
      ack: boolean;
    } | null>(null),
    newId = useRef(crypto.randomUUID()),
    alive = useRef(true),
    alert = useRef<HTMLParagraphElement>(null);
  const path = `/api/registrations/${p.registration.id}/withdrawal`,
    locked = busy || !!pending.current,
    dirty =
      !!view && JSON.stringify({ policy, reason, listChecked }) !== baseline;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    p.onLockedChange(locked);
    return () => p.onLockedChange(false);
  }, [locked, p.onLockedChange]);
  const mayLeave = () =>
    !busy &&
    (!(dirty || pending.current) ||
      window.confirm(
        "Há uma desistência ou retorno não salvo ou envio não confirmado. Sair desta edição?",
      ));
  useEffect(() => {
    p.guard.current = mayLeave;
    return () => {
      p.guard.current = () => true;
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
    if (error && p.enabled) alert.current?.focus();
  }, [error, p.enabled]);
  function fail(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível concluir a desistência ou retorno.",
    );
  }
  async function relation(ids: string[], offset: number, historical = false) {
    const found = new Map<string, string>();
    const slice = ids.slice(offset, offset + 20);
    for (let i = 0; i < slice.length; i += 4) {
      const rows = await Promise.all(
        slice
          .slice(i, i + 4)
          .map((id) => api(`/api/games/${id}`, gameSnapshotSchema)),
      );
      rows.forEach((g, j) => {
        if (
          g.id !== slice[i + j] ||
          g.disputeId !== p.registration.disputeId ||
          (!historical &&
            ![g.homeRegistrationId, g.awayRegistrationId].includes(
              p.registration.id,
            ))
        )
          throw new Error(
            "Um jogo da relação não corresponde à inscrição. Recarregue para conferir.",
          );
        found.set(g.id, gameLabel(g));
      });
    }
    return found;
  }
  async function load(preserve = false) {
    setBusy(true);
    setError("");
    try {
      const s = await api(path, registrationWithdrawalStateSchema);
      if (
        s.registrationId !== p.registration.id ||
        s.disputeId !== p.registration.disputeId
      )
        throw new Error("A resposta não corresponde à inscrição aberta.");
      const catalog = new Map<string, string>();
      for (let offset = 0; offset < 1000; offset += 20) {
        const page = await api(
          `/api/registrations?disputeId=${s.disputeId}&q=&offset=${offset}`,
          registrationListingSchema,
        );
        for (const r of page.items) {
          if (r.disputeId !== s.disputeId || catalog.has(r.id))
            throw new Error("O catálogo mudou. Recarregue para conferir.");
          catalog.set(r.id, r.name);
        }
        if (!page.hasMore) break;
        if (offset === 980)
          throw new Error("Catálogo excede o limite desta operação.");
      }
      const labels = await relation(s.previousGameIds, 0);
      if (!alive.current) return;
      const confirmed = pending.current?.ack,
        nextPolicy = s.head?.policy ?? "";
      setView(s);
      setNames(catalog);
      setGameNames(labels);
      setRelationOffset(0);
      setBaseline(
        JSON.stringify({ policy: nextPolicy, reason: "", listChecked: false }),
      );
      if (!preserve) {
        setPolicy(nextPolicy);
        setReason("");
        setListChecked(false);
      } else setListChecked(false);
      pending.current = null;
      setProposal(null);
      setImpact(false);
      setConflict(false);
      if (confirmed) {
        setStatus("Desistência ou retorno salvo.");
        p.onSaved();
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function relationPage(offset: number) {
    if (!view) return;
    setBusy(true);
    setError("");
    try {
      const labels = await relation(view.previousGameIds, offset);
      if (alive.current) {
        setGameNames((old) => new Map([...old, ...labels]));
        setRelationOffset(offset);
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function changed() {
    setProposal(null);
    setImpactOffset(0);
    setImpact(false);
    setStatus("");
  }
  async function confer() {
    if (locked || !view) return;
    const r = saveRegistrationWithdrawalSchema.safeParse({
      commandId: crypto.randomUUID(),
      disputeId: p.registration.disputeId,
      registrationId: p.registration.id,
      withdrawalId: view.head?.id ?? newId.current,
      expectedVersion: view.head?.version ?? 0,
      expectedRegulationVersion: view.regulationVersion,
      expectedContextFingerprint: view.contextFingerprint,
      policy: policy === "return" ? null : policy,
      previousGameIds: policy === "return" ? [] : view.previousGameIds,
      reason,
      acknowledgeImpact: false,
    });
    if (!r.success || !listChecked) {
      setError(
        "Escolha o tratamento, confira a relação completa de jogos e informe o motivo.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const c = r.data,
        v = await api(path + "/preview", decisionPreviewResultSchema, c);
      if (
        v.kind !== "registration_withdrawal" ||
        v.targetId !== c.registrationId ||
        v.disputeId !== c.disputeId ||
        v.commandId !== c.commandId ||
        v.baseVersion !== c.expectedVersion ||
        v.regulationVersion !== c.expectedRegulationVersion ||
        v.contextFingerprint !== c.expectedContextFingerprint
      )
        throw new Error("Não foi possível conferir a resposta da prévia.");
      const labels = await relation(
        v.affected.after.map((g) => g.gameId),
        0,
      );
      if (alive.current) {
        setGameNames((old) => new Map([...old, ...labels]));
        setImpactOffset(0);
        setProposal({ command: c, value: v });
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
        r = await api(path, registrationWithdrawalSaveResultSchema, c);
      if (
        r.commandId !== c.commandId ||
        r.disputeId !== c.disputeId ||
        r.registrationId !== c.registrationId ||
        r.withdrawalId !== c.withdrawalId ||
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
  async function impactPage(offset: number) {
    if (!proposal) return;
    setBusy(true);
    setError("");
    try {
      const labels = await relation(
        proposal.value.affected.after.map((g) => g.gameId),
        offset,
      );
      if (alive.current) {
        setGameNames((old) => new Map([...old, ...labels]));
        setImpactOffset(offset);
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const summary = (g: DecisionPreviewResult["affected"]["after"][number]) =>
    g.state === "played" && g.outcome?.kind === "played"
      ? `Resultado ${g.outcome.publication.homePoints} × ${g.outcome.publication.awayPoints}`
      : g.state === "awarded"
        ? "Decisão administrativa preservada"
        : g.state === "excluded"
          ? "Desconsiderado na classificação"
          : g.state === "conflict"
            ? "Revisão pendente"
            : "Pendente de decisão própria";
  const beforeById = new Map(
    proposal?.value.affected.before.map((g) => [g.gameId, g]) ?? [],
  );
  return (
    <section className="regulation">
      <button
        aria-expanded={open}
        disabled={!p.enabled && !open}
        onClick={() => {
          if (open) {
            if (!mayLeave()) return;
            setOpen(false);
            setView(null);
            pending.current = null;
            setProposal(null);
            setStatus("");
          } else if (p.beforeOpen()) {
            setOpen(true);
            void load();
          }
        }}
      >
        Desistência desta inscrição
      </button>
      {open && (
        <>
          <h4>Desistência ou retorno — {p.registration.name}</h4>
          <p>
            A decisão vale somente para esta inscrição nesta disputa. Não altera
            a equipe global, súmulas ou estatísticas de origem, nem atribui W.O.
            automaticamente a jogos futuros.
          </p>
          {error && (
            <p role="alert" tabIndex={-1} ref={alert} className="access-error">
              {error}
            </p>
          )}
          <p role="status">
            {busy
              ? "Conferindo desistência ou retorno…"
              : pending.current
                ? pending.current.ack
                  ? "Gravação confirmada; leitura pendente."
                  : "Envio não confirmado. Repita o mesmo pedido."
                : status ||
                  (!view
                    ? "Carregando situação…"
                    : dirty
                      ? "Desistência ou retorno não salvo."
                      : "Confira a situação antes de alterar.")}
          </p>
          {!view && !busy && (
            <button onClick={() => void load()}>
              Recarregar desistência da inscrição
            </button>
          )}
          {view && (
            <>
              {view.head && (
                <p>
                  Versão {view.head.version} ·{" "}
                  {view.head.policy === "keep_results"
                    ? "Manter resultados anteriores"
                    : view.head.policy === "exclude_results"
                      ? "Desconsiderar resultados anteriores"
                      : "Desistência retirada"}{" "}
                  · {view.head.reason}
                </p>
              )}
              <fieldset disabled={locked || !p.enabled}>
                <legend>Tratamento da inscrição</legend>
                <label>
                  Tratamento dos resultados anteriores
                  <select
                    value={policy}
                    onChange={(e) => {
                      setPolicy(e.target.value as Policy);
                      changed();
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="keep_results">
                      Manter resultados anteriores
                    </option>
                    <option value="exclude_results">
                      Desconsiderar resultados anteriores na classificação
                    </option>
                    <option value="return" disabled={!view.head?.policy}>
                      Retirar desistência e retomar inscrição
                    </option>
                  </select>
                </label>
                <p>
                  {view.previousGameIds.length} jogos com resultado ou decisão
                  anterior na relação atual. A lista completa será conferida
                  novamente no servidor ao salvar.
                </p>
                <ul>
                  {view.previousGameIds
                    .slice(relationOffset, relationOffset + 20)
                    .map((id) => (
                      <li key={id}>
                        {gameNames.get(id) ??
                          "Não foi possível carregar este jogo."}
                      </li>
                    ))}
                </ul>
                {!view.previousGameIds.length && (
                  <p>
                    Nenhum resultado anterior. Jogos futuros continuam pendentes
                    de decisão própria.
                  </p>
                )}
                {view.previousGameIds.length > 20 && (
                  <div className="reg-actions">
                    <button
                      disabled={relationOffset === 0}
                      onClick={() =>
                        void relationPage(Math.max(0, relationOffset - 20))
                      }
                    >
                      Jogos anteriores da relação
                    </button>
                    <button
                      disabled={
                        relationOffset + 20 >= view.previousGameIds.length
                      }
                      onClick={() => void relationPage(relationOffset + 20)}
                    >
                      Mais jogos da relação
                    </button>
                  </div>
                )}
                <label className="reg-check">
                  <input
                    type="checkbox"
                    checked={listChecked}
                    onChange={(e) => {
                      setListChecked(e.target.checked);
                      changed();
                    }}
                  />
                  Conferi a relação completa de jogos anteriores
                </label>
                <label>
                  Motivo da desistência ou retorno
                  <textarea
                    minLength={3}
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      changed();
                    }}
                  />
                </label>
                <button onClick={() => void confer()}>
                  Conferir desistência ou retorno
                </button>
              </fieldset>
              {conflict && (
                <button disabled={busy} onClick={() => void load(true)}>
                  Recarregar desistência preservando edição
                </button>
              )}
              {proposal && (
                <section className="reg-review">
                  <h4>Conferência da desistência ou retorno</h4>
                  <p>Os jogos futuros não ganham vencedor nesta operação.</p>
                  <ul>
                    {proposal.value.affected.after
                      .slice(impactOffset, impactOffset + 20)
                      .map((g) => {
                        const before = beforeById.get(g.gameId);
                        return (
                          <li key={g.gameId}>
                            {gameNames.get(g.gameId) ??
                              `${names.get(g.homeRegistrationId) ?? "Inscrição mandante"} × ${names.get(g.awayRegistrationId) ?? "Inscrição visitante"}`}{" "}
                            · Antes:{" "}
                            {before ? summary(before) : "Sem fato anterior"} ·
                            Depois: {summary(g)}
                          </li>
                        );
                      })}
                  </ul>
                  {proposal.value.affected.after.length > 20 && (
                    <div className="reg-actions">
                      <button
                        disabled={locked || !p.enabled || impactOffset === 0}
                        onClick={() =>
                          void impactPage(Math.max(0, impactOffset - 20))
                        }
                      >
                        Jogos afetados anteriores
                      </button>
                      <button
                        disabled={
                          locked ||
                          !p.enabled ||
                          impactOffset + 20 >=
                            proposal.value.affected.after.length
                        }
                        onClick={() => void impactPage(impactOffset + 20)}
                      >
                        Mais jogos afetados
                      </button>
                    </div>
                  )}
                  {proposal.value.definition && (
                    <details>
                      <summary>
                        Impacto na classificação e nos confrontos
                      </summary>
                      {proposal.value.before && (
                        <RegulationProjection
                          title="Classificação antes da desistência ou retorno"
                          names={names}
                          definition={proposal.value.definition}
                          value={proposal.value.before}
                        />
                      )}
                      {proposal.value.after && (
                        <RegulationProjection
                          title="Classificação depois da desistência ou retorno"
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
                        type="checkbox"
                        disabled={locked || !p.enabled}
                        checked={impact}
                        onChange={(e) => setImpact(e.target.checked)}
                      />
                      Conferi o impacto da desistência ou retorno
                    </label>
                  )}
                  {!pending.current && (
                    <button
                      disabled={
                        busy ||
                        !p.enabled ||
                        (proposal.value.requiresImpact && !impact)
                      }
                      onClick={() => void save()}
                    >
                      Confirmar desistência ou retorno
                    </button>
                  )}
                </section>
              )}
              {pending.current && (
                <button
                  disabled={busy || !p.enabled}
                  onClick={() => void save()}
                >
                  {pending.current.ack
                    ? "Recarregar desistência confirmada"
                    : "Repetir desistência ou retorno"}
                </button>
              )}
              <DecisionHistory
                key={view.head?.version ?? 0}
                kind="withdrawal"
                path={path}
                disputeId={view.disputeId}
                targetId={view.registrationId}
                head={view.head}
                history={view.history}
                hasMore={view.hasMore}
                enabled={!locked && p.enabled}
                names={names}
                gameNames={gameNames}
                resolveGames={(ids) => relation(ids, 0, true)}
                onSessionLost={p.onSessionLost}
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
