import { z } from "zod";
import { statisticsSourceSchema } from "./source";
const uuid = z.uuid().transform((v) => v.toLowerCase());
export const statisticsHeadSchema = z
  .object({
    disputeId: statisticsSourceSchema.shape.disputeId,
    version: statisticsSourceSchema.shape.version,
    confirmedAt: statisticsSourceSchema.shape.confirmedAt,
    minimumSeconds: statisticsSourceSchema.shape.minimumSeconds,
    kind: z.literal("confirmed-statistics-head-v1"),
    gameCount: z.number().int().min(0).max(10000),
  })
  .strict();
export const statisticsPageSchema = z
  .object({
    kind: z.literal("confirmed-statistics-page-v1"),
    disputeId: uuid,
    version: statisticsSourceSchema.shape.version,
    after: uuid.nullable(),
    next: uuid.nullable(),
    games: statisticsSourceSchema.shape.games.max(100),
  })
  .strict()
  .superRefine((page, ctx) => {
    let previous = page.after;
    for (const { snapshot: g } of page.games) {
      const id = g.id.toLowerCase();
      if (
        (previous !== null && id <= previous) ||
        g.disputeId.toLowerCase() !== page.disputeId
      )
        ctx.addIssue({
          code: "custom",
          message: "Página repete jogo, inverte cursor ou mistura contextos.",
        });
      previous = id;
    }
    if (
      page.next !== null &&
      (page.games.length === 0 || page.next !== previous)
    )
      ctx.addIssue({
        code: "custom",
        message: "Continuação não corresponde ao último jogo.",
      });
  });
