import { z } from "zod";
import { publicPlayerProfileSchema } from "./contract";
import { confirmedPlayerGameSchema } from "./participation-contract";
import { playerHonorSchema, playerTeamPlacementSchema } from "./career-source";
import { profileQuerySchema } from "./query-contract";
import {
  statisticsSummarySchema,
  statisticsRowSchema,
} from "../statistics/page-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  count = z.number().int().min(0).max(2147483647);
const summary = statisticsSummarySchema.safeExtend({
  registrationIds: z
    .array(uuid)
    .min(1)
    .max(10000)
    .refine((v) => new Set(v).size === v.length),
});
const context = confirmedPlayerGameSchema.shape.fact.shape.context;
const history = z
  .object({
    disputeId: uuid,
    context,
    registration: confirmedPlayerGameSchema.shape.fact.shape.registration,
    names: statisticsRowSchema.shape.names,
    teamNames: statisticsRowSchema.shape.teamNames,
    registrationNames: statisticsRowSchema.shape.registrationNames,
    jerseys: statisticsRowSchema.shape.jerseys,
    relatedGames: count,
    playedGames: count,
    firstGameDate: z.iso.date().nullable(),
    lastGameDate: z.iso.date().nullable(),
    unknownDates: z.boolean(),
  })
  .strict()
  .refine((h) => h.playedGames <= h.relatedGames);
export const playerProfilePageSchema = z
  .object({
    kind: z.literal("confirmed-player-profile-page-v1"),
    personId: uuid,
    query: profileQuerySchema,
    identity: z
      .object({
        name: z.string().min(1).max(120),
        nickname: z.string().max(120).nullable(),
        origin: z
          .object({
            kind: z.enum(["profile", "game", "honor"]),
            id: uuid,
            version: count.min(1),
            publishedAt: z.iso.datetime({ offset: true }),
          })
          .strict(),
        metadata: publicPlayerProfileSchema.shape.person.nullable(),
      })
      .strict(),
    contexts: z
      .array(z.object({ disputeId: uuid, context }).strict())
      .max(20000),
    statistics: z
      .object({
        status: z.enum(["available", "no-played-games", "mixed-minimums"]),
        minimumSeconds: count.min(1).nullable(),
        summary: summary.nullable(),
        relatedGames: count,
        phaseCoverage: z
          .object({
            regularGames: count,
            playoffGames: count,
            unknownGames: count,
          })
          .strict(),
      })
      .strict(),
    honors: z.array(playerHonorSchema).max(10000),
    teamPlacements: z.array(playerTeamPlacementSchema).max(10000),
    games: z
      .object({
        items: z.array(confirmedPlayerGameSchema).max(20),
        page: count.min(1),
        pageSize: z.literal(20),
        total: count,
        totalPages: count.min(1),
      })
      .strict(),
    history: z.array(history).max(10000),
  })
  .strict()
  .superRefine((p, c) => {
    const s = p.statistics,
      g = p.games;
    if (
      (s.status === "available") !== (s.summary !== null) ||
      (s.summary?.personId !== undefined &&
        s.summary.personId !== p.personId) ||
      (p.identity.metadata !== null && p.identity.metadata.id !== p.personId) ||
      g.page !== p.query.page ||
      g.totalPages !== Math.max(1, Math.ceil(g.total / 20)) ||
      g.page > g.totalPages ||
      g.items.length !==
        Math.min(20, Math.max(0, g.total - (g.page - 1) * 20)) ||
      new Set(g.items.map((x) => x.fact.gameId)).size !== g.items.length ||
      g.items.some((x) => x.fact.person.id !== p.personId) ||
      p.honors.some((x) => x.recipient.personId !== p.personId) ||
      new Set(p.contexts.map((x) => x.disputeId)).size !== p.contexts.length
    )
      c.addIssue({
        code: "custom",
        message: "Página do atleta inconsistente.",
      });
  });
export type PlayerProfilePage = z.infer<typeof playerProfilePageSchema>;
