import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import type { RegistrationSnapshot } from "../teams/contract";
import {
  type ApplyRosterReuse,
  type ReuseContext,
  REUSE_LIMIT,
  reuseContextSchema,
  rosterReuseResultSchema,
  rosterReuseSourcesSchema,
} from "./roster-reuse-contract";
import { previewRosterReuse } from "./roster-reuse";

type Props = {
  registration: RegistrationSnapshot;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onClose: () => void;
};
type Choice = { selected: boolean; jersey: string | null };
const reasons: Record<string, string> = {
  eligible: "Disponível",
  already_included: "Já está neste elenco",
  gender_mismatch: "Naipe incompatível",
  registered_elsewhere: "Inscrito em outra equipe",
  transfer_required: "Necessita transferência",
  jersey_conflict: "Camisa já utilizada",
  invalid_jersey: "Camisa inválida",
};
const SIZE = 25;

export function RosterReusePanel(p: Props) {
  const [sources, setSources] = useState<
    Awaited<ReturnType<typeof rosterReuseSourcesSchema.parse>>["items"]
  >([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [sourceId, setSourceId] = useState("");
  const [view, setView] = useState<ReuseContext | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [page, setPage] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [complete, setComplete] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef<ApplyRosterReuse | null>(null);
  const active = useRef(true);
  const alert = useRef<HTMLParagraphElement>(null);
  const changed =
    confirmed ||
    !!view?.candidates.some(
      (row) =>
        row.eligibility === "eligible" &&
        (choices[row.sourceEntryId]?.selected ||
          choices[row.sourceEntryId]?.jersey !== row.jersey),
    );
  const locked = busy || uncertain || complete;
  const mayLeave = () =>
    !busy &&
    (!(changed || pending.current) ||
      window.confirm(
        "Há uma seleção não salva ou um envio não confirmado. Sair desta edição?",
      ));

  useEffect(() => {
    p.guard.current = mayLeave;
    return () => {
      p.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!changed && !pending.current) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed, uncertain]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  useEffect(() => {
    active.current = true;
    void loadSources(0);
    return () => {
      active.current = false;
    };
  }, [p.registration.id]);

  function report(failure: unknown) {
    if (!active.current) return;
    if (isSessionFailure(failure)) p.onSessionLost();
    setError(
      failure instanceof Error
        ? failure.message
        : "Não foi possível consultar o elenco.",
    );
  }
  async function loadSources(next: number) {
    setBusy(true);
    setError("");
    try {
      const result = await api(
        `/api/roster/reuse/sources?targetRegistrationId=${p.registration.id}&offset=${next}`,
        rosterReuseSourcesSchema,
      );
      if (!active.current) return;
      setSources(result.items);
      setHasMore(result.hasMore);
      setOffset(next);
    } catch (failure) {
      report(failure);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function loadContext(id: string, confirmedDiscard = false) {
    if (
      pending.current ||
      (!confirmedDiscard &&
        changed &&
        !window.confirm("Descartar a seleção atual e atualizar a prévia?"))
    )
      return;
    setBusy(true);
    setError("");
    setView(null);
    setChoices({});
    setConfirmed(false);
    setPage(0);
    setComplete(false);
    try {
      const result = await api(
        `/api/roster/reuse/context?sourceRegistrationId=${id}&targetRegistrationId=${p.registration.id}`,
        reuseContextSchema,
      );
      if (!active.current) return;
      if (result.source.id !== id || result.target.id !== p.registration.id)
        throw Error(
          "A origem ou o destino retornado não corresponde à seleção.",
        );
      setView(result);
      setChoices(
        Object.fromEntries(
          result.candidates
            .filter((r) => r.eligibility === "eligible")
            .map((r) => [
              r.sourceEntryId,
              { selected: false, jersey: r.jersey },
            ]),
        ),
      );
    } catch (failure) {
      report(failure);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  function changeSource(id: string) {
    if (locked || (changed && !window.confirm("Descartar a seleção atual?")))
      return;
    pending.current = null;
    setUncertain(false);
    setSourceId(id);
    setView(null);
    if (id) void loadContext(id, true);
    else {
      setChoices({});
      setConfirmed(false);
    }
  }
  const selection =
    view?.candidates
      .filter((r) => r.eligibility === "eligible")
      .map((r) => ({
        sourceEntryId: r.sourceEntryId,
        selected: choices[r.sourceEntryId]?.selected ?? false,
        jersey: choices[r.sourceEntryId]?.jersey ?? null,
      })) ?? [];
  const preview = view ? previewRosterReuse(view, selection) : null;
  const selected = preview?.rows.filter((r) => r.selected) ?? [];
  const invalid = selected.filter((r) => r.errors.length > 0);

  async function save() {
    if (
      !p.enabled ||
      !view ||
      !preview?.ready ||
      !confirmed ||
      busy ||
      complete
    )
      return;
    const command = pending.current ?? {
      commandId: crypto.randomUUID(),
      sourceRegistrationId: view.source.id,
      targetRegistrationId: view.target.id,
      expectedContextFingerprint: view.contextFingerprint,
      confirmed: true as const,
      items: selected.map((r) => ({
        sourceEntryId: r.sourceEntryId,
        sourceVersion: r.sourceVersion,
        newEntryId: crypto.randomUUID(),
        jersey: r.jersey,
      })),
    };
    // Keep the exact command and generated entry IDs on an unknown acknowledgement.
    pending.current = command;
    setBusy(true);
    setError("");
    try {
      const receipt = await api(
        "/api/roster/reuse",
        rosterReuseResultSchema,
        command,
      );
      if (!active.current) return;
      if (
        receipt.commandId !== command.commandId ||
        receipt.targetRegistrationId !== command.targetRegistrationId ||
        receipt.sourceRegistrationId !== command.sourceRegistrationId ||
        receipt.items.length !== command.items.length ||
        receipt.items.some(
          (item, i) =>
            item.sourceEntryId !== command.items[i].sourceEntryId ||
            item.newEntryId !== command.items[i].newEntryId,
        )
      )
        throw Error("O recibo não corresponde à seleção enviada.");
      pending.current = null;
      setUncertain(false);
      setComplete(true);
      setStatus(`${receipt.items.length} atleta(s) reaproveitado(s).`);
      p.onSaved();
    } catch (failure) {
      if (
        failure instanceof ApiFailure &&
        [400, 404, 409, 413].includes(failure.status)
      ) {
        pending.current = null;
        setUncertain(false);
        setConfirmed(false);
        setStatus("Atualize a origem para revisar o elenco antes de reenviar.");
      } else setUncertain(true);
      report(failure);
    } finally {
      if (active.current) setBusy(false);
    }
  }

  return (
    <section className="members-workspace roster-reuse">
      <div className="competition-title">
        <h4 tabIndex={-1}>Reaproveitar atletas · {p.registration.name}</h4>
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
      <p>
        Escolha uma inscrição anterior da mesma equipe e temporada. Os vínculos
        anteriores permanecem intactos.
      </p>
      {error && (
        <p role="alert" tabIndex={-1} ref={alert} className="access-error">
          {error}
        </p>
      )}
      <p role="status">
        {busy
          ? "Consultando…"
          : uncertain
            ? "Envio sem confirmação; tente novamente com o mesmo comando."
            : status}
      </p>
      {complete ? (
        <button type="button" onClick={p.onClose}>
          Retornar ao elenco atualizado
        </button>
      ) : (
        <>
          <div className="roster-reuse-controls">
            <label>
              Inscrição de origem
              <select
                value={sourceId}
                disabled={locked || !p.enabled}
                onChange={(e) => changeSource(e.target.value)}
              >
                <option value="">Selecione uma inscrição anterior</option>
                {sourceId &&
                  !sources.some((s) => s.id === sourceId) &&
                  view && (
                    <option value={sourceId}>
                      {view.source.name} · {view.source.year} (selecionada)
                    </option>
                  )}
                {sources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.year} · {r.category} ·{" "}
                    {r.division || "Sem divisão"} ({r.athleteCount})
                  </option>
                ))}
              </select>
            </label>
            <div className="competition-actions">
              <button
                className="secondary"
                type="button"
                disabled={locked || offset === 0 || changed}
                onClick={() => void loadSources(Math.max(0, offset - 20))}
              >
                Origens anteriores
              </button>
              <button
                className="secondary"
                type="button"
                disabled={locked || !hasMore || changed}
                onClick={() => void loadSources(offset + 20)}
              >
                Mais origens
              </button>
              <button
                className="secondary"
                type="button"
                disabled={locked || !sourceId}
                onClick={() => void loadContext(sourceId)}
              >
                Atualizar prévia
              </button>
            </div>
          </div>
          {view && preview && (
            <>
              <p>
                {view.source.name} → {view.target.name}. {preview.selectedCount}{" "}
                selecionados (limite {REUSE_LIMIT});{" "}
                {preview.alreadyIncludedCount} já incluídos.
              </p>
              <div className="member-table-scroll roster-reuse-table">
                <table>
                  <caption>
                    Atletas da origem — página {page + 1} de{" "}
                    {Math.max(1, Math.ceil(preview.rows.length / SIZE))}
                  </caption>
                  <thead>
                    <tr>
                      <th>Incluir</th>
                      <th>Atleta</th>
                      <th>Camisa</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows
                      .slice(page * SIZE, (page + 1) * SIZE)
                      .map((r) => (
                        <tr key={r.sourceEntryId}>
                          <td>
                            <input
                              aria-label={`Incluir ${r.name}`}
                              type="checkbox"
                              checked={r.selected}
                              disabled={
                                locked || !p.enabled || r.status !== "eligible"
                              }
                              onChange={(e) => {
                                setChoices((previous) => ({
                                  ...previous,
                                  [r.sourceEntryId]: {
                                    selected: e.target.checked,
                                    jersey:
                                      previous[r.sourceEntryId]?.jersey ??
                                      r.jersey,
                                  },
                                }));
                                setConfirmed(false);
                              }}
                            />
                          </td>
                          <td>
                            {r.name}
                            {r.nickname && <small>{r.nickname}</small>}
                          </td>
                          <td>
                            {r.status === "eligible" ? (
                              <input
                                aria-label={`Camisa de ${r.name}`}
                                value={choices[r.sourceEntryId]?.jersey ?? ""}
                                maxLength={20}
                                disabled={locked || !p.enabled}
                                onChange={(e) => {
                                  setChoices((previous) => ({
                                    ...previous,
                                    [r.sourceEntryId]: {
                                      selected:
                                        previous[r.sourceEntryId]?.selected ??
                                        false,
                                      jersey: e.target.value || null,
                                    },
                                  }));
                                  setConfirmed(false);
                                }}
                              />
                            ) : (
                              (r.jersey ?? "—")
                            )}
                          </td>
                          <td>
                            {r.errors.map((e) => reasons[e]).join(", ") ||
                              reasons[r.status]}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="competition-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={locked || page === 0}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Página anterior
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={locked || (page + 1) * SIZE >= preview.rows.length}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Próxima página
                </button>
              </div>
              {!!invalid.length && (
                <p role="alert">
                  Corrija {invalid.length} camisa(s) em conflito ou inválida(s)
                  antes de continuar.
                </p>
              )}
              <label className="member-checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={locked || !preview.ready || !p.enabled}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />{" "}
                Confirmo a inclusão dos {preview.selectedCount} atletas
                selecionados nesta inscrição.
              </label>
              <button
                type="button"
                disabled={
                  busy || complete || !p.enabled || !confirmed || !preview.ready
                }
                onClick={() => void save()}
              >
                {uncertain
                  ? "Reenviar comando para confirmar"
                  : "Confirmar reaproveitamento"}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
