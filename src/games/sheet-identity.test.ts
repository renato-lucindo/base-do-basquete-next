import { describe, expect, it } from "vitest";
import { aggregate } from "../domain/scoresheet";
import { projectSheet } from "../scoresheet/projection";
import {
  emptyPersistedSheet,
  toEngineSheet,
  validatePersistedSheet,
} from "./sheet-contract";
import { changeSheetJersey, identifyPlayerEvents } from "./sheet-identity";
import { authorAction } from "./sheet-event-author";

const id = (n: number) =>
  `fb880000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function sample(version?: 2) {
  const d = emptyPersistedSheet(version);
  d.participants = ["home", "away"].flatMap((side, i) =>
    ["0", "00"].map((jersey, j) => ({
      rosterEntryId: id(i * 2 + j + 1),
      side: side as "home" | "away",
      jersey,
      played: true,
      starter: false,
    })),
  );
  d.staff.home.captainRosterEntryId = id(1);
  d.staff.away.captainRosterEntryId = id(3);
  d.events = [
    { id: id(10), side: "home", period: 1, target: "0", code: "2" },
    { id: id(11), side: "home", period: 2, target: "00", code: "3" },
    { id: id(12), side: "away", period: 1, target: "0", code: "2" },
    { id: id(13), side: "home", period: 2, target: "0", code: "P1" },
  ];
  return d;
}
describe.each([undefined, 2] as const)(
  "stable player authorship, format %s",
  (version) => {
    it("converts legacy targets exactly once and keeps order, identities, scores, fouls and participation", () => {
      const d = sample(version),
        before = structuredClone(d),
        next = changeSheetJersey(d, id(1), "17");
      expect(d).toEqual(before);
      expect(next.events.map((e) => e.id)).toEqual(d.events.map((e) => e.id));
      expect(next.events.map((e) => [e.target, e.playerRosterEntryId])).toEqual(
        [
          ["17", id(1)],
          ["00", id(2)],
          ["0", id(3)],
          ["17", id(1)],
        ],
      );
      expect(
        next.participants.map((p) => ({ ...p, jersey: "ignored" })),
      ).toEqual(d.participants.map((p) => ({ ...p, jersey: "ignored" })));
      const totals = aggregate(toEngineSheet(next)),
        old = aggregate(toEngineSheet(d));
      expect(totals.errors).toEqual([]);
      expect(totals.teams).toEqual(old.teams);
      expect(totals.players.map((p) => ({ ...p, jersey: "ignored" }))).toEqual(
        old.players.map((p) => ({ ...p, jersey: "ignored" })),
      );
      expect(
        projectSheet(toEngineSheet(next)).actions.map((a) => a.event.target),
      ).toEqual(["17", "00", "0", "17"]);
    });
    it("keeps previous and later actions after reload, repeated changes and reuse of a released jersey", () => {
      let d = changeSheetJersey(sample(version), id(1), "17");
      d.events.push(
        authorAction(d, { side: "home", period: 3, target: "17", code: "3" }),
      );
      d = validatePersistedSheet(JSON.parse(JSON.stringify(d)));
      d = changeSheetJersey(d, id(2), "0");
      d.events.push(
        authorAction(d, { side: "home", period: 3, target: "0", code: "2" }),
      );
      d = changeSheetJersey(d, id(1), "00");
      expect(
        d.events
          .filter((e) => e.playerRosterEntryId === id(1))
          .map((e) => e.target),
      ).toEqual(["00", "00", "00"]);
      expect(
        d.events
          .filter((e) => e.playerRosterEntryId === id(2))
          .map((e) => e.target),
      ).toEqual(["0", "0"]);
      const p = aggregate(toEngineSheet(d));
      expect(p.errors).toEqual([]);
      expect(p.players.find((x) => x.actorId === id(1))).toMatchObject({
        jersey: "00",
        points: 5,
        fouls: 1,
      });
      expect(p.players.find((x) => x.actorId === id(2))).toMatchObject({
        jersey: "0",
        points: 5,
        fouls: 0,
      });
      expect(p.players.find((x) => x.actorId === id(3))).toMatchObject({
        jersey: "0",
        points: 2,
      });
      expect(identifyPlayerEvents(d)).toEqual(d);
    });
    it("rejects occupied or invalid jerseys and inconsistent or ambiguous authorship", () => {
      const d = sample(version);
      for (const jersey of ["00", "", "01", "100", "-1"])
        expect(() => changeSheetJersey(d, id(1), jersey)).toThrow();
      const forged = structuredClone(d);
      forged.events[0].playerRosterEntryId = id(2);
      expect(() => identifyPlayerEvents(forged)).toThrow(/segurança/);
      expect(() => validatePersistedSheet(forged)).toThrow(/autoria/);
      const duplicate = structuredClone(d);
      duplicate.participants[1].jersey = "0";
      expect(() => identifyPlayerEvents(duplicate)).toThrow(/segurança/);
    });
    it("preserves commission events and never invents legacy staff authors", () => {
      const d = sample(version);
      d.events.push(
        version
          ? {
              id: id(20),
              side: "home",
              period: 2,
              target: "C",
              code: "C1",
              actorId: id(1),
            }
          : { id: id(20), side: "home", period: 2, target: "B", code: "B2" },
      );
      const next = changeSheetJersey(d, id(1), "12");
      expect(next.events.at(-1)).toEqual(d.events.at(-1));
      expect(aggregate(toEngineSheet(next)).errors).toEqual([]);
    });
  },
);
