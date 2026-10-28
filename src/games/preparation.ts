import { emptyPersistedSheet, type PersistedSheet } from "./sheet-contract";
import type { PreparationContext } from "./preparation-contract";
export const shirtOrder = (
  a: { jersey: string | null },
  b: { jersey: string | null },
) =>
  a.jersey === null
    ? b.jersey === null
      ? 0
      : 1
    : b.jersey === null
      ? -1
      : Number(a.jersey) - Number(b.jersey) ||
        a.jersey.length - b.jersey.length;
/** Suggestion only. Never apply to an existing saved sheet. Missing/conflicting shirts stay visible for correction. */
export function suggestPreparation(
  context: PreparationContext,
): PersistedSheet {
  const document = emptyPersistedSheet();
  for (const side of ["home", "away"] as const) {
    const c = context.sides[side],
      previous = c.previous;
    const ranked = c.roster
      .map((r) => ({ ...r, jersey: c.lastJerseys[r.id] ?? r.jersey }))
      .sort(
        (a, b) =>
          shirtOrder(a, b) ||
          a.person.name.localeCompare(b.person.name) ||
          a.id.localeCompare(b.id),
      );
    const preferred =
      previous?.players.flatMap((p) => {
        const r = ranked.find((r) => r.personId === p.personId);
        return r ? [r] : [];
      }) ?? [];
    const selected = [
      ...preferred,
      ...ranked.filter((r) => !preferred.some((p) => p.id === r.id)),
    ]
      .slice(0, 12)
      .sort(shirtOrder);
    document.participants.push(
      ...selected.map((r) => {
        const starter =
          previous?.players.find((p) => p.personId === r.personId)?.starter ??
          false;
        return {
          rosterEntryId: r.id,
          side,
          jersey: r.jersey ?? "",
          starter,
          played: starter,
        };
      }),
    );
    const captain = selected.find(
      (r) => r.personId === previous?.captainPersonId,
    );
    const heads = c.staff.filter((s) => s.role === "head"),
      assistants = c.staff.filter((s) => s.role === "assistant");
    const coach = previous
      ? heads.find((s) => s.personId === previous.coachPersonId)
      : heads.length === 1
        ? heads[0]
        : undefined;
    const assistant = coach
      ? previous
        ? assistants.find((s) => s.personId === previous.assistantPersonId)
        : assistants.length === 1
          ? assistants[0]
          : undefined
      : undefined;
    document.staff[side] = {
      captainRosterEntryId: captain?.id ?? null,
      coachStaffEntryId: coach?.id ?? null,
      assistantStaffEntryId: assistant?.id ?? null,
    };
  }
  return document;
}
