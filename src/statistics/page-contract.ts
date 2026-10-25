import { z } from "zod";
import { STATISTICS_METRICS, type StatisticsMetric } from "./metrics";
const uuid = z.uuid().transform((v) => v.toLowerCase()),
  count = z.number().int().min(0).max(2147483647),
  version = count.min(1);
export const statisticsMetricSchema = z.enum(
  Object.keys(STATISTICS_METRICS) as StatisticsMetric[],
);
export const metricCellSchema = z.union([
  z
    .object({ status: z.literal("available"), value: z.number().finite() })
    .strict(),
  z
    .object({
      status: z.enum(["unavailable", "insufficient-sample"]),
      value: z.null(),
    })
    .strict(),
]);
const names = z.array(z.string().min(1).max(120)).min(1).max(10000),
  reference = z.object({ personId: uuid, registrationId: uuid }).strict();
export const statisticsRowSchema = reference
  .extend({
    teamId: uuid,
    names,
    nicknames: z.array(z.string().max(120).nullable()).min(1).max(10000),
    registrationNames: names,
    teamNames: names,
    jerseys: z
      .array(z.string().regex(/^(00|0|[1-9][0-9]?)$/u))
      .min(1)
      .max(101),
    gamesPlayed: count,
    coverage: z
      .object({
        scoringGames: count,
        advancedGames: count,
        foulGames: count,
        foulsReceivedGames: count,
        plusMinusGames: count,
        disciplineGames: count,
      })
      .strict(),
    metrics: z.record(statisticsMetricSchema, metricCellSchema),
  })
  .strict()
  .superRefine((r, c) => {
    if (
      Object.values(r.coverage).some((n) => n > r.gamesPlayed) ||
      r.coverage.plusMinusGames > r.coverage.advancedGames ||
      r.metrics.games.status !== "available" ||
      r.metrics.games.value !== r.gamesPlayed
    )
      c.addIssue({
        code: "custom",
        message: "Cobertura estatística inconsistente.",
      });
  });
const uniqueRows = (rows: { personId: string; registrationId: string }[]) =>
  new Set(rows.map((r) => `${r.personId}/${r.registrationId}`)).size ===
  rows.length;
export const statisticsSummarySchema = z
  .object({
    personId: uuid,
    names,
    nicknames: statisticsRowSchema.shape.nicknames,
    registrationIds: z
      .array(uuid)
      .min(1)
      .max(1000)
      .refine((ids) => new Set(ids).size === ids.length),
    gamesPlayed: count,
    coverage: statisticsRowSchema.shape.coverage,
    metrics: statisticsRowSchema.shape.metrics,
  })
  .strict()
  .refine(
    (s) =>
      Object.values(s.coverage).every((n) => n <= s.gamesPlayed) &&
      s.metrics.games.value === s.gamesPlayed,
  );
const comparisonState = z.enum(["better", "worse", "equal", "unavailable"]);
export const statisticsPageSchema = z
  .object({
    kind: z.literal("confirmed-statistics-page-v1"),
    disputeId: uuid,
    version,
    confirmedAt: z.iso.datetime({ offset: true }),
    minimumSeconds: version,
    mode: z.enum(["per-game", "total", "per-30"]),
    scope: z.enum(["regular", "playoffs", "all"]),
    sort: z.union([statisticsMetricSchema, z.enum(["player", "team"])]),
    direction: z.enum(["asc", "desc"]),
    columns: z
      .array(statisticsMetricSchema)
      .max(Object.keys(STATISTICS_METRICS).length),
    page: version,
    pageSize: z.literal(20),
    total: count,
    totalPages: version,
    rows: z.array(statisticsRowSchema).max(20),
    compared: z.array(statisticsRowSchema).max(2000),
    comparisonSummaries: z.array(statisticsSummarySchema).max(2),
    comparisonStates: z.record(
      statisticsMetricSchema,
      z.object({ left: comparisonState, right: comparisonState }).strict(),
    ),
    leaders: z.partialRecord(
      statisticsMetricSchema,
      z.array(reference).max(200000),
    ),
    teams: z.array(z.object({ id: uuid, names }).strict()).max(1000),
    coverage: z
      .object({
        regularGames: count,
        playoffGames: count,
        unclassifiedGames: count,
      })
      .strict(),
  })
  .strict()
  .superRefine((p, c) => {
    if (
      new Set(p.comparisonSummaries.map((s) => s.personId)).size !==
        p.comparisonSummaries.length ||
      p.comparisonSummaries.some((s) => {
        const matching = p.compared.filter((r) => r.personId === s.personId);
        return (
          matching.reduce((sum, r) => sum + r.gamesPlayed, 0) !==
            s.gamesPlayed ||
          matching.length !== s.registrationIds.length ||
          matching.some((r) => !s.registrationIds.includes(r.registrationId))
        );
      }) ||
      p.compared.some(
        (r) => !p.comparisonSummaries.some((s) => s.personId === r.personId),
      )
    )
      c.addIssue({ code: "custom", message: "Comparação fora do contexto." });
    if (
      p.totalPages !== Math.max(1, Math.ceil(p.total / 20)) ||
      p.page > p.totalPages ||
      p.rows.length !==
        Math.min(20, Math.max(0, p.total - (p.page - 1) * 20)) ||
      !uniqueRows(p.rows) ||
      !uniqueRows(p.compared) ||
      new Set(p.compared.map((r) => r.personId)).size > 2 ||
      new Set(p.teams.map((t) => t.id)).size !== p.teams.length ||
      new Set(p.columns).size !== p.columns.length ||
      (p.mode === "per-30" &&
        (p.columns.includes("minutes") || p.sort === "minutes")) ||
      Object.values(p.leaders).some((refs) => refs && !uniqueRows(refs))
    )
      c.addIssue({
        code: "custom",
        message: "Página estatística inconsistente.",
      });
  });
export type StatisticsPage = z.infer<typeof statisticsPageSchema>;
