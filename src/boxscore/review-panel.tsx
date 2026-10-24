import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { saveResultSchema } from "../competition/contract";
import {
  gameListingSchema,
  gameSnapshotSchema,
  type GameSnapshot,
} from "../games/contract";
import { GamesWorkspace } from "../games/workspace";
import { MembersWorkspace } from "../people/workspace";
import {
  rosterListingSchema,
  rosterSnapshotSchema,
  type RosterSnapshot,
} from "../people/roster-contract";
import { PdfContextPicker, type PdfContext } from "./context-picker";
import {
  pdfReviewSnapshotSchema,
  savePdfReviewSchema,
  sourceMarkers,
  type PdfReviewSnapshot,
  type PdfReviewDocument,
  type SavePdfReview,
} from "./source-contract";
import { suggestPdfPlayer } from "./matching";
type Props = {
  sourceId: string;
  contexts: PdfContext[];
  onContexts: (rows: PdfContext[]) => void;
  enabled: boolean;
  guard: { current: () => boolean };
  onSessionLost: () => void;
  onSaved: () => void;
  onBack: () => void;
};
export function PdfReviewPanel(props: Props) {
  const [snapshot, setSnapshot] = useState<PdfReviewSnapshot | null>(null),
    [doc, setDoc] = useState<PdfReviewDocument | null>(null),
    [baseline, setBaseline] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [epoch, setEpoch] = useState(0);
  const [games, setGames] = useState<GameSnapshot[]>([]),
    [gameQuery, setGameQuery] = useState(""),
    [gameOffset, setGameOffset] = useState(0),
    [moreGames, setMoreGames] = useState(false),
    [game, setGame] = useState<GameSnapshot | null>(null),
    [rosters, setRosters] = useState<[RosterSnapshot[], RosterSnapshot[]]>([
      [],
      [],
    ]),
    [moreRoster, setMoreRoster] = useState<[boolean, boolean]>([false, false]),
    [rosterOffsets, setRosterOffsets] = useState<[number, number]>([0, 0]);
  const [gamesAux, setGamesAux] = useState(false),
    [memberAux, setMemberAux] = useState<0 | 1 | null>(null),
    [rosterLoading, setRosterLoading] = useState(false);
  const loaded = useRef(false),
    pending = useRef<SavePdfReview | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    auxGuard = useRef(() => true),
    auxTrigger = useRef<HTMLElement | null>(null),
    wasAux = useRef(false);
  const dirty = !!doc && JSON.stringify(doc) !== baseline,
    auxiliary = gamesAux || memberAux !== null,
    context = props.contexts.find((c) => c.id === doc?.disputeId);
  function mayLeave() {
    return (
      !busy &&
      auxGuard.current() &&
      (!(dirty || uncertain) ||
        window.confirm(
          "Há alterações da revisão não salvas ou um envio não confirmado. Deseja sair?",
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
    if (!auxiliary && wasAux.current) {
      wasAux.current = false;
      auxTrigger.current?.focus();
    } else heading.current?.focus();
  }, [props.enabled, auxiliary]);
  useEffect(() => {
    if (error && props.enabled) alert.current?.focus();
  }, [error, props.enabled]);
  function report(e: unknown) {
    if (isSessionFailure(e)) props.onSessionLost();
    else
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir. Tente novamente.",
      );
  }
  function accept(s: PdfReviewSnapshot) {
    setSnapshot(s);
    setDoc(s.document);
    setBaseline(JSON.stringify(s.document));
    setUncertain(false);
    setConflict(false);
    pending.current = null;
    loaded.current = true;
  }
  async function load() {
    setBusy(true);
    setError("");
    try {
      accept(
        await api(
          `/api/pdf-sources/${props.sourceId}/review`,
          pdfReviewSnapshotSchema,
        ),
      );
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (props.enabled && !loaded.current) void load();
  }, [props.enabled]);
  useEffect(() => {
    if (!props.enabled || !doc) return;
    let active = true;
    const c = new AbortController();
    const timer = setTimeout(() => {
      void api(
        `/api/games?disputeId=${doc.disputeId}&q=${encodeURIComponent(gameQuery)}&offset=${gameOffset}`,
        gameListingSchema,
        undefined,
        c.signal,
      )
        .then((r) => {
          if (active) {
            setGames(r.items);
            setMoreGames(r.hasMore);
          }
        })
        .catch((e) => {
          if (active) report(e);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
      c.abort();
    };
  }, [props.enabled, doc?.disputeId, gameQuery, gameOffset, epoch]);
  useEffect(() => {
    if (!props.enabled || !doc) return;
    const c = new AbortController();
    let active = true;
    setGame((old) => (old?.id === doc.gameId ? old : null));
    setRosters([[], []]);
    setMoreRoster([false, false]);
    setRosterOffsets([0, 0]);
    setRosterLoading(false);
    if (!doc.gameId) return;
    setRosterLoading(true);
    void (async () => {
      try {
        const g = await api(
          `/api/games/${doc.gameId}`,
          gameSnapshotSchema,
          undefined,
          c.signal,
        );
        if (g.disputeId !== doc.disputeId)
          throw Error("O jogo não pertence ao destino. Escolha outro jogo.");
        const pages = await Promise.all(
          [g.home, g.away].map((r) =>
            api(
              `/api/roster?registrationId=${r.id}&activeOnly=1&offset=0`,
              rosterListingSchema,
              undefined,
              c.signal,
            ),
          ),
        );
        const ids = new Set(pages.flatMap((p) => p.items.map((r) => r.id))),
          missing = doc.mappings
            .filter((m) => m.rosterEntryId && !ids.has(m.rosterEntryId))
            .map((m) => m.rosterEntryId!);
        const historical = await Promise.all(
          missing.map((id) =>
            api(`/api/roster/${id}`, rosterSnapshotSchema, undefined, c.signal),
          ),
        );
        if (active) {
          setGame(g);
          setRosters(
            [g.home, g.away].map((r, i) => [
              ...pages[i].items,
              ...historical.filter(
                (h) => h.registrationId === r.id && h.disputeId === g.disputeId,
              ),
            ]) as [RosterSnapshot[], RosterSnapshot[]],
          );
          setMoreRoster([pages[0].hasMore, pages[1].hasMore]);
        }
      } catch (e) {
        if (active) report(e);
      } finally {
        if (active) setRosterLoading(false);
      }
    })();
    return () => {
      active = false;
      c.abort();
    };
  }, [props.enabled, doc?.disputeId, doc?.gameId, epoch]);
  function change(next: PdfReviewDocument) {
    if (busy || uncertain || conflict) return;
    setDoc(next);
    setStatus("");
  }
  function resetTarget(patch: Partial<PdfReviewDocument>) {
    if (!doc) return;
    if (
      doc.mappings.some((m) => m.rosterEntryId) &&
      !window.confirm(
        "A mudança exige revisar os atletas novamente. Limpar as associações deste rascunho?",
      )
    )
      return;
    change({
      ...doc,
      ...patch,
      mappings: doc.mappings.map((m) => ({ ...m, rosterEntryId: null })),
    });
    setGameOffset(0);
    setGameQuery("");
  }
  async function more(side: 0 | 1) {
    if (!game || rosterLoading) return;
    setRosterLoading(true);
    try {
      const offset = rosterOffsets[side] + 20,
        r = await api(
          `/api/roster?registrationId=${side ? game.away.id : game.home.id}&activeOnly=1&offset=${offset}`,
          rosterListingSchema,
        );
      setRosters(
        (old) =>
          old.map((rows, i) =>
            i === side
              ? [
                  ...new Map(
                    [...rows, ...r.items].map((v) => [v.id, v]),
                  ).values(),
                ]
              : rows,
          ) as [RosterSnapshot[], RosterSnapshot[]],
      );
      setMoreRoster(
        (old) =>
          old.map((v, i) => (i === side ? r.hasMore : v)) as [boolean, boolean],
      );
      setRosterOffsets(
        (old) =>
          old.map((v, i) => (i === side ? offset : v)) as [number, number],
      );
    } catch (e) {
      report(e);
    } finally {
      setRosterLoading(false);
    }
  }
  async function save() {
    if (!doc || !snapshot || busy || conflict) return;
    const result = savePdfReviewSchema.safeParse(
      pending.current ?? {
        commandId: crypto.randomUUID(),
        sourceId: props.sourceId,
        expectedVersion: snapshot.version,
        document: doc,
      },
    );
    if (!result.success) {
      setError("Revise as camisas e não associe o mesmo atleta a duas linhas.");
      return;
    }
    const command = result.data;
    pending.current = command;
    setBusy(true);
    setError("");
    try {
      await api(
        `/api/pdf-sources/${props.sourceId}/review`,
        saveResultSchema,
        command,
      );
      accept(
        await api(
          `/api/pdf-sources/${props.sourceId}/review`,
          pdfReviewSnapshotSchema,
        ),
      );
      setStatus("Revisão salva");
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
  function closeAux() {
    if (auxGuard.current()) {
      wasAux.current = true;
      setGamesAux(false);
      setMemberAux(null);
      setEpoch((v) => v + 1);
    }
  }
  const disabled = busy || uncertain || conflict || !props.enabled,
    source = snapshot?.source;
  return (
    <section className="pdf-review" aria-busy={busy}>
      <h3 ref={heading} tabIndex={-1}>
        Revisão do PDF
      </h3>
      {error && (
        <p role="alert" ref={alert} tabIndex={-1}>
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
                ? "Revisão não salva"
                : status}
      </p>
      <div hidden={auxiliary}>
        {source && doc && (
          <>
            <h4>{source.filename}</h4>
            <div className="pdf-reference">
              <p>
                {source.parsed.format === "BASKETBALL_SITE"
                  ? "Basketball Site"
                  : "FIBA / Genius Sports"}{" "}
                · {source.pageCount} páginas
              </p>
              <p>
                {source.parsed.teams[0].name} {source.parsed.teams[0].score} ×{" "}
                {source.parsed.teams[1].score} {source.parsed.teams[1].name}
              </p>
              <p>
                Data/hora do PDF:{" "}
                {source.parsed.scheduledLocal.replace("T", " · ")} ·{" "}
                {source.parsed.venue}
              </p>
              {source.parsed.format === "BASKETBALL_SITE" && (
                <p>
                  Este formato não informa quartos, titulares, capitão ou DNP.
                  Minuto zero não significa que o atleta não jogou.
                </p>
              )}
              {source.parsed.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
            <PdfContextPicker
              label="Destino da revisão"
              value={doc.disputeId}
              contexts={props.contexts}
              onContexts={props.onContexts}
              disabled={disabled}
              onSessionLost={props.onSessionLost}
              onChange={(id) => resetTarget({ disputeId: id, gameId: null })}
            />
            <fieldset disabled={disabled}>
              <legend>Associar a um jogo</legend>
              <label>
                Buscar jogo de destino
                <input
                  value={gameQuery}
                  maxLength={120}
                  onChange={(e) => {
                    setGameQuery(e.target.value);
                    setGameOffset(0);
                  }}
                />
              </label>
              <label>
                Jogo de destino
                <select
                  aria-label="Jogo de destino"
                  value={doc.gameId ?? ""}
                  onChange={(e) =>
                    resetTarget({ gameId: e.target.value || null })
                  }
                >
                  <option value="">Ainda sem jogo associado</option>
                  {[
                    ...new Map(
                      [...(game ? [game] : []), ...games].map((g) => [g.id, g]),
                    ).values(),
                  ].map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.home.name} × {g.away.name} ·{" "}
                      {g.date ?? "Data a definir"} · {g.id.slice(-8)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="competition-actions">
                <button
                  disabled={!gameOffset}
                  onClick={() => setGameOffset(Math.max(0, gameOffset - 20))}
                >
                  Jogos de destino anteriores
                </button>
                <button
                  disabled={!moreGames}
                  onClick={() => setGameOffset(gameOffset + 20)}
                >
                  Mais jogos de destino
                </button>
                <button
                  disabled={!context}
                  onClick={(e) => {
                    auxTrigger.current = e.currentTarget;
                    setGamesAux(true);
                  }}
                >
                  Criar ou editar jogo aqui
                </button>
              </div>
              <label>
                <span>Inverter lados do PDF em relação ao jogo</span>
                <input
                  type="checkbox"
                  checked={doc.invertSides}
                  onChange={(e) =>
                    resetTarget({ invertSides: e.target.checked })
                  }
                />
              </label>
            </fieldset>
            {rosterLoading && <p role="status">Carregando atletas do jogo…</p>}
            {source.parsed.teams.map((team, sourceSide) => {
              const targetSide = (
                  (sourceSide === 0) !== doc.invertSides ? 0 : 1
                ) as 0 | 1,
                registration = game
                  ? targetSide
                    ? game.away
                    : game.home
                  : null,
                rows = rosters[targetSide];
              return (
                <fieldset key={sourceSide} disabled={disabled || rosterLoading}>
                  <legend>
                    {team.name} →{" "}
                    {registration?.name ?? "Escolha o jogo de destino"}
                  </legend>
                  {registration && (
                    <div className="competition-actions">
                      <button
                        disabled={!moreRoster[targetSide]}
                        onClick={() => void more(targetSide)}
                      >
                        Mais atletas de {registration.name}
                      </button>
                      <button
                        disabled={!context}
                        onClick={(e) => {
                          auxTrigger.current = e.currentTarget;
                          setMemberAux(targetSide);
                        }}
                      >
                        Cadastrar ou editar elenco de {registration.name}
                      </button>
                    </div>
                  )}
                  {moreRoster[targetSide] && (
                    <p>
                      Existem mais atletas neste elenco. As sugestões usam os
                      candidatos carregados.
                    </p>
                  )}
                  <ol className="pdf-rows">
                    {team.players.map((p, index) => {
                      const mapping = doc.mappings.find(
                          (m) =>
                            m.sourceSide === sourceSide &&
                            m.sourceIndex === index,
                        ),
                        suggestion = registration
                          ? suggestPdfPlayer(
                              p.name,
                              p.jerseyNumber,
                              team.name,
                              rows,
                              {
                                registrationId: registration.id,
                                disputeId: doc.disputeId,
                                registrationName: registration.name,
                                complete: !moreRoster[targetSide],
                              },
                            )
                          : null,
                        markers = sourceMarkers(source.parsed, p);
                      return (
                        <li key={index}>
                          <strong>
                            #{p.jerseyNumber} · {p.name}
                          </strong>
                          <p>
                            {p.points} pontos ·{" "}
                            {Math.floor(p.secondsPlayed / 60)}:
                            {String(p.secondsPlayed % 60).padStart(2, "0")} min.{" "}
                            {markers.starter === true
                              ? "Titular informado. "
                              : ""}
                            {markers.captain === true
                              ? "Capitão informado. "
                              : ""}
                            {markers.participation === "did_not_play"
                              ? "Não jogou, informado no PDF."
                              : markers.participation === "unknown"
                                ? "Participação não informada."
                                : ""}
                          </p>
                          <label>
                            Camisa nesta revisão
                            <input
                              aria-label={`Camisa ${team.name} linha ${index + 1}`}
                              value={mapping?.jersey ?? p.jerseyNumber}
                              maxLength={2}
                              inputMode="numeric"
                              onChange={(e) =>
                                change({
                                  ...doc,
                                  mappings: doc.mappings.map((m) =>
                                    m === mapping
                                      ? { ...m, jersey: e.target.value }
                                      : m,
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            Atleta correspondente
                            <select
                              aria-label={`Atleta ${team.name} linha ${index + 1}`}
                              value={mapping?.rosterEntryId ?? ""}
                              disabled={!registration}
                              onChange={(e) =>
                                change({
                                  ...doc,
                                  mappings: doc.mappings.map((m) =>
                                    m === mapping
                                      ? {
                                          ...m,
                                          rosterEntryId: e.target.value || null,
                                        }
                                      : m,
                                  ),
                                })
                              }
                            >
                              <option value="">Pendente de associação</option>
                              {rows
                                .filter(
                                  (r) =>
                                    r.active || r.id === mapping?.rosterEntryId,
                                )
                                .map((r) => (
                                  <option
                                    key={r.id}
                                    value={r.id}
                                    disabled={doc.mappings.some(
                                      (m) =>
                                        m !== mapping &&
                                        m.rosterEntryId === r.id,
                                    )}
                                  >
                                    {r.person.name} · camisa{" "}
                                    {r.jersey ?? "não definida"} ·{" "}
                                    {r.id.slice(-8)}
                                    {!r.active ? " · histórico" : ""}
                                  </option>
                                ))}
                            </select>
                          </label>
                          {suggestion &&
                            suggestion.alternatives.map((a) => (
                              <button
                                key={a.rosterEntryId}
                                disabled={doc.mappings.some(
                                  (m) =>
                                    m !== mapping &&
                                    m.rosterEntryId === a.rosterEntryId,
                                )}
                                onClick={() =>
                                  change({
                                    ...doc,
                                    mappings: doc.mappings.map((m) =>
                                      m === mapping
                                        ? {
                                            ...m,
                                            rosterEntryId: a.rosterEntryId,
                                          }
                                        : m,
                                    ),
                                  })
                                }
                              >
                                Escolher sugestão {a.name} ·{" "}
                                {a.rosterEntryId.slice(-8)}
                              </button>
                            ))}
                        </li>
                      );
                    })}
                  </ol>
                </fieldset>
              );
            })}
            <label>
              Observações da revisão
              <textarea
                aria-label="Observações da revisão"
                value={doc.notes}
                maxLength={500}
                disabled={disabled}
                onChange={(e) => change({ ...doc, notes: e.target.value })}
              />
            </label>
            <div className="competition-actions">
              <button
                disabled={busy || conflict || !props.enabled}
                onClick={() => void save()}
              >
                {uncertain ? "Repetir salvamento da revisão" : "Salvar revisão"}
              </button>
              <button
                disabled={busy || !props.enabled}
                onClick={() => {
                  if (mayLeave()) void load();
                }}
              >
                Recarregar revisão
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (mayLeave()) props.onBack();
                }}
              >
                Voltar aos documentos
              </button>
            </div>
            <p>
              Associações pendentes podem ser salvas para continuar depois. Esta
              revisão ainda não publica o resultado.
            </p>
          </>
        )}
        {!source && !busy && (
          <button onClick={() => void load()}>
            Tentar abrir revisão novamente
          </button>
        )}
      </div>
      {auxiliary && (
        <>
          <button onClick={closeAux}>Voltar à revisão do PDF</button>
          {gamesAux && context && (
            <GamesWorkspace
              disputeId={context.id}
              gender={context.gender}
              enabled={props.enabled}
              guard={auxGuard}
              onSessionLost={props.onSessionLost}
              onSaved={() => {
                setEpoch((v) => v + 1);
                props.onSaved();
              }}
            />
          )}
          {memberAux !== null && game && context && (
            <MembersWorkspace
              registration={memberAux ? game.away : game.home}
              gender={context.gender}
              enabled={props.enabled}
              canEdit
              guard={auxGuard}
              onSessionLost={props.onSessionLost}
              onSaved={() => {
                setEpoch((v) => v + 1);
                props.onSaved();
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
