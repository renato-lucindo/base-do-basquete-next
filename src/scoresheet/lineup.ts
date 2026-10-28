import {
  validateSheet,
  type RosterSlot,
  type Sheet,
} from "../domain/scoresheet";

export function orderedRoster(roster: readonly RosterSlot[]): RosterSlot[] {
  return [...roster].sort(
    (a, b) =>
      Number(a.jersey) - Number(b.jersey) || a.jersey.length - b.jersey.length,
  );
}
export function setStarter(sheet: Sheet, id: number, starter: boolean): Sheet {
  if (!sheet.roster.some((slot) => slot.rosterEntryId === id))
    throw new Error("Atleta não relacionado.");
  return validateSheet({
    ...sheet,
    roster: sheet.roster.map((slot) =>
      slot.rosterEntryId === id
        ? { ...slot, starter, played: starter || slot.played }
        : slot,
    ),
  });
}
export function assertStartingFive(sheet: Sheet) {
  for (const side of ["home", "away"] as const) {
    const count = sheet.roster.filter(
      (slot) => slot.side === side && slot.starter,
    ).length;
    if (count !== 5)
      throw new Error(
        `Selecione exatamente 5 titulares da equipe ${side === "home" ? "A" : "B"} (${count}/5).`,
      );
  }
}
