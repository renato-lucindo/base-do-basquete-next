import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  standingsPublicationPreviewSchema,
  standingsPublicationResultSchema,
  type ConfirmStandings,
} from "./publication-contract";
import { buildPublicStandings } from "./public";
import { RegulationProjection } from "./projection";
import { contextLabel } from "../public-ui/catalog-contract";

export function StandingsPublicationPanel({
  disputeId,
  enabled,
  guard,
  onSessionLost,
  onLockChange,
}: {
  disputeId: string;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onLockChange: (locked: boolean) => void;
}) {
  const [preview, setPreview] = useState<ReturnType<
    typeof standingsPublicationPreviewSchema.parse
  > | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [acknowledged, acknowledge] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const pending = useRef<ConfirmStandings | null>(null),
    alive = useRef(true),
    errorRef = useRef<HTMLParagraphElement>(null),
    reviewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    guard.current = () => !busy && !pending.current;
    return () => {
      guard.current = () => true;
    };
  });
  useEffect(() => {
    onLockChange(busy || uncertain);
  }, [busy, uncertain, onLockChange]);
  useEffect(() => {
    if (!uncertain && !busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uncertain, busy]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (preview) reviewRef.current?.focus();
  }, [preview]);
  const path = `/api/regulations/${disputeId}/publication`;
  async function review() {
    setBusy(true);
    setError("");
    setStatus("");
    setPreview(null);
    acknowledge(false);
    try {
      const p = await api(path, standingsPublicationPreviewSchema);
      if (p.source.disputeId !== disputeId) throw Error("Contexto inesperado.");
      buildPublicStandings(p.source);
      if (alive.current) setPreview(p);
    } catch (e) {
      if (alive.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível conferir a publicação.",
        );
        if (isSessionFailure(e)) onSessionLost();
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function confirm() {
    if (!preview || (!acknowledged && !pending.current)) return;
    const command = pending.current ?? {
      commandId: crypto.randomUUID(),
      disputeId,
      expectedPublicationVersion: preview.source.publicationVersion - 1,
      fingerprint: preview.fingerprint,
    };
    pending.current = command;
    setBusy(true);
    setError("");
    try {
      const r = await api(path, standingsPublicationResultSchema, command);
      if (
        r.commandId !== command.commandId ||
        r.disputeId !== disputeId ||
        r.publicationVersion !== command.expectedPublicationVersion + 1
      )
        throw Error(
          "Não foi possível confirmar a resposta. Repita o mesmo envio.",
        );
      if (!alive.current) return;
      pending.current = null;
      setPreview(null);
      acknowledge(false);
      setUncertain(false);
      setStatus(
        `Publicação v${r.publicationVersion} confirmada. Participantes e agenda estão disponíveis na consulta pública.`,
      );
    } catch (e) {
      if (!alive.current) return;
      if (e instanceof ApiFailure && [400, 409, 413].includes(e.status)) {
        pending.current = null;
        setPreview(null);
        setUncertain(false);
        acknowledge(false);
      } else setUncertain(true);
      setError(
        e instanceof Error
          ? e.message
          : "Resposta não confirmada. Repita o mesmo envio.",
      );
      if (isSessionFailure(e)) onSessionLost();
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const source = preview?.source,
    names = new Map(source?.registrations.map((r) => [r.id, r.name]));
  const gameLabel = (id: string) => {
    const g = source?.games.find((g) => g.id === id);
    return g
      ? `${g.number ? `Jogo ${g.number}: ` : ""}${names.get(g.homeRegistrationId)} × ${names.get(g.awayRegistrationId)} · ${g.date?.split("-").reverse().join("/") ?? "Data a definir"}`
      : "Jogo incluído";
  };
  return (
    <section
      className="reg-publication"
      aria-label="Publicação da classificação e agenda"
    >
      <h3>Publicar classificação e agenda</h3>
      <p>
        Salvar o regulamento mantém os dados privados. Confira todos os
        participantes, jogos e efeitos antes de publicar uma versão completa.
      </p>
      {!enabled && (
        <p>
          Salve ou conclua a edição do regulamento antes de conferir a
          publicação.
        </p>
      )}
      {error && (
        <p role="alert" ref={errorRef} tabIndex={-1}>
          {error}
        </p>
      )}
      {status && (
        <p role="status">
          {status}{" "}
          <a href={`/publico.html#${disputeId}?secao=classificacao`}>
            Abrir consulta pública
          </a>
        </p>
      )}
      {!pending.current && (
        <button
          type="button"
          disabled={!enabled || busy}
          onClick={() => void review()}
        >
          {busy ? "Conferindo publicação…" : "Conferir publicação pública"}
        </button>
      )}
      {source && (
        <section className="reg-review" ref={reviewRef} tabIndex={-1}>
          <h4>Prévia do conjunto que ficará público</h4>
          <p>
            {contextLabel(source.context)} · Regulamento v
            {source.regulationVersion} · Publicação v{source.publicationVersion}
          </p>
          <h5>Participantes ({source.registrations.length})</h5>
          <ul>
            {source.registrations.map((r) => (
              <li key={r.id}>
                {r.name} · {r.team.name}
              </li>
            ))}
          </ul>
          <RegulationProjection
            title="Fases, grupos e classificação prevista"
            definition={source.definition}
            value={{
              ...buildPublicStandings(source).projection,
              status: "preview",
            }}
            names={names}
          />
          <h5>Jogos vinculados ({source.games.length})</h5>
          <ul>
            {source.games.map((g) => (
              <li key={g.id}>
                {names.get(g.homeRegistrationId)} ×{" "}
                {names.get(g.awayRegistrationId)} ·{" "}
                {g.date?.split("-").reverse().join("/") ?? "Data a definir"} ·{" "}
                {g.time ?? "Horário a definir"} · {g.venue ?? "Local a definir"}
              </li>
            ))}
          </ul>
          <h5>
            Efeitos competitivos (
            {source.occurrences.length + source.withdrawals.length})
          </h5>
          {!source.occurrences.length && !source.withdrawals.length && (
            <p>Nenhum efeito competitivo incluído.</p>
          )}
          <ul>
            {source.occurrences.map((o) => {
              const g = source.games.find((g) => g.id === o.gameId);
              return (
                <li key={o.id}>
                  {g &&
                    `${names.get(g.homeRegistrationId)} × ${names.get(g.awayRegistrationId)}`}{" "}
                  ·{" "}
                  {
                    {
                      postponed: "Adiamento",
                      interrupted: "Interrupção",
                      cancelled: "Cancelamento",
                      wo: "W.O.",
                      administrative: "Decisão administrativa",
                    }[o.effect.kind]
                  }
                  {o.effect.kind === "wo" && (
                    <>
                      {" "}
                      · Vencedor: {names.get(o.effect.winnerRegistrationId)} ·
                      Pontos de classificação:{" "}
                      {source.definition.occurrenceRules.wo
                        ?.winnerLeaguePoints ?? "A definir"}{" "}
                      para o vencedor e{" "}
                      {source.definition.occurrenceRules.wo
                        ?.loserLeaguePoints ?? "A definir"}{" "}
                      para o perdedor ·{" "}
                      {source.definition.occurrenceRules.wo?.score
                        ? `Placar administrativo: ${source.definition.occurrenceRules.wo.score.winner} × ${source.definition.occurrenceRules.wo.score.loser}`
                        : "Sem placar competitivo definido"}
                    </>
                  )}
                  {o.effect.kind === "administrative" &&
                    (o.effect.decision.kind === "exclude" ? (
                      " · Desconsiderar o resultado na classificação"
                    ) : (
                      <>
                        {" "}
                        · Vencedor:{" "}
                        {names.get(o.effect.decision.winnerRegistrationId)} ·
                        Pontos de classificação:{" "}
                        {o.effect.decision.homeLeaguePoints} para{" "}
                        {g && names.get(g.homeRegistrationId)} e{" "}
                        {o.effect.decision.awayLeaguePoints} para{" "}
                        {g && names.get(g.awayRegistrationId)} ·{" "}
                        {o.effect.decision.score
                          ? `Placar administrativo: ${o.effect.decision.score.homePoints} × ${o.effect.decision.score.awayPoints}`
                          : "Sem placar competitivo definido"}
                      </>
                    ))}
                </li>
              );
            })}
            {source.withdrawals.map((w) => (
              <li key={w.id}>
                Desistência: {names.get(w.registrationId)} ·{" "}
                {w.policy === "keep_results"
                  ? "Manter resultados anteriores"
                  : "Excluir resultados anteriores"}{" "}
                · {w.previousGameIds.length} jogo(s) incluído(s)
                {!!w.previousGameIds.length && (
                  <ul>
                    {w.previousGameIds.map((id) => (
                      <li key={id}>{gameLabel(id)}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <p>
            Elencos, perfis de atletas, documentos e motivos internos não serão
            publicados por esta ação. Alterações privadas posteriores exigem
            nova confirmação; resultados publicados dos jogos incluídos
            atualizam a classificação.
          </p>
          <label>
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={busy || uncertain}
              onChange={(e) => acknowledge(e.target.checked)}
            />
            Conferi os participantes, jogos e efeitos e confirmo que este
            conjunto pode ficar público.
          </label>
          <div className="reg-actions">
            <button
              type="button"
              disabled={!enabled || busy || !acknowledged}
              onClick={() => void confirm()}
            >
              {uncertain
                ? "Repetir envio da publicação"
                : "Confirmar publicação pública"}
            </button>
            <button
              type="button"
              disabled={busy || uncertain}
              onClick={() => {
                setPreview(null);
                acknowledge(false);
              }}
            >
              Cancelar prévia
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
