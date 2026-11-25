import "../ui-system/query-controls.css";
import { SearchInput } from "../ui-system/query-controls";
import { GameFormatAssignment } from "./format-assignment";
import { GameVisibilityPanel } from "./visibility-panel";
import { flexibleCompetitionEnabled } from "../competition/features";
import type { GameListFilters, GameOrder } from "./contract";
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
import { Icon } from "../ui-system/components";
import { AdminToast } from "../ui-system/admin-toast";
import {
  registrationListingSchema,
  type RegistrationSnapshot,
} from "../teams/contract";
import {
  gameListingSchema,
  gameSchema,
  durationMinutes,
  type GameSnapshot,
  type GameListItem,
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
const initialOrder: GameOrder = { column: "date", direction: "asc" };

export function GamesWorkspace(props: Props) {
  const flexible = flexibleCompetitionEnabled(),
    formatAction = useRef<() => Promise<string>>(async () => "");
  const [formatDirty, setFormatDirty] = useState(false);
  const listPosition = useRef({ y: 0, top: 0, left: 0, id: "" }),
    listScroll = useRef<HTMLDivElement>(null),
    nextBatch = useRef<HTMLDivElement>(null),
    listVersion = useRef({ scope: "", epoch: -1 }),
    sheetChanged = useRef(false),
    stageId = useId(),
    workspace = useRef<HTMLElement>(null);
  const [list, setList] = useState<{
      items: GameListItem[];
      hasMore: boolean;
      order: GameOrder;
    }>({ items: [], hasMore: false, order: initialOrder }),
    [searchInput, setSearchInput] = useState(""),
    [query, setQuery] = useState(""),
    [filters, setFilters] = useState<GameListFilters>({
      teamId: null,
      state: null,
      date: null,
    }),
    [teams, setTeams] = useState<RegistrationSnapshot[]>([]),
    [teamLoadError, setTeamLoadError] = useState(false),
    [teamAttempt, setTeamAttempt] = useState(0),
    [offset, setOffset] = useState(0),
    [order, setOrder] = useState<GameOrder>(initialOrder),
    [epoch, setEpoch] = useState(0),
    [loading, setLoading] = useState(false),
    [listError, setListError] = useState("");
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
    [saveWarning, setSaveWarning] = useState(false),
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
      (!(dirty || uncertain || formatDirty) ||
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
    } else heading.current?.parentElement?.focus();
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
    if (searchInput === query) return;
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setOffset(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput, query]);
  useEffect(() => {
    if (!props.enabled) return;
    const controller = new AbortController();
    const signal = controller.signal;
    setTeamLoadError(false);
    async function loadTeams() {
      const options: RegistrationSnapshot[] = [];
      for (let teamOffset = 0; ; teamOffset += 20) {
        const params = new URLSearchParams({
          disputeId: props.disputeId,
          offset: String(teamOffset),
        });
        const result = await api(
          `/api/registrations?${params}`,
          registrationListingSchema,
          undefined,
          signal,
        );
        if (signal.aborted) return;
        options.push(...result.items);
        if (!result.hasMore) break;
      }
      setTeams(options);
    }
    void loadTeams().catch((failure: unknown) => {
      if (signal.aborted) return;
      if (isSessionFailure(failure)) props.onSessionLost();
      else setTeamLoadError(true);
    });
    return () => controller.abort();
  }, [props.enabled, props.disputeId, props.onSessionLost, teamAttempt]);
  useEffect(() => {
    if (!props.enabled) return;
    const controller = new AbortController();
    const signal = controller.signal;
    const scope = JSON.stringify([
      props.disputeId,
      query,
      order.column,
      order.direction,
      filters,
    ]);
    const newScope = listVersion.current.scope !== scope;
    const replace =
      offset === 0 || newScope || listVersion.current.epoch !== epoch;
    setLoading(true);
    setListError("");
    async function loadGames() {
      const items: GameListItem[] = [];
      try {
        let more = false;
        for (
          let pageOffset = replace ? 0 : offset;
          pageOffset <= offset;
          pageOffset += 20
        ) {
          const params = new URLSearchParams({
            disputeId: props.disputeId,
            q: query,
            offset: String(pageOffset),
            sort: order.column,
            direction: order.direction,
          });
          if (filters.teamId) params.set("teamId", filters.teamId);
          if (filters.state) params.set("state", filters.state);
          if (filters.date) params.set("date", filters.date);
          const result = await api(
            `/api/games?${params}`,
            gameListingSchema,
            undefined,
            signal,
          );
          items.push(...result.items);
          more = result.hasMore;
          if (!more) break;
        }
        if (signal.aborted) return;
        listVersion.current = { scope, epoch };
        if (newScope && listScroll.current) listScroll.current.scrollTop = 0;
        setList((previous) => ({
          items: [
            ...new Map(
              (replace ? items : [...previous.items, ...items]).map((game) => [
                game.id,
                game,
              ]),
            ).values(),
          ],
          hasMore: more,
          order,
        }));
      } catch (failure) {
        if (signal.aborted) return;
        if (isSessionFailure(failure)) props.onSessionLost();
        setListError(
          failure instanceof Error
            ? failure.message
            : "Não foi possível carregar os jogos.",
        );
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    void loadGames();
    return () => controller.abort();
  }, [
    props.enabled,
    props.disputeId,
    query,
    filters,
    offset,
    order,
    epoch,
    props.onSessionLost,
  ]);
  useEffect(() => {
    const root = listScroll.current;
    const target = nextBatch.current;
    if (
      !root ||
      !target ||
      editor ||
      sheetVisible ||
      !props.enabled ||
      !list.hasMore ||
      loading ||
      listError
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setOffset((value) => value + 20);
        }
      },
      { root, rootMargin: "0px 0px 96px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [editor, sheetVisible, props.enabled, list, loading, listError]);
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
  async function load(id: string, directSheet = false) {
    if (!mayLeave()) return;
    if (!editor) {
      listPosition.current = {
        y: window.scrollY,
        top: listScroll.current?.scrollTop ?? 0,
        left: listScroll.current?.scrollLeft ?? 0,
        id: `${directSheet ? "open-sheet-" : "open-game-"}${id}`,
      };
      sheetChanged.current = false;
    }
    setBusy(true);
    setError("");
    try {
      const snapshot = await api(
        `/api/games/${id}/editor`,
        gameEditorSnapshotSchema,
      );
      if (snapshot.game.id !== id)
        throw Error("Os dados recebidos não correspondem ao jogo.");
      accept(snapshot);
      if (directSheet) setSheetVisible(true);
      setStatus("");
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
      const organizationWarning = flexible ? await formatAction.current() : "";
      setSaveWarning(!!organizationWarning);
      accept(snapshot);
      if (intent === "next") beginNew(snapshot.game);
      setStatus(
        organizationWarning ||
          (intent === "next"
            ? "Jogo salvo. Preencha o próximo confronto."
            : "Jogo salvo"),
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
      requestAnimationFrame(() => {
        window.document
          .getElementById(listPosition.current.id)
          ?.focus({ preventScroll: true });
        listScroll.current?.scrollTo(
          listPosition.current.left,
          listPosition.current.top,
        );
        window.scrollTo(0, listPosition.current.y);
      });
      if (sheetChanged.current) {
        sheetChanged.current = false;
        setEpoch((value) => value + 1);
      }
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
  function changeListFilters(next: Partial<GameListFilters>) {
    setFilters((current) => ({ ...current, ...next }));
    setOffset(0);
  }
  const listRetry = listError && (
    <div className="game-list-error">
      <p role="alert">{listError}</p>
      <button
        type="button"
        className="secondary"
        onClick={() => setEpoch((value) => value + 1)}
      >
        Tentar novamente
      </button>
    </div>
  );
  return (
    <section className="games-workspace" ref={workspace}>
      <AdminToast
        tone={error ? "error" : saveWarning ? "warning" : "success"}
        announce={!error}
        message={
          props.enabled && !sheetVisible && !auxiliary && !busy
            ? error || (!uncertain && !conflict && !dirty ? status : "")
            : ""
        }
      />
      {!sheetVisible && !auxiliary && (
        <div className="competition-title" tabIndex={-1}>
          <h3 ref={heading} className="sr-only">
            Jogos
          </h3>
          {!editor && (
            <div
              className="game-list-filters"
              role="group"
              aria-label="Filtros dos jogos"
            >
              <label className="bb-query-field">
                <span className="bb-query-label">Buscar jogo</span>
                <SearchInput
                  placeholder="Buscar jogo…"
                  maxLength={120}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </label>
              <label className="bb-query-field">
                <span className="bb-query-label">Equipe</span>
                <select
                  value={filters.teamId ?? ""}
                  onChange={(e) =>
                    changeListFilters({ teamId: e.target.value || null })
                  }
                >
                  <option value="">Todas as equipes</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="bb-query-field">
                <span className="bb-query-label">Situação</span>
                <select
                  value={filters.state ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    changeListFilters({
                      state:
                        value === "finished" || value === "scheduled"
                          ? value
                          : null,
                    });
                  }}
                >
                  <option value="">Todas as situações</option>
                  <option value="finished">Resultado registrado</option>
                  <option value="scheduled">Sem resultado</option>
                </select>
              </label>
              <label className="bb-query-field">
                <span className="bb-query-label">Data</span>
                <input
                  placeholder="Data…"
                  type="date"
                  min="0001-01-01"
                  max="9999-12-31"
                  value={filters.date ?? ""}
                  onChange={(e) => {
                    if (e.target.validity.valid)
                      changeListFilters({ date: e.target.value || null });
                  }}
                />
              </label>
            </div>
          )}

          {props.onImportPdfs && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                if (mayLeave()) props.onImportPdfs?.();
              }}
            >
              Importar PDFs
            </button>
          )}
          <button
            type="button"
            className="primary game-list-add"
            disabled={busy || decisionLocked}
            onClick={() => {
              if (!mayLeave()) return;
              beginNew();
            }}
          >
            <Icon name="plus" /> Novo jogo
          </button>
          {!editor && loading && list.items.length > 0 && (
            <span className="game-list-updating" role="status">
              Atualizando jogos…
            </span>
          )}
        </div>
      )}
      {!sheetVisible && !auxiliary && !editor && teamLoadError && (
        <div className="game-list-error">
          <p role="alert">Não foi possível carregar as equipes do filtro.</p>
          <button
            type="button"
            className="secondary"
            onClick={() => setTeamAttempt((current) => current + 1)}
          >
            Recarregar equipes
          </button>
        </div>
      )}
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
          onSaved={() => {
            sheetChanged.current = true;
            props.onSaved();
          }}
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
          iconClose
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
                  Descartar alterações
                </button>
                <button
                  className="primary"
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
                    className="secondary"
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
              onToggle={(e) => {
                const section = e.currentTarget;
                setOfficialsOpen(section.open);
                if (section.open) section.scrollIntoView({ block: "start" });
              }}
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
            {flexible && (
              <GameFormatAssignment
                key={`format-${editor.game.id}`}
                disputeId={props.disputeId}
                gameId={editor.game.id}
                disabled={busy || uncertain || conflict || !props.enabled}
                action={formatAction}
                onDirty={setFormatDirty}
                onSessionLost={props.onSessionLost}
              />
            )}
            {flexible && savedGame && (
              <GameVisibilityPanel
                key={`visibility-${savedGame.id}`}
                game={savedGame}
                enabled={
                  props.enabled && !busy && !dirty && !uncertain && !conflict
                }
                onSessionLost={props.onSessionLost}
                onSaved={() => {
                  setEpoch((v) => v + 1);
                  props.onSaved();
                }}
              />
            )}
            <p className="game-publication-note">
              {flexible
                ? "Finalize a súmula ou conclua a importação para atualizar o resultado automaticamente."
                : "Salvar o jogo não publica o resultado."}
            </p>
            {savedGame && (
              <GameOccurrencePanel
                key={`occurrence-${savedGame.id}`}
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
          {offset === 0 && listRetry}
          <div
            className="admin-table-scroll game-list-scroll"
            ref={listScroll}
            role="region"
            aria-label="Tabela de jogos"
            aria-busy={loading}
            tabIndex={0}
          >
            <table className="admin-data-table">
              <caption className="admin-visually-hidden">
                Jogos da disputa
              </caption>
              <thead>
                <tr>
                  {(
                    [
                      ["number", "Nº"],
                      ["matchup", "Confronto"],
                      ["date", "Data"],
                      ["time", "Horário"],
                      ["venue", "Local"],
                      ["state", "Situação"],
                    ] as const
                  ).map(([column, label]) => (
                    <th
                      key={column}
                      scope="col"
                      className={column === "number" ? "numeric" : undefined}
                      aria-sort={
                        list.order.column === column
                          ? list.order.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className="admin-sort"
                        aria-label={`Ordenar por ${label}`}
                        onClick={() => {
                          setOrder({
                            column,
                            direction:
                              order.column === column &&
                              order.direction === "asc"
                                ? "desc"
                                : "asc",
                          });
                          setOffset(0);
                        }}
                      >
                        {label}
                        {list.order.column === column && (
                          <span aria-hidden="true">
                            {list.order.direction === "asc" ? " ↑" : " ↓"}
                          </span>
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="game-list-operations">
                    Operações
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((g) => (
                  <tr key={g.id}>
                    <td className="numeric nowrap">{g.number ?? "—"}</td>
                    <td>
                      <div className="game-list-matchup">
                        <span>{g.home.name}</span>
                        <strong className="game-list-score">
                          {g.score ? `${g.score.home} × ${g.score.away}` : "—"}
                        </strong>
                        <span>{g.away.name}</span>
                      </div>
                    </td>
                    <td className="nowrap">
                      {g.date
                        ? g.date.split("-").reverse().join("/")
                        : "Data a definir"}
                    </td>
                    <td className="nowrap">{g.time ?? "A definir"}</td>
                    <td>{g.venue ?? "A definir"}</td>
                    <td>
                      <span
                        className={`game-list-state${g.state === "finished" ? " is-finished" : ""}`}
                      >
                        <Icon
                          name={g.state === "finished" ? "check" : "clock"}
                        />
                        {g.state === "finished"
                          ? "Resultado registrado"
                          : "Sem resultado"}
                      </span>
                    </td>
                    <td className="game-list-operations">
                      <button
                        type="button"
                        className="secondary game-list-action game-list-edit"
                        id={`open-game-${g.id}`}
                        aria-label={`Editar jogo ${g.home.name} × ${g.away.name}`}
                        disabled={busy}
                        onClick={() => void load(g.id)}
                      >
                        <Icon name="edit" /> Editar
                      </button>
                      <button
                        type="button"
                        className="secondary game-list-action"
                        id={`open-sheet-${g.id}`}
                        aria-label={`Súmula de ${g.home.name} × ${g.away.name}`}
                        disabled={busy}
                        onClick={() => void load(g.id, true)}
                      >
                        <Icon name="file" /> Súmula
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && list.items.length === 0 && (
              <p role="status">Carregando jogos…</p>
            )}
            {offset > 0 && listRetry}
            {!loading && !listError && !list.items.length && (
              <p>Nenhum jogo encontrado nesta disputa.</p>
            )}
            {list.hasMore && !listError && (
              <div
                ref={nextBatch}
                className="game-list-next"
                aria-hidden="true"
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
