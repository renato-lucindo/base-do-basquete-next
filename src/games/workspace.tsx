import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { saveResultSchema } from "../competition/contract";
import { TeamsWorkspace } from "../teams/screen";
import { GameSheetWorkspace } from "./sheet-workspace";
import { GameOccurrencePanel } from "../regulation/occurrence-panel";
import { VenuePicker } from "./venue-picker";
import { AdminDialog } from "../competition/admin-dialog";
import { AdminToast } from "../competition/admin-toast";
import {
  registrationListingSchema,
  type RegistrationSnapshot,
} from "../teams/contract";
import {
  gameListingSchema,
  gameSnapshotSchema,
  gameSchema,
  saveGameSchema,
  type GameSnapshot,
  type SaveGame,
} from "./contract";
type Props = {
  disputeId: string;
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
    venue: s.venue,
    number: s.number,
  });
export function GamesWorkspace(props: Props) {
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
    } | null>(null),
    [baseline, setBaseline] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const [registrations, setRegistrations] = useState<{
      items: RegistrationSnapshot[];
      hasMore: boolean;
    }>({ items: [], hasMore: false }),
    [chosen, setChosen] = useState<RegistrationSnapshot[]>([]),
    [find, setFind] = useState(""),
    [findOffset, setFindOffset] = useState(0),
    [auxiliary, setAuxiliary] = useState(false);
  const pending = useRef<SaveGame | null>(null),
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
  const dirty = !!editor && JSON.stringify(editor.game) !== baseline;
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
    } else heading.current?.focus();
  }, [props.enabled, editor?.game.id, auxiliary]);
  useEffect(() => {
    if (error && props.enabled) alert.current?.focus();
  }, [error, props.enabled]);
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
  useEffect(() => {
    if (!props.enabled || !editor || auxiliary) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api(
        `/api/registrations?disputeId=${props.disputeId}&q=${encodeURIComponent(find)}&offset=${findOffset}`,
        registrationListingSchema,
        undefined,
        controller.signal,
      )
        .then((r) => {
          if (active) setRegistrations(r);
        })
        .catch((e) => {
          if (active) report(e);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    props.enabled,
    props.disputeId,
    !!editor,
    auxiliary,
    find,
    findOffset,
    epoch,
  ]);
  function accept(s: GameSnapshot) {
    if (s.disputeId !== props.disputeId)
      throw Error("Este jogo pertence a outra disputa.");
    const g = document(s);
    setSavedGame(s);
    setEditor({ game: g, version: s.version });
    setChosen([s.home, s.away]);
    setBaseline(JSON.stringify(g));
    pending.current = null;
    setUncertain(false);
    setConflict(false);
  }
  async function load(id: string) {
    if (!mayLeave()) return;
    setBusy(true);
    setError("");
    try {
      accept(await api(`/api/games/${id}`, gameSnapshotSchema));
      setStatus("Jogo salvo");
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!editor || busy || conflict) return;
    const parsed = saveGameSchema.safeParse(
      pending.current ?? {
        commandId: crypto.randomUUID(),
        expectedVersion: editor.version,
        game: editor.game,
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
      const result = await api("/api/games", saveResultSchema, pending.current);
      accept(await api(`/api/games/${result.id}`, gameSnapshotSchema));
      setStatus("Jogo salvo");
      setEpoch((v) => v + 1);
      props.onSaved();
    } catch (e) {
      if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
        pending.current = null;
        setUncertain(false);
        setConflict(e.status === 409);
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
    setStatus("");
  }
  const candidates = [
    ...new Map(
      [...chosen, ...registrations.items].map((r) => [r.id, r]),
    ).values(),
  ];
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
      setEditor(null);
      setStatus("");
      pending.current = null;
      setUncertain(false);
      setConflict(false);
      setError("");
    }
  }
  return (
    <section className="games-workspace">
      <AdminToast
        message={
          props.enabled && !busy && !uncertain && !conflict && !dirty
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
            setEditor({
              version: 0,
              game: {
                id: crypto.randomUUID(),
                disputeId: props.disputeId,
                homeRegistrationId: "",
                awayRegistrationId: "",
                date: null,
                time: null,
                venue: null,
                number: null,
              },
            });
            setBaseline("");
            setSavedGame(null);
            setChosen([]);
            setError("");
            setStatus("");
            setUncertain(false);
            setConflict(false);
            pending.current = null;
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
        />
      ) : editor ? (
        <AdminDialog
          title={editor.version ? "Editar jogo" : "Novo jogo"}
          open={props.enabled}
          busy={busy}
          onClose={closeEditor}
          className="game-editor-dialog"
        >
          {feedback}
          <div className="teams-inline">
            <p>
              Horários em America/Sao_Paulo. Data, horário, local e número são
              opcionais. Salvar a agenda não publica resultado.
            </p>
            <fieldset
              className="competition-form"
              disabled={busy || uncertain || conflict || decisionLocked}
            >
              <legend>Dados do jogo</legend>

              <div className="game-opponents">
                {(["homeRegistrationId", "awayRegistrationId"] as const).map(
                  (key, i) => (
                    <label key={key}>
                      {i ? "Inscrição visitante" : "Inscrição mandante"}
                      <select
                        aria-label={
                          i ? "Inscrição visitante" : "Inscrição mandante"
                        }
                        value={editor.game[key]}
                        onChange={(e) => {
                          const r = candidates.find(
                            (r) => r.id === e.target.value,
                          );
                          if (r)
                            setChosen((rows) => [
                              ...rows.filter((x) => x.id !== r.id),
                              r,
                            ]);
                          change(key, e.target.value);
                        }}
                      >
                        <option value="">Selecione uma inscrição</option>
                        {candidates.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
              </div>

              <label>
                Data do jogo
                <input
                  type="date"
                  value={editor.game.date ?? ""}
                  onChange={(e) => change("date", e.target.value || null)}
                />
              </label>
              <label>
                Horário do jogo
                <input
                  type="time"
                  value={editor.game.time ?? ""}
                  onChange={(e) => change("time", e.target.value || null)}
                />
              </label>
              <VenuePicker
                value={editor.game.venue ?? ""}
                onChange={(value) => change("venue", value || null)}
                disabled={busy || !props.enabled}
                onSessionLost={props.onSessionLost}
              />
              <label>
                Número do jogo
                <input
                  maxLength={40}
                  value={editor.game.number ?? ""}
                  onChange={(e) => change("number", e.target.value || null)}
                />
              </label>
              <div className="competition-actions game-registration-tools">
                <label className="game-registration-search">
                  Buscar inscrições para este jogo
                  <input
                    value={find}
                    maxLength={120}
                    onChange={(e) => {
                      setFind(e.target.value);
                      setFindOffset(0);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!findOffset}
                  onClick={() => setFindOffset(Math.max(0, findOffset - 20))}
                >
                  Inscrições anteriores
                </button>
                <button
                  type="button"
                  disabled={!registrations.hasMore}
                  onClick={() => setFindOffset(findOffset + 20)}
                >
                  Mais inscrições
                </button>
                <button
                  ref={auxiliaryTrigger}
                  type="button"
                  onClick={() => {
                    if (occurrenceGuard.current()) setAuxiliary(true);
                  }}
                >
                  Criar ou editar inscrição aqui
                </button>
              </div>
            </fieldset>
            <div className="competition-actions">
              <button
                disabled={busy || uncertain || conflict || dirty || !savedGame}
                onClick={() => {
                  if (occurrenceGuard.current()) setSheetVisible(true);
                }}
              >
                Preparar súmula
              </button>
              <button
                disabled={busy || conflict || decisionLocked}
                onClick={() => void save()}
              >
                {uncertain ? "Repetir o mesmo envio" : "Salvar jogo"}
              </button>
              {conflict && (
                <button
                  disabled={busy}
                  onClick={() => void load(editor.game.id)}
                >
                  Recarregar jogo
                </button>
              )}
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  if (mayLeave()) {
                    setEditor(null);
                    setStatus("");
                    pending.current = null;
                    setUncertain(false);
                    setConflict(false);
                    setError("");
                  }
                }}
              >
                Voltar à lista de jogos
              </button>
            </div>
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
