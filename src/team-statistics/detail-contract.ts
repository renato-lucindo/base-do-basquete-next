import { z } from "zod";
import { publicGameSchema } from "../publication/contract";
import { publicPdfGameSchema } from "../publication/pdf-contract";
import { statisticsRowSchema } from "../statistics/page-contract";
import { teamIdentitySchema, teamRowSchema, teamsPageSchema } from "./contract";
import { teamDetailQuerySchema } from "./detail-query";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  count = z.number().int().min(0).max(2147483647),
  version = count.min(1);
const base = {
  disputeId: uuid,
  teamId: uuid,
  version,
  confirmedAt: z.iso.datetime({ offset: true }),
  context: publicGameSchema.shape.context,
  query: teamDetailQuerySchema,
  coverage: teamsPageSchema.shape.coverage,
};
const rosterRow = z
  .object({
    personId: uuid,
    names: statisticsRowSchema.shape.names,
    nicknames: statisticsRowSchema.shape.nicknames,
    jerseys: statisticsRowSchema.shape.jerseys,
    relatedGames: count.min(1),
    playedGames: count,
    statistics: statisticsRowSchema.nullable(),
    firstGameDate: z.iso.date().nullable(),
    lastGameDate: z.iso.date().nullable(),
    unknownDates: z.boolean(),
  })
  .strict()
  .refine(
    (r) =>
      r.playedGames <= r.relatedGames &&
      (r.statistics !== null) === r.playedGames > 0 &&
      (!r.statistics ||
        (r.statistics.personId === r.personId &&
          r.statistics.gamesPlayed === r.playedGames)),
  );
const gameRow = z
  .object({
    gameId: uuid,
    publicationVersion: version,
    publishedAt: z.iso.datetime({ offset: true }),
    phase: z.enum(["round_robin", "knockout"]).nullable(),
    side: z.enum(["home", "away"]),
    game: publicGameSchema.shape.game,
    context: publicGameSchema.shape.context,
    score: z.object({ home: count, away: count }).strict(),
    source: z.union([
      publicGameSchema.shape.source,
      publicPdfGameSchema.shape.source,
    ]),
    collective:
      publicPdfGameSchema.shape.facts.shape.teams.shape.home.shape.advanced,
    collectiveOrigin:
      publicPdfGameSchema.shape.facts.shape.origins.shape.teamAdvanced,
  })
  .strict()
  .refine((g) => (g.collective === null) === (g.collectiveOrigin === null));
const pagination = {
  page: count.min(1),
  pageSize: z.literal(20),
  total: count.max(10000),
  totalPages: count.min(1),
};
const detail = z
  .object({
    ...base,
    kind: z.literal("confirmed-team-detail-v1"),
    registrationId: uuid,
    identity: teamIdentitySchema,
    statistics: teamRowSchema.nullable(),
    roster: z
      .object({ ...pagination, items: z.array(rosterRow).max(20) })
      .strict(),
    games: z
      .object({ ...pagination, items: z.array(gameRow).max(20) })
      .strict(),
  })
  .strict()
  .superRefine((d, c) => {
    const paginated = [d.games, d.roster].every(
      (p) =>
        p.totalPages === Math.max(1, Math.ceil(p.total / 20)) &&
        p.page <= p.totalPages &&
        p.items.length ===
          Math.min(20, Math.max(0, p.total - (p.page - 1) * 20)),
    );
    if (
      !paginated ||
      d.games.page !== d.query.page ||
      d.roster.page !== d.query.rosterPage ||
      d.identity.teamId !== d.teamId ||
      d.identity.registrationId !== d.registrationId ||
      (d.statistics !== null &&
        (d.statistics.registrationId !== d.registrationId ||
          d.statistics.teamId !== d.teamId ||
          d.statistics.gamesPlayed !== d.games.total)) ||
      (d.statistics === null) !== (d.games.total === 0) ||
      new Set(d.games.items.map((g) => g.gameId)).size !==
        d.games.items.length ||
      new Set(d.roster.items.map((r) => r.personId)).size !==
        d.roster.items.length ||
      d.roster.items.some(
        (r) =>
          r.statistics &&
          (r.statistics.teamId !== d.teamId ||
            r.statistics.registrationId !== d.registrationId),
      ) ||
      d.games.items.some(
        (g) =>
          g.game[g.side].registrationId !== d.registrationId ||
          g.game[g.side].team.id !== d.teamId,
      )
    )
      c.addIssue({
        code: "custom",
        message: "Detalhe público da equipe inconsistente.",
      });
  });
const selection = z
  .object({
    ...base,
    kind: z.literal("confirmed-team-selection-v1"),
    registrations: z.array(teamIdentitySchema).min(2).max(1000),
  })
  .strict()
  .refine(
    (d) =>
      new Set(d.registrations.map((r) => r.registrationId)).size ===
        d.registrations.length &&
      d.registrations.every((r) => r.teamId === d.teamId),
  );
export const teamDetailPageSchema = z.union([detail, selection]);
export type TeamDetailPage = z.infer<typeof teamDetailPageSchema>;
// Kept as a type boundary: no full publication or unrelated players are returned.
export type ConfirmedTeamGame = z.infer<typeof gameRow>;
