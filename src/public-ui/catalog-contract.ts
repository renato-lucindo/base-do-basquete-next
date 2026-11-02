import { z } from "zod";
import { publicGameSchema } from "../publication/contract";

export const publicContextSchema = publicGameSchema.shape.context;
export type PublicContext = z.infer<typeof publicContextSchema>;
export const catalogGameSchema = z
  .object({
    id: z.uuid(),
    disputeId: z.uuid(),
    context: publicContextSchema,
    game: publicGameSchema.shape.game,
    score: z
      .object({
        home: z.number().int().nonnegative(),
        away: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
export type CatalogGame = z.infer<typeof catalogGameSchema>;
export const catalogPageSchema = z
  .object({
    games: z.array(catalogGameSchema).max(100),
    next: z.uuid().nullable(),
  })
  .strict();
export const searchPlayerSchema = z
  .object({
    person: publicGameSchema.shape.facts.shape.players.element.shape.person,
    disputeId: z.uuid().nullable(),
  })
  .strict();
export const searchPageSchema = z
  .object({
    players: z.array(searchPlayerSchema).max(100),
    hasMore: z.boolean(),
  })
  .strict();
export const publicSections = [
  { id: "classificacao", label: "Classificação" },
  { id: "jogos", label: "Jogos" },
  { id: "equipes", label: "Equipes" },
  { id: "jogadores", label: "Jogadores" },
] as const;
export type PublicSection = (typeof publicSections)[number]["id"];
export const contextLabel = (c: PublicContext) =>
  `${c.name} · ${c.year} · ${c.gender === "masculino" ? "Masculino" : "Feminino"} · ${c.category}${c.division ? ` · ${c.division}` : ""}`;
export function disputeLink(
  id: string,
  section: PublicSection = "classificacao",
) {
  if (section === "equipes") return `/equipes.html#${id}?scope=all`;
  if (section === "jogadores") return `/estatisticas.html#${id}?scope=all`;
  return `/publico.html#${id}?secao=${section}`;
}
