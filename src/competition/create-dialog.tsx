import { DisputeControls } from "./dispute-controls";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AdminDialog } from "./admin-dialog";
import { CategoryFields } from "./category-fields";
import { CreateChampionshipPicker } from "./create-championship-picker";
import { api, ApiFailure, isSessionFailure } from "./api";
import {
  disputeSchema,
  snapshotSchema,
  saveResultSchema,
  type CompetitionSnapshot,
} from "./contract";
import {
  disputeAdministrationListSchema,
  disputeLockLabels,
  saveCompetitionAdministrationSchema,
  type DisputeAdministration,
  type SaveCompetitionAdministration,
} from "./administration-contract";
import type { ChampionshipOption, DisputeListRow } from "./catalog-contract";

export type DisputeFormTarget =
  { mode: "add"; row?: DisputeListRow } | { mode: "edit"; row: DisputeListRow };

const newChampionship = "new";
const currentYear = () =>
  Number(
    new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );

export function DisputeFormDialog({
  enabled,
  target,
  championships,
  onClose,
  onSaved,
  onAdministrationSaved,
  onSessionLost,
  guard,
}: {
  enabled: boolean;
  target: DisputeFormTarget;
  championships: ChampionshipOption[];
  onClose: () => void;
  onSaved: () => void;
  onAdministrationSaved: (state: DisputeAdministration) => void;
  onSessionLost: () => void;
  guard: { current: () => boolean };
}) {
  const editing = target.mode === "edit" ? target.row : undefined;
  const suggestedChampionship =
    target.row?.competitionId ??
    (championships.length === 1
      ? championships[0].id
      : championships.length
        ? ""
        : newChampionship);
  const [championshipId, setChampionshipId] = useState(suggestedChampionship);
  const [snapshot, setSnapshot] = useState<CompetitionSnapshot | null>(null);
  const [administration, setAdministration] = useState<DisputeAdministration[]>(
    [],
  );
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [year, setYear] = useState(String(target.row?.year ?? currentYear()));
  const [gender, setGender] = useState(editing?.gender ?? "masculino");
  const [category, setCategory] = useState(editing?.category ?? "Adulto");
  const [division, setDivision] = useState(editing?.division ?? "");
  const [isTest, setIsTest] = useState(false);
  const [requiresRenameReason, setRequiresRenameReason] = useState(false);
  const [renameReason, setRenameReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [divisionError, setDivisionError] = useState("");
  const pending = useRef<SaveCompetitionAdministration | null>(null);
  const championshipSearch = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const divisionRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const formId = useId();
  const creatingChampionship = championshipId === newChampionship;
  const selectedChampionship = championships.find(
    (item) => item.id === championshipId,
  );
  const resolvedSnapshot = snapshot?.id === championshipId ? snapshot : null;
  const season = resolvedSnapshot?.seasons.find((value) =>
    editing ? value.id === editing.seasonId : value.year === Number(year),
  );
  const original = season?.disputes.find(
    (value) => value.id === editing?.administration.disputeId,
  );
  const state = administration.find(
    (value) => value.disputeId === original?.id,
  );
  const yearLocked = administration.some(
    (value) =>
      value.lockReason &&
      season?.disputes.some((dispute) => dispute.id === value.disputeId),
  );
  const needsRenameReason =
    !!editing &&
    !!resolvedSnapshot &&
    name.trim().replace(/\s+/gu, " ") !== resolvedSnapshot.name &&
    (requiresRenameReason || administration.some((value) => value.wasPublic));
  const ready = editing
    ? !!original && !!state
    : creatingChampionship || !!resolvedSnapshot;
  const dirty = editing
    ? !!original &&
      (name !== resolvedSnapshot?.name ||
        year !== String(season?.year) ||
        gender !== original.gender ||
        category !== original.category ||
        division !== (original.division ?? ""))
    : championshipId !== suggestedChampionship ||
      !!name ||
      year !== String(target.row?.year ?? currentYear()) ||
      gender !== "masculino" ||
      category !== "Adulto" ||
      !!division ||
      isTest;

  function mayClose() {
    return (
      !busy &&
      (!(dirty || uncertain) ||
        window.confirm(
          "Há alterações não salvas ou um envio não confirmado. Deseja sair desta edição?",
        ))
    );
  }
  useEffect(() => {
    if (!enabled) return;
    guard.current = mayClose;
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || uncertain || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      guard.current = () => true;
      window.removeEventListener("beforeunload", warn);
    };
  });
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (enabled && (renaming || creatingChampionship)) nameRef.current?.focus();
  }, [enabled, renaming, creatingChampionship]);

  const editId = editing?.administration.disputeId;
  useEffect(() => {
    if (!enabled || uncertain) return;
    setSnapshot(null);
    setAdministration([]);
    setError("");
    if (!championshipId || creatingChampionship) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    void Promise.all([
      api(
        "/api/competitions/" + championshipId,
        snapshotSchema,
        undefined,
        signal,
      ),
      editId
        ? api(
            "/api/competition-administration/" + championshipId,
            disputeAdministrationListSchema,
            undefined,
            signal,
          )
        : Promise.resolve([]),
    ])
      .then(([value, states]) => {
        if (signal.aborted) return;
        if (editId) {
          const entry = value.seasons.find((item) =>
            item.disputes.some((dispute) => dispute.id === editId),
          );
          const current = entry?.disputes.find(
            (dispute) => dispute.id === editId,
          );
          if (
            !entry ||
            !current ||
            !states.some((item) => item.disputeId === editId)
          ) {
            setError(
              "A disputa não está disponível para edição. Volte à lista e tente novamente.",
            );
            return;
          }
          setName(value.name);
          setYear(String(entry.year));
          setGender(current.gender);
          setCategory(current.category);
          setDivision(current.division ?? "");
          setRenameReason("");
          setRequiresRenameReason(false);
        }
        setSnapshot(value);
        setAdministration(states);
        setConflict(false);
      })
      .catch((failure) => {
        if (signal.aborted) return;
        if (isSessionFailure(failure)) onSessionLost();
        setError(
          failure instanceof ApiFailure
            ? failure.message
            : "Não foi possível carregar o campeonato.",
        );
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    enabled,
    championshipId,
    creatingChampionship,
    editId,
    reload,
    onSessionLost,
  ]); // A retry keeps the frozen command.

  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || loading || conflict || (!uncertain && !ready)) return;
    let command = pending.current;
    if (!uncertain) {
      const validatedDispute = disputeSchema.safeParse({
        id: original?.id ?? crypto.randomUUID(),
        gender,
        category,
        division,
      });
      if (!validatedDispute.success) {
        setError("Confira o naipe, a categoria e a divisão.");
        return;
      }
      const dispute = validatedDispute.data;
      const matching = season?.disputes.filter(
        (item) =>
          item.id !== dispute.id &&
          item.gender === dispute.gender &&
          item.category.toLowerCase() === dispute.category.toLowerCase(),
      );
      const identityChanged =
        !original ||
        original.gender !== dispute.gender ||
        original.category !== dispute.category ||
        original.division !== dispute.division;
      if (
        identityChanged &&
        matching?.some(
          (item) =>
            !dispute.division ||
            item.division?.toLowerCase() === dispute.division.toLowerCase(),
        )
      ) {
        setDivisionError(
          dispute.division
            ? "Já existe uma disputa desse naipe e categoria nesta divisão. Use outra divisão."
            : "Já existe uma disputa desse naipe e categoria nesta temporada. Informe uma divisão diferente.",
        );
        divisionRef.current?.focus();
        return;
      }
      setDivisionError("");
      const numericYear = Number(year);
      const competition = {
        id: resolvedSnapshot?.id ?? crypto.randomUUID(),
        name: editing || creatingChampionship ? name : resolvedSnapshot!.name,
        seasons: structuredClone(resolvedSnapshot?.seasons ?? []),
      };
      const savedSeason = competition.seasons.find(
        (value) => value.id === season?.id,
      );
      if (savedSeason && editing) {
        if (
          competition.seasons.some(
            (value) =>
              value.id !== savedSeason.id && value.year === numericYear,
          )
        ) {
          setError("Já existe uma temporada com esse ano neste campeonato.");
          return;
        }
        savedSeason.year = numericYear;
        savedSeason.disputes = savedSeason.disputes.map((item) =>
          item.id === dispute.id ? dispute : item,
        );
      } else if (savedSeason) {
        savedSeason.disputes.push(dispute);
      } else {
        competition.seasons.push({
          id: crypto.randomUUID(),
          year: numericYear,
          disputes: [dispute],
        });
      }
      const parsed = saveCompetitionAdministrationSchema.safeParse({
        commandId: crypto.randomUUID(),
        expectedVersion: resolvedSnapshot?.version ?? 0,
        competition,
        testDisputeIds: isTest && !editing ? [dispute.id] : [],
        renameReason: renameReason.trim() || null,
      });
      if (!parsed.success) {
        setError("Confira os campos do campeonato, da temporada e da disputa.");
        return;
      }
      command = parsed.data;
      pending.current = command;
    }
    if (!command) return;
    setBusy(true);
    setError("");
    try {
      await api(
        "/api/competition-administration/competition",
        saveResultSchema,
        command,
      );
      onSaved();
    } catch (failure) {
      if (isSessionFailure(failure)) onSessionLost();
      const definite =
        failure instanceof ApiFailure && [400, 409].includes(failure.status);
      setUncertain(!definite);
      if (
        failure instanceof ApiFailure &&
        failure.code === "championship_rename_reason_required"
      ) {
        setRequiresRenameReason(true);
      }
      setConflict(
        failure instanceof ApiFailure &&
          failure.status === 409 &&
          failure.code !== "championship_rename_reason_required",
      );
      setError(
        definite && failure instanceof ApiFailure
          ? failure.message
          : "Não foi possível confirmar o envio. Repita o mesmo envio.",
      );
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (mayClose()) onClose();
  }
  function changeIdentity() {
    setDivisionError("");
  }
  const inputDisabled = busy || uncertain || conflict;
  const closeLabel = editing ? "Descartar alterações" : "Cancelar";

  return (
    <AdminDialog
      open={enabled}
      title={editing ? "Editar dados da disputa" : "Adicionar disputa"}
      busy={busy}
      initialFocus={
        editing || suggestedChampionship === newChampionship
          ? undefined
          : suggestedChampionship
            ? yearRef
            : championshipSearch
      }
      iconClose
      closeOnBackdrop={!dirty && !uncertain && !busy}
      className="dispute-create-dialog"
      onClose={close}
      footer={
        <>
          <button
            className={
              editing
                ? "secondary dispute-discard-action"
                : "secondary dispute-close-action"
            }
            type="button"
            disabled={busy}
            onClick={close}
          >
            {closeLabel}
          </button>
          <button
            className="primary"
            type="submit"
            form={formId}
            disabled={busy || loading || conflict || (!uncertain && !ready)}
          >
            {busy ? "Salvando…" : uncertain ? "Repetir envio" : "Salvar"}
          </button>
        </>
      }
    >
      <form
        id={formId}
        className="dispute-create-form"
        onSubmit={(event) => void save(event)}
      >
        <fieldset disabled={inputDisabled}>
          {!editing && championships.length > 0 && (
            <CreateChampionshipPicker
              championships={championships}
              chosen={selectedChampionship}
              creating={creatingChampionship}
              disabled={inputDisabled}
              input={championshipSearch}
              onChoose={(id) => {
                setChampionshipId(id);
                changeIdentity();
              }}
              onCreate={() => {
                setChampionshipId(newChampionship);
                changeIdentity();
              }}
              onClear={() => {
                setChampionshipId("");
                changeIdentity();
              }}
            />
          )}
          {editing && !renaming && (
            <div className="create-wide dispute-championship-picker">
              <span className="dispute-field-label">Campeonato</span>
              <div className="dispute-readonly">
                {resolvedSnapshot?.name ?? editing.name}
              </div>
              <button
                className="dispute-text-action"
                type="button"
                disabled={!ready}
                onClick={() => setRenaming(true)}
              >
                Renomear campeonato
              </button>
            </div>
          )}
          {(renaming || creatingChampionship) && (
            <div className="create-wide dispute-championship-inline">
              <label>
                Nome do campeonato
                <input
                  ref={nameRef}
                  name="competition-name"
                  autoComplete="off"
                  value={name}
                  disabled={!!editing && !ready}
                  maxLength={120}
                  required
                  aria-describedby={
                    renaming ? formId + "-rename-scope" : undefined
                  }
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              {renaming && (
                <small id={formId + "-rename-scope"}>
                  Este nome é compartilhado com as outras disputas do
                  campeonato.
                </small>
              )}
            </div>
          )}
          {needsRenameReason && (
            <label className="create-wide">
              Motivo da alteração do nome
              <textarea
                name="rename-reason"
                value={renameReason}
                maxLength={2000}
                required
                onChange={(event) => setRenameReason(event.target.value)}
              />
            </label>
          )}
          {(state?.lockReason || yearLocked) && (
            <div className="create-wide dispute-lock-notice">
              <strong>Campos protegidos pelo histórico</strong>
              {state?.lockReason && (
                <p>{disputeLockLabels[state.lockReason]}</p>
              )}
              {yearLocked && (
                <p>O ano está protegido pelo histórico da temporada.</p>
              )}
            </div>
          )}
          <label>
            Ano da temporada
            <input
              ref={yearRef}
              type="number"
              name="year"
              min={1}
              max={9999}
              required
              value={year}
              disabled={!!editing && (!ready || yearLocked)}
              list={editing ? undefined : formId + "-years"}
              onChange={(event) => {
                setYear(event.target.value);
                changeIdentity();
              }}
            />
            {!editing && (
              <datalist id={formId + "-years"}>
                {resolvedSnapshot?.seasons.map((item) => (
                  <option value={item.year} key={item.id} />
                ))}
              </datalist>
            )}
          </label>
          <label>
            Naipe
            <select
              name="gender"
              aria-label="Naipe"
              value={gender}
              disabled={!!editing && (!ready || !!state?.lockReason)}
              onChange={(event) => {
                setGender(event.target.value as typeof gender);
                changeIdentity();
              }}
            >
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </label>
          <CategoryFields
            suffix={editing ? "em edição" : "nova"}
            label={category}
            disabled={!!editing && (!ready || !!state?.lockReason)}
            onChange={(value) => {
              setCategory(value);
              changeIdentity();
            }}
          />
          <label className="create-wide">
            Divisão (opcional)
            <input
              ref={divisionRef}
              name="division"
              autoComplete="off"
              value={division}
              disabled={!!editing && (!ready || !!state?.lockReason)}
              maxLength={80}
              aria-invalid={divisionError ? true : undefined}
              aria-describedby={
                divisionError ? formId + "-division-error" : undefined
              }
              onChange={(event) => {
                setDivision(event.target.value);
                changeIdentity();
              }}
            />
            {divisionError && (
              <span
                id={formId + "-division-error"}
                className="error-text"
                role="alert"
              >
                {divisionError}
              </span>
            )}
          </label>
          {!editing && (
            <label className="create-wide competition-radio">
              <input
                type="checkbox"
                checked={isTest}
                onChange={(event) => setIsTest(event.target.checked)}
              />
              Disputa de teste
            </label>
          )}
        </fieldset>
        {loading && <p role="status">Carregando campeonato…</p>}
        {error && (
          <p ref={alertRef} tabIndex={-1} role="alert" className="error-text">
            {error}
          </p>
        )}
        {conflict && (
          <button
            type="button"
            className="secondary"
            disabled={loading}
            onClick={() => {
              pending.current = null;
              setReload((value) => value + 1);
            }}
          >
            {editing
              ? "Descartar edição e recarregar"
              : "Recarregar campeonato"}
          </button>
        )}
        {!loading &&
          !conflict &&
          !uncertain &&
          championshipId &&
          !creatingChampionship &&
          !ready &&
          error && (
            <button
              type="button"
              className="secondary"
              onClick={() => setReload((value) => value + 1)}
            >
              Tentar novamente
            </button>
          )}
      </form>
      {state && (
        <DisputeControls
          state={state}
          disabled={busy || loading || uncertain || conflict}
          onSaved={(updated) => {
            setAdministration((previous) =>
              previous.map((item) =>
                item.disputeId === updated.disputeId ? updated : item,
              ),
            );
            onAdministrationSaved(updated);
          }}
          onReload={() => {
            setConflict(true);
            setError(
              "A disputa foi alterada em outra sessão. Recarregue os dados.",
            );
          }}
          onSessionLost={onSessionLost}
        />
      )}
    </AdminDialog>
  );
}
