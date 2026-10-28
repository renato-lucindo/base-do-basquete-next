import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { rosterSnapshotSchema, type RosterSnapshot } from "./roster-contract";
import {
  saveTransferSchema,
  transferContextSchema,
  transferPreviewSchema,
  transferResultSchema,
  type SaveTransfer,
  type TransferContext,
  type TransferPreview,
  type TransferResult,
} from "./transfer-contract";
import { membershipMicros } from "./membership-time";

type Props = {
  source: RosterSnapshot;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onClose: () => void;
};
const needs: Record<NonNullable<TransferPreview["needs"]>, string> = {
  rule_required: "O regulamento ainda não define a permissão de transferência.",
  transfer_forbidden: "O regulamento proíbe transferências nesta disputa.",
  source_changed:
    "O vínculo de origem mudou. Abra a operação pelo vínculo atual do atleta.",
  destination_changed: "A inscrição de destino mudou. Atualize o contexto.",
  regulation_changed: "O regulamento mudou. Atualize o contexto.",
  context_changed:
    "Os vínculos ou o regulamento mudaram. Atualize o contexto e confira novamente.",
  jersey_in_use: "Esta camisa está ocupada no destino. Escolha outra camisa.",
  same_registration:
    "O atleta já está ativo nesta inscrição. Edite a camisa no vínculo atual.",
  entry_id_used: "O vínculo proposto já existe. Atualize o contexto.",
  invalid_effective_time:
    "A vigência precisa ser conferida novamente no servidor.",
  context_too_large:
    "O contexto atingiu o limite de vínculos para esta operação.",
};
const time = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
export function TransferPanel(p: Props) {
  const [view, setView] = useState<TransferContext | null>(null),
    [destination, setDestination] = useState(""),
    [jersey, setJersey] = useState(p.source.jersey ?? ""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [conflict, setConflict] = useState(false),
    [completed, setCompleted] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [offset, setOffset] = useState(0),
    [proposal, setProposal] = useState<{
      command: SaveTransfer;
      value: TransferPreview;
    } | null>(null);
  const pending = useRef<{
      command: SaveTransfer;
      ack: TransferResult | null;
    } | null>(null),
    entryId = useRef(crypto.randomUUID()),
    alive = useRef(true),
    contextFocus = useRef<"destination" | "jersey" | false>(false),
    alert = useRef<HTMLParagraphElement>(null),
    resultStatus = useRef<HTMLParagraphElement>(null),
    jerseyField = useRef<HTMLInputElement>(null),
    destinationField = useRef<HTMLSelectElement>(null),
    previewHeading = useRef<HTMLHeadingElement>(null);
  const path = `/api/roster/${p.source.id}/transfer`,
    locked = busy || !!pending.current || completed,
    dirty =
      !completed &&
      (destination !== "" ||
        jersey !== (p.source.jersey ?? "") ||
        reason !== "");
  const mayLeave = () =>
    !busy &&
    (!(dirty || pending.current) ||
      window.confirm(
        "Há uma transferência não salva ou envio não confirmado. Sair desta edição?",
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
  useEffect(() => {
    if (proposal && p.enabled) previewHeading.current?.focus();
  }, [proposal, p.enabled]);
  useEffect(() => {
    if (completed && p.enabled) resultStatus.current?.focus();
  }, [completed, p.enabled]);
  useLayoutEffect(() => {
    if (!view || busy || !p.enabled || !contextFocus.current) return;
    const field =
      contextFocus.current === "destination" ? destinationField : jerseyField;
    contextFocus.current = false;
    field.current?.focus();
  }, [view, busy, p.enabled]);
  useEffect(() => {
    alive.current = true;
    void load(p.source.registrationId, "destination");
    return () => {
      alive.current = false;
    };
  }, [p.source.id]);
  function fail(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível conferir a transferência.",
    );
  }
  async function context(id: string) {
    const value = await api(
      `${path}?destinationRegistrationId=${encodeURIComponent(id)}`,
      transferContextSchema,
    );
    if (
      value.disputeId !== p.source.disputeId ||
      value.personId !== p.source.personId ||
      !value.memberships.some(
        (m) => m.id === p.source.id && m.personId === p.source.personId,
      ) ||
      !value.registrations.some((r) => r.id === id)
    )
      throw new ApiFailure(
        503,
        "Não foi possível conferir o contexto da transferência.",
      );
    return value;
  }
  async function load(
    id: string,
    focus: "destination" | "jersey" | false = false,
  ) {
    setBusy(true);
    setError("");
    setProposal(null);
    setConfirmed(false);
    try {
      const value = await context(id);
      if (alive.current) {
        contextFocus.current = focus;
        setView(value);
        setConflict(false);
      }
    } catch (e) {
      if (alive.current) {
        setConflict(true);
        fail(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function changed() {
    setProposal(null);
    setConfirmed(false);
    setStatus("");
    setError("");
  }
  async function confer() {
    if (locked || conflict || !view || !destination) return;
    const c = saveTransferSchema.safeParse({
      commandId: crypto.randomUUID(),
      disputeId: view.disputeId,
      sourceEntryId: p.source.id,
      expectedSourceVersion: view.memberships.find((m) => m.id === p.source.id)
        ?.version,
      destinationRegistrationId: destination,
      expectedDestinationVersion: view.registrations.find(
        (r) => r.id === destination,
      )?.version,
      expectedRegulationVersion: view.regulation.version,
      expectedContextFingerprint: view.contextFingerprint,
      newEntryId: entryId.current,
      jersey: jersey.trim() || null,
      reason,
      acknowledgeImpact: false,
    });
    if (!c.success) {
      setError(
        "Escolha o destino, confira a camisa e informe um motivo de 3 a 2000 caracteres.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setProposal(null);
    setConfirmed(false);
    try {
      const v = await api(path + "/preview", transferPreviewSchema, c.data);
      if (
        v.disputeId !== c.data.disputeId ||
        v.personId !== p.source.personId ||
        v.sourceEntryId !== p.source.id ||
        v.destinationRegistrationId !== destination ||
        (v.ready &&
          (v.regulationVersion !== c.data.expectedRegulationVersion ||
            v.contextFingerprint !== c.data.expectedContextFingerprint)) ||
        (v.plan &&
          (v.plan.open.id !== entryId.current ||
            v.plan.open.jersey !== c.data.jersey))
      )
        throw new ApiFailure(
          503,
          "Não foi possível conferir a resposta da prévia.",
        );
      if (alive.current) {
        setProposal({ command: c.data, value: v });
        if (v.needs) {
          setError(needs[v.needs]);
          if (
            [
              "context_changed",
              "regulation_changed",
              "source_changed",
              "destination_changed",
              "entry_id_used",
              "invalid_effective_time",
            ].includes(v.needs)
          )
            setConflict(true);
        }
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
  async function recover(ack: TransferResult) {
    const entry = await api(
        `/api/roster/${ack.newEntryId}`,
        rosterSnapshotSchema,
      ),
      v = await context(ack.destinationRegistrationId),
      c = pending.current!.command;
    if (
      entry.id !== ack.newEntryId ||
      entry.personId !== p.source.personId ||
      entry.registrationId !== ack.destinationRegistrationId ||
      (entry.version === ack.newEntryVersion && entry.jersey !== c.jersey) ||
      entry.disputeId !== ack.disputeId
    )
      throw new ApiFailure(
        503,
        "O envio foi confirmado, mas o vínculo salvo ainda não pôde ser conferido.",
      );
    if (alive.current) {
      pending.current = null;
      setView(v);
      setCompleted(true);
      setProposal(null);
      setConfirmed(false);
      setStatus(
        ack.kind === "return"
          ? "Retorno concluído com novo vínculo. Histórico preservado."
          : "Transferência concluída. Histórico preservado.",
      );
      p.onSaved();
    }
  }
  async function save() {
    if (busy || completed) return;
    if (!pending.current) {
      if (!proposal?.value.ready || !confirmed) return;
      pending.current = {
        command: { ...proposal.command, acknowledgeImpact: true },
        ack: null,
      };
    }
    setBusy(true);
    setError("");
    try {
      if (!pending.current.ack) {
        const c = pending.current.command,
          ack = await api(path, transferResultSchema, c);
        if (
          ack.commandId !== c.commandId ||
          ack.disputeId !== c.disputeId ||
          ack.personId !== p.source.personId ||
          ack.sourceEntryId !== c.sourceEntryId ||
          ack.newEntryId !== c.newEntryId ||
          ack.destinationRegistrationId !== c.destinationRegistrationId ||
          ![c.expectedSourceVersion, c.expectedSourceVersion + 1].includes(
            ack.sourceVersion,
          )
        )
          throw new ApiFailure(
            503,
            "Não foi possível conferir a confirmação do envio.",
          );
        pending.current.ack = ack;
      }
      await recover(pending.current.ack);
    } catch (e) {
      if (alive.current) {
        if (
          !pending.current?.ack &&
          e instanceof ApiFailure &&
          [400, 409, 413].includes(e.status)
        ) {
          pending.current = null;
          setProposal(null);
          setConfirmed(false);
          setConflict(true);
        }
        fail(e);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const label = (id: string) =>
      view?.registrations.find((r) => r.id === id)?.name ??
      "Inscrição indisponível",
    periods = (view?.memberships ?? [])
      .filter((m) => m.personId === p.source.personId)
      .sort((a, b) => {
        const x = membershipMicros(a.startedAt)!,
          y = membershipMicros(b.startedAt)!;
        return x === y ? a.id.localeCompare(b.id) : x < y ? -1 : 1;
      });
  return (
    <section
      className="members-workspace transfer-panel"
      aria-label={`Transferência de ${p.source.person.name}`}
    >
      <div className="competition-title">
        <h4>Transferir ou retornar · {p.source.person.name}</h4>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            if (mayLeave()) p.onClose();
          }}
        >
          Voltar ao elenco
        </button>
      </div>
      {error && (
        <p role="alert" tabIndex={-1} ref={alert} className="access-error">
          {error}
        </p>
      )}
      <p role="status" tabIndex={-1} ref={resultStatus}>
        {busy
          ? "Aguarde…"
          : pending.current?.ack
            ? "Envio confirmado. Falta atualizar a leitura do vínculo salvo."
            : pending.current
              ? "Envio não confirmado. Repita o mesmo envio para recuperar a confirmação."
              : status}
      </p>
      {view && (
        <p>
          {view.regulation.transfers === null
            ? needs.rule_required
            : view.regulation.transfers === "forbidden"
              ? needs.transfer_forbidden
              : `Transferências permitidas · regulamento versão ${view.regulation.version}.`}
        </p>
      )}
      <form
        className="member-editor"
        onSubmit={(e) => {
          e.preventDefault();
          void confer();
        }}
      >
        <fieldset className="transfer-fields" disabled={locked || !p.enabled}>
          <legend>Origem e destino</legend>
          <p>
            Origem: {view ? label(p.source.registrationId) : "Carregando…"}. A
            operação abre um período novo e preserva as participações
            anteriores.
          </p>
          <label className="transfer-destination">
            Inscrição de destino
            <select
              aria-label="Inscrição de destino"
              ref={destinationField}
              value={destination}
              disabled={!view}
              onChange={(e) => {
                const id = e.target.value;
                setDestination(id);
                changed();
                if (id) void load(id, "jersey");
              }}
            >
              <option value="">Selecione</option>
              {view?.registrations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="transfer-jersey">
            Camisa no destino
            <input
              ref={jerseyField}
              inputMode="numeric"
              value={jersey}
              maxLength={2}
              onChange={(e) => {
                setJersey(e.target.value);
                changed();
              }}
            />
          </label>
          <small>
            Deixe em branco se ainda não definida. As camisas 0 e 00 são
            diferentes.
          </small>
          <label className="transfer-reason">
            Motivo da transferência ou retorno
            <textarea
              aria-label="Motivo da transferência ou retorno"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                changed();
              }}
            />
          </label>
          <button
            type="submit"
            disabled={
              !view ||
              !destination ||
              conflict ||
              view.regulation.transfers !== "allowed"
            }
          >
            Conferir transferência
          </button>
        </fieldset>
      </form>
      {proposal?.value.ready && (
        <section className="transfer-confirm">
          <h5 ref={previewHeading} tabIndex={-1}>
            Conferência da transferência
          </h5>
          <p>
            {proposal.value.kind === "return"
              ? "Retorno com novo vínculo"
              : "Transferência"}
            : {label(p.source.registrationId)} → {label(destination)} · camisa{" "}
            {proposal.command.jersey ?? "não definida"}.
          </p>
          <p>
            {proposal.value.plan?.close
              ? "O vínculo ativo será encerrado e o destino será aberto no mesmo instante."
              : "O período encerrado será preservado e um novo vínculo será aberto."}{" "}
            A vigência será registrada no momento da confirmação. Jogos e
            participações anteriores permanecem vinculados à inscrição original.
          </p>
          <label className="member-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={locked || !p.enabled}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Conferi destino, camisa e preservação do histórico
          </label>
          {!pending.current && (
            <button
              disabled={busy || !confirmed || !p.enabled}
              onClick={() => void save()}
            >
              Confirmar transferência
            </button>
          )}
        </section>
      )}
      {pending.current && (
        <button disabled={busy || !p.enabled} onClick={() => void save()}>
          {pending.current.ack
            ? "Atualizar vínculo salvo"
            : "Repetir o mesmo envio"}
        </button>
      )}
      {!completed && !pending.current && (
        <button
          disabled={busy || !p.enabled}
          onClick={() => void load(destination || p.source.registrationId)}
        >
          Atualizar contexto preservando campos
        </button>
      )}
      {view && (
        <div
          className="member-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Histórico de períodos do atleta"
        >
          <table>
            <caption>
              Períodos de {p.source.person.name} · horário de Brasília
            </caption>
            <thead>
              <tr>
                <th>Camisa</th>
                <th>Inscrição</th>
                <th>Vigência</th>
              </tr>
            </thead>
            <tbody>
              {periods.slice(offset, offset + 20).map((m) => (
                <tr key={m.id}>
                  <td>{m.jersey ?? "Não definida"}</td>
                  <td>{label(m.registrationId)}</td>
                  <td>
                    {time(m.startedAt)} →{" "}
                    {m.endedAt ? time(m.endedAt) : "Ativo"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="competition-actions">
            <button
              disabled={busy || offset === 0}
              onClick={() => setOffset((v) => Math.max(0, v - 20))}
            >
              Períodos anteriores
            </button>
            <span>
              {periods.length
                ? `${offset + 1}–${Math.min(offset + 20, periods.length)} de ${periods.length}`
                : "Sem períodos"}
            </span>
            <button
              disabled={busy || offset + 20 >= periods.length}
              onClick={() => setOffset((v) => v + 20)}
            >
              Próximos períodos
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
