import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  gameOccurrenceStateSchema,
  gameOccurrenceVersionSchema,
  type GameOccurrenceState,
} from "./occurrence-contract";
import {
  registrationWithdrawalStateSchema,
  registrationWithdrawalVersionSchema,
} from "./withdrawal-contract";
type OccurrenceVersion = ReturnType<typeof gameOccurrenceVersionSchema.parse>;
type WithdrawalVersion = ReturnType<
  typeof registrationWithdrawalVersionSchema.parse
>;
type Props = {
  kind: "occurrence" | "withdrawal";
  path: string;
  disputeId: string;
  targetId: string;
  head: GameOccurrenceState["head"] | WithdrawalVersion | null;
  history: GameOccurrenceState["history"];
  hasMore: boolean;
  enabled: boolean;
  names: Map<string, string>;
  gameNames?: Map<string, string>;
  resolveGames?: (ids: string[]) => Promise<Map<string, string>>;
  onSessionLost: () => void;
  onConflict: () => void;
};
export function DecisionHistory(p: Props) {
  const [rows, setRows] = useState(p.history),
    [more, setMore] = useState(p.hasMore),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [gameOffset, setGameOffset] = useState(0),
    [detailNames, setDetailNames] = useState(new Map<string, string>()),
    [detail, setDetail] = useState<
      OccurrenceVersion | WithdrawalVersion | null
    >(null);
  const alive = useRef(true),
    alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (error && p.enabled) alert.current?.focus();
  }, [error, p.enabled]);
  function fail(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    if (e instanceof ApiFailure && e.status === 409) p.onConflict();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível consultar o histórico.",
    );
  }
  async function page(next: number) {
    setBusy(true);
    setError("");
    try {
      const s =
        p.kind === "occurrence"
          ? await api(p.path + `?offset=${next}`, gameOccurrenceStateSchema)
          : await api(
              p.path + `?offset=${next}`,
              registrationWithdrawalStateSchema,
            );
      const target = "gameId" in s ? s.gameId : s.registrationId;
      if (
        target !== p.targetId ||
        s.disputeId !== p.disputeId ||
        s.head?.id !== p.head?.id ||
        s.head?.version !== p.head?.version
      )
        throw new ApiFailure(
          409,
          "O histórico mudou. Recarregue a situação preservando sua edição.",
        );
      if (alive.current) {
        setRows(s.history);
        setMore(s.hasMore);
        setOffset(next);
        setDetail(null);
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function version(n: number) {
    setBusy(true);
    setError("");
    try {
      const s =
        p.kind === "occurrence"
          ? await api(p.path + `/versions/${n}`, gameOccurrenceVersionSchema)
          : await api(
              p.path + `/versions/${n}`,
              registrationWithdrawalVersionSchema,
            );
      const target = "gameId" in s ? s.gameId : s.registrationId;
      if (
        target !== p.targetId ||
        s.disputeId !== p.disputeId ||
        s.id !== p.head?.id ||
        s.version !== n
      )
        throw new Error(
          "A versão recebida não corresponde à decisão solicitada.",
        );
      const labels =
        "previousGameIds" in s
          ? await labelsFor(s.previousGameIds.slice(0, 20))
          : new Map<string, string>();
      if (alive.current) {
        setDetail(s);
        setGameOffset(0);
        setDetailNames(labels);
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function labelsFor(ids: string[]) {
    return p.resolveGames
      ? await p.resolveGames(ids)
      : new Map(
          ids.map((id) => [
            id,
            p.gameNames?.get(id) ?? "Jogo da relação original",
          ]),
        );
  }
  async function gamesPage(next: number) {
    if (!detail || !("previousGameIds" in detail)) return;
    setBusy(true);
    setError("");
    try {
      const labels = await labelsFor(
        detail.previousGameIds.slice(next, next + 20),
      );
      if (alive.current) {
        setDetailNames(labels);
        setGameOffset(next);
      }
    } catch (e) {
      if (alive.current) fail(e);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const name = (id: string) => p.names.get(id) ?? "Inscrição original";
  const effect = (v: OccurrenceVersion) => {
    const e = v.effect;
    if (!e) return "Ocorrência retirada";
    if (e.kind === "wo")
      return `W.O. — vencedor: ${name(e.winnerRegistrationId)}`;
    if (e.kind === "administrative")
      return e.decision.kind === "exclude"
        ? "Decisão administrativa — desconsiderar resultado competitivo"
        : `Decisão administrativa — vencedor: ${name(e.decision.winnerRegistrationId)}; pontos de classificação ${e.decision.homeLeaguePoints} / ${e.decision.awayLeaguePoints}; placar ${e.decision.score ? `${e.decision.score.homePoints} × ${e.decision.score.awayPoints}` : "não informado"}`;
    return {
      postponed: "Adiamento",
      interrupted: "Interrupção",
      cancelled: "Cancelamento",
    }[e.kind];
  };
  return (
    <details>
      <summary>
        {p.kind === "occurrence"
          ? "Histórico de decisões do jogo"
          : "Histórico de desistências da inscrição"}
      </summary>
      {error && (
        <p role="alert" tabIndex={-1} ref={alert} className="access-error">
          {error}
        </p>
      )}
      {busy && <p role="status">Consultando histórico…</p>}
      {rows.length ? (
        <ul>
          {rows.map((h) => (
            <li key={h.version}>
              <button
                disabled={busy || !p.enabled}
                onClick={() => void version(h.version)}
                aria-label={`Consultar decisão versão ${h.version}`}
              >
                Versão {h.version}
              </button>{" "}
              · {h.active ? "Ativa nessa versão" : "Retirada"} · {h.reason}
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhuma decisão registrada.</p>
      )}
      <div className="reg-actions">
        <button
          disabled={busy || !p.enabled || offset === 0}
          onClick={() => void page(Math.max(0, offset - 20))}
        >
          Decisões mais recentes
        </button>
        <button
          disabled={busy || !p.enabled || !more}
          onClick={() => void page(offset + 20)}
        >
          Mais decisões anteriores
        </button>
      </div>
      {detail && (
        <section className="reg-review">
          <h5>Decisão histórica — versão {detail.version}</h5>
          <p>{detail.reason}</p>
          <p>
            Registrada em{" "}
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "America/Sao_Paulo",
            }).format(new Date(detail.savedAt))}{" "}
            (UTC-03).
          </p>
          {"effect" in detail ? (
            <>
              <p>{effect(detail)}</p>
              <p>
                Agenda versão {detail.gameVersion} · publicação{" "}
                {detail.publicationVersion || "ausente nessa decisão"} ·
                regulamento{" "}
                {detail.regulationVersion || "ausente nessa decisão"}.
              </p>
            </>
          ) : (
            <>
              <p>
                {detail.policy === "keep_results"
                  ? "Desistência mantendo resultados anteriores"
                  : detail.policy === "exclude_results"
                    ? "Desistência desconsiderando resultados anteriores"
                    : "Desistência retirada"}
              </p>
              <p>{detail.previousGameIds.length} jogos na relação histórica.</p>
              <ul>
                {detail.previousGameIds
                  .slice(gameOffset, gameOffset + 20)
                  .map((id) => (
                    <li key={id}>
                      {detailNames.get(id) ?? "Jogo da relação original"}
                    </li>
                  ))}
              </ul>
              {detail.previousGameIds.length > 20 && (
                <div className="reg-actions">
                  <button
                    disabled={busy || !p.enabled || gameOffset === 0}
                    onClick={() => void gamesPage(Math.max(0, gameOffset - 20))}
                  >
                    Jogos históricos anteriores
                  </button>
                  <button
                    disabled={
                      busy ||
                      !p.enabled ||
                      gameOffset + 20 >= detail.previousGameIds.length
                    }
                    onClick={() => void gamesPage(gameOffset + 20)}
                  >
                    Mais jogos históricos
                  </button>
                </div>
              )}
              <p>
                Relação original de jogos; identificação exibida conforme
                cadastro atual.
              </p>
            </>
          )}
          <p>
            Consulta histórica. Esta versão não substitui a decisão em edição
            nem recalcula seu impacto original.
          </p>
        </section>
      )}
    </details>
  );
}
