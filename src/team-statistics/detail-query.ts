import { z } from "zod";
import { teamsQuerySchema, parseTeamsQuery } from "./query-contract";
export const teamDetailQuerySchema = teamsQuerySchema
  .pick({ mode: true, scope: true, page: true })
  .extend({
    section: z.enum(["resumo", "participantes", "jogos"]),
    rosterPage: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export type TeamDetailQuery = z.infer<typeof teamDetailQuerySchema>;
export function parseTeamDetailQuery(p: URLSearchParams): TeamDetailQuery {
  const q = parseTeamsQuery(p),
    n = Number(p.get("rosterPage") ?? 1);
  return teamDetailQuerySchema.parse({
    mode: q.mode,
    scope: q.scope,
    page: q.page,
    section: teamDetailQuerySchema.shape.section
      .catch("resumo")
      .parse(p.get("section")),
    rosterPage: Number.isSafeInteger(n) && n > 0 ? n : 1,
  });
}
export function serializeTeamDetailQuery(input: TeamDetailQuery): string {
  const q = teamDetailQuerySchema.parse(input),
    p = new URLSearchParams();
  p.set("section", q.section);
  p.set("mode", q.mode);
  p.set("scope", q.scope);
  if (q.page > 1) p.set("page", String(q.page));
  if (q.rosterPage > 1) p.set("rosterPage", String(q.rosterPage));
  return p.toString();
}
