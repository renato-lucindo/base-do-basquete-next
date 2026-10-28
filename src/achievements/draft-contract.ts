import { z } from "zod";
import { achievementDraftSchema, placementSourceSchema } from "./contract";
import { achievementContextSchema } from "./context-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  stamp = z.iso.datetime({ offset: true });
export const saveAchievementDraftSchema = z
  .object({
    commandId: uuid,
    expectedVersion: z.number().int().min(0).max(2147483646),
    expectedContextFingerprint: fingerprint,
    source: placementSourceSchema.nullable(),
    draft: achievementDraftSchema,
  })
  .strict();
export const achievementDraftAckSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    version,
    savedAt: stamp,
    contextFingerprint: fingerprint,
  })
  .strict();
export const achievementDraftVersionSchema = z
  .object({
    disputeId: uuid,
    version,
    draft: achievementDraftSchema,
    source: placementSourceSchema.nullable(),
    contextSnapshot: achievementContextSchema,
    contextFingerprint: fingerprint,
    actorId: uuid,
    savedAt: stamp,
  })
  .strict()
  .refine(
    (v) =>
      v.disputeId === v.draft.disputeId &&
      v.disputeId === v.contextSnapshot.disputeId &&
      v.contextFingerprint === v.contextSnapshot.contextFingerprint,
    "Versão e contexto de premiações incompatíveis.",
  );
export const achievementDraftStateSchema = z
  .object({
    disputeId: uuid,
    version: z.number().int().min(0).max(2147483647),
    draft: achievementDraftSchema.nullable(),
    source: placementSourceSchema.nullable(),
    contextFingerprint: fingerprint,
    savedContextFingerprint: fingerprint.nullable(),
    savedAt: stamp.nullable(),
    needsReview: z.boolean(),
    history: z
      .array(z.object({ version, savedAt: stamp, actorId: uuid }).strict())
      .max(20),
    hasMore: z.boolean(),
  })
  .strict()
  .refine(
    (s) =>
      s.version === 0
        ? s.draft === null &&
          s.source === null &&
          s.savedAt === null &&
          s.savedContextFingerprint === null &&
          !s.needsReview &&
          !s.history.length &&
          !s.hasMore
        : s.draft?.disputeId === s.disputeId &&
          s.savedAt !== null &&
          s.savedContextFingerprint !== null &&
          s.needsReview ===
            (s.savedContextFingerprint !== s.contextFingerprint),
    "Estado de premiações inconsistente.",
  );
export type SaveAchievementDraft = z.infer<typeof saveAchievementDraftSchema>;
export type AchievementDraftState = z.infer<typeof achievementDraftStateSchema>;
