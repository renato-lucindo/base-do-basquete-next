import { expect, it } from "vitest";
import {
  disciplinarySheet,
  teamReview,
} from "../../tests/fixtures/sheet-team-statistics";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";
import { deriveManualFacts } from "./manual";
import { deriveSheetTeamStatistics } from "./sheet-team-statistics";
import { publicGameSchema } from "./contract";
import { confirmedManualFixture } from "../../tests/fixtures/statistics-publications";

it("counts technical occurrences across players and all acting staff, excludes B2 and deduplicates player-coach dismissals", () => {
  const d = disciplinarySheet();
  const known = deriveSheetTeamStatistics(d);
  expect(known.home).toMatchObject({
    technicalFouls: 5,
    minimumDisqualifications: 4,
    disqualifications: null,
    foulsReceived: 0,
  });
  const facts = deriveManualFacts(d, teamReview());
  expect(facts.teams.home.teamStatistics).toEqual({
    version: 1,
    technicalFouls: 5,
    disqualifications: 6,
    foulsReceived: 0,
  });
  expect(facts.players.reduce((n, p) => n + p.fouls, 0)).toBe(3);
  expect(facts.teams.home).not.toHaveProperty("staffPeople");
  expect(facts.teams.home).not.toHaveProperty("activeCoachId");
  expect(
    publicGameSchema.safeParse(confirmedManualFixture(false, d, teamReview()))
      .success,
  ).toBe(true);
});
it("allows explicit zero, rejects GD below identified dismissals, and derives FR from opposing FC", () => {
  const review = teamReview();
  review.home.disqualifications = 3;
  expect(() => deriveManualFacts(disciplinarySheet(), review)).toThrow(/menor/);
  const zero = {
    home: { disqualifications: 0, foulsReceived: 0 },
    away: { disqualifications: 0, foulsReceived: 0 },
  };
  expect(
    deriveManualFacts(publicationSheet(), zero).teams.home.teamStatistics,
  ).toMatchObject(zero.home);
  expect(
    deriveManualFacts(publicationSheet()).teams.home.teamStatistics
      .disqualifications,
  ).toBeNull();
});
it("legacy B2 is not a technical or a count of bench disqualifications", () => {
  const d = publicationSheet();
  d.events.push({
    id: pubId(2050),
    side: "home",
    period: 1,
    target: "B",
    code: "B2",
  });
  expect(deriveManualFacts(d).teams.home.teamStatistics).toEqual({
    version: 1,
    technicalFouls: 0,
    disqualifications: null,
    foulsReceived: 0,
  });
});
it("counts compensated legacy bank/coach/player technicals and the final successor", () => {
  const legacy = publicationSheet();
  legacy.staff.home.coachStaffEntryId = pubId(200);
  legacy.events.unshift(
    { id: pubId(2060), side: "home", period: 1, target: "0", code: "TC" },
    { id: pubId(2061), side: "home", period: 1, target: "C", code: "CC" },
    { id: pubId(2062), side: "home", period: 1, target: "B", code: "BC" },
    { id: pubId(2063), side: "home", period: 1, target: "B", code: "B2" },
  );
  expect(
    deriveManualFacts(legacy).teams.home.teamStatistics.technicalFouls,
  ).toBe(3);
  const current = disciplinarySheet();
  current.events.splice(-1, 0, {
    id: pubId(2064),
    side: "home",
    period: 1,
    target: "C",
    code: "CC",
    actorId: pubId(3),
  });
  expect(
    deriveManualFacts(current).teams.home.teamStatistics.technicalFouls,
  ).toBe(6);
});
