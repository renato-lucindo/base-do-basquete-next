import { expect, it } from "vitest";
import {
  disciplinarySheet,
  teamReview,
} from "../../tests/fixtures/sheet-team-statistics";
import { confirmedManualFixture } from "../../tests/fixtures/statistics-publications";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
import { buildTeamsPage } from "./domain";
import { parseTeamsQuery } from "./query-contract";
import { SHEET_TEAM_COLUMNS } from "./metrics";
const query = (q = "") => {
  const p = new URLSearchParams("mode=total&sort=points&direction=desc");
  new URLSearchParams(q).forEach((v, k) => p.set(k, v));
  return parseTeamsQuery(p);
};
function source() {
  const s = teamStatisticsFixture();
  const first = confirmedManualFixture(
    false,
    disciplinarySheet(),
    teamReview(),
  );
  const second = structuredClone(first);
  second.id = pubId(29000);
  s.games = [
    { snapshot: first, phase: "round_robin" },
    { snapshot: second, phase: "knockout" },
  ];
  return s;
}
it("sheet column order and every quantitative total/average use the selected complete games", () => {
  const s = source();
  const total = buildTeamsPage(s, query());
  expect(total.scoresheet).toBe(true);
  expect(total.query.columns).toEqual(SHEET_TEAM_COLUMNS);
  const row = total.rows[0];
  const expected = {
    games: 2,
    points: 4,
    twoMade: 2,
    threeMade: 0,
    foulsCommitted: 6,
    foulsReceived: 18,
    freeThrowsAttempted: 0,
    freeThrowsMade: 0,
    technicalFouls: 10,
    unsportsmanlikeFouls: 4,
    disqualifications: 12,
  };
  const average = buildTeamsPage(s, { ...query(), mode: "per-game" }).rows[0];
  for (const [key, value] of Object.entries(expected)) {
    const metric = key as keyof typeof expected;
    expect(row.statistics[metric].value, key).toBe(value);
    expect(average.statistics[metric].value, key).toBe(
      metric === "games" ? value : value / 2,
    );
  }
  expect(row.statistics.freeThrowPercentage.value).toBeNull();
  const regular = buildTeamsPage(s, query("scope=regular")).rows[0];
  expect(regular.statistics.technicalFouls.value).toBe(5);
  expect(regular.gamesPlayed).toBe(1);
});
it("legacy or partially reviewed games never contribute a partial team total as complete", () => {
  const s = source();
  const game = s.games[1].snapshot;
  if (!("freeTaken" in game.facts.teams.home)) throw Error("sheet fixture");
  delete game.facts.teams.home.teamStatistics;
  const row = buildTeamsPage(s, query()).rows[0];
  for (const key of [
    "technicalFouls",
    "disqualifications",
    "foulsReceived",
  ] as const) {
    expect(row.metricCoverage[key]).toBe(1);
    expect(row.statistics[key]).toEqual({ status: "unavailable", value: null });
  }
  expect(row.statistics.foulsCommitted.value).toBe(6);
});
it("statistical ranking shares exact ties and null stays unranked in either direction", () => {
  const s = teamStatisticsFixture();
  // Same total 6, but home has four games, the added registration just one.
  const extra = structuredClone(s.games[2]);
  extra.snapshot.id = pubId(29100);
  extra.snapshot.game.away.registrationId = pubId(29101);
  extra.snapshot.facts.players
    .filter((p) => p.side === "away")
    .forEach((p) => (p.registrationId = pubId(29101)));
  s.games.push(extra);
  const total = buildTeamsPage(s, query());
  expect(total.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
  const average = buildTeamsPage(s, { ...query(), mode: "per-game" });
  expect(average.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  expect(average.rows[0].registrationId).toBe(pubId(29101));
  for (const direction of ["asc", "desc"] as const)
    expect(
      buildTeamsPage(s, {
        ...query("sort=foulsReceived"),
        direction,
      }).rows.every((r) => r.rank === null),
    ).toBe(true);
});
it("corrected public snapshots replace one game's facts without blending versions or altering registrations", () => {
  const s = source();
  const old = buildTeamsPage(s, query()).rows[0];
  const revised = confirmedManualFixture(false, disciplinarySheet(), {
    ...teamReview(),
    home: { disqualifications: 4, foulsReceived: 5 },
  });
  revised.version = 2;
  revised.id = s.games[0].snapshot.id;
  s.games[0].snapshot = revised;
  const row = buildTeamsPage(s, query()).rows[0];
  expect(old.statistics.disqualifications.value).toBe(12);
  expect(row.statistics.disqualifications.value).toBe(10);
  expect(row.statistics.foulsReceived.value).toBe(14);
  expect(row.gamesPlayed).toBe(2);
  s.games.push({ snapshot: revised, phase: "round_robin" });
  expect(() => buildTeamsPage(s, query())).toThrow();
});
it("shared positions are assigned before pagination, including a tie spanning two pages", () => {
  const s = teamStatisticsFixture();
  const seed = s.games[0];
  s.games = Array.from({ length: 21 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = pubId(31000 + i);
    for (const side of ["home", "away"] as const) {
      const id = pubId(32000 + i * 2 + (side === "home" ? 0 : 1));
      g.snapshot.game[side].registrationId = id;
      g.snapshot.facts.players
        .filter((p) => p.side === side)
        .forEach((p) => (p.registrationId = id));
    }
    return g;
  });
  const second = buildTeamsPage(s, { ...query(), page: 2 });
  expect(second.rows[0].rank).toBe(1);
  expect(second.rows[1].rank).toBe(22);
});
