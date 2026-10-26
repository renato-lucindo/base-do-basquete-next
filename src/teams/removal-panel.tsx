import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import {
  registrationRemovalSchema,
  removalContextSchema,
  removalResultSchema,
  type RegistrationRemoval,
  type RemovalContext,
} from "./removal-contract";

type Props = {
  id: string;
  name: string;
  disputeId: string;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onRemoved: () => void;
  onClose: (removed: boolean) => void;
};
const labels = {
  roster: "Elenco, incluindo vínculos encerrados",
  staff: "Comissão técnica",
  games: "Jogos, incluindo agenda sem resultado",
  scoresheet: "Súmula",
  publication: "Publicação de resultado",
  decisions: "Decisões e desistências",
  regulation: "Regulamento e versões anteriores",
  text_review: "Conferência de texto salva",
  transfer: "Transferência ou retorno",
  awards: "Premiações e versões anteriores",
};
export function RegistrationRemovalPanel(p: Props) {
  const [view, setView] = useState<RemovalContext | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false);
  const pending = useRef<{ command: RegistrationRemoval; ack: boolean } | null>(
    null,
  );
  const alive = useRef(true),
    working = useRef(false),
    notified = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const displayedName = useRef(p.name);
  const heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    status = useRef<HTMLParagraphElement>(null);
  const path = `/api/registrations/${p.id}/removal`;
  const done = view?.state === "removed",
    frozen = !!pending.current;
  function mayLeave() {
    return (
      !pending.current ||
      (!working.current &&
        window.confirm(
          "Há uma exclusão com resultado não confirmado. Deseja sair desta conferência?",
        ))
    );
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    p.guard.current = mayLeave;
    return () => {
      p.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!frozen) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [frozen]);
  useEffect(() => {
    if (p.enabled && !view && !pending.current) void load();
  }, [p.enabled]);
  useEffect(() => {
    if (!p.enabled || busy) return;
    if (error) alert.current?.focus();
    else if (done) status.current?.focus();
    else heading.current?.focus();
  }, [p.enabled, busy, error, done]);
  function report(failure: unknown) {
    if (!alive.current) return;
    setError(
      failure instanceof Error
        ? failure.message
        : "Não foi possível confirmar o resultado. Tente novamente.",
    );
    if (isSessionFailure(failure)) p.onSessionLost();
  }
  async function read() {
    const result = await api(
      `${path}?disputeId=${p.disputeId}`,
      removalContextSchema,
      undefined,
      controller.current?.signal,
    );
    const identity = result.state === "removed" ? result : result.registration;
    if (
      identity.id.toLowerCase() !== p.id.toLowerCase() ||
      identity.disputeId.toLowerCase() !== p.disputeId.toLowerCase()
    )
      throw new ApiFailure(
        503,
        "A resposta não corresponde à inscrição. Atualize a conferência.",
      );
    if (pending.current?.ack && result.state !== "removed")
      throw new ApiFailure(
        503,
        "A exclusão foi confirmada, mas a leitura divergiu. Atualize o resultado.",
      );
    if (!alive.current) return;
    if (result.state !== "removed")
      displayedName.current = result.registration.name;
    setView(result);
    setConflict(false);
    if (result.state === "removed") {
      pending.current = null;
      if (!notified.current) {
        notified.current = true;
        p.onRemoved();
      }
    }
  }
  async function load() {
    if (!p.enabled || working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      await read();
    } catch (failure) {
      report(failure);
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function submit() {
    if (!p.enabled || working.current || done || conflict) return;
    if (!pending.current) {
      if (view?.state !== "available") return;
      pending.current = {
        command: Object.freeze(
          registrationRemovalSchema.parse({
            commandId: crypto.randomUUID(),
            registrationId: p.id,
            disputeId: p.disputeId,
            expectedVersion: view.registration.version,
          }),
        ),
        ack: false,
      };
    }
    working.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const request = pending.current;
      const ack = await api(
        path,
        removalResultSchema,
        request.command,
        controller.current.signal,
      );
      if (
        ack.id.toLowerCase() !== p.id.toLowerCase() ||
        ack.disputeId.toLowerCase() !== p.disputeId.toLowerCase() ||
        ack.deletedVersion !== request.command.expectedVersion
      )
        throw new ApiFailure(
          503,
          "Não foi possível confirmar a resposta da exclusão.",
        );
      request.ack = true;
      await read();
    } catch (failure) {
      if (
        !pending.current?.ack &&
        failure instanceof ApiFailure &&
        failure.status >= 400 &&
        failure.status < 500 &&
        !isSessionFailure(failure)
      ) {
        pending.current = null;
        setConflict(true);
      }
      report(failure);
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const name = displayedName.current;
  return (
    <section
      className="teams-inline registration-removal"
      style={{ overflowWrap: "anywhere" }}
      aria-labelledby={`remove-heading-${p.id}`}
      aria-busy={busy}
    >
      <h3 id={`remove-heading-${p.id}`} ref={heading} tabIndex={-1}>
        Conferir exclusão de {name}
      </h3>
      {view && view.state !== "removed" && (
        <>
          <p>
            Inscrição: <strong>{view.registration.name}</strong> · Referência{" "}
            {p.id.slice(-8)}
          </p>
          <p>
            A equipe global <strong>{view.registration.teamName}</strong>{" "}
            permanece cadastrada.
          </p>
          {view.state === "available" ? (
            <p>
              Esta inscrição está sem histórico ou dependências. Confirme para
              excluí-la desta disputa.
            </p>
          ) : (
            <>
              <p>
                Esta inscrição possui dados vinculados e precisa ser preservada.
              </p>
              <ul>
                {view.blockers.map((key) => (
                  <li key={key}>{labels[key]}</li>
                ))}
              </ul>
              <p>
                Volte à inscrição para consultar o histórico e as opções de
                situação.
              </p>
            </>
          )}
        </>
      )}
      {error && (
        <p ref={alert} role="alert" tabIndex={-1} className="access-error">
          {error}
        </p>
      )}
      {done ? (
        <p ref={status} role="status" tabIndex={-1}>
          Inscrição excluída. A equipe global permanece cadastrada.
        </p>
      ) : busy ? (
        <p role="status">Conferindo…</p>
      ) : pending.current ? (
        <p role="status">
          {pending.current.ack
            ? "Exclusão confirmada; falta atualizar a leitura."
            : "Resultado do envio não confirmado."}
        </p>
      ) : null}
      <div className="competition-actions">
        {!done && (
          <button
            disabled={
              !p.enabled ||
              busy ||
              frozen ||
              conflict ||
              view?.state !== "available"
            }
            onClick={() => void submit()}
          >
            Excluir esta inscrição
          </button>
        )}
        {!done && pending.current && !pending.current.ack && (
          <button disabled={!p.enabled || busy} onClick={() => void submit()}>
            Repetir o mesmo envio
          </button>
        )}
        {!done && pending.current?.ack && (
          <button disabled={!p.enabled || busy} onClick={() => void load()}>
            Atualizar resultado da exclusão
          </button>
        )}
        {!done && !pending.current && (
          <button
            className="secondary"
            disabled={!p.enabled || busy}
            onClick={() => void load()}
          >
            Atualizar conferência
          </button>
        )}
        <button
          className="secondary"
          disabled={!p.enabled || (busy && frozen)}
          onClick={() => {
            if (mayLeave()) p.onClose(done);
          }}
        >
          Voltar às inscrições
        </button>
      </div>
    </section>
  );
}
