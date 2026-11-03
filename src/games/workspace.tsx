import { useEffect, useId, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { saveResultSchema } from "../competition/contract";
import { TeamsWorkspace } from "../teams/screen";
import { GameSheetWorkspace } from "./sheet-workspace";
import { changeGameTime, gameTimeFields } from "./time-fields";
import {
  actualTimeFields,
  actualTimeError,
  applyActualTimeFields,
  changeActualTimeField,
  type ActualTimeFields,
} from "./actual-time-fields";
import { GameOccurrencePanel } from "../regulation/occurrence-panel";
import { GamePicker } from "./game-picker";
import "./game-editor.css";
import { VenuePicker } from "./venue-picker";
import {
  OfficiatingEditor,
  emptyOfficialNames,
  type OfficialNames,
} from "./officiating-editor";
import {
  emptyOfficiating,
  officialRoles,
  gameEditorSnapshotSchema,
  saveGameEditorSchema,
  type SaveGameEditor,
  type GameEditorSnapshot,
  type Officiating,
} from "./officiating-contract";
import { AdminDialog } from "../competition/admin-dialog";
import { AdminToast } from "../competition/admin-toast";
import { type RegistrationSnapshot } from "../teams/contract";
import {
  gameListingSchema,
  gameSchema,
  durationMinutes,
  type GameSnapshot,
  type SaveGame,
} from "./contract";
type Props = {
  disputeId: string;
  contextLabel?: string;
  gender: "masculino" | "feminino";
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onImportPdfs?: () => void;
};
const document = (s: GameSnapshot) =>
  gameSchema.parse({
    id: s.id,
    disputeId: s.disputeId,
    homeRegistrationId: s.homeRegistrationId,
    awayRegistrationId: s.awayRegistrationId,
    date: s.date,
    time: s.time,
    startAt: s.startAt,
    endAt: s.endAt,
    venue: s.venue,
    number: s.number,
    stageKind: s.stageKind ?? "round_robin",
    round: s.round ?? null,
    knockoutStage: s.knockoutStage ?? null,
  });
export function GamesWorkspace(props: Props) {
  const stageId = useId(),
    workspace = useRef<HTMLElement>(null);
  const [list, setList] = useState<{ items: GameSnapshot[]; hasMore: boolean }>(
      { items: [], hasMore: false },
    ),
    [query, setQuery] = useState(""),
    [offset, setOffset] = useState(0),
    [epoch, setEpoch] = useState(0),
    [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<{
      game: SaveGame["game"];
      version: number;
      officiating: Officiating;
      officialNames: OfficialNames;
      actualTimes: ActualTimeFields;
      roundText: string;
    } | null>(null),
    [baseline, setBaseline] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [chosen, setChosen] = useState<RegistrationSnapshot[]>([]),
    [auxiliary, setAuxiliary] = useState(false),
    [officialsOpen, setOfficialsOpen] = useState(false),
    [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const saveAction = useRef<"save" | "next">("save");
  const pending = useRef<SaveGameEditor | null>(null),
    knownAck = useRef<{ id: string; version: number } | null>(null),
    sheetGuard = useRef<() => boolean>(() => true),
    auxGuard = useRef<() => boolean>(() => true),
    occurrenceGuard = useRef<() => boolean>(() => true),
    auxiliaryTrigger = useRef<HTMLButtonElement>(null),
    returningFromAuxiliary = useRef(false),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null);
  const [savedGame, setSavedGame] = useState<GameSnapshot | null>(null),
    [decisionLocked, setDecisionLocked] = useState(false),
    [sheetVisible, setSheetVisible] = useState(false);
  const dirty =
    !!editor &&
    JSON.stringify({
      game: editor.game,
      officiating: editor.officiating,
      officialNames: editor.officialNames,
      actualTimes: editor.actualTimes,
      roundText: editor.roundText,
    }) !== baseline;
  function mayLeave() {
    return (
      !busy &&
      sheetGuard.current() &&
      auxGuard.current() &&
      occurrenceGuard.current() &&
      (!(dirty || uncertain) ||
        window.confirm(
          "Há alterações não salvas ou um envio não confirmado. Deseja sair deste jogo?",
        ))
    );
  }
  useEffect(() => {
    props.guard.current = mayLeave;
    return () => {
      props.guard.current = () => true;
    };
  });
  useEffect(() => {
    if (!dirty && !uncertain) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain]);
  useEffect(() => {
    if (!props.enabled) return;
    if (!auxiliary && returningFromAuxiliary.current) {
      returningFromAuxiliary.current = false;
      auxiliaryTrigger.current?.focus();
    } else if (editor && !auxiliary && !sheetVisible) {
      workspace.current
        ?.querySelector<HTMLInputElement>(
          '.game-editor-dialog input[aria-label="Inscrição mandante"]',
        )
        ?.focus();
    } else heading.current?.focus();
  }, [props.enabled, editor?.game.id, auxiliary]);
  useEffect(() => {
    if (error && props.enabled) alert.current?.focus();
  }, [error, props.enabled]);
  useEffect(() => {
    if (props.enabled && Object.keys(fieldErrors).length)
      workspace.current
        ?.querySelector<HTMLInputElement>(
          '.game-editor-dialog input[aria-invalid="true"]',
        )
        ?.focus();
  }, [fieldErrors, props.enabled]);
  function report(failure: unknown) {
    if (isSessionFailure(failure)) props.onSessionLost();
    else
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível concluir. Tente novamente.",
      );
  }
  useEffect(() => {
    if (!props.enabled) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/api/games?disputeId=${props.disputeId}&q=${encodeURIComponent(query)}&offset=${offset}`,
        gameListingSchema,
        undefined,
        controller.signal,
      )
        .then((r) => {
          if (active) setList(r);
        })
        .catch((e) => {
          if (active) report(e);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [props.enabled, props.disputeId, query, offset, epoch]);
  function accept(snapshot: GameEditorSnapshot) {
    const s = snapshot.game;
    if (s.disputeId !== props.disputeId)
      throw Error("Este jogo pertence a outra disputa.");
    const g = document(s);
    setSavedGame(s);
    const names = emptyOfficialNames(),
      officiating = emptyOfficiating() as Officiating;
    for (const role of officialRoles) {
      const official = snapshot.officiating[role];
      if (official) {
        names[role] = official.name;
        officiating[role] = { kind: "existing", id: official.id };
      }
    }
    setEditor({
      game: g,
      version: s.version,
      officiating,
      officialNames: names,
      actualTimes: actualTimeFields(g),
      roundText: g.round == null ? "" : String(g.round),
    });
    setChosen([s.home, s.away]);
    setFieldErrors({});
    setBaseline(
      JSON.stringify({
        game: g,
        officiating,
        officialNames: names,
        actualTimes: actualTimeFields(g),
        roundText: g.round == null ? "" : String(g.round),
      }),
    );
    pending.current = null;
    knownAck.current = null;
    setUncertain(false);
    setConflict(false);
  }
  async function load(id: string) {
    if (!mayLeave()) return;
    setBusy(true);
    setError("");
    try {
      accept(await api(`/api/games/${id}/editor`, gameEditorSnapshotSchema));
      setStatus("Jogo salvo");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(action: "save" | "next" = "save") {
    if (!editor || busy || conflict) return;
    if (
      !pending.current &&
      savedGame?.state === "finished" &&
      actualTimeError(editor.actualTimes)
    ) {
      setError(actualTimeError(editor.actualTimes));
      return;
    }
    if (
      !pending.current &&
      officialRoles.some(
        (role) =>
          editor.officialNames[role].trim() && !editor.officiating[role],
      )
    ) {
      setOfficialsOpen(true);
      setError(
        "Selecione um oficial da lista ou escolha Usar novo oficial para cada nome digitado.",
      );
      return;
    }
    if (!pending.current) {
      saveAction.current = action;
      const fields: Record<string, string> = {};
      if (!editor.game.homeRegistrationId)
        fields.home = "Selecione uma equipe mandante da lista.";
      if (!editor.game.awayRegistrationId)
        fields.away = "Selecione uma equipe visitante da lista.";
      if (
        editor.game.homeRegistrationId &&
        editor.game.homeRegistrationId === editor.game.awayRegistrationId
      )
        fields.away = "Escolha uma equipe diferente do mandante.";
      if (
        editor.game.round != null &&
        (!Number.isInteger(editor.game.round) ||
          editor.game.round < 1 ||
          editor.game.round > 2147483647)
      )
        fields.round = "Informe um número inteiro maior que zero.";
      setFieldErrors(fields);
      if (Object.keys(fields).length) {
        setError("Revise os campos indicados antes de salvar.");
        return;
      }
    }
    const parsed = saveGameEditorSchema.safeParse(
      pending.current ?? {
        commandId: crypto.randomUUID(),
        expectedVersion: editor.version,
        game: editor.game,
        officiating: editor.officiating,
      },
    );
    if (!parsed.success) {
      setError(
        "Escolha duas inscrições distintas da disputa. Confira a data antes do horário e os demais campos.",
      );
      return;
    }
    pending.current = parsed.data;
    setBusy(true);
    setError("");
    try {
      const result =
        knownAck.current ??
        (await api(
          `/api/games/${editor.game.id}/editor`,
          saveResultSchema,
          pending.current,
        ));
      knownAck.current = result;
      const snapshot = await api(
        `/api/games/${result.id}/editor`,
        gameEditorSnapshotSchema,
      );
      const intent = saveAction.current;
      accept(snapshot);
      if (intent === "next") beginNew(snapshot.game);
      setStatus(
        intent === "next"
          ? "Jogo salvo. Preencha o próximo confronto."
          : "Jogo salvo",
      );
      setEpoch((v) => v + 1);
      props.onSaved();
    } catch (e) {
      if (
        !knownAck.current &&
        e instanceof ApiFailure &&
        [400, 409].includes(e.status)
      ) {
        pending.current = null;
        setUncertain(false);
        setConflict(
          e.status === 409 &&
            e.code !== "official_homonym_confirmation_required",
        );
      } else setUncertain(true);
      report(e);
    } finally {
      setBusy(false);
    }
  }
  function change<K extends keyof SaveGame["game"]>(
    key: K,
    value: SaveGame["game"][K],
  ) {
    if (busy || uncertain || conflict) return;
    setEditor((s) => (s ? { ...s, game: { ...s.game, [key]: value } } : s));
    setFieldErrors({});
    setError("");
    setStatus("");
  }
  function changeTime(field: "date" | "start" | "end", value: string) {
    if (busy || uncertain || conflict) return;
    setEditor((s) =>
      s ? { ...s, game: changeGameTime(s.game, field, value) } : s,
    );
    setStatus("");
  }
  function changeActualTime<K extends keyof ActualTimeFields>(
    field: K,
    value: ActualTimeFields[K],
  ) {
    if (busy || uncertain || conflict) return;
    setEditor((s) => {
      if (!s) return s;
      const actualTimes = changeActualTimeField(s.actualTimes, field, value);
      return {
        ...s,
        actualTimes,
        game: applyActualTimeFields(s.game, actualTimes),
      };
    });
    setError("");
    setStatus("");
  }
  const timeError =
    editor && savedGame?.state === "finished"
      ? actualTimeError(editor.actualTimes)
      : "";
  const showDialog = !!editor && !auxiliary && !sheetVisible;
  const feedback = (
    <>
      {error && (
        <p role="alert" ref={alert} tabIndex={-1} className="access-error">
          {error}
        </p>
      )}
      <p role="status">
        {busy
          ? "Aguarde…"
          : uncertain
            ? "Envio não confirmado"
            : conflict
              ? "Conflito de versão"
              : dirty
                ? "Jogo não salvo"
                : status}
      </p>
    </>
  );
  function closeEditor() {
    if (mayLeave()) {
      setSheetVisible(false);
      setEditor(null);
      setStatus("");
      pending.current = null;
      knownAck.current = null;
      setUncertain(false);
      setConflict(false);
      setError("");
    }
  }
  function beginNew(previous?: GameSnapshot) {
    const fresh = {
      game: {
        id: crypto.randomUUID(),
        disputeId: props.disputeId,
        homeRegistrationId: "",
        awayRegistrationId: "",
        date: previous?.date ?? null,
        time: null,
        startAt: null,
        endAt: null,
        venue: previous?.venue ?? null,
        number: null,
        stageKind: "round_robin" as const,
        round: previous?.round ?? null,
        knockoutStage: null,
      },
      version: 0,
      officiating: emptyOfficiating(),
      officialNames: emptyOfficialNames(),
      actualTimes: { date: "", start: "", end: "", endNextDay: false },
      roundText: previous?.round == null ? "" : String(previous.round),
    };
    setEditor(fresh);
    setBaseline(
      JSON.stringify({
        game: fresh.game,
        officiating: fresh.officiating,
        officialNames: fresh.officialNames,
        actualTimes: fresh.actualTimes,
        roundText: fresh.roundText,
      }),
    );
    setSavedGame(null);
    setChosen([]);
    setError("");
    setStatus("");
    setUncertain(false);
    setConflict(false);
    setFieldErrors({});
    setOfficialsOpen(false);
    pending.current = null;
    knownAck.current = null;
    saveAction.current = "save";
  }
  return (
    <section className="games-workspace" ref={workspace}>
      <AdminToast
        message={
          props.enabled &&
          !sheetVisible &&
          !auxiliary &&
          !busy &&
          !uncertain &&
          !conflict &&
          !dirty
            ? status
            : ""
        }
      />
      <div className="competition-title">
        <h3 ref={heading} tabIndex={-1}>
          Jogos
        </h3>
        {!editor && !auxiliary && !sheetVisible && (
          <label className="competition-search">
            Buscar jogo
            <input
              maxLength={120}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOffset(0);
              }}
            />
          </label>
        )}

        {props.onImportPdfs && (
          <button
            disabled={busy || auxiliary || sheetVisible}
            onClick={() => {
              if (mayLeave()) props.onImportPdfs?.();
            }}
          >
            Importar PDFs
          </button>
        )}
        <button
          disabled={busy || auxiliary || sheetVisible || decisionLocked}
          onClick={() => {
            if (!mayLeave()) return;
            beginNew();
          }}
        >
          Novo jogo
        </button>
      </div>
      {!showDialog && feedback}
      {auxiliary ? (
        <>
          <button
            className="secondary"
            onClick={() => {
              if (auxGuard.current()) {
                returningFromAuxiliary.current = true;
                setAuxiliary(false);
                setEpoch((v) => v + 1);
              }
            }}
          >
            Voltar ao jogo
          </button>
          <TeamsWorkspace
            disputeId={props.disputeId}
            gender={props.gender}
            enabled={props.enabled}
            guard={auxGuard}
            onSessionLost={props.onSessionLost}
            onSaved={() => {
              setEpoch((v) => v + 1);
              props.onSaved();
            }}
          />
        </>
      ) : sheetVisible && savedGame ? (
        <GameSheetWorkspace
          key={savedGame.id}
          game={savedGame}
          gender={props.gender}
          enabled={props.enabled}
          guard={sheetGuard}
          onSessionLost={props.onSessionLost}
          onSaved={props.onSaved}
          onBack={() => setSheetVisible(false)}
          onBackToGames={closeEditor}
        />
      ) : editor ? (
        <AdminDialog
          title={editor.version ? "Editar jogo" : "Novo jogo"}
          open={props.enabled}
          busy={busy}
          onClose={closeEditor}
          closeLabel="Voltar à lista de jogos"
          className="game-editor-dialog"
          closeOnBackdrop
          footer={
            <>
              <span className="game-save-note" role="status">
                {busy
                  ? "Salvando…"
                  : uncertain
                    ? "Envio não confirmado"
                    : dirty
                      ? "Alterações não salvas"
                      : status || "Preencha o confronto para salvar"}
              </span>
              <div className="game-footer-actions">
                {savedGame && (
                  <button
                    className="secondary"
                    disabled={busy || uncertain || conflict || dirty}
                    onClick={() => {
                      if (occurrenceGuard.current()) setSheetVisible(true);
                    }}
                  >
                    Preparar súmula
                  </button>
                )}
                <button
                  className="secondary game-cancel"
                  disabled={busy}
                  onClick={closeEditor}
                >
                  Cancelar
                </button>
                <button
                  className="secondary"
                  disabled={busy || conflict || decisionLocked}
                  onClick={() => void save()}
                >
                  {uncertain
                    ? knownAck.current
                      ? "Recuperar jogo salvo"
                      : "Repetir o mesmo envio"
                    : "Salvar jogo"}
                </button>
                {!editor.version && !uncertain && (
                  <button
                    disabled={busy || conflict || decisionLocked}
                    onClick={() => void save("next")}
                  >
                    Salvar e adicionar outro
                  </button>
                )}
                {conflict && (
                  <button
                    disabled={busy}
                    onClick={() => void load(editor.game.id)}
                  >
                    Recarregar jogo
                  </button>
                )}
              </div>
            </>
          }
        >
          {error && (
            <p role="alert" ref={alert} tabIndex={-1} className="access-error">
              {error}
            </p>
          )}
          <div className="teams-inline">
            <p className="game-context">
              {props.contextLabel ??
                "Disputa · " +
                  (props.gender === "feminino" ? "Feminino" : "Masculino")}
            </p>
            <fieldset
              className="game-confrontation"
              disabled={
                busy ||
                uncertain ||
                conflict ||
                decisionLocked ||
                savedGame?.state === "finished"
              }
            >
              <legend>Confronto</legend>
              <div className="game-opponents">
                {(["homeRegistrationId", "awayRegistrationId"] as const).map(
                  (key, i) => (
                    <GamePicker
                      key={key}
                      kind="registration"
                      label={i ? "Visitante" : "Mandante"}
                      accessibleLabel={
                        i ? "Inscrição visitante" : "Inscrição mandante"
                      }
                      value={
                        chosen.find((r) => r.id === editor.game[key])?.name ??
                        ""
                      }
                      excludedId={
                        editor.game[
                          i ? "homeRegistrationId" : "awayRegistrationId"
                        ]
                      }
                      disputeId={props.disputeId}
                      disabled={
                        busy ||
                        uncertain ||
                        conflict ||
                        decisionLocked ||
                        savedGame?.state === "finished"
                      }
                      invalid={fieldErrors[i ? "away" : "home"]}
                      onSessionLost={props.onSessionLost}
                      onChange={(value, r) => {
                        if (r)
                          setChosen((rows) => [
                            ...rows.filter((x) => x.id !== r.id),
                            r,
                          ]);
                        change(key, value);
                      }}
                    />
                  ),
                )}
              </div>
              <div className="game-registration-tools">
                <p>Não encontrou uma equipe na disputa?</p>
                <button
                  ref={auxiliaryTrigger}
                  type="button"
                  className="game-add-registration"
                  onClick={() => {
                    if (occurrenceGuard.current()) setAuxiliary(true);
                  }}
                >
                  Criar ou editar inscrição aqui
                </button>
              </div>
            </fieldset>
            <fieldset
              className="game-agenda"
              disabled={
                busy ||
                uncertain ||
                conflict ||
                decisionLocked ||
                savedGame?.state === "finished"
              }
            >
              <legend>
                Agenda <span>Preenchimento opcional</span>
              </legend>
              <div className="game-agenda-grid">
                {savedGame?.state !== "finished" && (
                  <>
                    <label>
                      Data do jogo
                      <input
                        type="date"
                        name="gameDate"
                        autoComplete="off"
                        value={gameTimeFields(editor.game).date}
                        onChange={(e) => changeTime("date", e.target.value)}
                      />
                    </label>
                    <label>
                      Hora de início
                      <input
                        type="time"
                        name="gameStart"
                        autoComplete="off"
                        value={gameTimeFields(editor.game).start}
                        disabled={!gameTimeFields(editor.game).date}
                        onChange={(e) => changeTime("start", e.target.value)}
                      />
                    </label>
                    <label>
                      Hora de fim
                      <input
                        type="time"
                        name="gameEnd"
                        autoComplete="off"
                        value={gameTimeFields(editor.game).end}
                        disabled={
                          !gameTimeFields(editor.game).date ||
                          !gameTimeFields(editor.game).start
                        }
                        onChange={(e) => changeTime("end", e.target.value)}
                      />
                    </label>
                  </>
                )}
                <VenuePicker
                  value={editor.game.venue ?? ""}
                  onChange={(value) => change("venue", value || null)}
                  disabled={
                    busy ||
                    uncertain ||
                    conflict ||
                    decisionLocked ||
                    savedGame?.state === "finished" ||
                    !props.enabled
                  }
                  onSessionLost={props.onSessionLost}
                />
                <label>
                  Número do jogo
                  <input
                    name="gameNumber"
                    autoComplete="off"
                    maxLength={40}
                    placeholder="Ex.: 024…"
                    value={editor.game.number ?? ""}
                    onChange={(e) => change("number", e.target.value || null)}
                  />
                </label>
              </div>
              <p className="game-agenda-hint" role="status">
                Horários de Brasília.
                {savedGame?.state !== "finished" &&
                  editor.game.endAt &&
                  " Duração total (inclui intervalos): " +
                    `${Math.floor(durationMinutes(editor.game.startAt, editor.game.endAt)! / 60)}h${String(durationMinutes(editor.game.startAt, editor.game.endAt)! % 60).padStart(2, "0")}min.`}
                {editor.game.startAt &&
                  editor.game.endAt &&
                  editor.game.startAt.slice(0, 10) !==
                    editor.game.endAt.slice(0, 10) &&
                  " Término no dia seguinte."}
              </p>
            </fieldset>
            <fieldset
              className="game-classification"
              disabled={busy || uncertain || conflict || decisionLocked}
            >
              <legend className="admin-visually-hidden">
                Rodada e eliminatória
              </legend>
              <GamePicker
                kind="round"
                label="Rodada (opcional)"
                value={editor.roundText}
                disputeId={props.disputeId}
                disabled={busy || uncertain || conflict || decisionLocked}
                invalid={fieldErrors.round}
                onSessionLost={props.onSessionLost}
                onChange={(value) => {
                  if (busy || uncertain || conflict) return;
                  setEditor((s) =>
                    s
                      ? {
                          ...s,
                          roundText: value,
                          game: {
                            ...s.game,
                            round: value ? Number(value) : null,
                          },
                        }
                      : s,
                  );
                  setFieldErrors({});
                  setError("");
                  setStatus("");
                }}
              />
              <div className="game-knockout-fields">
                <div className="game-knockout">
                  <label className="game-knockout-check">
                    <input
                      type="checkbox"
                      name="knockout"
                      checked={editor.game.stageKind === "knockout"}
                      aria-controls={stageId}
                      onChange={(e) => {
                        const knockout = e.target.checked;
                        if (busy || uncertain || conflict) return;
                        setEditor((s) =>
                          s
                            ? {
                                ...s,
                                game: {
                                  ...s.game,
                                  stageKind: knockout
                                    ? "knockout"
                                    : "round_robin",
                                  knockoutStage: knockout
                                    ? s.game.knockoutStage
                                    : null,
                                },
                              }
                            : s,
                        );
                        setStatus("");
                      }}
                    />
                    Jogo de eliminatória
                  </label>
                </div>
                <div id={stageId} hidden={editor.game.stageKind !== "knockout"}>
                  <GamePicker
                    kind="stage"
                    label="Etapa (opcional)"
                    value={editor.game.knockoutStage ?? ""}
                    disputeId={props.disputeId}
                    disabled={busy || uncertain || conflict || decisionLocked}
                    onSessionLost={props.onSessionLost}
                    onChange={(value) => change("knockoutStage", value || null)}
                  />
                </div>
                <p className="game-knockout-hint">
                  Marque apenas para jogos eliminatórios.
                </p>
              </div>
            </fieldset>
            {savedGame?.state === "finished" && (
              <>
                <p>
                  Jogo encerrado: atualize os horários reais e a arbitragem. A
                  agenda permanece fixa; corrigir a súmula exige motivo e
                  republicação explícita para atualizar o resultado público.
                </p>
                <fieldset
                  className="competition-form"
                  disabled={busy || uncertain || conflict || decisionLocked}
                >
                  <legend>Horários reais (America/Sao_Paulo)</legend>
                  <div className="game-actual-times">
                    <label>
                      Data dos horários reais
                      <input
                        type="date"
                        name="actualDate"
                        autoComplete="off"
                        value={editor.actualTimes.date}
                        aria-describedby="actual-time-help actual-time-error"
                        aria-invalid={!!timeError && !editor.actualTimes.date}
                        onChange={(e) =>
                          changeActualTime("date", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Hora de início
                      <input
                        type="time"
                        value={editor.actualTimes.start}
                        name="actualStartTime"
                        autoComplete="off"
                        aria-describedby="actual-time-help actual-time-error"
                        aria-invalid={!!timeError && !editor.actualTimes.start}
                        onChange={(e) =>
                          changeActualTime("start", e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Hora de fim
                      <input
                        type="time"
                        value={editor.actualTimes.end}
                        name="actualEndTime"
                        autoComplete="off"
                        aria-describedby="actual-time-help actual-time-error"
                        aria-invalid={!!timeError}
                        onChange={(e) =>
                          changeActualTime("end", e.target.value)
                        }
                      />
                    </label>
                    <label className="reg-check game-end-next-day">
                      <input
                        type="checkbox"
                        name="actualEndNextDay"
                        checked={editor.actualTimes.endNextDay}
                        aria-describedby="actual-time-help actual-time-error"
                        onChange={(e) =>
                          changeActualTime("endNextDay", e.target.checked)
                        }
                      />
                      Termina no dia seguinte
                    </label>
                    <p role="status">
                      Duração total (inclui intervalos):{" "}
                      {durationMinutes(
                        editor.game.startAt,
                        editor.game.endAt,
                      ) === null || !!timeError
                        ? "Informe início e fim válidos para calcular."
                        : `${durationMinutes(editor.game.startAt, editor.game.endAt)} min`}
                    </p>
                  </div>
                  <p
                    id="actual-time-help"
                    className="game-actual-time-feedback"
                  >
                    Início e fim usam a mesma data. Um fim anterior ao início
                    seleciona o dia seguinte; confira essa opção ao cruzar a
                    meia-noite. A agenda permanece fixa e horários ausentes no
                    legado ficam em branco.
                  </p>
                  <p
                    id="actual-time-error"
                    className={`game-actual-time-feedback${timeError ? " access-error" : ""}`}
                    aria-live="polite"
                  >
                    {timeError}
                  </p>
                </fieldset>
              </>
            )}
            <details
              className="game-officiating"
              open={officialsOpen}
              onToggle={(e) => setOfficialsOpen(e.currentTarget.open)}
            >
              <summary>
                Arbitragem e mesa{" "}
                <span>
                  {
                    officialRoles.filter((r) => editor.officialNames[r].trim())
                      .length
                  }{" "}
                  de 6 oficiais informados · opcional
                </span>
              </summary>
              <OfficiatingEditor
                slots={editor.officiating}
                names={editor.officialNames}
                disabled={
                  busy ||
                  uncertain ||
                  conflict ||
                  decisionLocked ||
                  !props.enabled
                }
                onSessionLost={props.onSessionLost}
                onChange={(officiating, officialNames) => {
                  setEditor((s) =>
                    s ? { ...s, officiating, officialNames } : s,
                  );
                  setStatus("");
                }}
              />
            </details>
            <p className="game-publication-note">
              Salvar o jogo não publica o resultado.
            </p>
            {savedGame && (
              <GameOccurrencePanel
                key={savedGame.id}
                game={savedGame}
                enabled={
                  props.enabled && !busy && !dirty && !uncertain && !conflict
                }
                guard={occurrenceGuard}
                onLockedChange={setDecisionLocked}
                onSessionLost={props.onSessionLost}
                onSaved={props.onSaved}
              />
            )}
          </div>
        </AdminDialog>
      ) : (
        <>
          {loading && <p role="status">Carregando jogos…</p>}
          <div
            className="admin-table-scroll"
            role="region"
            aria-label="Tabela de jogos"
            tabIndex={0}
          >
            <table className="admin-data-table">
              <caption className="admin-visually-hidden">
                Jogos da disputa
              </caption>
              <thead>
                <tr>
                  <th scope="col">Confronto</th>
                  <th scope="col">Data</th>
                  <th scope="col">Horário</th>
                  <th scope="col">Local</th>
                  <th scope="col">Nº</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <button
                        className="competition-name"
                        aria-label={`Abrir jogo ${g.home.name} × ${g.away.name}`}
                        onClick={() => void load(g.id)}
                      >
                        {g.home.name} × {g.away.name}
                      </button>
                    </td>
                    <td className="nowrap">
                      {g.date
                        ? g.date.split("-").reverse().join("/")
                        : "Data a definir"}
                    </td>
                    <td className="nowrap">{g.time ?? "A definir"}</td>
                    <td>{g.venue ?? "A definir"}</td>
                    <td>{g.number ?? "—"}</td>
                    <td className="nowrap">
                      {g.state === "finished"
                        ? "Resultado publicado"
                        : "Sem resultado"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !list.items.length && (
            <p>Nenhum jogo encontrado nesta disputa.</p>
          )}
          <div className="competition-actions">
            <button
              className="secondary"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - 20))}
            >
              Jogos anteriores
            </button>
            <button
              className="secondary"
              disabled={!list.hasMore}
              onClick={() => setOffset(offset + 20)}
            >
              Mais jogos
            </button>
          </div>
        </>
      )}
    </section>
  );
}
