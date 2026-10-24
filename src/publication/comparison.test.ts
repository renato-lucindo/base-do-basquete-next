import { it, expect } from "vitest";
import { comparePublicationSources, type ComparableGame } from "./comparison";
import { pubId } from "../../tests/fixtures/publication";
const sample = (): ComparableGame => ({
  disputeId: pubId(1),
  gameNumber: "4",
  home: {
    registrationId: pubId(2),
    score: 2,
    periodScores: [0, 0, 0, 2],
    players: [
      { playerId: pubId(21), jerseyNumber: "00", points: 2, twoPointMade: 1 },
    ],
  },
  away: {
    registrationId: pubId(3),
    score: 0,
    periodScores: [0, 0, 0, 0],
    players: [{ playerId: pubId(31), jerseyNumber: "0", points: 0 }],
  },
});
it("shares a UUID dictionary across both sources and restores identities in diagnostics", () => {
  const a = sample(),
    b = sample();
  b.home.players![0].points = 3;
  b.home.players![0].jerseyNumber = "0";
  const r = comparePublicationSources(a, b);
  expect(r.compatible).toBe(false);
  expect(r.errors[0].path).toBe(`home.players.${pubId(21)}.points`);
  expect(r.warnings[0].code).toBe("INGESTION_JERSEY_WARNING");
  expect(comparePublicationSources(a, sample()).compatible).toBe(true);
  b.home.players![0].playerId = pubId(22);
  const diff = comparePublicationSources(a, b).errors.find(
    (e) => e.code === "INGESTION_PARTICIPATION_MISMATCH",
  )!;
  expect(diff.expected).toEqual([pubId(21)]);
  expect(diff.actual).toEqual([pubId(22)]);
});
it("never matches distinct full UUIDs sharing their prefix or registration sets", () => {
  const a = sample(),
    b = sample();
  b.disputeId = pubId(9);
  b.home.registrationId = pubId(8);
  const r = comparePublicationSources(a, b);
  expect(
    r.errors.find((e) => e.code === "INGESTION_COMPETITION_MISMATCH"),
  ).toMatchObject({ expected: pubId(1), actual: pubId(9) });
  expect(
    r.errors.find((e) => e.code === "INGESTION_PARTICIPANTS_MISMATCH")?.actual,
  ).toEqual([pubId(8), pubId(3)].sort());
});
it("requires explicit inversion and preserves unknown periods and participation", () => {
  const a = sample(),
    b = sample();
  [b.home, b.away] = [b.away, b.home];
  expect(comparePublicationSources(a, b).compatible).toBe(false);
  expect(
    comparePublicationSources(a, b, { allowSideInversion: true }),
  ).toMatchObject({ compatible: true, sideInverted: true });
  const c = sample();
  c.home.periodScores = null;
  c.home.players = null;
  c.gameNumber = null;
  expect(comparePublicationSources(a, c).compatible).toBe(true);
  c.home.score = 3;
  expect(comparePublicationSources(a, c).compatible).toBe(false);
});
it("validates duplicate identities, UUIDs and unsafe statistics before adapting", () => {
  const a = sample();
  a.home.players!.push({ ...a.home.players![0] });
  expect(() => comparePublicationSources(a, sample())).toThrow();
  const b = sample();
  b.home.registrationId = "2";
  expect(() => comparePublicationSources(b, sample())).toThrow();
  const c = sample();
  c.home.players![0].points = -1;
  expect(() => comparePublicationSources(c, sample())).toThrow();
});
