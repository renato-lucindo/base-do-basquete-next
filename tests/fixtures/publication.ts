import {
  emptyPersistedSheet,
  type PersistedSheet,
} from "../../src/games/sheet-contract";
export const pubId = (n: number) =>
  `f9000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function publicationSheet(): PersistedSheet {
  const d = emptyPersistedSheet();
  d.participants = ["home", "away"].flatMap((side, i) =>
    Array.from({ length: 5 }, (_, n) => ({
      rosterEntryId: pubId(i * 10 + n + 1),
      side: side as "home" | "away",
      jersey: n === 0 ? "0" : n === 1 ? "00" : String(n),
      played: true,
      starter: true,
    })),
  );
  d.staff.home.captainRosterEntryId = pubId(1);
  d.staff.away.captainRosterEntryId = pubId(11);
  d.events = [
    { id: pubId(100), side: "home", period: 4, target: "0", code: "2" },
  ];
  return d;
}
export function finalCases() {
  const base = publicationSheet(),
    cases: PersistedSheet[] = [structuredClone(base)],
    add = (edit: (d: PersistedSheet) => void) => {
      const d = structuredClone(base);
      edit(d);
      cases.push(d);
    };
  add((d) => {
    d.events = [];
  });
  add((d) => {
    d.periods = 5;
  });
  add((d) => {
    d.periods = 5;
    d.events.push(
      { id: pubId(101), side: "away", period: 4, target: "0", code: "2" },
      { id: pubId(102), side: "home", period: 5, target: "00", code: "3" },
    );
  });
  add((d) => {
    d.periods = 6;
    d.events.push(
      { id: pubId(101), side: "away", period: 4, target: "0", code: "2" },
      { id: pubId(102), side: "home", period: 5, target: "00", code: "3" },
      { id: pubId(103), side: "away", period: 5, target: "00", code: "3" },
      { id: pubId(104), side: "home", period: 6, target: "0", code: "2" },
    );
  });
  add((d) => {
    d.periods = 6;
    d.events.push(
      { id: pubId(101), side: "away", period: 4, target: "0", code: "2" },
      { id: pubId(102), side: "home", period: 5, target: "00", code: "3" },
    );
  });
  add((d) => {
    d.periods = 12;
    d.events[0].period = 12;
  });
  add((d) => {
    d.periods = 13;
  });
  add((d) => {
    d.events[0].code = "1";
  });
  add((d) => {
    d.events[0].code = "1";
    d.events.unshift({
      id: pubId(101),
      side: "away",
      period: 1,
      target: "0",
      code: "P2",
    });
    d.events.push({
      id: pubId(102),
      side: "home",
      period: 4,
      target: "00",
      code: "1",
    });
  });
  add((d) => {
    d.events[0].code = "1";
    d.events.unshift({
      id: pubId(101),
      side: "away",
      period: 1,
      target: "0",
      code: "PC",
    });
  });
  add((d) => {
    d.events.unshift({
      id: pubId(101),
      side: "away",
      period: 1,
      target: "0",
      code: "D3",
    });
  });
  add((d) => {
    d.events.unshift({
      id: pubId(101),
      side: "home",
      period: 1,
      target: "B",
      code: "B2",
    });
  });
  add((d) => {
    d.events.unshift({
      id: pubId(101),
      side: "home",
      period: 1,
      target: "C",
      code: "D",
    });
  });
  add((d) => {
    d.participants.push({
      rosterEntryId: pubId(7),
      side: "home",
      jersey: "9",
      played: false,
      starter: false,
    });
  });
  add((d) => {
    d.participants.push({
      rosterEntryId: pubId(7),
      side: "home",
      jersey: "9",
      played: true,
      starter: false,
    });
  });
  add((d) => {
    d.participants[1].starter = false;
  });
  add((d) => {
    d.participants[1].played = false;
  });
  add((d) => {
    d.staff.home.captainRosterEntryId = null;
  });
  add((d) => {
    d.staff.home.coachStaffEntryId = pubId(200);
    d.staff.home.captainRosterEntryId = null;
  });
  add((d) => {
    d.staff.home.assistantStaffEntryId = pubId(201);
  });
  let seed = 20261024;
  const random = (n: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  for (let i = 0; i < 60; i++)
    add((d) => {
      d.periods = 4 + random(3);
      d.events = Array.from({ length: 1 + random(12) }, (_, j) => ({
        id: pubId(300 + j),
        side: random(2) ? "home" : "away",
        period: 1 + random(d.periods),
        target: ["0", "00", "B", "C"][random(4)],
        code: ["1", "2", "3", "P", "P2", "PC", "T1", "UC", "D", "B2", "C1"][
          random(11)
        ],
      }));
    });
  return cases;
}
