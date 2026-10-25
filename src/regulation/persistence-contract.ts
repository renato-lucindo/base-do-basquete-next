import { z } from "zod";
import { crossingsInputSchema } from "./crossings";
import { seriesDependencyOrder } from "./crossing-graph";
import { groupPhaseInputSchema } from "./groups";
import { occurrencesInputSchema, occurrenceRulesSchema } from "./occurrences";
import { organizedInputSchema, previewOrganizedCompetition } from "./organized";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  version = z.number().int().min(1).max(2147483647),
  fingerprint = z.string().regex(/^[a-f0-9]{64}$/u),
  name = z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(
      (v) => !/[\u0000-\u001f\u007f]/u.test(v),
      "Nome contém controle inválido.",
    ),
  reason = z.string().trim().max(2000),
  stamp = z.iso.datetime({ offset: true });
const definitionShape = z
  .object({
    registrationIds: z.array(uuid).max(1000),
    transfers: z.enum(["allowed", "forbidden"]).nullable().optional(),
    occurrenceRules: occurrenceRulesSchema,
    groupPhases: z
      .array(
        z
          .object({
            phaseId: uuid,
            name,
            rules: groupPhaseInputSchema.shape.rules,
            groups: z
              .array(
                groupPhaseInputSchema.shape.groups.element.extend({ name }),
              )
              .max(1000),
          })
          .strict(),
      )
      .max(64),
    knockoutPhases: z.array(z.object({ id: uuid, name }).strict()).max(64),
    series: z
      .array(organizedInputSchema.shape.series.element.extend({ name }))
      .max(256),
  })
  .strict();
const structure = (d: z.infer<typeof definitionShape>) => ({
  groupPhases: d.groupPhases.map((p) => ({
    phaseId: p.phaseId,
    rules: p.rules,
    groups: p.groups.map((g) => ({
      id: g.id,
      registrationIds: g.registrationIds,
      gameIds: g.gameIds,
    })),
  })),
  series: d.series.map((n) => ({
    id: n.id,
    phaseId: n.phaseId,
    format: n.format,
    home: n.home,
    away: n.away,
    games: n.games,
  })),
});
export const regulationDefinitionSchema = definitionShape.superRefine(
  (d, c) => {
    const parts = structure(d),
      phases = new Set(d.knockoutPhases.map((p) => p.id)),
      assigned = d.groupPhases.flatMap((p) =>
        p.groups.flatMap((g) => g.gameIds),
      );
    const issue = () =>
      c.addIssue({
        code: "custom",
        message:
          "Confira fases, inscrições, referências sem ciclos e atribuições únicas do regulamento.",
      });
    if (
      new TextEncoder().encode(JSON.stringify(d)).length > 1048576 ||
      phases.size !== d.knockoutPhases.length ||
      d.groupPhases.some((p) => phases.has(p.phaseId)) ||
      d.series.some((n) => !phases.has(n.phaseId))
    )
      issue();
    const staticCatalog = crossingsInputSchema.safeParse({
      disputeId: "00000000-0000-4000-8000-000000000001",
      regulationVersion: 1,
      registrationIds: d.registrationIds,
      groupPhases: parts.groupPhases.map((p) => ({
        ...p,
        disputeId: "00000000-0000-4000-8000-000000000001",
        publishedGames: [],
      })),
      series: parts.series.map((n) => ({ ...n, games: [] })),
    });
    if (!staticCatalog.success) issue();
    for (const n of d.series) {
      const maximum = {
        single: 1,
        two_leg: 2,
        best_of_3: 3,
        best_of_5: 5,
        best_of_7: 7,
      }[n.format];
      if (
        new Set(n.games.map((g) => g.slot)).size !== n.games.length ||
        n.games.some((g) => g.slot > maximum)
      )
        issue();
      assigned.push(...n.games.map((g) => g.gameId));
    }
    if (assigned.length > 10000 || new Set(assigned).size !== assigned.length)
      issue();
    try {
      seriesDependencyOrder(d.series);
    } catch {
      issue();
    }
  },
);
export type RegulationDefinition = z.infer<typeof regulationDefinitionSchema>;
export const regulationContextSchema = z
  .object({
    registrationIds: occurrencesInputSchema.shape.registrationIds,
    games: occurrencesInputSchema.shape.games,
    publishedGames: occurrencesInputSchema.shape.publishedGames,
    occurrences: occurrencesInputSchema.shape.occurrences,
    withdrawals: occurrencesInputSchema.shape.withdrawals,
    decisionVersion: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .strict();
export type RegulationContext = z.infer<typeof regulationContextSchema>;
export function previewRegulationDefinition(
  definitionInput: unknown,
  contextInput: unknown,
  disputeId: string,
  regulationVersion: number,
) {
  const definition = regulationDefinitionSchema.parse(definitionInput),
    context = regulationContextSchema.parse(contextInput),
    catalog = new Set(context.registrationIds);
  if (definition.registrationIds.some((id) => !catalog.has(id)))
    throw Error("Inscrição selecionada não existe no contexto autoritativo.");
  return previewOrganizedCompetition({
    context: {
      registrationIds: context.registrationIds,
      games: context.games,
      publishedGames: context.publishedGames,
      occurrences: context.occurrences,
      withdrawals: context.withdrawals,
      disputeId,
      regulationVersion,
      rules: definition.occurrenceRules,
    },
    ...structure(definition),
  });
}
const historyHeaderSchema = z
  .object({ version, savedAt: stamp, actorId: uuid, reason })
  .strict();
export const regulationStateSchema = z
  .object({
    disputeId: uuid,
    version: z.number().int().min(0).max(2147483647),
    definition: regulationDefinitionSchema.nullable(),
    savedAt: stamp.nullable(),
    contextFingerprint: fingerprint,
    context: regulationContextSchema,
    history: z.array(historyHeaderSchema).max(20),
    hasMore: z.boolean(),
  })
  .strict()
  .superRefine((s, c) => {
    if (
      (s.version === 0) !== (s.definition === null) ||
      (s.version === 0) !== (s.savedAt === null)
    )
      c.addIssue({
        code: "custom",
        message: "Cabeçalho de regulamento incoerente.",
      });
    try {
      previewRegulationDefinition(
        s.definition ?? {
          registrationIds: [],
          occurrenceRules: { wo: null },
          groupPhases: [],
          knockoutPhases: [],
          series: [],
        },
        s.context,
        s.disputeId,
        Math.max(1, s.version),
      );
    } catch {
      c.addIssue({
        code: "custom",
        message: "Contexto autoritativo incompatível com regulamento.",
      });
    }
  });
export const regulationVersionSchema = z
  .object({
    disputeId: uuid,
    version,
    definition: regulationDefinitionSchema,
    contextFingerprint: fingerprint,
    context: regulationContextSchema,
    savedAt: stamp,
    actorId: uuid,
    reason,
    algorithmVersion: z.literal("organized-v1"),
  })
  .strict()
  .superRefine((s, c) => {
    try {
      previewRegulationDefinition(
        s.definition,
        s.context,
        s.disputeId,
        s.version,
      );
    } catch {
      c.addIssue({
        code: "custom",
        message: "Contexto histórico incompatível.",
      });
    }
  });
export const saveRegulationSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    expectedVersion: z.number().int().min(0).max(2147483646),
    expectedContextFingerprint: fingerprint,
    definition: regulationDefinitionSchema,
    reason,
    acknowledgeImpact: z.boolean(),
  })
  .strict()
  .refine(
    (s) => new TextEncoder().encode(JSON.stringify(s)).length <= 1048576,
    "Regulamento excede o limite da operação.",
  );
export const regulationSaveResultSchema = z
  .object({
    commandId: uuid,
    disputeId: uuid,
    version,
    savedAt: stamp,
    contextFingerprint: fingerprint,
  })
  .strict();
export type RegulationState = z.infer<typeof regulationStateSchema>;
export type SaveRegulation = z.infer<typeof saveRegulationSchema>;
