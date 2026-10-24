import { z } from "zod";
import type { PdfContext } from "./context-picker";
const schema = z
  .object({
    baseDisputeId: z.uuid(),
    destination: z.uuid(),
    offset: z.number().int().min(0).max(100000),
    selected: z.uuid().nullable(),
    contexts: z
      .array(
        z
          .object({
            id: z.uuid(),
            label: z.string().max(500),
            gender: z.enum(["masculino", "feminino"]),
          })
          .strict(),
      )
      .max(4096),
  })
  .strict();
/** Browser history holds navigation only. No File, parsed facts, notes, commands or credentials. */
export function readPdfView(
  value: unknown,
  baseDisputeId: string,
  initialContexts: PdfContext[],
) {
  const parsed = z.object({ bdbPdfView: schema }).safeParse(value);
  const view =
    parsed.success && parsed.data.bdbPdfView.baseDisputeId === baseDisputeId
      ? parsed.data.bdbPdfView
      : {
          baseDisputeId,
          destination: baseDisputeId,
          offset: 0,
          selected: null,
          contexts: initialContexts,
        };
  return {
    ...view,
    contexts: [
      ...new Map(
        [...view.contexts, ...initialContexts].map((c) => [c.id, c]),
      ).values(),
    ],
  };
}
