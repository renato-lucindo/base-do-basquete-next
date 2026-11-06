import { expect, it } from "vitest";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";
import { deriveSheetTeamStatistics } from "./sheet-team-statistics";
import { prepareManualPublication } from "./manual";

it("FR crosses the same athlete FC total per game, including T/U but not staff technicals", () => {
  const d = publicationSheet();
  d.events.unshift(
    { id: pubId(701), side: "home", period: 1, target: "0", code: "T1" },
    { id: pubId(702), side: "home", period: 1, target: "00", code: "U2" },
    { id: pubId(703), side: "home", period: 1, target: "C", code: "C1" },
    { id: pubId(704), side: "away", period: 1, target: "0", code: "P" },
  );
  const facts = deriveSheetTeamStatistics(d);
  expect(facts.home.foulsReceived).toBe(1);
  expect(facts.away.foulsReceived).toBe(2);
  expect(facts.home.technicalFouls).toBe(2);
  const review = {
    home: {
      disqualifications: facts.home.minimumDisqualifications,
      foulsReceived: 1,
    },
    away: { disqualifications: 0, foulsReceived: null },
  };
  expect(deriveSheetTeamStatistics(d, review).away.foulsReceived).toBe(2);
  review.home.foulsReceived = 9;
  expect(() => deriveSheetTeamStatistics(d, review)).toThrow(/FR/);
});

it("requires explicit GD from both sides for writing while legacy derivation remains readable", () => {
  const d = publicationSheet();
  const c = {
    requestId: pubId(800),
    gameId: pubId(801),
    gameVersion: 1,
    basePublicationVersion: 0,
    source: { kind: "sheet" as const, baseSheetVersion: 0, document: d },
    reason: "",
    fallback: false,
  };
  expect(() => prepareManualPublication(c)).toThrow(/GD/);
  expect(deriveSheetTeamStatistics(d).home.disqualifications).toBeNull();
  expect(deriveSheetTeamStatistics(d).home.foulsReceived).toBe(0);
  const review = {
    home: { disqualifications: 0, foulsReceived: null },
    away: { disqualifications: 0, foulsReceived: null },
  };
  expect(() =>
    prepareManualPublication({
      ...c,
      source: { ...c.source, teamReview: review },
    }),
  ).not.toThrow();
  expect(() =>
    prepareManualPublication({
      ...c,
      source: {
        ...c.source,
        teamReview: {
          ...review,
          away: { ...review.away, disqualifications: null },
        },
      },
    }),
  ).toThrow(/GD/);
});

import { disciplinarySheet } from "../../tests/fixtures/sheet-team-statistics";
import { gdReviewReady, initialGDReview } from "./collective-review";
it("accepts automatic zero and identified dismissals without human confirmation", () => {
  for (const d of [publicationSheet(), disciplinarySheet()]) {
    const facts = deriveSheetTeamStatistics(d);
    const review = initialGDReview(facts);
    expect(gdReviewReady(review, facts)).toBe(true);
    expect(Number(review.home.total)).toBe(facts.home.minimumDisqualifications);
    expect(Number(review.away.total)).toBe(facts.away.minimumDisqualifications);
  }
});

it("preserves known published totals and validates incomplete or below-minimum corrections", () => {
  const facts = deriveSheetTeamStatistics(disciplinarySheet());
  const review = initialGDReview(facts, { home: 6, away: 0 });
  expect(gdReviewReady(review, facts)).toBe(true);
  expect(review.home.total).toBe("6");
  for (const invalid of ["", " ", "-1", "3", "1.5", "2147483648"]) {
    expect(
      gdReviewReady(
        { ...review, home: { ...review.home, total: invalid } },
        facts,
      ),
    ).toBe(false);
  }
});
