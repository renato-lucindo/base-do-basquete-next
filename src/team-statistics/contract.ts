import { z } from "zod";
import { publicGameSchema } from "../publication/contract";
import { teamsQuerySchema } from "./query-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  count = z.number().int().min(0).max(2147483647),
  version = count.min(1);
export const teamRowSchema = z
  .object({
    registrationId: uuid,
    teamId: uuid,
    name: z.string().min(1).max(120),
    teamName: z.string().min(1).max(120),
    names: z.array(z.string().min(1).max(120)).min(1).max(10000),
    teamNames: z.array(z.string().min(1).max(120)).min(1).max(10000),
    gamesPlayed: count.min(1).max(10000),
    origin: z
      .object({
        gameId: uuid,
        publicationVersion: version,
        publishedAt: z.iso.datetime({ offset: true }),
      })
      .strict(),
    metrics: z
      .object({
        pointsFor: z.number().finite().nonnegative(),
        pointsAgainst: z.number().finite().nonnegative(),
        difference: z.number().finite(),
      })
      .strict(),
  })
  .strict()
  .refine((r) => r.names.includes(r.name) && r.teamNames.includes(r.teamName));
export const teamsPageSchema = z
  .object({
    kind: z.literal("confirmed-teams-page-v1"),
    disputeId: uuid,
    version,
    confirmedAt: z.iso.datetime({ offset: true }),
    context: publicGameSchema.shape.context.nullable(),
    query: teamsQuerySchema,
    coverage: z
      .object({ regularGames: count, playoffGames: count, unknownGames: count })
      .strict(),
    rows: z.array(teamRowSchema).max(20),
    page: count.min(1),
    pageSize: z.literal(20),
    total: count.max(1000),
    totalPages: count.min(1),
  })
  .strict()
  .refine(
    (p) =>
      p.query.page === p.page &&
      p.totalPages === Math.max(1, Math.ceil(p.total / 20)) &&
      p.page <= p.totalPages &&
      p.rows.length ===
        Math.min(20, Math.max(0, p.total - (p.page - 1) * 20)) &&
      new Set(p.rows.map((r) => r.registrationId)).size === p.rows.length,
  );
export type TeamsPage = z.infer<typeof teamsPageSchema>;
export type TeamRow = z.infer<typeof teamRowSchema>;
