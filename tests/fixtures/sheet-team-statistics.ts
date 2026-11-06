import { publicationSheet, pubId } from "./publication";
import type { PersistedSheet } from "../../src/games/sheet-contract";
export function disciplinarySheet(): PersistedSheet {
  const d = publicationSheet();
  d.formatVersion = 2;
  d.staff.home.coachStaffEntryId = pubId(200);
  d.staff.home.assistantStaffEntryId = pubId(201);
  const event = (
    n: number,
    target: string,
    code: string,
    actorId?: string,
    successorId?: string,
  ) => ({
    id: pubId(2000 + n),
    side: "home" as const,
    period: 1,
    target,
    code,
    ...(actorId ? { actorId } : {}),
    ...(successorId ? { successorId } : {}),
  });
  d.events = [
    event(1, "0", "T1"),
    event(2, "00", "U2"),
    event(3, "AT", "D2", pubId(201)),
    event(4, "C", "C1", pubId(200)),
    event(5, "C", "C1", pubId(200)),
    event(6, "C", "B1", pubId(1)),
    event(7, "C", "C1", pubId(1), pubId(3)),
    event(8, "00", "UC"),
    { id: pubId(100), side: "home", period: 4, target: "3", code: "2" },
  ];
  return d;
}
export const teamReview = () => ({
  home: { disqualifications: 6, foulsReceived: null as number | null },
  away: { disqualifications: 0, foulsReceived: null as number | null },
});
