import { z } from "zod";
const count = z.number().int().min(0).max(2147483647);
export const reviseTeamStatisticsSchema = z
  .object({
    requestId: z.uuid(),
    gameId: z.uuid(),
    basePublicationVersion: count.min(1).max(2147483646),
    disqualifications: z.object({ home: count, away: count }).strict(),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
export type ReviseTeamStatistics = z.infer<typeof reviseTeamStatisticsSchema>;
export const teamStatisticsRevisionAckSchema = z
  .object({
    requestId: z.uuid(),
    gameId: z.uuid(),
    version: count.min(1),
    sourceVersion: count.min(1),
    publishedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
