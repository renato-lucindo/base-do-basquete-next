import { describe, it, expect } from "vitest";
import {
  persistedSheetSchema,
  toEngineSheet,
  validatePersistedSheet,
  saveSheetSchema,
} from "./sheet-contract";
const id = (n: number) =>
  `f1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const blank = () => ({
  rulesVersion: "FIBA_2024" as const,
  periods: 4,
  participants: [] as {
    rosterEntryId: string;
    side: "home" | "away";
    jersey: string;
    played: boolean;
    starter: boolean;
  }[],
  staff: {
    home: {
      captainRosterEntryId: null as string | null,
      coachStaffEntryId: null as string | null,
      assistantStaffEntryId: null as string | null,
    },
    away: {
      captainRosterEntryId: null as string | null,
      coachStaffEntryId: null as string | null,
      assistantStaffEntryId: null as string | null,
    },
  },
  events: [] as {
    id: string;
    side: "home" | "away";
    period: number;
    target: string;
    code: string;
  }[],
});
describe("persisted sheet boundary", () => {
  it("saves an incomplete draft without inventing players, captain or starters", () => {
    expect(validatePersistedSheet(blank()).participants).toEqual([]);
    expect(() => validatePersistedSheet(blank(), true)).toThrow();
  });
  it("maps UUID identities to local engine slots without numeric coercion", () => {
    const d = blank();
    d.participants = [
      {
        rosterEntryId: id(1),
        side: "away",
        jersey: "00",
        played: true,
        starter: false,
      },
      {
        rosterEntryId: id(2),
        side: "home",
        jersey: "0",
        played: true,
        starter: true,
      },
    ];
    d.staff.home.captainRosterEntryId = id(2);
    const result = toEngineSheet(persistedSheetSchema.parse(d));
    expect(result.roster.map((r) => r.rosterEntryId)).toEqual([1, 2]);
    expect(result.roster.map((r) => r.registrationId)).toEqual([2, 1]);
    expect(result.coachPlayer).toEqual({ home: 2, away: null });
    expect(result.staff?.home.captainId).toBe(2);
  });
  it("rejects duplicate membership, shirts, cross-side captains, assistant without coach and unknown fields", () => {
    const d = blank();
    d.participants = [
      {
        rosterEntryId: id(1),
        side: "home",
        jersey: "0",
        played: false,
        starter: false,
      },
      {
        rosterEntryId: id(2),
        side: "home",
        jersey: "00",
        played: false,
        starter: false,
      },
    ];
    expect(persistedSheetSchema.safeParse(d).success).toBe(true);
    expect(persistedSheetSchema.safeParse({ ...d, secret: "no" }).success).toBe(
      false,
    );
    expect(
      persistedSheetSchema.safeParse({
        ...d,
        participants: [d.participants[0], d.participants[0]],
      }).success,
    ).toBe(false);
    d.staff.away.captainRosterEntryId = id(1);
    expect(persistedSheetSchema.safeParse(d).success).toBe(false);
    d.staff.away.captainRosterEntryId = null;
    d.staff.home.assistantStaffEntryId = id(3);
    expect(persistedSheetSchema.safeParse(d).success).toBe(false);
  });
  it("runs supplied engine rules on the backend, preserving participation distinctions", () => {
    const d = blank();
    d.participants = [
      {
        rosterEntryId: id(1),
        side: "home",
        jersey: "12",
        played: false,
        starter: false,
      },
      {
        rosterEntryId: id(2),
        side: "away",
        jersey: "77",
        played: false,
        starter: false,
      },
    ];
    d.events = [
      { id: id(10), side: "home", target: "12", period: 1, code: "2" },
    ];
    expect(() => validatePersistedSheet(d)).toThrow(/participação/);
    d.participants[0].played = true;
    expect(validatePersistedSheet(d).events).toHaveLength(1);
    d.events = Array.from({ length: 6 }, (_, i) => ({
      id: id(10 + i),
      side: "home" as const,
      target: "12",
      period: 1,
      code: i < 5 ? "P" : "2",
    }));
    expect(() => validatePersistedSheet(d)).toThrow(/exclusão/);
  });
  it("rejects actions in incomplete rosters, invalid periods, too many starters and final ties", () => {
    const d = blank();
    d.events = [
      { id: id(10), side: "home", target: "12", period: 1, code: "2" },
    ];
    expect(() => validatePersistedSheet(d)).toThrow();
    d.events = [];
    d.participants = Array.from({ length: 6 }, (_, i) => ({
      rosterEntryId: id(i + 1),
      side: "home" as const,
      jersey: String(i),
      played: true,
      starter: true,
    }));
    expect(persistedSheetSchema.safeParse(d).success).toBe(false);
  });
  it("requires explicit captains, five starters and valid closing before final validation", () => {
    const d = blank();
    d.participants = ["home", "away"].flatMap((s, i) =>
      Array.from({ length: 5 }, (_, j) => ({
        rosterEntryId: id(i * 5 + j + 1),
        side: s as "home" | "away",
        jersey: String(j),
        played: true,
        starter: true,
      })),
    );
    d.staff.home.captainRosterEntryId = id(1);
    d.staff.away.captainRosterEntryId = id(6);
    expect(() => validatePersistedSheet(d, true)).toThrow(/empatado/);
    d.events = [
      { id: id(100), side: "home", period: 1, target: "0", code: "2" },
    ];
    expect(validatePersistedSheet(d, true)).toEqual(d);
    d.participants[0].starter = false;
    expect(() => validatePersistedSheet(d, true)).toThrow(/5 titulares/);
    d.participants[0].starter = true;
    d.staff.home.captainRosterEntryId = null;
    d.staff.home.coachStaffEntryId = id(30);
    expect(() => validatePersistedSheet(d, true)).toThrow(/capitão/);
  });
  it("correlates commands and canonicalizes action codes without accepting publication in G2", () => {
    const c = {
      requestId: id(100),
      gameId: id(101),
      gameVersion: 1,
      baseVersion: 0,
      confirm: false,
      reason: "",
      document: blank(),
    };
    expect(saveSheetSchema.safeParse(c).success).toBe(true);
    expect(saveSheetSchema.safeParse({ ...c, confirm: true }).success).toBe(
      false,
    );
    expect(saveSheetSchema.safeParse({ ...c, gameVersion: 0 }).success).toBe(
      false,
    );
    const d = blank();
    d.events = [
      { id: id(1), side: "home", period: 1, target: "0", code: "p2" },
    ];
    expect(persistedSheetSchema.parse(d).events[0].code).toBe("P2");
  });
});
