import { z } from "zod";
import { persistedSheetSchema } from "../games/sheet-contract";
export const publishSheetSchema = z
  .object({
    requestId: z.uuid(),
    gameId: z.uuid(),
    gameVersion: z.number().int().min(1).max(2147483646),
    basePublicationVersion: z.number().int().min(0).max(2147483646),
    source: z
      .object({
        kind: z.literal("sheet"),
        baseSheetVersion: z.number().int().min(0).max(2147483646),
        document: persistedSheetSchema,
      })
      .strict(),
    reason: z.string().trim().max(500),
    fallback: z.boolean(),
  })
  .strict()
  .refine(
    (c) =>
      (c.basePublicationVersion === 0 && !c.fallback) || c.reason.length >= 10,
    {
      message: "Informe o motivo da revisão ou fallback (10 a 500 caracteres).",
    },
  );
export type PublishSheet = z.infer<typeof publishSheetSchema>;
