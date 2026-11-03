import { z } from "zod";
import {
  TEAM_METRIC_KEYS,
  TEAM_COLUMN_PRESETS,
  type TeamMetric,
} from "./metrics";
export const teamMetricSchema = z.enum(TEAM_METRIC_KEYS);
export const teamsQuerySchema = z
  .object({
    mode: z.enum(["total", "per-game"]),
    scope: z.enum(["regular", "playoffs", "all"]),
    search: z.string().max(80),
    sort: z.enum(["name", "pointsFor", ...TEAM_METRIC_KEYS]),
    dataset: z.enum(["all", "boxscore"]).default("all"),
    preset: z
      .enum(["essentials", "boxscore", "all", "custom"])
      .default("essentials"),
    columns: z
      .array(teamMetricSchema)
      .max(TEAM_METRIC_KEYS.length)
      .refine((v) => new Set(v).size === v.length)
      .default(TEAM_COLUMN_PRESETS.essentials),
    direction: z.enum(["asc", "desc"]),
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export type TeamsQuery = z.infer<typeof teamsQuerySchema>;
export function parseTeamsQuery(p: URLSearchParams): TeamsQuery {
  const page = Number(p.get("page") ?? 1);
  const preset = teamsQuerySchema.shape.preset
    .catch("essentials")
    .parse(p.get("preset"));
  const columns = [
    ...new Set(
      (p.get("columns") ?? "")
        .split(",")
        .filter((k): k is TeamMetric =>
          TEAM_METRIC_KEYS.includes(k as TeamMetric),
        ),
    ),
  ];
  return teamsQuerySchema.parse({
    mode: teamsQuerySchema.shape.mode.catch("per-game").parse(p.get("mode")),
    scope: teamsQuerySchema.shape.scope.catch("all").parse(p.get("scope")),
    search: (p.get("q") ?? "").trim().slice(0, 80),
    sort: teamsQuerySchema.shape.sort.catch("name").parse(p.get("sort")),
    direction: teamsQuerySchema.shape.direction
      .catch("asc")
      .parse(p.get("direction")),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    dataset: p.get("dataset") === "boxscore" ? "boxscore" : "all",
    preset,
    columns: p.has("columns")
      ? columns
      : [...TEAM_COLUMN_PRESETS[preset === "custom" ? "essentials" : preset]],
  });
}
export function serializeTeamsQuery(input: TeamsQuery): string {
  const q = teamsQuerySchema.parse(input),
    p = new URLSearchParams();
  p.set("mode", q.mode);
  p.set("scope", q.scope);
  p.set("sort", q.sort);
  p.set("direction", q.direction);
  p.set("dataset", q.dataset);
  p.set("preset", q.preset);
  p.set("columns", q.columns.join(","));
  if (q.search) p.set("q", q.search);
  if (q.page > 1) p.set("page", String(q.page));
  return p.toString();
}
