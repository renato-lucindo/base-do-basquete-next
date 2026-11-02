import { describe, expect, it } from "vitest";
import { changeGameTime, gameTimeFields } from "./time-fields";
import type { SaveGame } from "./contract";

const game = (): SaveGame["game"] => ({
  id: "00000000-0000-4000-8000-000000000001",
  disputeId: "00000000-0000-4000-8000-000000000002",
  homeRegistrationId: "00000000-0000-4000-8000-000000000003",
  awayRegistrationId: "00000000-0000-4000-8000-000000000004",
  date: null,
  time: null,
  startAt: null,
  endAt: null,
  venue: null,
  number: null,
});

describe("three-field game times", () => {
  it("keeps a scheduled date and start time without inventing an actual finish", () => {
    const date = changeGameTime(game(), "date", "2026-11-15");
    const start = changeGameTime(date, "start", "15:30");
    expect(start).toMatchObject({
      date: "2026-11-15",
      time: "15:30",
      startAt: null,
      endAt: null,
    });
    expect(gameTimeFields(start)).toEqual({
      date: "2026-11-15",
      start: "15:30",
      end: "",
    });
  });

  it("derives actual dates across midnight and on date edits", () => {
    let updated = changeGameTime(game(), "date", "2026-10-30");
    updated = changeGameTime(updated, "start", "23:15");
    updated = changeGameTime(updated, "end", "00:47");
    expect(updated).toMatchObject({
      date: "2026-10-30",
      time: "23:15",
      startAt: "2026-10-30T23:15",
      endAt: "2026-10-31T00:47",
    });
    expect(changeGameTime(updated, "date", "2026-12-31")).toMatchObject({
      startAt: "2026-12-31T23:15",
      endAt: "2027-01-01T00:47",
    });
  });

  it("shows the actual start on legacy games while preserving their stored times until edited", () => {
    const legacy = {
      ...game(),
      date: "2026-10-30",
      time: "20:00",
      startAt: "2026-10-30T20:12",
      endAt: "2026-10-30T21:45",
    };
    expect(gameTimeFields(legacy)).toEqual({
      date: "2026-10-30",
      start: "20:12",
      end: "21:45",
    });
    expect(changeGameTime(legacy, "end", "22:00")).toMatchObject({
      time: "20:12",
      startAt: "2026-10-30T20:12",
      endAt: "2026-10-30T22:00",
    });
  });
});
