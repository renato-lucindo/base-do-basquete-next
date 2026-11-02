import { describe, expect, it } from "vitest";
import { gameSchema, type SaveGame } from "./contract";
import {
  actualTimeFields,
  actualTimeError,
  applyActualTimeFields,
  changeActualTimeField,
} from "./actual-time-fields";

const game: SaveGame["game"] = {
  id: "00000000-0000-4000-8000-000000000001",
  disputeId: "00000000-0000-4000-8000-000000000002",
  homeRegistrationId: "00000000-0000-4000-8000-000000000003",
  awayRegistrationId: "00000000-0000-4000-8000-000000000004",
  date: "2026-10-30",
  time: "20:00",
  startAt: null,
  endAt: null,
  venue: "Quadra",
  number: "1",
};

describe("separate actual date and time range", () => {
  it("uses the agenda date as a suggestion without inventing actual clocks", () => {
    const fields = actualTimeFields(game);
    expect(fields).toEqual({
      date: game.date,
      start: "",
      end: "",
      endNextDay: false,
    });
    expect(applyActualTimeFields(game, fields)).toEqual(game);
    expect(actualTimeError(fields)).toBe("");
  });

  it("records the same actual day without changing the agenda or other game fields", () => {
    let fields = changeActualTimeField(
      actualTimeFields(game),
      "date",
      "2026-11-01",
    );
    fields = changeActualTimeField(fields, "start", "20:12");
    fields = changeActualTimeField(fields, "end", "21:45");
    const saved = applyActualTimeFields(game, fields);
    expect(saved).toEqual({
      ...game,
      startAt: "2026-11-01T20:12",
      endAt: "2026-11-01T21:45",
    });
    expect(actualTimeError(fields)).toBe("");
    expect(gameSchema.safeParse(saved).success).toBe(true);
    expect(actualTimeFields(saved)).toEqual(fields);
  });

  it.each([
    ["2026-10-30", "2026-10-31"],
    ["2026-12-31", "2027-01-01"],
    ["2028-02-29", "2028-03-01"],
  ])("marks overnight ending and round-trips %s → %s", (date, nextDate) => {
    let fields = { ...actualTimeFields(game), date, start: "23:15" };
    fields = changeActualTimeField(fields, "end", "00:47");
    expect(fields.endNextDay).toBe(true);
    const saved = applyActualTimeFields(game, fields);
    expect(saved).toMatchObject({
      startAt: `${date}T23:15`,
      endAt: `${nextDate}T00:47`,
    });
    expect(actualTimeFields(saved)).toEqual(fields);
    expect(actualTimeError(fields)).toBe("");
    expect(actualTimeError({ ...fields, endNextDay: false })).toContain(
      "posterior",
    );
  });

  it("preserves drafts when clearing a required part and rejects incomplete or excessive ranges", () => {
    const fields = {
      date: "2026-10-30",
      start: "20:00",
      end: "21:00",
      endNextDay: false,
    };
    expect(
      actualTimeError(changeActualTimeField(fields, "date", "")),
    ).toContain("data");
    expect(
      actualTimeError(changeActualTimeField(fields, "start", "")),
    ).toContain("início");
    expect(actualTimeError({ ...fields, endNextDay: true })).toContain(
      "24 horas",
    );
    expect(actualTimeError({ ...fields, end: fields.start })).toContain(
      "posterior",
    );
    expect(
      actualTimeError({ ...fields, end: fields.start, endNextDay: true }),
    ).toBe("");
    expect(
      applyActualTimeFields(game, { ...fields, start: "", end: "" }),
    ).toEqual(game);
    expect(applyActualTimeFields(game, { ...fields, end: "" })).toMatchObject({
      startAt: "2026-10-30T20:00",
      endAt: null,
    });
  });
});
