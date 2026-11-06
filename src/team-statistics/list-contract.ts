import { z } from "zod";
import { teamRowSchema, teamsPageSchema } from "./contract";
import { metricCellSchema } from "../statistics/page-contract";
import {
  LIST_METRIC_KEYS,
  LIST_SHEET_COLUMNS,
  teamsListQuerySchema,
} from "./list-query";
const rowSchema = teamRowSchema.safeExtend({
  statistics: z.record(z.enum(LIST_METRIC_KEYS), metricCellSchema),
  metricCoverage: z.record(
    z.enum(LIST_METRIC_KEYS),
    z.number().int().nonnegative(),
  ),
});
// A distinct opt-in DTO leaves the legacy 20-row response unchanged.
export const teamsListPageSchema = z
  .object({
    kind: z.literal("confirmed-teams-list-v2"),
    disputeId: z.uuid(),
    version: z.number().int().positive(),
    confirmedAt: z.iso.datetime({ offset: true }),
    context: teamsPageSchema.shape.context,
    query: teamsListQuerySchema,
    scoresheet: z.boolean(),
    hasBoxscore: z.boolean(),
    coverage: teamsPageSchema.shape.coverage,
    options: z
      .array(
        z
          .object({
            registrationId: z.uuid(),
            name: z.string().min(1).max(120),
          })
          .strict(),
      )
      .max(1000),
    rows: z.array(rowSchema).max(1000),
    total: z.number().int().min(0).max(1000),
    pageSize: z.literal("all"),
  })
  .strict()
  .refine(
    (p) =>
      p.total === p.rows.length &&
      p.scoresheet === !p.hasBoxscore &&
      (!p.scoresheet || p.query.columns.join() === LIST_SHEET_COLUMNS.join()) &&
      p.rows.every((r) =>
        p.options.some((o) => o.registrationId === r.registrationId),
      ) &&
      new Set(p.options.map((o) => o.registrationId)).size ===
        p.options.length &&
      new Set(p.rows.map((o) => o.registrationId)).size === p.rows.length,
  );
export type TeamsListPage = z.infer<typeof teamsListPageSchema>;
