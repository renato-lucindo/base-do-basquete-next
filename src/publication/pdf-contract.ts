import { z } from "zod";
import { pdfSupplementSchema } from "./pdf-selection";
import { pdfAuthoritySchema } from "./pdf-authority";
import { publicGameSchema } from "./contract";
const version = z.number().int().min(1).max(2147483647),
  count = z.number().int().min(0).max(2147483647);
export const publishPdfSchema = z
  .object({
    requestId: z.uuid(),
    gameId: z.uuid(),
    gameVersion: version.max(2147483646),
    basePublicationVersion: count.max(2147483646),
    source: z
      .object({
        kind: z.literal("pdf"),
        sourceId: z.uuid(),
        sourceVersion: z.literal(2),
        reviewVersion: version.max(2147483646),
      })
      .strict(),
    supplement: pdfSupplementSchema,
    authority: pdfAuthoritySchema,
    sheetVersion: version.max(2147483646).nullable(),
    reason: z.string().trim().max(500),
    acceptDivergence: z.boolean(),
  })
  .strict()
  .superRefine((c, ctx) => {
    const manual =
      c.authority.scorePoints === "sheet" ||
      c.authority.periodScores === "sheet";
    if (
      manual !== (c.sheetVersion !== null) ||
      ((manual || c.basePublicationVersion > 0 || c.acceptDivergence) &&
        c.reason.length < 10)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Informe a versão da fonte e motivo da revisão/fallback (10 a 500 caracteres).",
      });
  });
export type PublishPdf = z.infer<typeof publishPdfSchema>;
const shooting = z
  .object({ made: count, attempted: count })
  .strict()
  .refine((s) => s.made <= s.attempted);
const advanced = z
  .object({
    points: count,
    secondsPlayed: count,
    fieldGoals: shooting,
    twoPoints: shooting,
    threePoints: shooting,
    freeThrows: shooting,
    offensiveRebounds: count,
    defensiveRebounds: count,
    rebounds: count,
    assists: count,
    turnovers: count,
    steals: count,
    blocks: count,
    foulsCommitted: count,
    plusMinus: z.number().int().min(-2147483648).max(2147483647).nullable(),
    efficiency: z.number().min(-2147483648).max(2147483647),
  })
  .strict()
  .refine(
    (a) =>
      a.rebounds === a.offensiveRebounds + a.defensiveRebounds &&
      a.points ===
        2 * a.twoPoints.made + 3 * a.threePoints.made + a.freeThrows.made &&
      a.fieldGoals.made === a.twoPoints.made + a.threePoints.made &&
      a.fieldGoals.attempted ===
        a.twoPoints.attempted + a.threePoints.attempted,
  );
const collective = z
  .object({
    pointsFromTurnovers: count,
    pointsInPaint: count,
    pointsInPaintMade: count,
    pointsInPaintAttempted: count,
    secondChancePoints: count,
    fastBreakPoints: count,
    fastBreakPointsFromTurnovers: count,
    benchPoints: count,
    largestLead: count,
    largestScoringRun: count,
    pointsPerPossession: z.number().nonnegative().max(2147483647),
    timeLeadingSeconds: count,
  })
  .strict();
const person = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120),
    nickname: z.string().max(120).nullable(),
  })
  .strict();
const player = z
  .object({
    person,
    registrationId: z.uuid(),
    side: z.enum(["home", "away"]),
    jersey: z.string().regex(/^(00|0|[1-9][0-9]?)$/u),
    played: z.boolean(),
    starter: z.boolean(),
    captain: z.boolean(),
    points: count,
    two: count,
    three: count,
    free: count,
    advanced: advanced.nullable(),
    foulsReceived: count.nullable(),
  })
  .strict();
const team = z
  .object({
    points: count,
    periods: z.array(count).min(4).max(12).nullable(),
    advanced: collective.nullable(),
  })
  .strict();
const origin = z.object({ kind: z.enum(["pdf", "sheet"]), version }).strict();
const origins = z
  .object({
    scorePoints: origin,
    periodScores: origin.nullable(),
    playerAdvanced: origin.nullable(),
    foulsReceived: origin.nullable(),
    teamAdvanced: origin.nullable(),
    gameAdvanced: origin.nullable(),
  })
  .strict();
export const publicPdfGameSchema = z
  .object({
    ...publicGameSchema.shape,
    source: z
      .object({
        kind: z.literal("pdf"),
        version,
        format: z.enum(["FIBA_GENIUS_SPORTS", "BASKETBALL_SITE"]),
        parserVersion: z.enum(["fiba-genius-v2", "basketball-site-v1"]),
      })
      .strict(),
    facts: z
      .object({
        teams: z.object({ home: team, away: team }).strict(),
        players: z.array(player).min(10).max(24),
        gameAdvanced: z
          .object({ leadChanges: count, timesTied: count })
          .strict()
          .nullable(),
        origins,
      })
      .strict(),
  })
  .strict()
  .superRefine((g, ctx) => {
    const fail = () =>
        ctx.addIssue({
          code: "custom",
          message: "Projeção PDF inconsistente ou domínio indisponível.",
        }),
      o = g.facts.origins,
      isSite = g.source.format === "BASKETBALL_SITE";
    if (
      g.source.parserVersion !==
        (isSite ? "basketball-site-v1" : "fiba-genius-v2") ||
      g.game.home.registrationId === g.game.away.registrationId ||
      g.facts.teams.home.points === g.facts.teams.away.points ||
      new Set(g.facts.players.map((p) => p.person.id)).size !==
        g.facts.players.length
    )
      fail();
    for (const v of Object.values(o))
      if (v?.kind === "pdf" && v.version !== g.source.version) fail();
    for (const k of [
      "playerAdvanced",
      "foulsReceived",
      "teamAdvanced",
      "gameAdvanced",
    ] as const)
      if (o[k] !== null && o[k]?.kind !== "pdf") fail();
    if (
      isSite &&
      [o.periodScores, o.foulsReceived, o.teamAdvanced, o.gameAdvanced].some(
        (v) => v?.kind === "pdf",
      )
    )
      fail();
    if ((o.gameAdvanced === null) !== (g.facts.gameAdvanced === null)) fail();
    for (const side of ["home", "away"] as const) {
      const rows = g.facts.players.filter((p) => p.side === side),
        t = g.facts.teams[side],
        s = g.staff[side];
      if (
        rows.filter((p) => p.starter).length !== 5 ||
        rows.filter((p) => p.captain).length !== 1 ||
        new Set(rows.map((p) => p.jersey)).size !== rows.length ||
        rows.reduce((n, p) => n + p.points, 0) !== t.points ||
        !s.captain ||
        !s.coach ||
        s.captain.id !== rows.find((p) => p.captain)?.person.id ||
        (s.captainIsCoach &&
          (s.coach.id !== s.captain.id || s.assistant !== null))
      )
        fail();
      if (
        (o.periodScores === null) !== (t.periods === null) ||
        (t.periods && t.periods.reduce((n, v) => n + v, 0) !== t.points) ||
        (o.teamAdvanced === null) !== (t.advanced === null)
      )
        fail();
      if (
        rows.some(
          (p) =>
            p.registrationId !== g.game[side].registrationId ||
            (p.starter && !p.played) ||
            p.points !== 2 * p.two + 3 * p.three + p.free ||
            (o.playerAdvanced === null) !== (p.advanced === null) ||
            (o.foulsReceived === null) !== (p.foulsReceived === null) ||
            (!p.played &&
              (p.points > 0 ||
                (p.advanced !== null &&
                  (p.advanced.secondsPlayed > 0 ||
                    p.advanced.fieldGoals.attempted > 0 ||
                    p.advanced.freeThrows.attempted > 0 ||
                    p.advanced.rebounds > 0 ||
                    p.advanced.assists > 0 ||
                    p.advanced.turnovers > 0 ||
                    p.advanced.steals > 0 ||
                    p.advanced.blocks > 0 ||
                    p.advanced.foulsCommitted > 0)) ||
                (p.foulsReceived ?? 0) > 0)),
        )
      )
        fail();
    }
    const h = g.facts.teams.home.periods,
      a = g.facts.teams.away.periods;
    if ((h === null) !== (a === null) || (h && a && h.length !== a.length))
      fail();
    if (h && a)
      for (let n = 4; n < h.length; n++)
        if (
          h.slice(0, n).reduce((s, v) => s + v, 0) !==
          a.slice(0, n).reduce((s, v) => s + v, 0)
        )
          fail();
  });
export const publicResultSchema = z.union([
  publicGameSchema,
  publicPdfGameSchema,
]);
export type PublicPdfGame = z.infer<typeof publicPdfGameSchema>;
export type PublicResult = z.infer<typeof publicResultSchema>;
