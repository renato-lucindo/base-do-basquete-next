import { z } from "zod";
import { occurrenceEffectSchema } from "./occurrences";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  revision = z.number().int().min(0).max(2147483647),
  positive = revision.min(1),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  reason = z.string().trim().min(3).max(2000),
  stamp = z.iso.datetime({ offset: true });
const effect = occurrenceEffectSchema.nullable().superRefine((e, c) => {
  if (
    e?.kind === "administrative" &&
    e.decision.kind === "award" &&
    e.decision.score &&
    e.decision.score.homePoints === e.decision.score.awayPoints
  )
    c.addIssue({
      code: "custom",
      message: "Placar administrativo precisa de vencedor coerente.",
    });
});
export const saveGameOccurrenceSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    gameId: uuid,
    occurrenceId: uuid,
    expectedVersion: revision.max(2147483646),
    expectedGameVersion: positive,
    expectedPublicationVersion: revision,
    expectedRegulationVersion: revision,
    expectedContextFingerprint: fingerprint,
    effect,
    reason,
    acknowledgeImpact: z.boolean(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (
      (c.effect === null && c.expectedVersion === 0) ||
      (c.effect?.kind === "wo" && c.expectedRegulationVersion === 0)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Revise a ocorrência existente e o regulamento antes de confirmar.",
      });
    if (new TextEncoder().encode(JSON.stringify(c)).length > 65536)
      ctx.addIssue({
        code: "custom",
        message: "Ocorrência excede o limite da operação.",
      });
  });
export const gameOccurrenceVersionSchema = z
  .object({
    id: uuid,
    disputeId: uuid,
    gameId: uuid,
    version: positive,
    gameVersion: positive,
    publicationVersion: revision,
    regulationVersion: revision,
    contextFingerprint: fingerprint,
    effect,
    reason,
    actorId: uuid,
    savedAt: stamp,
  })
  .strict();
export const gameOccurrenceHistorySchema = z
  .object({
    id: uuid,
    version: positive,
    reason,
    actorId: uuid,
    savedAt: stamp,
    active: z.boolean(),
  })
  .strict();
export const gameOccurrenceStateSchema = z
  .object({
    disputeId: uuid,
    gameId: uuid,
    gameVersion: positive,
    publicationVersion: revision,
    regulationVersion: revision,
    contextFingerprint: fingerprint,
    head: gameOccurrenceVersionSchema.nullable(),
    history: z.array(gameOccurrenceHistorySchema).max(20),
    hasMore: z.boolean(),
  })
  .strict()
  .superRefine((s, c) => {
    const h = s.head;
    if (
      (h &&
        (h.disputeId !== s.disputeId ||
          h.gameId !== s.gameId ||
          h.gameVersion > s.gameVersion ||
          h.publicationVersion > s.publicationVersion ||
          h.regulationVersion > s.regulationVersion ||
          s.history.some((v) => v.id !== h.id || v.version > h.version))) ||
      (!h && s.history.length > 0) ||
      new Set(s.history.map((v) => v.version)).size !== s.history.length
    )
      c.addIssue({
        code: "custom",
        message: "Histórico não corresponde à ocorrência solicitada.",
      });
  });
export const gameOccurrenceSaveResultSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    gameId: uuid,
    occurrenceId: uuid,
    version: positive,
    savedAt: stamp,
    contextFingerprint: fingerprint,
  })
  .strict();
export type SaveGameOccurrence = z.infer<typeof saveGameOccurrenceSchema>;
export type GameOccurrenceVersion = z.infer<typeof gameOccurrenceVersionSchema>;
export type GameOccurrenceState = z.infer<typeof gameOccurrenceStateSchema>;
