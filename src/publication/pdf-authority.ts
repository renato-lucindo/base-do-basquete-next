import { z } from "zod";
import type { PdfReviewSnapshot } from "../boxscore/source-contract";
import type { PersistedSheet } from "../games/sheet-contract";
import { deriveManualFacts } from "./manual";
import { resolvePdfSelection, type PdfSupplement } from "./pdf-selection";
import { comparePublicationSources, type ComparableGame } from "./comparison";
export const pdfAuthoritySchema = z
  .object({
    scorePoints: z.enum(["pdf", "sheet"]),
    periodScores: z.enum(["pdf", "sheet", "none"]),
    playerAdvanced: z.enum(["pdf", "none"]),
    foulsReceived: z.enum(["pdf", "none"]),
    teamAdvanced: z.enum(["pdf", "none"]),
    gameAdvanced: z.enum(["pdf", "none"]),
  })
  .strict();
export type PdfAuthority = z.infer<typeof pdfAuthoritySchema>;
export function preparePdfFacts(
  review: PdfReviewSnapshot,
  supplement: PdfSupplement,
  choice: PdfAuthority,
  manual?: { document: PersistedSheet; version: number },
  reason = "",
  acceptDivergence = false,
) {
  const selected = resolvePdfSelection(review, supplement),
    a = pdfAuthoritySchema.parse(choice),
    p = review.source.parsed;
  const fail = (message: string) => {
    throw Error(message);
  };
  const sides = ["home", "away"] as const;
  const sourceSide = (side: (typeof sides)[number]) =>
    side === (review.document.invertSides ? "away" : "home") ? 0 : 1;
  const manualNeeded = a.scorePoints === "sheet" || a.periodScores === "sheet";
  if (
    manualNeeded &&
    (!manual ||
      !Number.isInteger(manual.version) ||
      manual.version < 1 ||
      reason.trim().length < 10 ||
      reason.trim().length > 500)
  )
    fail(
      "Informe fonte manual salva e motivo do fallback (10 a 500 caracteres).",
    );
  const m = manualNeeded && manual ? deriveManualFacts(manual.document) : null;
  if (
    m &&
    (m.players.length !== selected.participants.length ||
      selected.participants.some(
        (r) =>
          !m.players.some(
            (q) => q.rosterEntryId === r.rosterEntryId && q.side === r.side,
          ),
      ))
  )
    fail(
      "Confira todos os relacionados das duas fontes antes de combinar domínios.",
    );
  if (a.periodScores === "pdf" && p.teams.some((t) => t.periodScores === null))
    fail("Esta fonte não fornece períodos reais.");
  if (
    a.foulsReceived === "pdf" &&
    p.teams.some((t) => t.players.some((r) => r.foulsReceived === null))
  )
    fail("Esta fonte não fornece faltas recebidas completas.");
  if (a.teamAdvanced === "pdf" && p.teams.some((t) => !t.teamStatistics))
    fail("Esta fonte não fornece indicadores coletivos.");
  if (a.gameAdvanced === "pdf" && !p.gameStatistics)
    fail("Esta fonte não fornece indicadores gerais.");
  // Comparable IDs are contextual roster memberships. Persistence resolves their person IDs afresh.
  const comparable = (kind: "pdf" | "sheet"): ComparableGame => {
    const team = (side: (typeof sides)[number]) => {
      const t = p.teams[sourceSide(side)];
      const rows =
        kind === "pdf"
          ? selected.participants
              .filter((r) => r.side === side && r.played)
              .map((r) => {
                const q = t.players[r.sourceIndex];
                return {
                  playerId: r.rosterEntryId,
                  jerseyNumber: r.jersey,
                  points: q.points,
                  twoPointMade: q.twoPoints.made,
                  threePointMade: q.threePoints.made,
                  freeThrowMade: q.freeThrows.made,
                };
              })
          : m!.players
              .filter((r) => r.side === side && r.played)
              .map((r) => ({
                playerId: r.rosterEntryId,
                jerseyNumber: r.jersey,
                points: r.points,
                twoPointMade: r.two,
                threePointMade: r.three,
                freeThrowMade: r.free,
              }));
      // Side constants are identity tokens here; neither names nor jersey numbers identify teams.
      return {
        registrationId:
          side === "home"
            ? "00000000-0000-4000-8000-000000000001"
            : "00000000-0000-4000-8000-000000000002",
        score: kind === "pdf" ? t.score : m!.teams[side].points,
        periodScores: kind === "pdf" ? t.periodScores : m!.teams[side].periods,
        players: rows,
      };
    };
    return {
      disputeId: review.document.disputeId,
      home: team("home"),
      away: team("away"),
    };
  };
  const comparison = m
    ? comparePublicationSources(comparable("pdf"), comparable("sheet"))
    : null;
  if (
    comparison?.errors.some(
      (e) => e.code === "INGESTION_PARTICIPATION_MISMATCH",
    )
  )
    fail(
      "As participações das fontes precisam ser reconciliadas antes de combinar domínios.",
    );
  if (
    comparison &&
    !comparison.compatible &&
    (!acceptDivergence || reason.trim().length < 10)
  )
    fail("Confirme a divergência e informe o motivo antes de combinar fontes.");
  const origin = {
    kind: "pdf" as const,
    sourceId: review.source.id,
    sourceVersion: review.source.version,
    reviewVersion: review.version,
  };
  const origins = Object.fromEntries(
    Object.entries(a).map(([k, v]) => [
      k,
      v === "none"
        ? null
        : v === "pdf"
          ? origin
          : { kind: "sheet" as const, version: manual!.version },
    ]),
  );
  const teams = Object.fromEntries(
    sides.map((side) => {
      const t = p.teams[sourceSide(side)];
      return [
        side,
        {
          points: a.scorePoints === "pdf" ? t.score : m!.teams[side].points,
          periods:
            a.periodScores === "none"
              ? null
              : a.periodScores === "pdf"
                ? t.periodScores
                : m!.teams[side].periods,
          advanced: a.teamAdvanced === "pdf" ? t.teamStatistics! : null,
        },
      ];
    }),
  ) as Record<
    (typeof sides)[number],
    {
      points: number;
      periods: number[] | null;
      advanced: (typeof p.teams)[number]["teamStatistics"] | null;
    }
  >;
  if (teams.home.points === teams.away.points)
    fail("O resultado final não pode estar empatado.");
  if (teams.home.periods && teams.away.periods) {
    if (
      sides.some(
        (side) =>
          teams[side].periods!.reduce((sum, n) => sum + n, 0) !==
          teams[side].points,
      )
    )
      fail("Os períodos não correspondem ao placar escolhido.");
    for (let n = 4; n < teams.home.periods.length; n++)
      if (
        teams.home.periods.slice(0, n).reduce((s, v) => s + v, 0) !==
        teams.away.periods.slice(0, n).reduce((s, v) => s + v, 0)
      )
        fail("Prorrogação sem empate anterior.");
  }
  const players = selected.participants.map((r) => {
    const q = p.teams[r.sourceSide].players[r.sourceIndex],
      b = m?.players.find((row) => row.rosterEntryId === r.rosterEntryId);
    const basic =
      a.scorePoints === "pdf"
        ? {
            points: q.points,
            two: q.twoPoints.made,
            three: q.threePoints.made,
            free: q.freeThrows.made,
          }
        : { points: b!.points, two: b!.two, three: b!.three, free: b!.free };
    const advanced =
      a.playerAdvanced === "none"
        ? null
        : {
            points: q.points,
            secondsPlayed: q.secondsPlayed,
            fieldGoals: q.fieldGoals,
            twoPoints: q.twoPoints,
            threePoints: q.threePoints,
            freeThrows: q.freeThrows,
            offensiveRebounds: q.offensiveRebounds,
            defensiveRebounds: q.defensiveRebounds,
            rebounds: q.rebounds,
            assists: q.assists,
            turnovers: q.turnovers,
            steals: q.steals,
            blocks: q.blocks,
            foulsCommitted: q.foulsCommitted,
            plusMinus: q.plusMinus,
            efficiency: q.efficiency,
          };
    return {
      ...r,
      ...basic,
      advanced,
      foulsReceived: a.foulsReceived === "pdf" ? q.foulsReceived : null,
    };
  });
  return {
    teams,
    players,
    staff: selected.staff,
    gameAdvanced: a.gameAdvanced === "pdf" ? p.gameStatistics! : null,
    origins,
    comparison,
  };
}
