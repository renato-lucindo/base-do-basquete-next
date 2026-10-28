import { z } from "zod";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  revision = z.number().int().min(0).max(2147483647),
  positive = revision.min(1),
  reason = z.string().trim().min(3).max(2000),
  stamp = z.iso.datetime({ offset: true }),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u);
const games = z
  .array(uuid)
  .max(10000)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Não repita o mesmo jogo na relação anterior.",
  );
const policy = z.enum(["keep_results", "exclude_results"]).nullable();
export const saveRegistrationWithdrawalSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    registrationId: uuid,
    withdrawalId: uuid,
    expectedVersion: revision.max(2147483646),
    expectedRegulationVersion: revision,
    expectedContextFingerprint: fingerprint,
    policy,
    previousGameIds: games,
    reason,
    acknowledgeImpact: z.boolean(),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      v.policy === null &&
      (v.expectedVersion === 0 || v.previousGameIds.length !== 0)
    )
      c.addIssue({
        code: "custom",
        message:
          "Retire uma desistência existente sem apagar seu histórico de jogos.",
      });
    if (new TextEncoder().encode(JSON.stringify(v)).length > 1048576)
      c.addIssue({
        code: "custom",
        message: "Relação de desistência excede o limite da operação.",
      });
  });
export const registrationWithdrawalVersionSchema = z
  .object({
    id: uuid,
    registrationId: uuid,
    disputeId: uuid,
    version: positive,
    regulationVersion: revision,
    contextFingerprint: fingerprint,
    policy,
    previousGameIds: games,
    reason,
    actorId: uuid,
    savedAt: stamp,
  })
  .strict()
  .refine(
    (v) => v.policy !== null || v.previousGameIds.length === 0,
    "Retirada de desistência não contém nova relação de jogos.",
  );
export const registrationWithdrawalStateSchema = z
  .object({
    registrationId: uuid,
    disputeId: uuid,
    regulationVersion: revision,
    contextFingerprint: fingerprint,
    previousGameIds: games,
    head: registrationWithdrawalVersionSchema.nullable(),
    history: z
      .array(
        z
          .object({
            id: uuid,
            version: positive,
            reason,
            actorId: uuid,
            savedAt: stamp,
            active: z.boolean(),
          })
          .strict(),
      )
      .max(20),
    hasMore: z.boolean(),
  })
  .strict()
  .superRefine((s, c) => {
    const h = s.head;
    if (
      (h &&
        (h.registrationId !== s.registrationId ||
          h.disputeId !== s.disputeId ||
          h.regulationVersion > s.regulationVersion ||
          s.history.some((v) => v.id !== h.id || v.version > h.version))) ||
      (!h && s.history.length > 0) ||
      new Set(s.history.map((v) => v.version)).size !== s.history.length
    )
      c.addIssue({
        code: "custom",
        message: "Histórico não corresponde à inscrição solicitada.",
      });
  });
export const registrationWithdrawalSaveResultSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    registrationId: uuid,
    withdrawalId: uuid,
    version: positive,
    savedAt: stamp,
    contextFingerprint: fingerprint,
  })
  .strict();
export type SaveRegistrationWithdrawal = z.infer<
  typeof saveRegistrationWithdrawalSchema
>;
export type RegistrationWithdrawalState = z.infer<
  typeof registrationWithdrawalStateSchema
>;
export type RegistrationWithdrawalVersion = z.infer<
  typeof registrationWithdrawalVersionSchema
>;
