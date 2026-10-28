import { z } from "zod";
import { achievementContextSchema } from "./context-contract";
import { achievementDraftStateSchema } from "./draft-contract";
import { achievementDraftVersionSchema } from "./draft-contract";
import { achievementPublicationStateSchema } from "./publication-contract";
import { placementSourceSchema, placementSuggestionSchema } from "./contract";
import { publicPersonSchema } from "../people/contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  revision = z.number().int().min(0).max(2147483647),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  name = z.string().min(1).max(100);
export const achievementPublicationSummarySchema = z
  .object(achievementPublicationStateSchema.shape)
  .omit({ published: true })
  .strict()
  .refine((s) =>
    s.version === 0
      ? s.confirmedDraftVersion === null &&
        s.confirmedContextFingerprint === null &&
        !s.sourceChanged &&
        !s.draftChanged
      : s.confirmedDraftVersion !== null &&
        s.confirmedContextFingerprint !== null &&
        s.sourceChanged ===
          (s.contextFingerprint !== s.confirmedContextFingerprint) &&
        s.draftChanged === (s.draftVersion !== s.confirmedDraftVersion),
  );
export const achievementWorkspaceSchema = z
  .object({
    disputeId: uuid,
    scope: achievementContextSchema.shape.scope,
    contextFingerprint: fingerprint,
    regulationVersion: revision,
    registrations: achievementContextSchema.shape.registrations,
    sourceOptions: z
      .object({
        groups: z
          .array(
            z
              .object({ phaseId: uuid, groupId: uuid, phaseName: name, name })
              .strict(),
          )
          .max(1000),
        series: z
          .array(
            z
              .object({
                id: uuid,
                name,
                format: z.enum([
                  "single",
                  "two_leg",
                  "best_of_3",
                  "best_of_5",
                  "best_of_7",
                ]),
              })
              .strict(),
          )
          .max(256),
      })
      .strict(),
    selectedPeople: z
      .array(
        publicPersonSchema
          .pick({ name: true, nickname: true, publicBirthYear: true })
          .extend({ personId: uuid, version: revision.min(1) })
          .strict(),
      )
      .max(10000),
    draft: achievementDraftStateSchema,
    publication: achievementPublicationSummarySchema,
  })
  .strict()
  .superRefine((w, c) => {
    const registrations = w.registrations.map((r) => r.id),
      people = w.selectedPeople.map((p) => p.personId),
      selected = new Set(
        w.draft.draft?.honors.flatMap((h) => h.personIds) ?? [],
      );
    if (
      w.draft.disputeId !== w.disputeId ||
      w.publication.disputeId !== w.disputeId ||
      w.draft.contextFingerprint !== w.contextFingerprint ||
      w.publication.contextFingerprint !== w.contextFingerprint ||
      w.publication.draftVersion !== w.draft.version ||
      new Set(registrations).size !== registrations.length ||
      w.registrations.some((r) => r.disputeId !== w.disputeId) ||
      new Set(people).size !== people.length ||
      selected.size !== people.length ||
      people.some((id) => !selected.has(id))
    )
      c.addIssue({ code: "custom", message: "Área de premiações incoerente." });
  });
export const previewAchievementsSchema = z
  .object({
    disputeId: uuid,
    expectedContextFingerprint: fingerprint,
    source: placementSourceSchema.nullable(),
  })
  .strict();
export const achievementSuggestionViewSchema = z
  .object({
    disputeId: uuid,
    contextFingerprint: fingerprint,
    suggestion: placementSuggestionSchema,
  })
  .strict()
  .refine((v) => v.suggestion.disputeId === v.disputeId);
export type AchievementWorkspace = z.infer<typeof achievementWorkspaceSchema>;
export const achievementDraftVersionViewSchema = z
  .object(achievementDraftVersionSchema.shape)
  .omit({ contextSnapshot: true })
  .extend({ registrations: achievementContextSchema.shape.registrations })
  .strict()
  .refine(
    (v) =>
      v.draft.disputeId === v.disputeId &&
      v.registrations.every((r) => r.disputeId === v.disputeId),
  );
