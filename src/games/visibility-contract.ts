import { z } from "zod";

const revision = z.number().int().min(0).max(2147483647);
const visibility = z.enum(["draft", "published"]);

export const gameVisibilityStateSchema = z
  .object({
    gameId: z.uuid(),
    disputeId: z.uuid(),
    version: revision,
    gameVersion: revision.min(1),
    publicationVersion: revision,
    visibility,
    reason: z.string().nullable(),
    savedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

export const saveGameVisibilitySchema = z
  .object({
    commandId: z.uuid(),
    gameId: z.uuid(),
    expectedVersion: revision.max(2147483646),
    expectedGameVersion: revision.min(1),
    expectedPublicationVersion: revision,
    visibility,
    reason: z.string().trim().min(3).max(2000),
  })
  .strict();

export const gameVisibilityResultSchema = z
  .object({
    commandId: z.uuid(),
    gameId: z.uuid(),
    version: revision.min(1),
    visibility,
    savedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type GameVisibilityState = z.infer<typeof gameVisibilityStateSchema>;
export type SaveGameVisibility = z.infer<typeof saveGameVisibilitySchema>;
