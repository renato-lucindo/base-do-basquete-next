import { z } from "zod";
import {
  compareIngestionGame,
  type IngestionComparisonIssue,
  type IngestionGame,
} from "./comparator-reference";
const count = z.number().int().min(0).max(2147483647);
const player = z
  .object({
    playerId: z.uuid(),
    jerseyNumber: z
      .string()
      .regex(/^(00|0|[1-9][0-9]?)$/u)
      .nullable()
      .optional(),
    points: count.nullable().optional(),
    twoPointMade: count.nullable().optional(),
    threePointMade: count.nullable().optional(),
    freeThrowMade: count.nullable().optional(),
  })
  .strict();
const team = z
  .object({
    registrationId: z.uuid(),
    score: count.nullable().optional(),
    periodScores: z.array(count).min(4).max(12).nullable().optional(),
    players: z.array(player).max(12).nullable().optional(),
  })
  .strict();
export const comparableGameSchema = z
  .object({
    disputeId: z.uuid(),
    gameNumber: z.string().max(80).nullable().optional(),
    home: team,
    away: team,
  })
  .strict()
  .superRefine((g, ctx) => {
    const ids = [...(g.home.players ?? []), ...(g.away.players ?? [])].map(
      (p) => p.playerId,
    );
    if (
      g.home.registrationId === g.away.registrationId ||
      new Set(ids).size !== ids.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Identidades ou inscrições duplicadas.",
      });
  });
export type ComparableGame = z.infer<typeof comparableGameSchema>;
/** Adapt the supplied numeric-ID comparator without truncating UUIDs or changing unknown coverage. */
export function comparePublicationSources(
  expected: ComparableGame,
  actual: ComparableGame,
  options: { allowSideInversion?: boolean } = {},
) {
  const ids = new Map<string, number>(),
    reverse = new Map<number, string>();
  const slot = (id: string) => {
    let n = ids.get(id);
    if (n === undefined) {
      n = ids.size + 1;
      ids.set(id, n);
      reverse.set(n, id);
    }
    return n;
  };
  const adapt = (input: ComparableGame): IngestionGame => {
    const g = comparableGameSchema.parse(input);
    const side = (t: ComparableGame["home"]) => ({
      ...t,
      registrationId: slot(t.registrationId),
      players:
        t.players == null
          ? t.players
          : t.players.map((p) => ({ ...p, playerId: slot(p.playerId) })),
    });
    return {
      competitionId: slot(g.disputeId),
      gameNumber: g.gameNumber,
      home: side(g.home),
      away: side(g.away),
    };
  };
  const a = adapt(expected),
    b = adapt(actual),
    r = compareIngestionGame(a, b, options);
  const restore = (i: IngestionComparisonIssue): IngestionComparisonIssue => {
    const idValue = (v: unknown): unknown =>
      typeof v === "number"
        ? (reverse.get(v) ?? v)
        : Array.isArray(v)
          ? v.map(idValue)
          : v;
    const isIdentity =
      i.path === "competitionId" ||
      i.path === "participants" ||
      i.code === "INGESTION_PARTICIPATION_MISMATCH";
    return {
      ...i,
      path: i.path.replace(
        /(players\.)([0-9]+)(\.)/u,
        (_m, p, n, s) => p + reverse.get(Number(n)) + s,
      ),
      ...(isIdentity
        ? { expected: idValue(i.expected), actual: idValue(i.actual) }
        : {}),
    };
  };
  return {
    ...r,
    errors: r.errors.map(restore),
    warnings: r.warnings.map(restore),
  };
}
