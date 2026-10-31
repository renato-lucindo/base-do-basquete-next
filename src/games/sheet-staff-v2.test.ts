import { describe, expect, it } from "vitest";
import { aggregate } from "../domain/scoresheet";
import {
  emptyPersistedSheet,
  toEngineSheet,
  validatePersistedSheet,
} from "./sheet-contract";

const id = (n: number) =>
  `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const document = () => {
  const d = emptyPersistedSheet(2);
  d.participants = ["home", "away"].flatMap((side, j) =>
    [0, 1].map((i) => ({
      rosterEntryId: id(10 + j * 2 + i),
      side: side as "home" | "away",
      jersey: String(i),
      played: true,
      starter: false,
    })),
  );
  d.staff.home.captainRosterEntryId = id(10);
  d.staff.away.captainRosterEntryId = id(12);
  d.staff.home.coachStaffEntryId = id(1);
  d.staff.home.assistantStaffEntryId = id(2);
  return d;
};
const action = (n: number, target: string, code: string, actorId?: string) => ({
  id: id(100 + n),
  side: "home" as const,
  period: 1,
  target,
  code,
  ...(actorId ? { actorId } : {}),
});

describe("identified game staff and atomic bench disqualification", () => {
  it("attributes B/C to the acting coach and keeps B2 out of the GD count", () => {
    const d = document();
    d.events = [action(1, "C", "B1", id(1)), action(2, "AT", "D2", id(2))];
    expect(validatePersistedSheet(d)).toEqual(d);
    const totals = aggregate(toEngineSheet(d)).teams.home;
    expect(totals.freeConceded).toBe(3);
    expect(totals.coachB).toBe(1);
    expect(totals.staffPeople?.[id(1)]?.marks.map((f) => f.code)).toEqual([
      "B1",
      "B2",
    ]);
    expect(totals.staffPeople?.[id(2)]?.status).toBe("D");
    expect(totals.activeCoachId).toBe(id(1));
  });

  it("passes the role to an eligible assistant without transferring earlier fouls", () => {
    const d = document();
    d.events = [
      action(1, "C", "C1", id(1)),
      action(2, "C", "C1", id(1)),
      action(3, "C", "B1", id(2)),
    ];
    expect(validatePersistedSheet(d)).toEqual(d);
    const totals = aggregate(toEngineSheet(d)).teams.home;
    expect(totals.staffPeople?.[id(1)]?.status).toBe("GD");
    expect(totals.staffPeople?.[id(2)]?.b).toBe(1);
    expect(totals.staffPeople?.[id(2)]?.c).toBe(0);
    expect(totals.activeCoachId).toBe(id(2));
    d.events[2].actorId = id(1);
    expect(() => validatePersistedSheet(d)).toThrow(
      /responsável|técnico|autoria/i,
    );
  });

  it("rejects assistant penalties after succession and requires the acting coach", () => {
    const d = document();
    d.events = [action(1, "C", "D2", id(1)), action(2, "AT", "D2", id(2))];
    expect(() => validatePersistedSheet(d)).toThrow();
    d.events[1] = action(2, "C", "C1", id(2));
    expect(validatePersistedSheet(d)).toEqual(d);
  });

  it("keeps unversioned saved documents readable and forbids anonymous new staff events", () => {
    const d = document();
    d.events = [action(1, "C", "C1")];
    expect(() => validatePersistedSheet(d)).toThrow();
    const old = { ...d, formatVersion: undefined };
    expect(validatePersistedSheet(old)).toEqual(old);
    expect(() =>
      validatePersistedSheet({
        ...old,
        events: [{ ...action(1, "C", "C1"), actorId: id(1) }],
      }),
    ).toThrow(/autoria/i);
    expect(() =>
      validatePersistedSheet({
        ...d,
        events: [{ ...action(1, "0", "2"), actorId: id(1) }],
      }),
    ).toThrow(/autoria/i);
  });

  it("requires an explicit successor when the captain acting as coach is disqualified", () => {
    const d = document();
    d.staff.home.coachStaffEntryId = null;
    d.staff.home.assistantStaffEntryId = null;
    d.events = [action(1, "0", "D2")];
    expect(() => validatePersistedSheet(d)).toThrow(/outro atleta elegível/i);
    d.events[0].successorId = id(11);
    d.events.push(action(2, "C", "B1", id(11)));
    expect(validatePersistedSheet(d)).toEqual(d);
    const totals = aggregate(toEngineSheet(d));
    expect(totals.teams.home.activeCoachId).toBe(id(11));
    expect(totals.teams.home.staffPeople?.[id(11)]?.b).toBe(1);
  });

  it("does not accept a duplicate role, orphan assistant or unsolicited successor", () => {
    const d = document();
    d.staff.home.assistantStaffEntryId = id(1);
    expect(() => validatePersistedSheet(d)).toThrow();
    d.staff.home.coachStaffEntryId = null;
    expect(() => validatePersistedSheet(d)).toThrow();
    d.staff.home.coachStaffEntryId = id(1);
    d.staff.home.assistantStaffEntryId = id(2);
    d.events = [{ ...action(1, "C", "B1", id(1)), successorId: id(11) }];
    expect(() => validatePersistedSheet(d)).toThrow(/sucessão/i);
    d.events = [{ ...action(1, "C", "D2", id(1)), successorId: id(11) }];
    expect(() => validatePersistedSheet(d)).toThrow(/sucessão/i);
  });

  it("uses the captain when the assistant is disqualified and refuses reassignment of historical fouls", () => {
    const d = document();
    d.events = [
      action(1, "AT", "D2", id(2)),
      action(2, "C", "D2", id(1)),
      action(3, "C", "C1", id(10)),
    ];
    expect(validatePersistedSheet(d)).toEqual(d);
    d.events[2].actorId = id(1);
    expect(() => validatePersistedSheet(d)).toThrow(/autoria/i);
  });
});
