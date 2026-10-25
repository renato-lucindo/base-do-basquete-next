import { z } from "zod";
import { achievementContextSchema } from "./context-contract";
import { publicPersonSchema } from "../people/contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647),
  revision = z.number().int().min(0).max(2147483646),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  stamp = z.iso.datetime({ offset: true });
const reason = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) =>
      (v === "" || Array.from(v).length >= 3) &&
      !/[\u0000\uD800-\uDFFF]/u.test(v),
    "Confira o motivo de revisão.",
  );
export const confirmAchievementsSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    expectedDraftVersion: version,
    expectedPublicationVersion: revision,
    expectedContextFingerprint: fingerprint,
    reason,
    acknowledgeImpact: z.literal(true),
  })
  .strict()
  .refine(
    (v) =>
      v.expectedPublicationVersion === 0 || Array.from(v.reason).length >= 3,
    "Revisão exige motivo.",
  );
export const publicAchievementsSchema = z
  .object({
    disputeId: uuid,
    version,
    confirmedAt: stamp,
    context: achievementContextSchema.shape.scope,
    placements: z
      .array(
        z
          .object({
            position: z.number().int().min(1).max(1000),
            registrations: z
              .array(
                z
                  .object({
                    registrationId: uuid,
                    teamId: uuid,
                    name: z.string().min(1).max(120),
                  })
                  .strict(),
              )
              .min(1)
              .max(1000),
          })
          .strict(),
      )
      .max(1000),
    honors: z
      .array(
        z
          .object({
            id: uuid,
            title: z.string().min(2).max(80),
            athletes: z
              .array(
                publicPersonSchema
                  .pick({ name: true, nickname: true, publicBirthYear: true })
                  .extend({ personId: uuid })
                  .strict(),
              )
              .min(1)
              .max(1000),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict()
  .refine((v) => {
    const ids = v.placements.flatMap((g) =>
      g.registrations.map((r) => r.registrationId),
    );
    return (
      ids.length <= 1000 &&
      new Set(ids).size === ids.length &&
      new Set(v.placements.map((g) => g.position)).size ===
        v.placements.length &&
      new Set(v.honors.map((h) => h.id)).size === v.honors.length &&
      v.honors.reduce((n, h) => n + h.athletes.length, 0) <= 10000 &&
      v.honors.every(
        (h) =>
          new Set(h.athletes.map((p) => p.personId)).size === h.athletes.length,
      )
    );
  }, "Premiação pública inconsistente.");
const header = z
  .object({
    version,
    draftVersion: version,
    confirmedAt: stamp,
    actorId: uuid,
    reason,
  })
  .strict();
export const achievementPublicationVersionSchema = header
  .extend({
    disputeId: uuid,
    contextFingerprint: fingerprint,
    snapshot: publicAchievementsSchema,
  })
  .strict()
  .refine(
    (v) =>
      v.snapshot.disputeId === v.disputeId &&
      v.snapshot.version === v.version &&
      v.snapshot.confirmedAt === v.confirmedAt,
  );
export const achievementPublicationStateSchema = z
  .object({
    disputeId: uuid,
    version: z.number().int().min(0).max(2147483647),
    draftVersion: z.number().int().min(0).max(2147483647),
    confirmedDraftVersion: version.nullable(),
    contextFingerprint: fingerprint,
    confirmedContextFingerprint: fingerprint.nullable(),
    sourceChanged: z.boolean(),
    draftChanged: z.boolean(),
    published: publicAchievementsSchema.nullable(),
    history: z.array(header).max(20),
    hasMore: z.boolean(),
  })
  .strict()
  .refine(
    (s) =>
      s.version === 0
        ? s.published === null &&
          s.confirmedDraftVersion === null &&
          s.confirmedContextFingerprint === null &&
          !s.sourceChanged &&
          !s.draftChanged &&
          !s.history.length &&
          !s.hasMore
        : s.published?.disputeId === s.disputeId &&
          s.published?.version === s.version &&
          s.confirmedDraftVersion !== null &&
          s.confirmedContextFingerprint !== null &&
          s.sourceChanged ===
            (s.contextFingerprint !== s.confirmedContextFingerprint) &&
          s.draftChanged === (s.draftVersion !== s.confirmedDraftVersion),
    "Estado de confirmação inconsistente.",
  );
export type ConfirmAchievements = z.infer<typeof confirmAchievementsSchema>;
export const achievementConfirmationAckSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    version,
    draftVersion: version,
    confirmedAt: stamp,
  })
  .strict();
export type PublicAchievements = z.infer<typeof publicAchievementsSchema>;
export type AchievementPublicationState = z.infer<
  typeof achievementPublicationStateSchema
>;
