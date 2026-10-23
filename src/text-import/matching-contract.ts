import { z } from "zod";
import { personListingSchema } from "../people/contract";
import { playerDraftSchema, ROW_LIMIT } from "./contract";
export const importCandidateSchema = z
  .object({
    id: z.uuid(),
    version: z.number().int().positive(),
    data: playerDraftSchema.extend({
      dominantHand: z.enum(["right", "left", "both"]).nullable(),
      positions: z.array(z.string().max(80)).max(80),
    }),
    sex: z.enum(["female", "male"]).nullable(),
    hasAthlete: z.boolean(),
    contexts: personListingSchema.shape.items.element.shape.contexts,
    roster: z
      .object({
        id: z.uuid(),
        version: z.number().int().positive(),
        jersey: z.string().nullable(),
      })
      .strict()
      .nullable(),
    activeRegistrationId: z.uuid().nullable(),
  })
  .strict();
export const matchingProbeSchema = z
  .object({
    rowId: z.uuid(),
    name: z.string().trim().min(1).max(120),
    nickname: z.string().max(120).nullable(),
    birthDate: z.iso.date().nullable(),
    birthYear: z.number().int().min(1).max(9999).nullable(),
    federationRegistration: z
      .string()
      .regex(/^[0-9]{6}$/u)
      .nullable(),
  })
  .strict();
export const matchingRequestSchema = z
  .object({
    disputeId: z.uuid(),
    registrationId: z.uuid().nullable(),
    players: z.array(matchingProbeSchema).min(1).max(50),
  })
  .strict();
export const matchingResultSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            rowId: z.uuid(),
            status: z.enum([
              "new",
              "registration",
              "name",
              "suggestion",
              "ambiguous",
            ]),
            candidates: z.array(importCandidateSchema).max(5),
            hasMore: z.boolean(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
export type ImportCandidate = z.infer<typeof importCandidateSchema>;
export type MatchingRequest = z.infer<typeof matchingRequestSchema>;
export type MatchingResult = z.infer<typeof matchingResultSchema>;
export const IMPORT_ROW_LIMIT = ROW_LIMIT;
