import { z } from "zod";
import { publishPdfSchema } from "./pdf-contract";
export const savePreparationSchema = z
  .object({
    commandId: z.uuid(),
    expectedVersion: z.number().int().min(0).max(2147483646),
    publication: publishPdfSchema,
  })
  .strict();
export const preparationSchema = z
  .object({
    sourceId: z.uuid(),
    version: z.number().int().positive(),
    savedAt: z.iso.datetime({ offset: true }),
    publication: publishPdfSchema,
  })
  .strict()
  .refine((r) => r.sourceId === r.publication.source.sourceId);
export const preparationAckSchema = z
  .object({
    sourceId: z.uuid(),
    requestId: z.uuid(),
    version: z.number().int().positive(),
  })
  .strict();
export type Preparation = z.infer<typeof preparationSchema>;
export type SavePreparation = z.infer<typeof savePreparationSchema>;
