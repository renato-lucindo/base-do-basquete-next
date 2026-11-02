import { describe, expect, it } from "vitest";
import { authorAction } from "./sheet-event-author";
import { emptyPersistedSheet, validatePersistedSheet } from "./sheet-contract";

const id = (n: number) =>
  `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fixture = () => {
  const d = emptyPersistedSheet(2);
  d.participants = ["home", "away"].flatMap((side, index) =>
    [0, 1].map((i) => ({
      rosterEntryId: id(10 + index * 2 + i),
      side: side as "home" | "away",
      jersey: String(i),
      played: true,
      starter: false,
    })),
  );
  d.staff.home = {
    captainRosterEntryId: id(10),
    coachStaffEntryId: id(1),
    assistantStaffEntryId: id(2),
  };
  d.staff.away.captainRosterEntryId = id(12);
  return d;
};

describe("identified staff event authoring and correction", () => {
  it("attributes D of the assistant and its B2 consequence without duplicating the free throws", () => {
    const d = fixture();
    const assistantD = authorAction(d, {
      side: "home",
      period: 1,
      target: "AT",
      code: "D2",
    });
    expect(assistantD.actorId).toBe(id(2));
    d.events.push(assistantD);
    const corrected = authorAction(
      d,
      { side: "home", period: 1, target: "AT", code: "D3" },
      assistantD.id,
    );
    expect(corrected.actorId).toBe(id(2));
    d.events[0] = corrected;
    expect(validatePersistedSheet(d)).toEqual(d);
  });

  it("attributes later penalties to the new coach, preserving previous authors", () => {
    const d = fixture();
    d.events.push(
      authorAction(d, { side: "home", period: 1, target: "C", code: "C1" }),
    );
    d.events.push(
      authorAction(d, { side: "home", period: 1, target: "C", code: "C1" }),
    );
    d.events[0].period = 2;
    d.events[1].period = 2;
    const successor = authorAction(d, {
      side: "home",
      period: 3,
      target: "C",
      code: "B1",
    });
    expect(d.events.map((event) => event.actorId)).toEqual([id(1), id(1)]);
    expect(successor.actorId).toBe(id(2));
    d.events.push(successor);
    expect(validatePersistedSheet(d)).toEqual(d);
    expect(() =>
      authorAction(
        d,
        { side: "home", period: 1, target: "C", code: "B1" },
        successor.id,
      ),
    ).toThrow(/responsável.*mudou/i);
  });

  it("blocks reassigning a historical staff event by changing side or target", () => {
    const d = fixture();
    const e = authorAction(d, {
      side: "home",
      period: 1,
      target: "C",
      code: "B1",
    });
    d.events.push(e);
    expect(() =>
      authorAction(
        d,
        { side: "away", period: 1, target: "C", code: "B1" },
        e.id,
      ),
    ).toThrow(/responsável/i);
    expect(() =>
      authorAction(
        d,
        { side: "home", period: 1, target: "AT", code: "D2" },
        e.id,
      ),
    ).toThrow(/responsável/i);
    expect(() =>
      authorAction(
        d,
        { side: "home", period: 1, target: "0", code: "P" },
        e.id,
      ),
    ).toThrow(/responsável/i);
  });

  it("allows correcting the code or period while the same person remains responsible", () => {
    const d = fixture();
    const e = authorAction(d, {
      side: "home",
      period: 1,
      target: "C",
      code: "B1",
    });
    d.events.push(e);
    const changed = authorAction(
      d,
      { side: "home", period: 2, target: "C", code: "BC" },
      e.id,
    );
    expect(changed).toMatchObject({
      id: e.id,
      actorId: id(1),
      period: 2,
      code: "BC",
    });
    d.events[0] = changed;
    expect(validatePersistedSheet(d)).toEqual(d);
  });

  it("allows clearing an explicit successor on correction without keeping a stale id", () => {
    const d = fixture();
    d.staff.home.coachStaffEntryId = null;
    d.staff.home.assistantStaffEntryId = null;
    const e = authorAction(
      d,
      { side: "home", period: 1, target: "0", code: "D2" },
      null,
      id(11),
    );
    d.events.push(e);
    const changed = authorAction(
      d,
      { side: "home", period: 1, target: "0", code: "P" },
      e.id,
      null,
    );
    expect(changed.successorId).toBeUndefined();
    d.events[0] = changed;
    expect(validatePersistedSheet(d)).toEqual(d);
  });
});
