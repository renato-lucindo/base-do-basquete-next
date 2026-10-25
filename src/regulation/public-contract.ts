import { z } from "zod";
import { gameSchema } from "../games/contract";
import { publicGameSchema } from "../publication/contract";
import { competitiveFactSchema } from "./contract";
import { gameOccurrenceSchema } from "./occurrences";
import { organizedInputSchema } from "./organized";
import { regulationDefinitionSchema } from "./persistence-contract";
import { regulationProjectionSchema } from "./view-contract";

const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647),
  revision = z.number().int().min(0).max(2147483647),
  publicGame = gameSchema.safeExtend({
    id: uuid,
    disputeId: uuid,
    homeRegistrationId: uuid,
    awayRegistrationId: uuid,
    version,
    timeZone: z.literal("America/Sao_Paulo"),
  }),
  registration = publicGameSchema.shape.game.shape.home
    .omit({ registrationId: true })
    .extend({ id: uuid }),
  publicOccurrence = gameOccurrenceSchema.omit({ reason: true }),
  publicWithdrawal = z
    .object({
      id: uuid,
      version,
      registrationId: uuid,
      policy: z.enum(["keep_results", "exclude_results"]),
      previousGameIds: z.array(uuid).max(10000),
    })
    .strict(),
  shared = {
    disputeId: uuid,
    publicationVersion: version,
    regulationVersion: version,
    publishedAt: z.iso.datetime({ offset: true }),
    context: publicGameSchema.shape.context,
    definition: regulationDefinitionSchema,
    registrations: z.array(registration).max(1000),
  };

const source = z
  .object({
    schemaVersion: z.literal("public-standings-source-v1"),
    ...shared,
    games: z.array(publicGame).max(10000),
    publishedGames: z.array(competitiveFactSchema).max(10000),
    occurrences: z.array(publicOccurrence).max(10000),
    withdrawals: z.array(publicWithdrawal).max(1000),
  })
  .strict();
type Source = z.infer<typeof source>;

/** Validation adapter only: no private motive is requested or returned. */
export function publicCompetitiveContext(s: Source) {
  return {
    disputeId: s.disputeId,
    regulationVersion: s.regulationVersion,
    registrationIds: s.registrations.map((r) => r.id),
    rules: s.definition.occurrenceRules,
    games: s.games.map((g) => ({
      id: g.id,
      version: g.version,
      disputeId: g.disputeId,
      homeRegistrationId: g.homeRegistrationId,
      awayRegistrationId: g.awayRegistrationId,
    })),
    publishedGames: s.publishedGames,
    occurrences: s.occurrences.map((o) => ({
      ...o,
      reason: "Decisão publicada",
    })),
    withdrawals: s.withdrawals.map((w) => ({
      ...w,
      reason: "Decisão publicada",
    })),
  };
}
function sameIds(actual: string[], expected: string[]) {
  const set = new Set(actual);
  return (
    set.size === actual.length &&
    actual.length === expected.length &&
    expected.every((id) => set.has(id))
  );
}
function assignedIds(d: z.infer<typeof regulationDefinitionSchema>) {
  return [
    ...d.groupPhases.flatMap((p) => p.groups.flatMap((g) => g.gameIds)),
    ...d.series.flatMap((s) => s.games.map((g) => g.gameId)),
  ];
}
export const publicStandingsSourceSchema = source.superRefine((s, c) => {
  const d = s.definition;
  const valid =
    sameIds(
      s.registrations.map((r) => r.id),
      d.registrationIds,
    ) &&
    sameIds(
      s.games.map((g) => g.id),
      assignedIds(d),
    ) &&
    organizedInputSchema.safeParse({
      context: publicCompetitiveContext(s),
      groupPhases: d.groupPhases.map((p) => ({
        phaseId: p.phaseId,
        rules: p.rules,
        groups: p.groups.map(({ id, registrationIds, gameIds }) => ({
          id,
          registrationIds,
          gameIds,
        })),
      })),
      series: d.series.map(({ id, phaseId, format, home, away, games }) => ({
        id,
        phaseId,
        format,
        home,
        away,
        games,
      })),
    }).success;
  if (!valid)
    c.addIssue({
      code: "custom",
      message: "Fonte pública fora do conjunto confirmado.",
    });
});
export type PublicStandingsSource = z.infer<typeof publicStandingsSourceSchema>;

const competitiveGame = publicGame
  .safeExtend({
    state: z.enum(["played", "awarded", "pending", "excluded", "conflict"]),
    needs: z
      .enum([
        "result",
        "postponed",
        "interrupted",
        "withdrawal_decision",
        "withdrawal_review",
        "occurrence_review",
      ])
      .nullable(),
    score: z
      .object({
        homePoints: z.number().int().min(0).max(2147483647),
        awayPoints: z.number().int().min(0).max(2147483647),
      })
      .strict()
      .nullable(),
    winnerRegistrationId: uuid.nullable(),
    publicationVersion: revision,
    sourceKind: z.enum(["sheet", "pdf", "administrative"]).nullable(),
  })
  .superRefine((g, c) => {
    const counted = g.state === "played" || g.state === "awarded";
    if (
      (counted &&
        (!g.winnerRegistrationId ||
          ![g.homeRegistrationId, g.awayRegistrationId].includes(
            g.winnerRegistrationId,
          ) ||
          g.needs !== null ||
          g.sourceKind === null)) ||
      (!counted &&
        (g.score !== null ||
          g.winnerRegistrationId !== null ||
          g.sourceKind !== null)) ||
      (g.state === "played" &&
        (!g.score ||
          g.publicationVersion === 0 ||
          g.sourceKind === "administrative")) ||
      (g.state === "awarded" && g.sourceKind !== "administrative") ||
      (g.score &&
        (g.score.homePoints === g.score.awayPoints ||
          (g.winnerRegistrationId === g.homeRegistrationId) !==
            g.score.homePoints > g.score.awayPoints))
    )
      c.addIssue({
        code: "custom",
        message: "Resultado público inconsistente.",
      });
  });
export const publicStandingsSchema = z
  .object({
    schemaVersion: z.literal("public-standings-v1"),
    ...shared,
    games: z.array(competitiveGame).max(10000),
    projection: regulationProjectionSchema.extend({
      status: z.literal("provisional"),
    }),
  })
  .strict()
  .superRefine((s, c) => {
    const d = s.definition,
      p = s.projection,
      regs = new Set(d.registrationIds),
      games = new Set(assignedIds(d)),
      gameCatalog = new Map(s.games.map((g) => [g.id, g])),
      phaseCatalog = new Map(d.groupPhases.map((p) => [p.phaseId, p])),
      seriesCatalog = new Map(d.series.map((n) => [n.id, n]));
    let valid =
      p.disputeId === s.disputeId &&
      p.regulationVersion === s.regulationVersion &&
      sameIds(
        s.registrations.map((r) => r.id),
        d.registrationIds,
      ) &&
      sameIds(
        s.games.map((g) => g.id),
        [...games],
      ) &&
      sameIds(
        p.lineage.map((l) => l.gameId),
        [...games],
      ) &&
      sameIds(
        p.groupPhases.map((g) => g.phaseId),
        d.groupPhases.map((g) => g.phaseId),
      ) &&
      sameIds(
        p.series.map((n) => n.id),
        d.series.map((n) => n.id),
      ) &&
      p.lineage.every((l) => {
        const g = gameCatalog.get(l.gameId);
        return (
          g?.version === l.gameVersion &&
          g.publicationVersion === l.publicationVersion
        );
      }) &&
      s.games.every(
        (g) =>
          g.disputeId === s.disputeId &&
          regs.has(g.homeRegistrationId) &&
          regs.has(g.awayRegistrationId),
      );
    for (const phase of p.groupPhases) {
      const declared = phaseCatalog.get(phase.phaseId),
        groupCatalog = new Map(declared?.groups.map((g) => [g.id, g]) ?? []);
      valid &&=
        !!declared &&
        sameIds(
          phase.groups.map((g) => g.groupId),
          declared.groups.map((g) => g.id),
        );
      for (const g of phase.groups) {
        const declaredGroup = groupCatalog.get(g.groupId),
          ids = new Set(declaredGroup?.gameIds ?? []),
          members = new Set(declaredGroup?.registrationIds ?? []);
        valid &&=
          !!declaredGroup &&
          sameIds(
            g.standings.rows.map((r) => r.registrationId),
            declaredGroup.registrationIds,
          ) &&
          sameIds(
            [
              ...g.pendingGameIds,
              ...g.excludedGameIds,
              ...g.standings.lineage.map((l) => l.gameId),
            ],
            [...ids],
          ) &&
          g.pendingGameIds.every((id) =>
            ["pending", "conflict"].includes(gameCatalog.get(id)?.state ?? ""),
          ) &&
          g.excludedGameIds.every(
            (id) => gameCatalog.get(id)?.state === "excluded",
          ) &&
          g.standings.lineage.every((l) => {
            const game = gameCatalog.get(l.gameId);
            return (
              game?.state === l.kind &&
              (l.kind !== "played" ||
                l.publicationVersion === game.publicationVersion)
            );
          }) &&
          [
            ...g.standings.unresolvedTies.flat(),
            ...g.standings.tieSteps.flatMap((t) => [
              ...t.registrationIds,
              ...t.values.map((v) => v.registrationId),
            ]),
          ].every((id) => members.has(id));
      }
    }
    for (const n of p.series) {
      const declared = seriesCatalog.get(n.id),
        ids = new Set(declared?.games.map((g) => g.gameId) ?? []);
      valid &&=
        !!declared &&
        n.phaseId === declared.phaseId &&
        JSON.stringify(n.home.reference) === JSON.stringify(declared.home) &&
        JSON.stringify(n.away.reference) === JSON.stringify(declared.away) &&
        [
          n.home.registrationId,
          n.away.registrationId,
          n.result?.winnerRegistrationId,
        ].every((id) => id == null || regs.has(id)) &&
        [
          ...n.conflicts.flatMap((v) => v.gameIds),
          ...(n.result?.lineage.map((v) => v.gameId) ?? []),
        ].every((id) => ids.has(id));
    }
    if (!valid)
      c.addIssue({
        code: "custom",
        message: "Classificação pública fora do conjunto confirmado.",
      });
  });
export type PublicStandings = z.infer<typeof publicStandingsSchema>;
