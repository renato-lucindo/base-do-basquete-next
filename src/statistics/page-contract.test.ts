import { expect, it } from "vitest";
import { statisticsPageSchema } from "./page-contract";
import { buildStatisticsPage, parseStatisticsQuery } from "./query";
import { readFileSync } from "node:fs";
function page() {
  return buildStatisticsPage(
    JSON.parse(readFileSync("tests/fixtures/statistics-source.json", "utf8")),
    parseStatisticsQuery(new URLSearchParams("scope=all")),
  );
}
it("DTO da página preserva cobertura e correlação sem aceitar campos privados", () => {
  const value = page();
  expect(statisticsPageSchema.parse(value)).toEqual(value);
  for (const mutation of [
    { ...value, actorId: "private" },
    { ...value, page: 999 },
    { ...value, total: 1 },
    { ...value, rows: [value.rows[0], value.rows[0]] },
    { ...value, compared: [value.rows[0], value.rows[0]] },
  ])
    expect(statisticsPageSchema.safeParse(mutation).success).toBe(false);
  const bad = structuredClone(value);
  bad.rows[0].coverage.scoringGames = bad.rows[0].gamesPlayed + 1;
  expect(statisticsPageSchema.safeParse(bad).success).toBe(false);
});
it("não aceita ausência como zero, métrica faltando nem número não finito", () => {
  const value = page();
  for (const metric of [
    { status: "unavailable", value: 0 },
    { status: "available", value: null },
    { status: "available", value: Infinity },
  ]) {
    const bad = structuredClone(value);
    Object.assign(bad.rows[0].metrics, { points: metric });
    expect(statisticsPageSchema.safeParse(bad).success).toBe(false);
  }
  const missing = structuredClone(value);
  Reflect.deleteProperty(missing.rows[0].metrics, "points");
  expect(statisticsPageSchema.safeParse(missing).success).toBe(false);
});
