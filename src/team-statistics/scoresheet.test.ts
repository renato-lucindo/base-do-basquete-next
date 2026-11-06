import { expect, it } from "vitest";
import {
  disciplinarySheet,
  teamReview,
} from "../../tests/fixtures/sheet-team-statistics";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";
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
it("crosses FR before aggregation for distinct opponents, zero, phases and mixed PDF authority", async () => {
  const s = teamStatisticsFixture();
  s.games = [
    [1, 2, "round_robin"],
    [2, 3, "knockout"],
    [0, 0, null],
  ].map(([own, opposing, phase], index) => {
    const d = publicationSheet();
    for (const [side, count] of [
      ["home", Number(own)],
      ["away", Number(opposing)],
    ] as const)
      d.events.unshift(
        ...Array.from({ length: count }, (_, n) => ({
          id: pubId(31000 + index * 100 + (side === "home" ? 0 : 10) + n),
          side,
          period: 1,
          target: "0",
          code: "P",
        })),
      );
    const snapshot = confirmedManualFixture(false, d, {
      home: { disqualifications: 0, foulsReceived: null },
      away: { disqualifications: 0, foulsReceived: null },
    });
    snapshot.id = pubId(32000 + index);
    const opponent = pubId(32100 + index);
    snapshot.game.away.registrationId = opponent;
    for (const p of snapshot.facts.players.filter((p) => p.side === "away")) {
      p.registrationId = opponent;
    }
    // 0 and 00 are separate people; retain those identities independently.
    snapshot.facts.players
      .filter((p) => p.side === "away")
      .forEach((p, n) => {
        p.person.id = pubId(33000 + index * 100 + n);
      });
    const captain = snapshot.facts.players.find(
      (p) => p.side === "away" && p.captain,
    )!.person;
    snapshot.staff.away.captain = captain;
    snapshot.staff.away.coach = captain;
    return { snapshot, phase: phase as "round_robin" | "knockout" | null };
  });
  const get = (text = "", id = pubId(5)) =>
    buildTeamsPage(s, query(text)).rows.find((r) => r.registrationId === id)!;
  expect(get().statistics.foulsReceived.value).toBe(5);
  expect(get("mode=per-game").statistics.foulsReceived.value).toBe(5 / 3);
  expect(get("scope=regular").statistics.foulsReceived.value).toBe(2);
  expect(get("scope=playoffs").statistics.foulsReceived.value).toBe(3);
  for (const [index, expected] of [1, 2, 0].entries())
    expect(get("", pubId(32100 + index)).statistics.foulsReceived.value).toBe(
      expected,
    );
  const pdf = await confirmedPdfFixture(
    "Box Score FIBA ALC vs AVA 09 maio.pdf",
  );
  pdf.id = pubId(34000);
  const ownFR = pdf.facts.players
    .filter((p) => p.side === "home" && p.played)
    .reduce((n, p) => n + p.foulsReceived!, 0);
  expect(ownFR).toBeGreaterThan(0);
  const pdfFC = pdf.facts.players
    .filter((p) => p.side === "away" && p.played)
    .reduce((n, p) => n + p.advanced!.foulsCommitted, 0);
  // A distinct authoritative FR proves that no opponent-FC inference touches PDFs.
  pdf.facts.players.find(
    (p) => p.side === "home" && p.played,
  )!.foulsReceived! += 7;
  const authoritativeFR = ownFR + 7;
  expect(authoritativeFR).not.toBe(pdfFC);
  const pdfPlayers = structuredClone(pdf.facts.players);
  s.games.push({ snapshot: pdf, phase: "knockout" });
  expect(get().statistics.foulsReceived.value).toBe(5 + authoritativeFR);
  expect(get("mode=per-game").statistics.foulsReceived.value).toBe(
    (5 + authoritativeFR) / 4,
  );
  expect(get("dataset=boxscore").statistics.foulsReceived.value).toBe(
    authoritativeFR,
  );
  expect(get("dataset=boxscore&mode=per-game").gamesPlayed).toBe(1);
  expect(pdf.facts.players).toEqual(pdfPlayers);
});
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
    foulsReceived: 0,
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
        ...query("sort=disqualifications"),
        direction,
      }).rows.every((r) => r.rank === null),
    ).toBe(true);
});
it("corrected public snapshots replace one game's facts without blending versions or altering registrations", () => {
  const s = source();
  const old = buildTeamsPage(s, query()).rows[0];
  const document = disciplinarySheet();
  document.events.unshift(
    ...Array.from({ length: 3 }, (_, i) => ({
      id: pubId(29900 + i),
      side: "away" as const,
      period: 1,
      target: "0",
      code: "P",
      playerRosterEntryId: pubId(11),
    })),
  );
  const revised = confirmedManualFixture(false, document, {
    ...teamReview(),
    home: { disqualifications: 4, foulsReceived: null },
  });
  revised.version = 2;
  revised.id = s.games[0].snapshot.id;
  s.games[0].snapshot = revised;
  const row = buildTeamsPage(s, query()).rows[0];
  expect(old.statistics.disqualifications.value).toBe(12);
  expect(row.statistics.disqualifications.value).toBe(10);
  expect(row.statistics.foulsReceived.value).toBe(3);
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
