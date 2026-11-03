import { z } from "zod";
import { publicStandingsSourceSchema } from "./public-contract";

export const standingsPublicationPreviewSchema = z
  .object({
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    source: publicStandingsSourceSchema,
  })
  .strict();
export const confirmStandingsSchema = z
  .object({
    commandId: z.uuid(),
    disputeId: z.uuid(),
    expectedPublicationVersion: z.number().int().min(0).max(2147483646),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict();
export const standingsPublicationResultSchema = z
  .object({
    commandId: z.uuid(),
    disputeId: z.uuid(),
    publicationVersion: z.number().int().positive(),
    publishedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const publicDisputeSchema = z
  .object({
    disputeId: z.uuid(),
    context: publicStandingsSourceSchema.shape.context,
    registrations: publicStandingsSourceSchema.shape.registrations,
  })
  .strict();
export type PublicDispute = z.infer<typeof publicDisputeSchema>;
export type ConfirmStandings = z.infer<typeof confirmStandingsSchema>;
