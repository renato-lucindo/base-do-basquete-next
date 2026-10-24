import { z } from "zod";
import { persistedSheetSchema } from "../games/sheet-contract";
export const publishSheetSchema = z
  .object({
    requestId: z.uuid(),
    gameId: z.uuid(),
    gameVersion: z.number().int().min(1).max(2147483646),
    basePublicationVersion: z.number().int().min(0).max(2147483646),
    source: z
      .object({
        kind: z.literal("sheet"),
        baseSheetVersion: z.number().int().min(0).max(2147483646),
        document: persistedSheetSchema,
      })
      .strict(),
    reason: z.string().trim().max(500),
    fallback: z.boolean(),
  })
  .strict()
  .refine(
    (c) =>
      (c.basePublicationVersion === 0 && !c.fallback) || c.reason.length >= 10,
    {
      message: "Informe o motivo da revisão ou fallback (10 a 500 caracteres).",
    },
  );
export type PublishSheet = z.infer<typeof publishSheetSchema>;
const count = z.number().int().min(0).max(2147483647),
  version = z.number().int().min(1).max(2147483647);
const person = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120),
    nickname: z.string().max(120).nullable(),
  })
  .strict();
const registration = z
  .object({
    registrationId: z.uuid(),
    name: z.string().min(1).max(120),
    team: z
      .object({
        id: z.uuid(),
        name: z.string().min(1).max(120),
        abbreviation: z.string().max(20).nullable(),
      })
      .strict(),
  })
  .strict();
const teamFacts = z
  .object({
    points: count,
    periods: z.array(count).min(4).max(12),
    freeMade: count,
    freeTaken: count,
    freeConceded: count,
    coachC: count,
    coachB: count,
    coachStatus: z.enum(["eligible", "GD", "D"]),
    foulsByPeriod: z.array(count).min(4).max(12),
  })
  .strict();
const playerFacts = z
  .object({
    person,
    registrationId: z.uuid(),
    side: z.enum(["home", "away"]),
    jersey: z.string().regex(/^(00|0|[1-9][0-9]?)$/u),
    played: z.boolean(),
    starter: z.boolean(),
    captain: z.boolean(),
    two: count,
    three: count,
    free: count,
    points: count,
    fouls: count,
    technical: count,
    unsportsmanlike: count,
    status: z.enum(["eligible", "excluded", "GD", "D"]),
  })
  .strict();
const staff = z
  .object({
    captain: person.nullable(),
    coach: person.nullable(),
    assistant: person.nullable(),
    captainIsCoach: z.boolean(),
  })
  .strict();
export const publicGameSchema = z
  .object({
    id: z.uuid(),
    disputeId: z.uuid(),
    version,
    publishedAt: z.iso.datetime({ offset: true }),
    gameVersion: version,
    context: z
      .object({
        championshipId: z.uuid(),
        name: z.string().min(1).max(120),
        seasonId: z.uuid(),
        year: z.number().int().min(1).max(9999),
        gender: z.enum(["feminino", "masculino"]),
        category: z.string().min(1).max(80),
        division: z.string().max(80).nullable(),
      })
      .strict(),
    game: z
      .object({
        date: z.iso.date().nullable(),
        time: z
          .string()
          .regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/u)
          .nullable(),
        timeZone: z.literal("America/Sao_Paulo"),
        venue: z.string().max(160).nullable(),
        number: z.string().max(40).nullable(),
        home: registration,
        away: registration,
      })
      .strict(),
    source: z
      .object({
        kind: z.literal("sheet"),
        version,
        rulesVersion: z.literal("FIBA_2024"),
      })
      .strict(),
    staff: z.object({ home: staff, away: staff }).strict(),
    facts: z
      .object({
        rulesVersion: z.literal("FIBA_2024"),
        periods: z.number().int().min(4).max(12),
        teams: z.object({ home: teamFacts, away: teamFacts }).strict(),
        players: z.array(playerFacts).min(10).max(24),
      })
      .strict(),
  })
  .strict()
  .superRefine((g, ctx) => {
    const fail = () =>
      ctx.addIssue({
        code: "custom",
        message: "Projeção pública inconsistente.",
      });
    if (
      g.game.home.registrationId === g.game.away.registrationId ||
      g.facts.teams.home.points === g.facts.teams.away.points ||
      new Set(g.facts.players.map((p) => p.person.id)).size !==
        g.facts.players.length
    )
      fail();
    for (const side of ["home", "away"] as const) {
      const rows = g.facts.players.filter((p) => p.side === side),
        t = g.facts.teams[side],
        s = g.staff[side];
      if (
        rows.filter((p) => p.starter).length !== 5 ||
        rows.filter((p) => p.captain).length !== 1 ||
        new Set(rows.map((p) => p.jersey)).size !== rows.length ||
        rows.some(
          (p) =>
            p.registrationId !== g.game[side].registrationId ||
            (p.starter && !p.played) ||
            p.points !== 2 * p.two + 3 * p.three + p.free ||
            (!p.played && (p.points > 0 || p.fouls > 0)),
        ) ||
        t.periods.length !== g.facts.periods ||
        t.foulsByPeriod.length !== g.facts.periods ||
        t.periods.reduce((a, b) => a + b, 0) !== t.points ||
        rows.reduce((a, p) => a + p.points, 0) !== t.points ||
        t.freeMade > t.freeTaken ||
        !s.captain ||
        !s.coach ||
        s.captain.id !== rows.find((p) => p.captain)?.person.id ||
        (s.captainIsCoach &&
          (s.coach.id !== s.captain.id || s.assistant !== null))
      )
        fail();
    }
  });
export type PublicGame = z.infer<typeof publicGameSchema>;
