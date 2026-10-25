import { z } from "zod";
import { publicGameSchema } from "../publication/contract";
import {
  publicPdfGameSchema,
  publicResultSchema,
} from "../publication/pdf-contract";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  count = z.number().int().min(0).max(2147483647),
  version = count.min(1);
const origin = z.object({ kind: z.enum(["sheet", "pdf"]), version }).strict();
const coveredCount = z.object({ value: count, origin }).strict().nullable();
const publicPlayer = publicGameSchema.shape.facts.shape.players.element;
const registration = publicGameSchema.shape.game.shape.home;
export const confirmedPlayerFactSchema = z
  .object({
    normalizationVersion: z.literal("confirmed-statistics-v1"),
    gameId: uuid,
    disputeId: uuid,
    publicationVersion: version,
    publishedAt: z.iso.datetime({ offset: true }),
    context: publicGameSchema.shape.context.extend({
      championshipId: uuid,
      seasonId: uuid,
    }),
    source: z.union([
      publicGameSchema.shape.source,
      publicPdfGameSchema.shape.source,
    ]),
    phase: z.null(),
    person: publicPlayer.shape.person.extend({ id: uuid }),
    registration: registration.extend({
      registrationId: uuid,
      team: registration.shape.team.extend({ id: uuid }),
    }),
    side: z.enum(["home", "away"]),
    jersey: publicPlayer.shape.jersey,
    played: z.boolean(),
    starter: z.boolean(),
    captain: z.boolean(),
    scoring: z
      .object({
        origin,
        points: count,
        twoMade: count,
        threeMade: count,
        freeMade: count,
      })
      .strict()
      .refine((s) => s.points === 2 * s.twoMade + 3 * s.threeMade + s.freeMade)
      .nullable(),
    advanced: z
      .object({
        origin,
        statistics:
          publicPdfGameSchema.shape.facts.shape.players.element.shape.advanced.unwrap(),
      })
      .strict()
      .nullable(),
    foulsCommitted: coveredCount,
    foulsReceived: coveredCount,
    discipline: publicPlayer.shape.status.nullable(),
  })
  .strict()
  .refine(
    (r) =>
      r.played
        ? r.scoring !== null
        : r.scoring === null &&
          r.advanced === null &&
          r.foulsCommitted === null &&
          r.foulsReceived === null &&
          r.discipline === null,
    "Participação e cobertura inconsistentes.",
  );
export type ConfirmedPlayerFact = z.infer<typeof confirmedPlayerFactSchema>;

/** Only confirmed public snapshots are inputs; this module never reads live identities. */
export function normalizeConfirmedGame(input: unknown): ConfirmedPlayerFact[] {
  const game = publicResultSchema.parse(input),
    base = {
      normalizationVersion: "confirmed-statistics-v1" as const,
      gameId: game.id,
      disputeId: game.disputeId,
      publicationVersion: game.version,
      publishedAt: game.publishedAt,
      context: game.context,
      source: game.source,
      phase: null,
    };
  const rows =
    "origins" in game.facts
      ? game.facts.players.map((p) => {
          const facts = game.facts;
          if (!("origins" in facts))
            throw Error("Domínio de publicação inconsistente.");
          const advanced = p.played ? p.advanced : null;
          return confirmedPlayerFactSchema.parse({
            ...base,
            person: p.person,
            registration: game.game[p.side],
            side: p.side,
            jersey: p.jersey,
            played: p.played,
            starter: p.starter,
            captain: p.captain,
            scoring: p.played
              ? {
                  origin: facts.origins.scorePoints,
                  points: p.points,
                  twoMade: p.two,
                  threeMade: p.three,
                  freeMade: p.free,
                }
              : null,
            advanced: advanced
              ? { origin: facts.origins.playerAdvanced, statistics: advanced }
              : null,
            foulsCommitted: advanced
              ? {
                  origin: facts.origins.playerAdvanced,
                  value: advanced.foulsCommitted,
                }
              : null,
            foulsReceived:
              p.played && p.foulsReceived !== null
                ? {
                    origin: facts.origins.foulsReceived,
                    value: p.foulsReceived,
                  }
                : null,
            discipline: null,
          });
        })
      : game.facts.players.map((p) =>
          confirmedPlayerFactSchema.parse({
            ...base,
            person: p.person,
            registration: game.game[p.side],
            side: p.side,
            jersey: p.jersey,
            played: p.played,
            starter: p.starter,
            captain: p.captain,
            scoring: p.played
              ? {
                  origin: { kind: "sheet", version: game.source.version },
                  points: p.points,
                  twoMade: p.two,
                  threeMade: p.three,
                  freeMade: p.free,
                }
              : null,
            advanced: null,
            foulsCommitted: p.played
              ? {
                  value: p.fouls,
                  origin: { kind: "sheet", version: game.source.version },
                }
              : null,
            foulsReceived: null,
            discipline: p.played ? p.status : null,
          }),
        );
  if (new Set(rows.map((r) => r.person.id)).size !== rows.length)
    throw Error("A publicação repete uma identidade após normalização.");
  return rows;
}
