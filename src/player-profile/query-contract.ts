import { z } from "zod";
export const PROFILE_SECTIONS = [
  { id: "resumo", label: "Resumo" },
  { id: "estatisticas", label: "Estatísticas" },
  { id: "conquistas", label: "Conquistas e honrarias" },
  { id: "jogos", label: "Jogos" },
  { id: "historico", label: "Histórico" },
] as const;
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const profileQuerySchema = z
  .object({
    section: z.enum([
      "resumo",
      "estatisticas",
      "conquistas",
      "jogos",
      "historico",
    ]),
    mode: z.enum(["per-game", "total", "per-30"]),
    scope: z.enum(["regular", "playoffs", "all"]),
    championshipId: uuid.nullable(),
    seasonId: uuid.nullable(),
    disputeId: uuid.nullable(),
    page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  })
  .strict();
export type ProfileQuery = z.infer<typeof profileQuerySchema>;
export function parseProfileQuery(p: URLSearchParams): ProfileQuery {
  const page = Number(p.get("page") ?? 1);
  return profileQuerySchema.parse({
    section: profileQuerySchema.shape.section
      .catch("resumo")
      .parse(p.get("secao")),
    mode: profileQuerySchema.shape.mode.catch("per-game").parse(p.get("mode")),
    scope: profileQuerySchema.shape.scope.catch("all").parse(p.get("scope")),
    championshipId: p.get("championshipId") || null,
    seasonId: p.get("seasonId") || null,
    disputeId: p.get("disputeId") || null,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  });
}
export function serializeProfileQuery(input: ProfileQuery): string {
  const q = profileQuerySchema.parse(input),
    p = new URLSearchParams();
  p.set("secao", q.section);
  p.set("mode", q.mode);
  p.set("scope", q.scope);
  for (const key of ["championshipId", "seasonId", "disputeId"] as const)
    if (q[key]) p.set(key, q[key]);
  if (q.page > 1) p.set("page", String(q.page));
  return p.toString();
}
