import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { AdminDialog } from "./admin-dialog";
import { CategoryFields } from "./category-fields";
import { ChampionshipPicker } from "./championship-picker";
import { api, ApiFailure, isSessionFailure } from "./api";
import {
  snapshotSchema,
  saveResultSchema,
  type CompetitionSnapshot,
} from "./contract";
import {
  saveCompetitionAdministrationSchema,
  type SaveCompetitionAdministration,
} from "./administration-contract";
import type { DisputeListRow } from "./catalog-contract";

export type CreateTarget = {
  kind: "championship" | "season" | "dispute";
  row?: DisputeListRow;
};
export function CreateCompetitionDialog({
  enabled,
  target,
  onClose,
  onSaved,
  onSessionLost,
  guard,
}: {
  enabled: boolean;
  target: CreateTarget;
  onClose: () => void;
  onSaved: () => void;
  onSessionLost: () => void;
  guard: { current: () => boolean };
}) {
  const titles = {
    championship: "Novo campeonato",
    season: "Nova temporada",
    dispute: "Nova disputa",
  };
  const currentYear = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  const [championship, setChampionship] = useState<{
    id: string;
    name: string;
  } | null>(
    target.row ? { id: target.row.competitionId, name: target.row.name } : null,
  );
  const [snapshot, setSnapshot] = useState<CompetitionSnapshot | null>(null);
  const [name, setName] = useState("");
  const [yearOverride, setYearOverride] = useState<number>();
  const year =
    yearOverride ??
    (target.kind === "season" && snapshot
      ? Math.max(currentYear, ...snapshot.seasons.map((s) => s.year + 1))
      : currentYear);
  const [seasonId, setSeasonId] = useState(target.row?.seasonId ?? "");
  const [gender, setGender] = useState<"masculino" | "feminino">("masculino");
  const [category, setCategory] = useState("Adulto");
  const [division, setDivision] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const pending = useRef<SaveCompetitionAdministration | null>(null);
  const ids = useRef({
    competition: crypto.randomUUID(),
    season: crypto.randomUUID(),
    dispute: crypto.randomUUID(),
  });
  const initialFocus = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const formId = useId();
  const dirty =
    name !== "" ||
    category !== "Adulto" ||
    division !== "" ||
    isTest ||
    gender !== "masculino" ||
    yearOverride !== undefined ||
    championship?.id !== target.row?.competitionId ||
    seasonId !== (target.row?.seasonId ?? "");
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
    if (!enabled) return;
    if (!championship || target.kind === "championship") {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSnapshot(null);
    void api(
      "/api/competitions/" + championship.id,
      snapshotSchema,
      undefined,
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted) {
          setSnapshot(value);
          setConflict(false);
          setSeasonId((previous) =>
            value.seasons.some((s) => s.id === previous)
              ? previous
              : value.seasons[0].id,
          );
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          if (isSessionFailure(failure)) onSessionLost();
          setError(
            failure instanceof ApiFailure
              ? failure.message
              : "Não foi possível abrir o campeonato.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, championship, target.kind, reload, onSessionLost]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || loading || conflict) return;
    let command = pending.current;
    if (!uncertain) {
      const dispute = {
        id: ids.current.dispute,
        gender,
        category,
        division: division.trim() || null,
      };
      const competition =
        target.kind === "championship"
          ? {
              id: ids.current.competition,
              name,
              seasons: [{ id: ids.current.season, year, disputes: [dispute] }],
            }
          : snapshot &&
            structuredClone({
              id: snapshot.id,
              name: snapshot.name,
              seasons: snapshot.seasons,
            });
      if (!competition) {
        setError("Selecione um campeonato.");
        return;
      }
      if (target.kind === "season")
        competition.seasons.push({
          id: ids.current.season,
          year,
          disputes: [dispute],
        });
      if (target.kind === "dispute") {
        const season = competition.seasons.find((s) => s.id === seasonId);
        if (!season) {
          setError("Selecione uma temporada.");
          return;
        }
        season.disputes.push(dispute);
      }
      const parsed = saveCompetitionAdministrationSchema.safeParse({
        commandId: crypto.randomUUID(),
        expectedVersion: target.kind === "championship" ? 0 : snapshot?.version,
        competition,
        testDisputeIds: isTest ? [dispute.id] : [],
        renameReason: null,
      });
      if (!parsed.success) {
        setError(
          "Confira os campos. A temporada e a disputa não podem se repetir.",
        );
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
      setConflict(failure instanceof ApiFailure && failure.status === 409);
      setError(
        definite && failure instanceof ApiFailure
          ? failure.message
          : "Não foi possível confirmar o envio. Repita o mesmo envio.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDialog
      open={enabled}
      title={titles[target.kind]}
      busy={busy}
      initialFocus={initialFocus}
      closeOnBackdrop={!dirty && !uncertain && !busy}
      className="dispute-create-dialog"
      onClose={() => {
        if (mayClose()) onClose();
      }}
      footer={
        <>
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              if (mayClose()) onClose();
            }}
          >
            Cancelar
          </button>
          <button
            className="primary"
            type="submit"
            form={formId}
            disabled={
              busy ||
              loading ||
              conflict ||
              (!uncertain && target.kind !== "championship" && !snapshot)
            }
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
        <fieldset disabled={busy || uncertain || conflict}>
          {target.kind === "championship" ? (
            <label className="create-wide">
              Nome do campeonato
              <input
                ref={initialFocus}
                name="competition-name"
                autoComplete="off"
                value={name}
                maxLength={120}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          ) : (
            <div className="create-wide">
              <ChampionshipPicker
                inputRef={initialFocus}
                value={championship}
                onChange={setChampionship}
                onSessionLost={onSessionLost}
              />
            </div>
          )}
          {target.kind === "dispute" ? (
            <label>
              Temporada
              <select
                name="season"
                aria-label="Temporada"
                required
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
              >
                {!snapshot && <option value="">Selecione o campeonato</option>}
                {snapshot?.seasons.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.year}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Temporada
              <input
                ref={target.row ? initialFocus : undefined}
                type="number"
                name="year"
                min={1}
                max={9999}
                required
                value={year || ""}
                onChange={(e) => setYearOverride(Number(e.target.value))}
              />
            </label>
          )}
          <label>
            Naipe
            <select
              name="gender"
              aria-label="Naipe"
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
            >
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
            </select>
          </label>
          <CategoryFields
            suffix="nova"
            label={category}
            onChange={setCategory}
          />
          <label>
            Divisão (opcional)
            <input
              name="division"
              autoComplete="off"
              value={division}
              maxLength={80}
              onChange={(e) => setDivision(e.target.value)}
            />
          </label>
          <label className="create-wide competition-radio">
            <input
              type="checkbox"
              checked={isTest}
              onChange={(e) => setIsTest(e.target.checked)}
            />
            Disputa de teste
          </label>
        </fieldset>
        {loading && <p role="status">Carregando temporadas…</p>}
        {error && (
          <p ref={alertRef} tabIndex={-1} role="alert" className="error-text">
            {error}
          </p>
        )}
        {conflict && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              pending.current = null;
              setReload((n) => n + 1);
              setConflict(false);
            }}
          >
            Recarregar campeonato
          </button>
        )}
        {!loading && championship && !snapshot && error && (
          <button
            type="button"
            className="secondary"
            onClick={() => setReload((n) => n + 1)}
          >
            Tentar novamente
          </button>
        )}
      </form>
    </AdminDialog>
  );
}
