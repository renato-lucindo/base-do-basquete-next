import { expect, it } from "vitest";
import { simpleStatisticsQuery } from "./simple-query";
it("simple presentation rejects advanced modes and metrics while retaining useful URL state", () => {
  const q = simpleStatisticsQuery(
    new URLSearchParams(
      "dataset=boxscore&mode=per-30&columns=minutes,assists&sort=rebounds&filters=rebounds:>:1;points:>=:2&q=Joao&page=3",
    ),
  );
  expect(q).toMatchObject({
    dataset: "all",
    mode: "total",
    scope: "all",
    sort: "points",
    page: 3,
    search: "Joao",
  });
  expect(q.columns).toEqual([
    "games",
    "points",
    "pointsPerGame",
    "twoMade",
    "threeMade",
    "freeMade",
    "foulsCommitted",
    "disqualifications",
  ]);
  expect(q.filters).toEqual([{ metric: "points", operator: ">=", value: 2 }]);
});
