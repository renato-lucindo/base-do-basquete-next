import { validateSheet, type Entry, type Sheet } from "../domain/scoresheet";

export function orderedActions(sheet: Sheet, order: "entry" | "period") {
  const actions = sheet.events.map((event, index) => ({
    event,
    sequence: index + 1,
  }));
  return order === "period"
    ? actions.sort(
        (a, b) => a.event.period - b.event.period || a.sequence - b.sequence,
      )
    : actions;
}
export function editAction(
  sheet: Sheet,
  id: string,
  patch: Pick<Entry, "period" | "side" | "target" | "code">,
): Sheet {
  if (!sheet.events.some((event) => event.id === id))
    throw new Error("Ação não encontrada. Selecione novamente na lista.");
  const edited = {
    period: patch.period,
    side: patch.side,
    target: patch.target.trim().toUpperCase(),
    code: patch.code.trim().toUpperCase(),
  };
  return validateSheet({
    ...sheet,
    events: sheet.events.map((event) =>
      event.id === id ? { ...event, ...edited } : event,
    ),
    roster: sheet.roster.map((slot) =>
      slot.side === edited.side && slot.jersey === edited.target
        ? { ...slot, played: true }
        : slot,
    ),
  });
}
export function deleteAction(sheet: Sheet, id: string): Sheet {
  if (!sheet.events.some((event) => event.id === id))
    throw new Error("Ação não encontrada. Selecione novamente na lista.");
  // Excluir uma ação não elimina a evidência independente de participação.
  return validateSheet({
    ...sheet,
    events: sheet.events.filter((event) => event.id !== id),
  });
}
