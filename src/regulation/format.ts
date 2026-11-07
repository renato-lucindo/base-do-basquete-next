import { z } from "zod";
import { createDefaultDefinition, createFibaRules } from "./defaults";
import {
  regulationDefinitionSchema,
  type RegulationDefinition,
  type RegulationContext,
} from "./persistence-contract";
import { roundRobinRulesSchema } from "./contract";
import { occurrenceRulesSchema } from "./occurrences";
import { seriesFormatSchema } from "./series";
import { qualificationCriterionSchema } from "./qualifications";
import { tieDecisionSchema, tieNoteSchema } from "./tie-decisions";

const index = z.number().int().min(0).max(31),
  size = z.union([
    z.literal(0),
    z.literal(2),
    z.literal(4),
    z.literal(8),
    z.literal(16),
    z.literal(32),
    z.literal(64),
  ]);
export const organizationAssignmentSchema = z.discriminatedUnion("kind", [
  z.object({ gameId: z.uuid(), kind: z.literal("unassigned") }).strict(),
  z
    .object({ gameId: z.uuid(), kind: z.literal("group"), groupId: z.uuid() })
    .strict(),
  z
    .object({
      gameId: z.uuid(),
      kind: z.literal("series"),
      seriesId: z.uuid(),
      slot: z.number().int().min(1).max(7),
    })
    .strict(),
]);
export const competitionSetupSchema = z
  .object({
    schemaVersion: z.literal("competition-setup-v1"),
    mode: z.enum(["standard", "custom"]),
    groupCount: z.number().int().min(0).max(32),
    turns: z.union([z.literal(1), z.literal(2)]),
    directPerGroup: z.number().int().min(0).max(1000),
    extras: z
      .array(
        z
          .object({
            position: z.number().int().min(1).max(1000),
            count: z.number().int().min(1).max(1000),
          })
          .strict(),
      )
      .max(32),
    comparison: z
      .array(qualificationCriterionSchema)
      .min(1)
      .max(8)
      .refine((v) => new Set(v).size === v.length),
    knockoutSize: size,
    seriesFormat: seriesFormatSchema,
    roundFormats: z.record(
      z.string().regex(/^(2|4|8|16|32|64)$/u),
      seriesFormatSchema,
    ),
    groupNames: z.array(z.string().trim().min(1).max(100)).max(32),
    memberships: z
      .record(z.uuid(), index.nullable())
      .refine((v) => Object.keys(v).length <= 1000),
    assignments: z
      .array(organizationAssignmentSchema)
      .max(10000)
      .refine((v) => new Set(v.map((a) => a.gameId)).size === v.length),
    manualOrder: z
      .array(z.uuid().nullable())
      .max(1000)
      .refine(
        (v) =>
          new Set(v.filter((id) => id !== null)).size ===
          v.filter((id) => id !== null).length,
      ),
    manualEntrants: z
      .record(
        z.uuid(),
        z
          .object({ home: z.uuid().nullable(), away: z.uuid().nullable() })
          .strict(),
      )
      .refine((v) => Object.keys(v).length <= 256),
    rules: roundRobinRulesSchema,
    occurrenceRules: occurrenceRulesSchema,
    tieDecisions: z.array(tieDecisionSchema).max(1000).default([]),
    tieNotes: z.array(tieNoteSchema).max(1000).default([]),
    customDefinition: regulationDefinitionSchema.nullable(),
  })
  .strict();
export type CompetitionSetup = z.infer<typeof competitionSetupSchema>;
export function defaultCompetitionSetup(): CompetitionSetup {
  return {
    schemaVersion: "competition-setup-v1",
    mode: "standard",
    groupCount: 1,
    turns: 1,
    directPerGroup: 4,
    extras: [],
    comparison: [
      "league_points_per_game",
      "difference_per_game",
      "points_for_per_game",
    ],
    knockoutSize: 4,
    seriesFormat: "single",
    roundFormats: {},
    groupNames: [],
    memberships: {},
    assignments: [],
    manualOrder: [],
    manualEntrants: {},
    rules: createFibaRules(),
    occurrenceRules: createDefaultDefinition().occurrenceRules,
    tieDecisions: [],
    tieNotes: [],
    customDefinition: null,
  };
}
type FormatContext = {
  registrationIds: string[];
  games: (RegulationContext["games"][number] & {
    stageKind?: "round_robin" | "knockout";
  })[];
};
export const knockoutPhaseNames: Record<number, string> = {
  2: "Final",
  4: "Semifinais",
  8: "Quartas de final",
  16: "Oitavas de final",
  32: "16 avos de final",
  64: "32 avos de final",
};
const lengths = {
  single: 1,
  two_leg: 2,
  best_of_3: 3,
  best_of_5: 5,
  best_of_7: 7,
};

/** Stable within each dispute. One SHA-256 namespace, disjoint 16-bit local identifiers. */
async function identifiers(disputeId: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`competition-format-v1:${disputeId}`),
  );
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return (n: number) =>
    `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 28)}${n.toString(16).padStart(4, "0")}`;
}
/** Configuration never changes a game's facts, identity or opponents. */
export async function buildCompetitionDefinition(
  disputeId: string,
  input: unknown,
  context: FormatContext,
) {
  const setup = competitionSetupSchema.parse(input),
    ids = new Set(context.registrationIds),
    gameIds = new Set(context.games.map((g) => g.id)),
    warnings: string[] = [];
  if (
    Object.keys(setup.memberships).some((id) => !ids.has(id)) ||
    setup.manualOrder.some((id) => id !== null && !ids.has(id)) ||
    Object.values(setup.manualEntrants).some((e) =>
      [e.home, e.away].some((id) => id && !ids.has(id)),
    ) ||
    setup.assignments.some((a) => !gameIds.has(a.gameId))
  )
    throw Error(
      "A configuração contém equipe ou jogo de outra disputa. Recarregue os dados.",
    );
  if (setup.mode === "custom" && setup.customDefinition) {
    const definition = structuredClone(setup.customDefinition),
      groups = definition.groupPhases.flatMap((p) => p.groups),
      catalog = new Map(context.games.map((g) => [g.id, g])),
      overrides = new Map(setup.assignments.map((a) => [a.gameId, a])),
      assigned = new Set<string>();
    for (const group of groups)
      group.gameIds = group.gameIds.filter((id) => {
        const game = catalog.get(id),
          valid =
            game &&
            !overrides.has(id) &&
            group.registrationIds.includes(game.homeRegistrationId) &&
            group.registrationIds.includes(game.awayRegistrationId);
        if (valid) assigned.add(id);
        else
          warnings.push(
            "Um jogo mudou ou recebeu outra associação. Confira sua organização.",
          );
        return !!valid;
      });
    for (const series of definition.series)
      series.games = series.games.filter((g) => {
        if (!catalog.has(g.gameId) || overrides.has(g.gameId)) return false;
        assigned.add(g.gameId);
        return true;
      });
    for (const game of context.games) {
      if (assigned.has(game.id)) continue;
      const override = overrides.get(game.id);
      if (override?.kind === "unassigned") continue;
      if (override?.kind === "series") {
        const series = definition.series.find(
          (s) => s.id === override.seriesId,
        );
        if (
          series &&
          override.slot <= lengths[series.format] &&
          !series.games.some((g) => g.slot === override.slot)
        ) {
          series.games.push({ gameId: game.id, slot: override.slot });
          assigned.add(game.id);
        }
        continue;
      }
      if (!override && game.stageKind === "knockout") continue;
      const eligible = groups.filter(
        (g) =>
          (override?.kind !== "group" || g.id === override.groupId) &&
          g.registrationIds.includes(game.homeRegistrationId) &&
          g.registrationIds.includes(game.awayRegistrationId),
      );
      if (eligible.length === 1) {
        eligible[0].gameIds.push(game.id);
        assigned.add(game.id);
      }
    }
    return {
      definition: regulationDefinitionSchema.parse(definition),
      organizationPendingGameIds: context.games
        .filter((g) => !assigned.has(g.id))
        .map((g) => g.id),
      warnings,
    };
  }
  const uid = await identifiers(disputeId),
    definition: RegulationDefinition = {
      ...createDefaultDefinition(),
      registrationIds: [...context.registrationIds],
      occurrenceRules: setup.occurrenceRules,
      tieDecisions: setup.tieDecisions,
      tieNotes: setup.tieNotes,
    },
    phaseId = uid(1),
    poolId = uid(2),
    assignments = new Map(setup.assignments.map((a) => [a.gameId, a])),
    assigned = new Set<string>();
  if (setup.groupCount) {
    const groups = Array.from({ length: setup.groupCount }, (_, i) => ({
      id: uid(100 + i),
      name:
        setup.groupNames[i] ??
        (setup.groupCount === 1
          ? "Grupo único"
          : `Grupo ${i < 26 ? String.fromCharCode(65 + i) : i + 1}`),
      registrationIds: context.registrationIds.filter((id) =>
        setup.groupCount === 1
          ? setup.memberships[id] !== null
          : setup.memberships[id] === i,
      ),
      gameIds: [] as string[],
    }));
    for (const game of context.games) {
      const assignment = assignments.get(game.id);
      if (assignment?.kind === "unassigned" || assignment?.kind === "series")
        continue;
      const matches = groups.filter(
        (g) =>
          (assignment?.kind !== "group" || assignment.groupId === g.id) &&
          g.registrationIds.includes(game.homeRegistrationId) &&
          g.registrationIds.includes(game.awayRegistrationId),
      );
      if (
        matches.length === 1 &&
        (assignment?.kind === "group" || game.stageKind !== "knockout")
      ) {
        matches[0].gameIds.push(game.id);
        assigned.add(game.id);
      }
    }
    definition.groupPhases = [
      {
        phaseId,
        name: "Classificatória",
        rules: { ...setup.rules, turns: setup.turns },
        groups,
      },
    ];
    const missing = context.registrationIds.filter(
      (id) => !groups.some((g) => g.registrationIds.includes(id)),
    );
    if (missing.length)
      warnings.push(
        `${missing.length} equipe(s) sem grupo. Os resultados continuam disponíveis.`,
      );
  }
  if (setup.knockoutSize) {
    definition.qualificationPools = [
      {
        id: poolId,
        phaseId,
        size: setup.knockoutSize,
        directPerGroup: setup.directPerGroup,
        extras: setup.extras,
        comparison: setup.comparison,
        manualOrder: setup.manualOrder,
      },
    ];
    let previous: string[] = [],
      seeds = [1, 2];
    for (let count = 4; count <= setup.knockoutSize; count *= 2)
      seeds = seeds.flatMap((seed) => [seed, count + 1 - seed]);
    for (let count: number = setup.knockoutSize; count >= 2; count /= 2) {
      const knockoutPhase = uid(1000 + count),
        current: string[] = [],
        format = setup.roundFormats[String(count)] ?? setup.seriesFormat;
      definition.knockoutPhases.push({
        id: knockoutPhase,
        name: knockoutPhaseNames[count],
      });
      for (let i = 0; i < count / 2; i++) {
        const seriesId = uid(2000 + count * 100 + i),
          manual = setup.manualEntrants[seriesId],
          first = count === setup.knockoutSize,
          home: RegulationDefinition["series"][number]["home"] = manual?.home
            ? { kind: "registration", registrationId: manual.home }
            : first
              ? { kind: "qualification_rank", poolId, position: seeds[i * 2] }
              : { kind: "series_winner", seriesId: previous[i * 2] },
          away: RegulationDefinition["series"][number]["away"] = manual?.away
            ? { kind: "registration", registrationId: manual.away }
            : first
              ? {
                  kind: "qualification_rank",
                  poolId,
                  position: seeds[i * 2 + 1],
                }
              : { kind: "series_winner", seriesId: previous[i * 2 + 1] },
          games: { gameId: string; slot: number }[] = [];
        for (const game of context.games) {
          const assignment = assignments.get(game.id);
          if (assignment?.kind !== "series" || assignment.seriesId !== seriesId)
            continue;
          if (
            assignment.slot > lengths[format] ||
            games.some((g) => g.slot === assignment.slot)
          ) {
            warnings.push(
              "Há atribuições fora do formato da série; os jogos permanecem disponíveis.",
            );
            continue;
          }
          games.push({ gameId: game.id, slot: assignment.slot });
          assigned.add(game.id);
        }
        definition.series.push({
          id: seriesId,
          phaseId: knockoutPhase,
          name: count === 2 ? "Final" : `${knockoutPhaseNames[count]} ${i + 1}`,
          format,
          home,
          away,
          games,
        });
        current.push(seriesId);
      }
      previous = current;
    }
    if (
      setup.groupCount * setup.directPerGroup +
        setup.extras.reduce((n, e) => n + e.count, 0) !==
        setup.knockoutSize &&
      !setup.manualOrder.length
    )
      warnings.push(
        "As vagas não completam a eliminatória. Ajuste as vagas ou escolha os classificados manualmente.",
      );
  }
  if (!setup.groupCount && !setup.knockoutSize)
    warnings.push("Defina as fases quando desejar organizar os resultados.");
  return {
    definition: regulationDefinitionSchema.parse(definition),
    organizationPendingGameIds: context.games
      .filter((g) => !assigned.has(g.id))
      .map((g) => g.id),
    warnings,
  };
}
