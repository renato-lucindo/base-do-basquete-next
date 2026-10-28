import { z } from "zod";
import { entrantReferenceSchema } from "./crossings";
import { tieCriterionSchema } from "./contract";
import {
  regulationStateSchema,
  regulationVersionSchema,
  saveRegulationSchema,
} from "./persistence-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  integer = z
    .number()
    .int()
    .min(Number.MIN_SAFE_INTEGER)
    .max(Number.MAX_SAFE_INTEGER),
  count = z.number().int().min(0).max(10000),
  positive = z.number().int().min(1).max(2147483647),
  revision = z.number().int().min(0).max(2147483647),
  score = integer.min(0),
  ids = z.array(uuid).max(10000),
  source = z
    .object({ kind: z.enum(["sheet", "pdf"]), version: positive })
    .strict();
const row = z
  .object({
    registrationId: uuid,
    games: count,
    playedGames: count,
    awardedGames: count,
    scoreGamesCovered: count,
    wins: count,
    losses: count,
    leaguePoints: integer,
    pointsFor: score.nullable(),
    pointsAgainst: score.nullable(),
    difference: integer.nullable(),
    position: z.number().int().min(1).max(1000).nullable(),
    tied: z.boolean(),
  })
  .strict();
const outcomeLineage = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("played"),
      gameId: uuid,
      publicationVersion: positive,
      pointsSource: source,
    })
    .strict(),
  z
    .object({
      kind: z.literal("awarded"),
      gameId: uuid,
      occurrenceId: uuid,
      version: positive,
    })
    .strict(),
]);
const standings = z
  .object({
    algorithmVersion: z.literal("outcome-standings-v1"),
    status: z.enum(["empty", "provisional"]),
    rows: z.array(row).max(1000),
    unresolvedTies: z.array(z.array(uuid).max(1000)).max(1000),
    tieSteps: z
      .array(
        z
          .object({
            criterion: tieCriterionSchema,
            registrationIds: z.array(uuid).max(1000),
            gameCount: count,
            blocked: z.boolean(),
            values: z
              .array(
                z
                  .object({ registrationId: uuid, value: integer.nullable() })
                  .strict(),
              )
              .max(1000),
          })
          .strict(),
      )
      .max(6000),
    lineage: z.array(outcomeLineage).max(10000),
  })
  .strict();
const entry = z
  .object({
    reference: entrantReferenceSchema,
    status: z.enum(["ready", "pending"]),
    registrationId: uuid.nullable(),
    needs: z
      .enum([
        "group_tie",
        "group_results",
        "series_result",
        "upstream_conflict",
      ])
      .nullable(),
  })
  .strict();
const seriesResult = z
  .object({
    algorithmVersion: z.literal("outcome-series-v1"),
    status: z.enum(["complete", "pending", "tied"]),
    winnerRegistrationId: uuid.nullable(),
    homeWins: count,
    awayWins: count,
    gamesPlayed: count,
    playedGames: count,
    awardedGames: count,
    outcomesCounted: count,
    scoreGamesCovered: count,
    totals: z
      .object({ homePoints: score, awayPoints: score })
      .strict()
      .nullable(),
    nextSlot: z.number().int().min(1).max(7).nullable(),
    needs: z.enum(["score_or_decision", "decision", "games"]).nullable(),
    lineage: z
      .array(
        z.union(
          outcomeLineage.options.map((s) =>
            s.extend({ slot: z.number().int().min(1).max(7) }),
          ),
        ),
      )
      .max(7),
  })
  .strict();
export const regulationProjectionSchema = z
  .object({
    algorithmVersion: z.literal("organized-v1"),
    status: z.literal("preview"),
    disputeId: uuid,
    regulationVersion: positive,
    groupPhases: z
      .array(
        z
          .object({
            phaseId: uuid,
            groups: z
              .array(
                z
                  .object({
                    groupId: uuid,
                    pendingGameIds: ids,
                    excludedGameIds: ids,
                    standings,
                  })
                  .strict(),
              )
              .max(1000),
          })
          .strict(),
      )
      .max(64),
    series: z
      .array(
        z
          .object({
            id: uuid,
            phaseId: uuid,
            home: entry,
            away: entry,
            status: z.enum([
              "ready",
              "pending",
              "complete",
              "tied",
              "conflict",
            ]),
            result: seriesResult.nullable(),
            conflicts: z
              .array(
                z
                  .object({
                    code: z.enum([
                      "duplicate_entrant",
                      "opponents_changed",
                      "unresolved_entrants",
                      "unresolved_results",
                      "invalid_sequence",
                    ]),
                    gameIds: ids,
                  })
                  .strict(),
              )
              .max(4),
          })
          .strict(),
      )
      .max(256),
    lineage: z
      .array(
        z
          .object({
            gameId: uuid,
            gameVersion: positive,
            publicationVersion: revision,
            occurrenceVersion: revision,
            withdrawalVersions: z
              .array(z.object({ id: uuid, version: positive }).strict())
              .max(2),
          })
          .strict(),
      )
      .max(10000),
  })
  .strict();
const saved = regulationStateSchema.shape;
export const regulationViewSchema = z
  .object({
    disputeId: saved.disputeId,
    version: saved.version,
    definition: saved.definition,
    savedAt: saved.savedAt,
    contextFingerprint: saved.contextFingerprint,
    history: saved.history,
    hasMore: saved.hasMore,
    registrationIds: z.array(uuid).max(1000),
    hasPublishedResults: z.boolean(),
    preview: regulationProjectionSchema.nullable(),
  })
  .strict();
export const regulationVersionViewSchema = z
  .object(regulationVersionSchema.shape)
  .omit({ context: true })
  .extend({ preview: regulationProjectionSchema })
  .strict();
export const previewRegulationSchema = z
  .object({
    expectedVersion: saveRegulationSchema.shape.expectedVersion,
    expectedContextFingerprint:
      saveRegulationSchema.shape.expectedContextFingerprint,
    definition: saveRegulationSchema.shape.definition,
  })
  .strict();
export const regulationPreviewResultSchema = z
  .object({
    disputeId: uuid,
    baseVersion: saveRegulationSchema.shape.expectedVersion,
    contextFingerprint: saved.contextFingerprint,
    definition: saved.definition.unwrap(),
    hasPublishedResults: z.boolean(),
    before: regulationProjectionSchema.nullable(),
    after: regulationProjectionSchema,
  })
  .strict();
export type RegulationView = z.infer<typeof regulationViewSchema>;
export type PreviewRegulation = z.infer<typeof previewRegulationSchema>;
export type RegulationPreviewResult = z.infer<
  typeof regulationPreviewResultSchema
>;
