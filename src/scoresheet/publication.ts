import type { Prototype } from "../prototype/model";
import { aggregate, validateSheet, type Sheet } from "../domain/scoresheet";

export function preparePublication(data: Prototype, reason: string): Prototype {
  if (
    data.fallback?.required &&
    (!data.fallback.decided ||
      data.fallback.reason.trim().length < 10 ||
      data.fallback.reason.length > 500)
  )
    throw new Error(
      "Resolva a divergência de fontes e informe a justificativa do fallback (10 a 500 caracteres).",
    );
  const sheet = validateSheet(data.sheet.present, true);
  const previous = data.publications
    .filter((p) => p.id === data.game.id && p.source === "sheet")
    .at(-1);
  if (previous) {
    if (reason.trim().length < 10 || reason.length > 500)
      throw new Error("Informe o motivo da revisão (10 a 500 caracteres).");
    const identity = (document: Sheet) =>
      JSON.stringify(
        document.roster
          .map(({ rosterEntryId, registrationId, side, jersey }) => ({
            rosterEntryId,
            registrationId,
            side,
            jersey,
          }))
          .sort((a, b) => a.rosterEntryId - b.rosterEntryId),
      );
    if (previous.document && identity(previous.document) !== identity(sheet))
      throw new Error(
        "Os relacionados e as camisas confirmados não podem ser alterados nesta revisão.",
      );
  }
  const total = aggregate(sheet);
  const next = structuredClone(data);
  next.publications.push({
    id: data.game.id,
    home: data.game.home,
    away: data.game.away,
    score: [total.teams.home.points, total.teams.away.points],
    source: "sheet",
    version: (previous?.version ?? 0) + 1,
    reason: reason.trim() || data.fallback?.reason.trim() || "",
    dispute: data.game.dispute,
    document: structuredClone(sheet),
    createdAt: new Date().toISOString(),
  });
  return next;
}
