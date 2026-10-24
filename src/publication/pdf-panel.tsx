import { useEffect, useRef, useState } from "react";
import { api, ApiFailure, isSessionFailure } from "../competition/api";
import { gameSnapshotSchema, type GameSnapshot } from "../games/contract";
import {
  sheetSnapshotSchema,
  type SheetSnapshot,
} from "../games/sheet-contract";
import {
  staffListingSchema,
  type StaffSnapshot,
} from "../people/staff-contract";
import {
  pdfReviewSnapshotSchema,
  sourceMarkers,
  type PdfReviewSnapshot,
} from "../boxscore/source-contract";
import {
  publicationStateSchema,
  publicationPdfResultSchema,
  type PublicationState,
} from "./data-contract";
import {
  preparationSchema,
  preparationAckSchema,
  type SavePreparation,
} from "./preparation-contract";
import { publishPdfSchema, type PublishPdf } from "./pdf-contract";
import { preparePdfFacts, type PdfAuthority } from "./pdf-authority";
import type { PdfSupplement } from "./pdf-selection";
import { aggregate } from "../domain/scoresheet";
import { PublicationHistory } from "./history";
import { toEngineSheet } from "../games/sheet-contract";

type Side = "home" | "away";
type Choice = { played: "" | "played" | "did_not_play"; starter: boolean };
type Staff = { coach: string; assistant: string };
type Loaded = {
  game: GameSnapshot;
  state: PublicationState;
  sheet: SheetSnapshot | null;
  staff: Record<
    Side,
    { items: StaffSnapshot[]; hasMore: boolean; offset: number }
  >;
};
type Props = {
  review: PdfReviewSnapshot;
  game: GameSnapshot;
  disabled: boolean;
  guard: { current: () => boolean };
  onLock: (v: boolean) => void;
  onSessionLost: () => void;
  onPublished: () => void;
};
const sides = ["home", "away"] as const;
const rowKey = (side: number, index: number) => `${side}:${index}`;
export function PdfPublicationPanel(p: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [edited, setEdited] = useState(false),
    [draftVersion, setDraftVersion] = useState(0),
    [ready, setReady] = useState<PublishPdf | null>(null),
    [published, setPublished] = useState(false);
  const [rows, setRows] = useState<Record<string, Choice>>({}),
    [captains, setCaptains] = useState<Record<Side, string>>({
      home: "",
      away: "",
    }),
    [staff, setStaff] = useState<Record<Side, Staff>>({
      home: { coach: "", assistant: "" },
      away: { coach: "", assistant: "" },
    }),
    [authority, setAuthority] = useState<PdfAuthority>({
      scorePoints: "pdf",
      periodScores: "none",
      playerAdvanced: "pdf",
      foulsReceived: "none",
      teamAdvanced: "none",
      gameAdvanced: "none",
    }),
    [reason, setReason] = useState(""),
    [accepted, setAccepted] = useState(false);
  const pendingSave = useRef<SavePreparation | null>(null),
    pendingPublish = useRef<PublishPdf | null>(null),
    ack = useRef<ReturnType<typeof publicationPdfResultSchema.parse> | null>(
      null,
    ),
    heading = useRef<HTMLHeadingElement>(null),
    alert = useRef<HTMLParagraphElement>(null),
    epoch = useRef(0);
  const frozen = busy || uncertain || ack.current !== null,
    disabled = frozen || conflict || p.disabled;
  function mayLeave() {
    return (
      !busy &&
      (!(edited || uncertain || ack.current) ||
        window.confirm(
          "Há decisões de publicação não salvas ou um envio sem reconciliação. Deseja sair?",
        ))
    );
  }
  useEffect(() => {
    p.guard.current = mayLeave;
  });
  useEffect(() => {
    p.onLock(loaded !== null || busy);
  }, [!!loaded, busy, p.onLock]);
  useEffect(
    () => () => {
      epoch.current++;
      p.guard.current = () => true;
      p.onLock(false);
    },
    [p.guard, p.onLock],
  );
  useEffect(() => {
    if (!edited && !uncertain && !ack.current) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edited, uncertain, !!ack.current]);
  useEffect(() => {
    if (error) alert.current?.focus();
    else if (loaded) heading.current?.focus();
  }, [error, !!loaded]);
  function report(e: unknown) {
    if (isSessionFailure(e)) p.onSessionLost();
    setError(
      e instanceof Error
        ? e.message
        : "Não foi possível concluir a publicação.",
    );
  }
  const targetSide = (sourceSide: number): Side =>
    sourceSide === (p.review.document.invertSides ? 1 : 0) ? "home" : "away";
  const capabilities = {
    periodScores: p.review.source.parsed.teams.every(
      (t) => t.periodScores !== null,
    ),
    foulsReceived: p.review.source.parsed.teams.every((t) =>
      t.players.every((r) => r.foulsReceived !== null),
    ),
    teamAdvanced: p.review.source.parsed.teams.every((t) => !!t.teamStatistics),
    gameAdvanced: !!p.review.source.parsed.gameStatistics,
  };
  function restore(c: PublishPdf) {
    setRows(
      Object.fromEntries(
        c.supplement.rows.map((r) => [
          rowKey(r.sourceSide, r.sourceIndex),
          { played: r.played ? "played" : "did_not_play", starter: r.starter },
        ]),
      ),
    );
    setCaptains(
      Object.fromEntries(
        sides.map((side) => {
          const r = c.supplement.rows.find(
              (r) => targetSide(r.sourceSide) === side && r.captain,
            ),
            m = p.review.document.mappings.find(
              (m) =>
                m.sourceSide === r?.sourceSide &&
                m.sourceIndex === r?.sourceIndex,
            );
          return [side, m?.rosterEntryId ?? ""];
        }),
      ) as Record<Side, string>,
    );
    setStaff(
      Object.fromEntries(
        sides.map((side) => [
          side,
          {
            coach: c.supplement.staff[side].coachStaffEntryId ?? "captain",
            assistant: c.supplement.staff[side].assistantStaffEntryId ?? "",
          },
        ]),
      ) as Record<Side, Staff>,
    );
    setAuthority(c.authority);
    setReason(c.reason);
    setAccepted(c.acceptDivergence);
  }
  async function load() {
    if (p.disabled || busy || !mayLeave()) return;
    const n = ++epoch.current;
    setBusy(true);
    setError("");
    try {
      const [r, g, s, sh, prep] = await Promise.all([
        api(
          `/api/pdf-sources/${p.review.source.id}/review`,
          pdfReviewSnapshotSchema,
        ),
        api(`/api/games/${p.game.id}`, gameSnapshotSchema),
        api(`/api/games/${p.game.id}/publication`, publicationStateSchema),
        api(`/api/games/${p.game.id}/sheet`, sheetSnapshotSchema.nullable()),
        api(
          `/api/pdf-sources/${p.review.source.id}/preparation`,
          preparationSchema.nullable(),
        ),
      ]);
      if (
        r.source.id !== p.review.source.id ||
        r.version !== p.review.version ||
        JSON.stringify(r.document) !== JSON.stringify(p.review.document) ||
        r.document.gameId !== g.id ||
        g.id !== p.game.id ||
        g.disputeId !== p.review.document.disputeId ||
        s.gameId !== g.id ||
        g.home.id !== p.game.home.id ||
        g.away.id !== p.game.away.id ||
        (sh && sh.gameId !== g.id)
      )
        throw new ApiFailure(
          409,
          "A revisão ou o jogo mudou. Volte e recarregue a revisão antes de preparar.",
        );
      if (
        !r.source.ready ||
        r.version < 1 ||
        r.document.mappings.some((m) => !m.rosterEntryId)
      )
        throw Error(
          "Salve a revisão e resolva todas as associações de atletas antes de preparar a publicação.",
        );
      const pages = await Promise.all(
        sides.map((side) =>
          api(
            `/api/staff?registrationId=${g[side].id}&activeOnly=1&offset=0`,
            staffListingSchema,
          ),
        ),
      );
      const compatible =
        prep?.publication.gameId === g.id &&
        prep.publication.source.reviewVersion === r.version;
      // Historical staff explicitly chosen in the saved intent may no longer be on the first active page.
      const histories: StaffSnapshot[] = [];
      if (compatible && prep)
        for (const side of sides)
          for (const id of Object.values(
            prep.publication.supplement.staff[side],
          ))
            if (id && !pages.flatMap((q) => q.items).some((q) => q.id === id)) {
              const { staffSnapshotSchema } =
                await import("../people/staff-contract");
              histories.push(
                await api(`/api/staff/${id}`, staffSnapshotSchema),
              );
            }
      if (n !== epoch.current) return;
      setLoaded({
        game: g,
        state: s,
        sheet: sh,
        staff: Object.fromEntries(
          sides.map((side, i) => [
            side,
            {
              ...pages[i],
              items: [
                ...pages[i].items,
                ...histories.filter((h) => h.registrationId === g[side].id),
              ],
              offset: 0,
            },
          ]),
        ) as Loaded["staff"],
      });
      setDraftVersion(prep?.version ?? 0);
      setReady(compatible && prep ? prep.publication : null);
      setPublished(false);
      if (compatible && prep) {
        restore(prep.publication);
        setStatus("Preparação salva recuperada. Confira antes de publicar.");
      } else {
        setRows(
          Object.fromEntries(
            r.document.mappings.map((m) => [
              rowKey(m.sourceSide, m.sourceIndex),
              { played: "", starter: false },
            ]),
          ),
        );
        setCaptains({ home: "", away: "" });
        setStaff({
          home: { coach: "", assistant: "" },
          away: { coach: "", assistant: "" },
        });
        setAuthority({
          scorePoints: "pdf",
          periodScores: capabilities.periodScores ? "pdf" : "none",
          playerAdvanced: "pdf",
          foulsReceived: capabilities.foulsReceived ? "pdf" : "none",
          teamAdvanced: capabilities.teamAdvanced ? "pdf" : "none",
          gameAdvanced: capabilities.gameAdvanced ? "pdf" : "none",
        });
        setReason("");
        setAccepted(false);
        setStatus(
          prep
            ? "A preparação anterior pertence a outra revisão ou destino. Confira todas as escolhas novamente."
            : "",
        );
      }
      setEdited(false);
      setConflict(false);
      setUncertain(false);
      pendingSave.current = null;
      pendingPublish.current = null;
      ack.current = null;
    } catch (e) {
      if (n === epoch.current) report(e);
    } finally {
      if (n === epoch.current) setBusy(false);
    }
  }
  function change(run: () => void) {
    if (disabled) return;
    run();
    setEdited(true);
    setReady(null);
    setStatus("");
  }
  function command(): PublishPdf {
    if (!loaded) throw Error("Prepare este jogo primeiro.");
    if (
      sides.some((side) => !captains[side] || !staff[side].coach) ||
      p.review.document.mappings.some(
        (m) => !rows[rowKey(m.sourceSide, m.sourceIndex)]?.played,
      )
    )
      throw Error(
        "Confira a participação, cinco titulares, capitão e técnico de cada equipe.",
      );
    const supplement: PdfSupplement = {
      rows: p.review.document.mappings.map((m) => ({
        sourceSide: m.sourceSide,
        sourceIndex: m.sourceIndex,
        played: rows[rowKey(m.sourceSide, m.sourceIndex)].played === "played",
        starter: rows[rowKey(m.sourceSide, m.sourceIndex)].starter,
        captain: captains[targetSide(m.sourceSide)] === m.rosterEntryId,
      })),
      staff: Object.fromEntries(
        sides.map((side) => [
          side,
          {
            coachStaffEntryId:
              staff[side].coach === "captain" ? null : staff[side].coach,
            assistantStaffEntryId:
              staff[side].coach === "captain"
                ? null
                : staff[side].assistant || null,
          },
        ]),
      ) as PdfSupplement["staff"],
    };
    const manualNeeded =
      authority.scorePoints === "sheet" || authority.periodScores === "sheet";
    preparePdfFacts(
      p.review,
      supplement,
      authority,
      loaded.sheet
        ? { document: loaded.sheet.document, version: loaded.sheet.version }
        : undefined,
      reason,
      accepted,
    );
    if (
      p.review.source.parsed.gameNumber &&
      loaded.game.number &&
      p.review.source.parsed.gameNumber !== loaded.game.number &&
      (!accepted || reason.trim().length < 10)
    )
      throw Error(
        "O número do PDF difere do jogo. Aceite a divergência com motivo para continuar.",
      );
    return publishPdfSchema.parse({
      requestId: crypto.randomUUID(),
      gameId: loaded.game.id,
      gameVersion: loaded.game.version,
      basePublicationVersion: loaded.state.version,
      source: {
        kind: "pdf",
        sourceId: p.review.source.id,
        sourceVersion: 2,
        reviewVersion: p.review.version,
      },
      supplement,
      authority,
      sheetVersion: manualNeeded ? loaded.sheet?.version : null,
      reason,
      acceptDivergence: accepted,
    });
  }
  async function save() {
    if (p.disabled || busy || conflict) return;
    let c = pendingSave.current;
    try {
      c ??= {
        commandId: crypto.randomUUID(),
        expectedVersion: draftVersion,
        publication: command(),
      };
    } catch (e) {
      report(e);
      return;
    }
    pendingSave.current = c;
    setBusy(true);
    setError("");
    try {
      const r = await api(
        `/api/games/${c.publication.gameId}/publication/preparation/${p.review.source.id}`,
        preparationAckSchema,
        c,
      );
      if (
        r.sourceId !== c.publication.source.sourceId ||
        r.version !== c.expectedVersion + 1 ||
        r.requestId !== c.publication.requestId
      )
        throw new ApiFailure(
          503,
          "Não foi possível confirmar o salvamento. Repita o mesmo envio.",
        );
      setReady(c.publication);
      setDraftVersion(r.version);
      setEdited(false);
      pendingSave.current = null;
      setUncertain(false);
      setStatus("Preparação salva. O resultado ainda não foi publicado.");
    } catch (e) {
      if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
        pendingSave.current = null;
        setUncertain(false);
        setConflict(e.status === 409);
      } else setUncertain(true);
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    const a = ack.current;
    if (!a || !loaded) return;
    const s = await api(
      `/api/games/${a.gameId}/publication`,
      publicationStateSchema,
    );
    if (s.gameId !== a.gameId || s.version < a.version)
      throw new ApiFailure(
        503,
        "Publicação confirmada. Falta recuperar o resultado publicado.",
      );
    setLoaded({ ...loaded, state: s });
    ack.current = null;
    pendingPublish.current = null;
    setUncertain(false);
    setPublished(true);
    setStatus("Resultado publicado");
    p.onPublished();
  }
  async function publish() {
    if (!ready || edited || p.disabled || busy || conflict) return;
    const c = pendingPublish.current ?? ready;
    pendingPublish.current = c;
    setBusy(true);
    setError("");
    try {
      if (!ack.current) {
        const a = await api(
          `/api/games/${c.gameId}/publication/pdf`,
          publicationPdfResultSchema,
          c,
        );
        if (
          a.requestId !== c.requestId ||
          a.gameId !== c.gameId ||
          a.version !== c.basePublicationVersion + 1 ||
          a.gameVersion !== c.gameVersion + 1 ||
          a.reviewVersion !== c.source.reviewVersion ||
          a.sourceVersion !== 2
        )
          throw new ApiFailure(
            503,
            "Não foi possível confirmar a publicação. Repita o mesmo envio.",
          );
        ack.current = a;
        pendingPublish.current = null;
        setUncertain(false);
      }
      await finish();
    } catch (e) {
      if (ack.current) {
        report(e);
      } else if (e instanceof ApiFailure && [400, 409].includes(e.status)) {
        pendingPublish.current = null;
        setUncertain(false);
        setConflict(e.status === 409);
        report(e);
      } else {
        setUncertain(true);
        report(e);
      }
    } finally {
      setBusy(false);
    }
  }
  async function moreStaff(side: Side) {
    if (!loaded || disabled) return;
    setBusy(true);
    try {
      const old = loaded.staff[side],
        offset = old.offset + 20,
        r = await api(
          `/api/staff?registrationId=${loaded.game[side].id}&activeOnly=1&offset=${offset}`,
          staffListingSchema,
        );
      setLoaded({
        ...loaded,
        staff: {
          ...loaded.staff,
          [side]: {
            items: [
              ...new Map(
                [...old.items, ...r.items].map((s) => [s.id, s]),
              ).values(),
            ],
            hasMore: r.hasMore,
            offset,
          },
        },
      });
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  const manualTotals = loaded?.sheet
    ? aggregate(toEngineSheet(loaded.sheet.document))
    : null;
  return (
    <section
      className="pdf-publication"
      aria-label="Publicação do PDF"
      aria-busy={busy}
    >
      {!loaded && (
        <button disabled={p.disabled || busy} onClick={() => void load()}>
          Preparar publicação do PDF
        </button>
      )}
      {error && (
        <p role="alert" ref={alert} tabIndex={-1}>
          {error}
        </p>
      )}
      <p role="status">{busy ? "Aguarde…" : status}</p>
      {loaded && (
        <>
          <h4 ref={heading} tabIndex={-1}>
            Conferir publicação do PDF
          </h4>
          <p>
            Escolha a participação, cinco titulares e um capitão por equipe. As
            escolhas complementam o PDF; minuto zero não significa que não
            jogou.
          </p>
          <p>
            PDF: {p.review.source.parsed.teams[0].name}{" "}
            {p.review.source.parsed.teams[0].score} ×{" "}
            {p.review.source.parsed.teams[1].score}{" "}
            {p.review.source.parsed.teams[1].name}.{" "}
            {manualTotals
              ? `Súmula salva: ${manualTotals.teams.home.points} × ${manualTotals.teams.away.points}.`
              : "Sem súmula manual salva para combinar."}
          </p>
          {sides.map((side) => {
            const sourceSide = (
                side === (p.review.document.invertSides ? "away" : "home")
                  ? 0
                  : 1
              ) as 0 | 1,
              team = p.review.source.parsed.teams[sourceSide],
              mappings = p.review.document.mappings
                .filter((m) => m.sourceSide === sourceSide)
                .sort(
                  (a, b) =>
                    Number(a.jersey) - Number(b.jersey) ||
                    a.jersey.length - b.jersey.length,
                );
            return (
              <fieldset key={side} disabled={disabled}>
                <legend>
                  {loaded.game[side].name} ·{" "}
                  {
                    mappings.filter(
                      (m) => rows[rowKey(sourceSide, m.sourceIndex)]?.starter,
                    ).length
                  }
                  /5 titulares
                </legend>
                <ol className="pdf-rows">
                  {mappings.map((m) => {
                    const key = rowKey(sourceSide, m.sourceIndex),
                      choice = rows[key],
                      player = team.players[m.sourceIndex],
                      markers = sourceMarkers(p.review.source.parsed, player);
                    return (
                      <li key={key}>
                        <strong>
                          #{m.jersey} · {player.name}
                        </strong>
                        <p>
                          {markers.participation === "unknown"
                            ? "PDF: participação desconhecida."
                            : markers.participation === "played"
                              ? "PDF: há participação ou fatos registrados."
                              : "PDF: não jogou informado."}{" "}
                          {markers.starter ? "Titular informado no PDF." : ""}{" "}
                          {markers.captain ? "Capitão informado no PDF." : ""}
                        </p>
                        <label>
                          Participação
                          <select
                            aria-label={`Participação ${team.name} linha ${m.sourceIndex + 1}`}
                            value={choice?.played ?? ""}
                            onChange={(e) =>
                              change(() =>
                                setRows({
                                  ...rows,
                                  [key]: {
                                    played: e.target.value as Choice["played"],
                                    starter:
                                      e.target.value === "played" &&
                                      !!choice?.starter,
                                  },
                                }),
                              )
                            }
                          >
                            <option value="">Escolha a participação</option>
                            <option value="played">Jogou</option>
                            <option value="did_not_play">Não jogou</option>
                          </select>
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            aria-label={`Titular ${team.name} linha ${m.sourceIndex + 1}`}
                            checked={!!choice?.starter}
                            disabled={choice?.played !== "played"}
                            onChange={(e) =>
                              change(() =>
                                setRows({
                                  ...rows,
                                  [key]: {
                                    ...choice,
                                    starter: e.target.checked,
                                  },
                                }),
                              )
                            }
                          />{" "}
                          Titular
                        </label>
                      </li>
                    );
                  })}
                </ol>
                <label>
                  Capitão
                  <select
                    aria-label={`Capitão de ${loaded.game[side].name}`}
                    value={captains[side]}
                    onChange={(e) =>
                      change(() =>
                        setCaptains({ ...captains, [side]: e.target.value }),
                      )
                    }
                  >
                    <option value="">Escolha o capitão</option>
                    {mappings.map((m) => (
                      <option
                        key={m.rosterEntryId}
                        value={m.rosterEntryId ?? ""}
                      >
                        #{m.jersey} · {team.players[m.sourceIndex].name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Técnico
                  <select
                    aria-label={`Técnico de ${loaded.game[side].name}`}
                    value={staff[side].coach}
                    onChange={(e) =>
                      change(() =>
                        setStaff({
                          ...staff,
                          [side]: { coach: e.target.value, assistant: "" },
                        }),
                      )
                    }
                  >
                    <option value="">Escolha o técnico</option>
                    <option value="captain">
                      Capitão assume (sem técnico próprio)
                    </option>
                    {loaded.staff[side].items
                      .filter((s) => s.role === "head")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.person.name}
                          {s.active ? "" : " · vínculo histórico"}
                        </option>
                      ))}
                  </select>
                </label>
                {staff[side].coach && staff[side].coach !== "captain" && (
                  <label>
                    Ass. Técnico
                    <select
                      aria-label={`Ass. Técnico de ${loaded.game[side].name}`}
                      value={staff[side].assistant}
                      onChange={(e) =>
                        change(() =>
                          setStaff({
                            ...staff,
                            [side]: {
                              ...staff[side],
                              assistant: e.target.value,
                            },
                          }),
                        )
                      }
                    >
                      <option value="">Sem assistente</option>
                      {loaded.staff[side].items
                        .filter((s) => s.role === "assistant")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.person.name}
                            {s.active ? "" : " · vínculo histórico"}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {loaded.staff[side].hasMore && (
                  <button onClick={() => void moreStaff(side)}>
                    Mais comissão de {loaded.game[side].name}
                  </button>
                )}
              </fieldset>
            );
          })}
          <fieldset disabled={disabled}>
            <legend>Escolher fontes do resultado</legend>
            <label>
              Placar e pontos
              <select
                aria-label="Fonte do placar e pontos"
                value={authority.scorePoints}
                onChange={(e) =>
                  change(() =>
                    setAuthority({
                      ...authority,
                      scorePoints: e.target
                        .value as PdfAuthority["scorePoints"],
                    }),
                  )
                }
              >
                <option value="pdf">PDF</option>
                {loaded.sheet && (
                  <option value="sheet">Súmula manual salva</option>
                )}
              </select>
            </label>
            <label>
              Períodos
              <select
                aria-label="Fonte dos períodos"
                value={authority.periodScores}
                onChange={(e) =>
                  change(() =>
                    setAuthority({
                      ...authority,
                      periodScores: e.target
                        .value as PdfAuthority["periodScores"],
                    }),
                  )
                }
              >
                <option value="none">Indisponíveis / não publicar</option>
                {capabilities.periodScores && <option value="pdf">PDF</option>}
                {loaded.sheet && (
                  <option value="sheet">Súmula manual salva</option>
                )}
              </select>
            </label>
            {(
              [
                ["playerAdvanced", "Estatísticas avançadas dos atletas"],
                ["foulsReceived", "Faltas recebidas"],
                ["teamAdvanced", "Indicadores coletivos"],
                ["gameAdvanced", "Indicadores gerais"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <select
                  aria-label={`Fonte de ${label.toLowerCase()}`}
                  value={authority[key]}
                  onChange={(e) =>
                    change(() =>
                      setAuthority({
                        ...authority,
                        [key]: e.target.value as "pdf" | "none",
                      }),
                    )
                  }
                >
                  <option value="none">Indisponíveis / não publicar</option>
                  {(key === "playerAdvanced" || capabilities[key]) && (
                    <option value="pdf">PDF</option>
                  )}
                </select>
              </label>
            ))}
            <label>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => change(() => setAccepted(e.target.checked))}
              />{" "}
              Aceitar divergências entre as fontes ou número do jogo
            </label>
            <label>
              Motivo da publicação do PDF
              <textarea
                maxLength={500}
                value={reason}
                onChange={(e) => change(() => setReason(e.target.value))}
              />
            </label>
            <p>
              Correções, combinação com súmula ou divergências exigem motivo de
              10 a 500 caracteres. Salvar a preparação não publica.
            </p>
          </fieldset>
          <div className="competition-actions">
            <button
              disabled={
                p.disabled ||
                busy ||
                conflict ||
                !!pendingPublish.current ||
                !!ack.current
              }
              onClick={() => void save()}
            >
              {pendingSave.current
                ? "Repetir salvamento da preparação"
                : "Salvar preparação"}
            </button>
            {ready && !edited && !published && (
              <button
                disabled={
                  p.disabled || busy || conflict || !!pendingSave.current
                }
                onClick={() => void publish()}
              >
                {ack.current
                  ? "Recuperar resultado publicado"
                  : pendingPublish.current
                    ? "Repetir publicação do PDF"
                    : "Publicar preparação salva"}
              </button>
            )}
            <button
              disabled={busy || p.disabled || uncertain || !!ack.current}
              onClick={() => void load()}
            >
              Preparar nova revisão
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (mayLeave()) {
                  setLoaded(null);
                  setEdited(false);
                  setUncertain(false);
                  ack.current = null;
                  pendingSave.current = null;
                  pendingPublish.current = null;
                  setError("");
                }
              }}
            >
              Voltar às associações do PDF
            </button>
          </div>
          {(published || ack.current || loaded.state.published) && (
            <p>
              <a
                href={`/resultado.html#${loaded.game.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver resultado publicado
              </a>
            </p>
          )}
        </>
      )}
      <PublicationHistory
        gameId={p.game.id}
        enabled={!p.disabled && !busy}
        onSessionLost={p.onSessionLost}
      />
    </section>
  );
}
