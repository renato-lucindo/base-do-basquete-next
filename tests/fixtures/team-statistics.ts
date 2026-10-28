import { confirmedManualFixture } from "./statistics-publications";
import { statisticsSourceSchema } from "../../src/statistics/source";
import { pubId } from "./publication";
export function teamStatisticsFixture() {
  const games = [
    [1, 0, "round_robin"],
    [1, 0, "knockout"],
    [0, 2, null],
  ].map(([homeTwo, awayThree, phase], i) => {
    const snapshot = confirmedManualFixture(true);
    snapshot.id = pubId(20000 + i);
    snapshot.publishedAt = `2026-10-${String(23 + i).padStart(2, "0")}T12:00:00Z`;
    for (const [side, points] of [
      ["home", Number(homeTwo) * 2],
      ["away", Number(awayThree) * 3],
    ] as const) {
      snapshot.facts.teams[side].points = points;
      snapshot.facts.teams[side].periods = [0, 0, 0, points];
      const first = snapshot.facts.players.find((p) => p.side === side)!;
      first.points = points;
      first.two = side === "home" ? Number(homeTwo) : 0;
      first.three = side === "away" ? Number(awayThree) : 0;
    }
    return { phase, snapshot };
  });
  return statisticsSourceSchema.parse({
    kind: "confirmed-statistics-v1",
    disputeId: pubId(801),
    version: 3,
    confirmedAt: "2026-10-25T12:00:00Z",
    minimumSeconds: 600,
    games,
  });
}
