import { expect, it } from "vitest";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
  serializeStatisticsQuery,
  updateStatisticsQuery,
} from "./query";
import { mixedStatisticsFixture } from "../../tests/fixtures/statistics-mixed";
import { pubId } from "../../tests/fixtures/publication";

it("simple totals and PTS/J cover all confirmed games; full view covers boxscores only", async () => {
  const s = await mixedStatisticsFixture(),
    person = s.games[0].snapshot.facts.players[0].person.id;
  const query = parseStatisticsQuery(
    new URLSearchParams("scope=all&mode=total&dataset=all&preset=simple"),
  );
  const simple = buildStatisticsPage(s, query),
    row = simple.rows.find((r) => r.personId === person)!;
  const points = s.games.reduce(
    (sum, g) => sum + g.snapshot.facts.players[0].points,
    0,
  );
  expect(row.gamesPlayed).toBe(2);
  expect(row.metrics.points.value).toBe(points);
  expect(row.metrics.pointsPerGame.value).toBe(
    Math.round((points / 2) * 10) / 10,
  );
  const full = buildStatisticsPage(
    s,
    parseStatisticsQuery(
      new URLSearchParams("scope=all&mode=per-game&dataset=boxscore"),
    ),
  );
  const pdfRow = full.rows.find((r) => r.personId === person)!;
  expect(pdfRow.gamesPlayed).toBe(1);
  expect(pdfRow.metrics.points.value).toBe(
    s.games[1].snapshot.facts.players[0].points,
  );
  expect(full.rows.some((r) => r.personId === pubId(7))).toBe(false);
  const bench = buildStatisticsPage(s, {
    ...query,
    search: "Reserva Só Manual",
  }).rows[0];
  expect(bench.gamesPlayed).toBe(0);
  expect(bench.metrics.pointsPerGame.value).toBeNull();
});
it("the selected dataset survives shared URLs and resets pagination", () => {
  const q = parseStatisticsQuery(
    new URLSearchParams("scope=all&dataset=boxscore&page=2"),
  );
  expect(q.dataset).toBe("boxscore");
  expect(updateStatisticsQuery(q, { dataset: "all" }).page).toBe(1);
  expect(parseStatisticsQuery(serializeStatisticsQuery(q))).toEqual(q);
});
