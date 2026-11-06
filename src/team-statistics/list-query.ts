import { z } from "zod";
import { TEAM_METRICS, TEAM_METRIC_KEYS, SHEET_TEAM_COLUMNS } from "./metrics";
import {
  parseTeamsQuery,
  serializeTeamsQuery,
  teamsQuerySchema,
} from "./query-contract";

export const LIST_METRICS = {
  ...TEAM_METRICS,
  benchPoints: {
    label: "PB",
    name: "Pontos do banco",
    normalizable: true,
    lowerIsBetter: false,
  },
  benchPointsShare: {
    label: "PB%",
    name: "Participação dos pontos do banco",
    normalizable: false,
    lowerIsBetter: false,
  },
} as const;
export type ListMetric = keyof typeof LIST_METRICS;
export const LIST_METRIC_KEYS = [
  "benchPoints",
  "benchPointsShare",
  ...TEAM_METRIC_KEYS,
] as const;
export const LIST_SHEET_COLUMNS: ListMetric[] = [
  ...SHEET_TEAM_COLUMNS.slice(0, 2),
  "benchPoints",
  "benchPointsShare",
  ...SHEET_TEAM_COLUMNS.slice(2),
];
export const teamsListQuerySchema = teamsQuerySchema
  .extend({
    pageSize: z.literal("all"),
    sort: z.enum(["name", "pointsFor", ...LIST_METRIC_KEYS]),
    columns: z
      .array(z.enum(LIST_METRIC_KEYS))
      .max(LIST_METRIC_KEYS.length)
      .refine((a) => new Set(a).size === a.length),
    selection: z.enum(["all", "none", "custom"]),
    registrationIds: z
      .array(z.uuid().transform((v) => v.toLowerCase()))
      .max(1000)
      .refine((a) => new Set(a).size === a.length),
  })
  .refine((q) =>
    q.selection === "custom"
      ? q.registrationIds.length > 0
      : q.registrationIds.length === 0,
  );
export type TeamsListQuery = z.infer<typeof teamsListQuerySchema>;
export function parseTeamsListQuery(p: URLSearchParams): TeamsListQuery {
  const base = parseTeamsQuery(p);
  const ids = [
    ...new Set(p.getAll("registrationId").map((v) => v.toLowerCase())),
  ];
  return teamsListQuerySchema.parse({
    ...base,
    page: 1,
    pageSize: "all",
    sort: p.has("sort")
      ? z
          .enum(["name", "pointsFor", ...LIST_METRIC_KEYS])
          .catch("points")
          .parse(p.get("sort"))
      : "points",
    direction: p.has("direction") ? base.direction : "desc",
    columns: p.has("columns")
      ? [
          ...new Set(
            p
              .get("columns")!
              .split(",")
              .filter((v): v is ListMetric =>
                LIST_METRIC_KEYS.includes(v as ListMetric),
              ),
          ),
        ]
      : base.columns,
    selection:
      p.get("selection") === "none" ? "none" : ids.length ? "custom" : "all",
    registrationIds: p.get("selection") === "none" ? [] : ids,
  });
}
export function serializeTeamsListQuery(q: TeamsListQuery) {
  q = teamsListQuerySchema.parse(q);
  const {
    pageSize: _size,
    selection: _selection,
    registrationIds: _ids,
    ...legacy
  } = q;
  void _size;
  void _selection;
  void _ids;
  const p = new URLSearchParams(
    serializeTeamsQuery({
      ...legacy,
      sort:
        q.sort === "benchPoints" || q.sort === "benchPointsShare"
          ? "points"
          : q.sort,
      columns: q.columns.filter((v): v is (typeof TEAM_METRIC_KEYS)[number] =>
        TEAM_METRIC_KEYS.includes(v as (typeof TEAM_METRIC_KEYS)[number]),
      ),
    }),
  );
  p.set("sort", q.sort);
  p.set("columns", q.columns.join(","));
  p.set("pageSize", "all");
  p.set("selection", q.selection);
  q.registrationIds.forEach((id) => p.append("registrationId", id));
  return p.toString();
}
