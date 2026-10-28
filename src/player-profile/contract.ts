import { z } from "zod";
import { publicPersonSchema } from "../people/contract";

const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647),
  expectedVersion = z.number().int().min(0).max(2147483646),
  stamp = z.iso.datetime({ offset: true });
const reason = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) =>
      v.length <= 2000 &&
      (v === "" || Array.from(v).length >= 3) &&
      !/[\u0000\uD800-\uDFFF]/u.test(v),
    "Confira o motivo da revisão.",
  );
const textLimits: Record<string, number> = {
  name: 120,
  nickname: 120,
  position: 80,
  originCity: 120,
  originState: 80,
  biography: 4000,
};
const metadata = publicPersonSchema
  .extend({ id: uuid })
  .refine(
    (p) =>
      Object.entries(p).every(
        ([key, v]) =>
          typeof v !== "string" ||
          (!/[\u0000\uD800-\uDFFF]/u.test(v) &&
            (textLimits[key] === undefined || v.length <= textLimits[key])),
      ),
    "Confira os caracteres dos metadados públicos.",
  );

export const confirmPlayerProfileSchema = z
  .object({
    commandId: uuid,
    personId: uuid,
    expectedPersonVersion: expectedVersion.refine((v) => v > 0),
    expectedPublicationVersion: expectedVersion,
    reason,
    acknowledgeImpact: z.literal(true),
  })
  .strict()
  .refine(
    (c) =>
      c.expectedPublicationVersion === 0 || Array.from(c.reason).length >= 3,
    "Revisão exige motivo.",
  );

export const playerProfileProposalSchema = z
  .object({ personId: uuid, personVersion: version, person: metadata })
  .strict()
  .refine((p) => p.person.id === p.personId);

export const publicPlayerProfileSchema = z
  .object({
    kind: z.literal("confirmed-player-profile-v1"),
    personId: uuid,
    version,
    confirmedAt: stamp,
    person: metadata,
  })
  .strict()
  .refine((p) => p.person.id === p.personId);

const header = z
  .object({
    version,
    personVersion: version,
    confirmedAt: stamp,
    actorId: uuid,
    reason,
  })
  .strict();
export const playerProfileVersionSchema = header
  .extend({ personId: uuid, snapshot: publicPlayerProfileSchema })
  .strict()
  .refine(
    (v) =>
      v.personId === v.snapshot.personId &&
      v.version === v.snapshot.version &&
      v.confirmedAt === v.snapshot.confirmedAt &&
      (v.version === 1 || Array.from(v.reason).length >= 3),
  );

export const playerProfileStateSchema = z
  .object({
    personId: uuid,
    personVersion: version,
    version: z.number().int().min(0).max(2147483647),
    confirmedPersonVersion: version.nullable(),
    sourceChanged: z.boolean(),
    published: publicPlayerProfileSchema.nullable(),
    history: z.array(header).max(20),
    hasMore: z.boolean(),
  })
  .strict()
  .refine((s) => {
    if (s.version === 0)
      return (
        s.published === null &&
        s.confirmedPersonVersion === null &&
        !s.sourceChanged &&
        s.history.length === 0 &&
        !s.hasMore
      );
    return (
      s.published?.personId === s.personId &&
      s.published.version === s.version &&
      s.confirmedPersonVersion !== null &&
      s.confirmedPersonVersion <= s.personVersion &&
      s.sourceChanged === (s.confirmedPersonVersion !== s.personVersion) &&
      s.history.every(
        (h, i) =>
          h.version <= s.version &&
          h.personVersion <= s.personVersion &&
          (i === 0 || h.version < s.history[i - 1].version) &&
          (h.version === 1 || Array.from(h.reason).length >= 3) &&
          (h.version !== s.version ||
            (h.personVersion === s.confirmedPersonVersion &&
              h.confirmedAt === s.published?.confirmedAt)),
      )
    );
  }, "Estado de publicação do perfil inconsistente.");

export const playerProfileAckSchema = z
  .object({
    commandId: uuid,
    personId: uuid,
    version,
    personVersion: version,
    confirmedAt: stamp,
  })
  .strict();

export type ConfirmPlayerProfile = z.infer<typeof confirmPlayerProfileSchema>;
export type PublicPlayerProfile = z.infer<typeof publicPlayerProfileSchema>;
export type PlayerProfileProposal = z.infer<typeof playerProfileProposalSchema>;
export type PlayerProfileState = z.infer<typeof playerProfileStateSchema>;
export type PlayerProfileAck = z.infer<typeof playerProfileAckSchema>;

export const playerProfileWorkspaceSchema = z
  .object({
    proposal: playerProfileProposalSchema,
    state: playerProfileStateSchema,
  })
  .strict()
  .refine(
    (w) =>
      w.proposal.personId === w.state.personId &&
      w.proposal.personVersion === w.state.personVersion,
  );
export type PlayerProfileWorkspace = z.infer<
  typeof playerProfileWorkspaceSchema
>;
