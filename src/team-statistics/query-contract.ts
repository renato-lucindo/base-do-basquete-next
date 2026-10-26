import { z } from "zod";
export const teamsQuerySchema = z
  .object({
    mode: z.enum(["total", "per-game"]),
    scope: z.enum(["regular", "playoffs", "all"]),
    search: z.string().max(80),
    sort: z.enum(["name", "games", "pointsFor", "pointsAgainst", "difference"]),
    direction: z.enum(["asc", "desc"]),
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export type TeamsQuery = z.infer<typeof teamsQuerySchema>;
export function parseTeamsQuery(p: URLSearchParams): TeamsQuery {
  const page = Number(p.get("page") ?? 1);
  return teamsQuerySchema.parse({
    mode: teamsQuerySchema.shape.mode.catch("per-game").parse(p.get("mode")),
    scope: teamsQuerySchema.shape.scope.catch("all").parse(p.get("scope")),
    search: (p.get("q") ?? "").trim().slice(0, 80),
    sort: teamsQuerySchema.shape.sort.catch("name").parse(p.get("sort")),
    direction: teamsQuerySchema.shape.direction
      .catch("asc")
      .parse(p.get("direction")),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  });
}
export function serializeTeamsQuery(input: TeamsQuery): string {
  const q = teamsQuerySchema.parse(input),
    p = new URLSearchParams();
  p.set("mode", q.mode);
  p.set("scope", q.scope);
  p.set("sort", q.sort);
  p.set("direction", q.direction);
  if (q.search) p.set("q", q.search);
  if (q.page > 1) p.set("page", String(q.page));
  return p.toString();
}
