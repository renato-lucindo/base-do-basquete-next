import { expect, it } from "vitest";
import { resolveQualifications } from "./qualifications";

const id = (n: number) =>
  `f1800000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (
  n: number,
  position: number,
  games = 4,
  leaguePoints = 6,
  difference = 10,
) => ({
  registrationId: id(n),
  position,
  tied: false,
  games,
  leaguePoints,
  difference,
  pointsFor: 300,
});
const groups = [0, 1, 2].map((g) => ({
  groupId: id(100 + g),
  pendingGameIds: [] as string[],
  qualificationReady: true,
  standings: {
    status: "provisional" as const,
    rows: [
      row(g * 3 + 1, 1, 4, 8, 30 - g),
      row(g * 3 + 2, 2, 4, 7, 20 - g),
      row(g * 3 + 3, 3, 4, 6, 10 - g),
    ],
  },
}));
const pool = {
  id: id(500),
  phaseId: id(501),
  directPerGroup: 2,
  extras: [{ position: 3, count: 2 }],
  comparison: [
    "league_points_per_game",
    "difference_per_game",
    "points_for_per_game",
  ] as const,
};

it("qualifies two per group plus the two best third placed teams", () => {
  const result = resolveQualifications(pool, groups);
  expect(result.status).toBe("ready");
  expect(result.registrationIds).toEqual([
    id(1),
    id(4),
    id(7),
    id(2),
    id(5),
    id(8),
    id(3),
    id(6),
  ]);
  expect(result.registrationIds).not.toContain(id(9));
});
it("compares unequal group calendars by exact ratios, not raw totals", () => {
  const value = structuredClone(groups);
  value[2].standings.rows[2] = row(9, 3, 2, 4, 10);
  expect(resolveQualifications(pool, value).registrationIds.slice(-2)).toEqual([
    id(9),
    id(3),
  ]);
});
it("does not invent an order when a relevant inter-group tie remains", () => {
  const value = structuredClone(groups);
  value[2].standings.rows[2] = row(9, 3);
  expect(resolveQualifications(pool, value).status).toBe("pending");
});
it("does not treat the first published game as a complete calendar", () => {
  const value = structuredClone(groups);
  value[0].qualificationReady = false;
  expect(resolveQualifications(pool, value).status).toBe("pending");
});
it("manual qualification survives pending results without changing the group rows", () => {
  const value = structuredClone(groups);
  value[0].pendingGameIds = [id(999)];
  const before = structuredClone(value);
  const order = [1, 4, 7, 2, 5, 8, 6, 9].map(id);
  expect(
    resolveQualifications({ ...pool, manualOrder: order }, value),
  ).toMatchObject({ status: "ready", registrationIds: order, manual: true });
  expect(value).toEqual(before);
});
it("does not compare teams without any valid games as zero averages", () => {
  const value = structuredClone(groups);
  value[0].standings.rows[2] = row(3, 3, 0, 0, 0);
  expect(resolveQualifications(pool, value).status).toBe("pending");
});
