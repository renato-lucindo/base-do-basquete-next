import { z } from "zod";

export const ageWarningHeader = "X-BB-Age-Warnings";

export const ageWarningSchema = z
  .object({
    code: z.enum(["above_maximum", "below_minimum", "sub22_quota"]),
    category: z.string().min(1).max(80),
    age: z.number().int(),
  })
  .strict();

export type AgeWarning = z.infer<typeof ageWarningSchema>;

export function ageWarningText({ code, category, age }: AgeWarning) {
  if (code === "sub22_quota")
    return `As duas vagas de 23 a 25 anos do ${category} já estão ocupadas.`;
  const range =
    code === "below_minimum"
      ? "abaixo da idade mínima"
      : "acima da idade máxima";
  return `Atleta com ${age} anos na temporada, ${range} da categoria ${category}.`;
}
