import { z } from "zod";
import { registrationSchema } from "../teams/contract";
import { rosterEntrySchema } from "./roster-contract";
import { membershipMicros } from "./membership-time";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  positive = z.number().int().min(1).max(2147483647),
  revision = z.number().int().min(0).max(2147483647),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  stamp = z.iso
    .datetime({ offset: true })
    .refine((v) => membershipMicros(v) !== null),
  jersey = rosterEntrySchema.shape.jersey,
  membership = rosterEntrySchema.omit({ active: true }).extend({
    id: uuid,
    personId: uuid,
    registrationId: uuid,
    disputeId: uuid,
    version: positive,
    startedAt: stamp,
    endedAt: stamp.nullable(),
  }),
  registration = registrationSchema.extend({
    id: uuid,
    disputeId: uuid,
    teamId: uuid,
    version: positive,
  });
export const saveTransferSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    sourceEntryId: uuid,
    expectedSourceVersion: positive.max(2147483646),
    destinationRegistrationId: uuid,
    expectedDestinationVersion: positive,
    expectedRegulationVersion: revision,
    expectedContextFingerprint: fingerprint,
    newEntryId: uuid,
    jersey,
    reason: z.string().trim().min(3).max(2000),
    acknowledgeImpact: z.boolean(),
  })
  .strict()
  .refine(
    (c) => c.newEntryId !== c.sourceEntryId,
    "Retorno exige vínculo novo.",
  );
export type SaveTransfer = z.infer<typeof saveTransferSchema>;

export const transferContextSchema = z
  .object({
    disputeId: uuid,
    personId: uuid,
    regulation: z
      .object({
        version: revision,
        transfers: z.enum(["allowed", "forbidden"]).nullable(),
      })
      .strict()
      .refine((r) => r.version !== 0 || r.transfers === null),
    contextFingerprint: fingerprint,
    effectiveAt: stamp,
    registrations: z.array(registration).max(1000),
    memberships: z.array(membership).max(2000),
  })
  .strict()
  .superRefine((s, c) => {
    const registrations = new Set(s.registrations.map((r) => r.id)),
      activePeople = new Set<string>(),
      activeJerseys = new Set<string>(),
      byPerson = new Map<string, typeof s.memberships>();
    let valid =
      registrations.size === s.registrations.length &&
      new Set(s.memberships.map((m) => m.id)).size === s.memberships.length &&
      s.registrations.every((r) => r.disputeId === s.disputeId);
    for (const m of s.memberships) {
      const start = membershipMicros(m.startedAt),
        end = m.endedAt === null ? null : membershipMicros(m.endedAt);
      valid &&=
        m.disputeId === s.disputeId &&
        registrations.has(m.registrationId) &&
        start !== null &&
        (m.endedAt === null || (end !== null && end >= start!));
      const rows = byPerson.get(m.personId) ?? [];
      rows.push(m);
      byPerson.set(m.personId, rows);
      if (m.endedAt === null) {
        valid &&= !activePeople.has(m.personId);
        activePeople.add(m.personId);
        if (m.jersey !== null) {
          const key = `${m.registrationId}:${m.jersey}`;
          valid &&= !activeJerseys.has(key);
          activeJerseys.add(key);
        }
      }
    }
    // Inspect chronological periods without choosing a person's identity by list order.
    if (valid)
      for (const rows of byPerson.values()) {
        rows.sort((a, b) => {
          const aStart = membershipMicros(a.startedAt)!,
            bStart = membershipMicros(b.startedAt)!;
          if (aStart !== bStart) return aStart < bStart ? -1 : 1;
          if (a.endedAt === null || b.endedAt === null)
            return a.endedAt === b.endedAt ? 0 : a.endedAt === null ? 1 : -1;
          const aEnd = membershipMicros(a.endedAt)!,
            bEnd = membershipMicros(b.endedAt)!;
          return aEnd === bEnd ? 0 : aEnd < bEnd ? -1 : 1;
        });
        for (let i = 1; i < rows.length; i++) {
          const prior = rows[i - 1],
            next = rows[i];
          if (
            prior.endedAt === null ||
            membershipMicros(prior.endedAt)! > membershipMicros(next.startedAt)!
          )
            valid = false;
        }
      }
    if (!valid)
      c.addIssue({
        code: "custom",
        message: "Contexto de vínculos inconsistente.",
      });
  });
export type TransferContext = z.infer<typeof transferContextSchema>;
export const transferNeedSchema = z.enum([
  "context_too_large",
  "rule_required",
  "transfer_forbidden",
  "source_changed",
  "destination_changed",
  "regulation_changed",
  "context_changed",
  "jersey_in_use",
  "same_registration",
  "entry_id_used",
  "invalid_effective_time",
]);
export const transferPreviewSchema = z
  .object({
    algorithmVersion: z.literal("roster-transfer-v1"),
    status: z.literal("preview"),
    disputeId: uuid,
    personId: uuid,
    sourceEntryId: uuid,
    destinationRegistrationId: uuid,
    regulationVersion: revision,
    contextFingerprint: fingerprint,
    effectiveAt: stamp,
    ready: z.boolean(),
    needs: transferNeedSchema.nullable(),
    kind: z.enum(["transfer", "return"]).nullable(),
    plan: z
      .object({
        close: z
          .object({ id: uuid, expectedVersion: positive, endedAt: stamp })
          .strict()
          .nullable(),
        open: membership.safeExtend({
          version: z.literal(1),
          endedAt: z.null(),
        }),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((p, c) => {
    if (
      p.ready !== (p.needs === null && p.kind !== null && p.plan !== null) ||
      (!p.ready && (p.plan !== null || p.kind !== null || p.needs === null)) ||
      (p.plan &&
        (p.plan.open.id === p.sourceEntryId ||
          p.plan.open.personId !== p.personId ||
          p.plan.open.disputeId !== p.disputeId ||
          p.plan.open.registrationId !== p.destinationRegistrationId ||
          p.plan.open.startedAt !== p.effectiveAt ||
          (p.plan.close &&
            (p.plan.close.id !== p.sourceEntryId ||
              p.plan.close.endedAt !== p.effectiveAt))))
    )
      c.addIssue({
        code: "custom",
        message: "Prévia de transferência inconsistente.",
      });
  });
export type TransferPreview = z.infer<typeof transferPreviewSchema>;
