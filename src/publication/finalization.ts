import { z } from "zod";
import { publishSheetSchema, type PublishSheet } from "./contract";
import { publishPdfSchema } from "./pdf-contract";
import { prepareManualPublication } from "./manual";
import { deriveSheetTeamStatistics } from "./sheet-team-statistics";

/** New commands only: the historical publication contracts retain their gates. */
export const finalizeSheetSchema = z.object(publishSheetSchema.shape).strict();
export const finalizePdfSchema = z
  .object(publishPdfSchema.shape)
  .strict()
  .refine(
    (c) =>
      (c.authority.scorePoints === "sheet" ||
        c.authority.periodScores === "sheet") ===
      (c.sheetVersion !== null),
    "Confira a versão da fonte selecionada.",
  );
export function auditFinalizationReason(comment: string) {
  const reason = z.string().trim().max(500).parse(comment);
  return reason.length >= 10
    ? reason
    : `Finalização/correção automática. Comentário: ${reason || "não informado"}`;
}
export function prepareFinalSheet(input: PublishSheet): PublishSheet {
  const c = finalizeSheetSchema.parse(input),
    facts = deriveSheetTeamStatistics(c.source.document);
  c.source.teamReview ??= {
    home: {
      disqualifications: facts.home.minimumDisqualifications,
      foulsReceived: facts.home.foulsReceived,
    },
    away: {
      disqualifications: facts.away.minimumDisqualifications,
      foulsReceived: facts.away.foulsReceived,
    },
  };
  prepareManualPublication({ ...c, reason: auditFinalizationReason(c.reason) });
  return c;
}
