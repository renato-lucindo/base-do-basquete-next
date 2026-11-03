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
    foulsReceived: null,
  });
  const facts = deriveManualFacts(d, teamReview());
  expect(facts.teams.home.teamStatistics).toEqual({
    version: 1,
    technicalFouls: 5,
    disqualifications: 6,
    foulsReceived: 9,
  });
  expect(facts.players.reduce((n, p) => n + p.fouls, 0)).toBe(3);
  expect(facts.teams.home).not.toHaveProperty("staffPeople");
  expect(facts.teams.home).not.toHaveProperty("activeCoachId");
  expect(
    publicGameSchema.safeParse(confirmedManualFixture(false, d, teamReview()))
      .success,
  ).toBe(true);
});
it("allows explicit zero, rejects totals below identified dismissals, and never infers received fouls", () => {
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
    foulsReceived: null,
  });
});
