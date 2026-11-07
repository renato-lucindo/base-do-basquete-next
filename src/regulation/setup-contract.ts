import { z } from "zod";
import { competitionSetupSchema } from "./format";
import {
  regulationContextSchema,
  regulationDefinitionSchema,
} from "./persistence-contract";
import { regulationProjectionSchema } from "./view-contract";
const revision = z.number().int().min(0).max(2147483646),
  stamp = z.iso.datetime({ offset: true });
export const setupRegistrationSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(1).max(120),
    teamName: z.string().min(1).max(120),
  })
  .strict();
export const setupGameSchema = regulationContextSchema.shape.games.element
  .extend({
    stageKind: z.enum(["round_robin", "knockout"]),
    number: z.string().max(40).nullable(),
    date: z.iso.date().nullable(),
  })
  .strict();
export const competitionSetupStateSchema = z
  .object({
    disputeId: z.uuid(),
    version: revision,
    savedAt: stamp.nullable(),
    document: competitionSetupSchema.nullable(),
    legacyDefinition: regulationDefinitionSchema.nullable(),
    legacyRegulationVersion: revision,
    context: regulationContextSchema,
    contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    registrations: z.array(setupRegistrationSchema).max(1000),
    games: z.array(setupGameSchema).max(10000),
    history: z
      .array(
        z
          .object({ version: revision, savedAt: stamp, actorId: z.uuid() })
          .strict(),
      )
      .max(20),
  })
  .strict();
export const saveCompetitionSetupSchema = z
  .object({
    commandId: z.uuid(),
    disputeId: z.uuid(),
    expectedVersion: revision,
    expectedContextFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    document: competitionSetupSchema,
  })
  .strict();
export const competitionSetupResultSchema = z
  .object({
    commandId: z.uuid(),
    disputeId: z.uuid(),
    version: revision.min(1),
    savedAt: stamp,
  })
  .strict();
export const competitionSetupViewSchema = competitionSetupStateSchema
  .omit({ context: true, legacyDefinition: true })
  .extend({
    document: competitionSetupSchema,
    definition: regulationDefinitionSchema,
    projection: regulationProjectionSchema,
    organizationPendingGameIds: z.array(z.uuid()).max(10000),
    warnings: z.array(z.string().max(500)).max(1000),
  })
  .strict();
export type SaveCompetitionSetup = z.infer<typeof saveCompetitionSetupSchema>;
export type CompetitionSetupView = z.infer<typeof competitionSetupViewSchema>;
