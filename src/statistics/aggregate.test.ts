import { expect, it } from "vitest";
import { aggregateConfirmedStatistics } from "./aggregate";
import {
  normalizeConfirmedGame,
  confirmedPlayerFactSchema,
} from "./confirmed-facts";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
async function advancedFact(
  n: number,
  made = 5,
  attempted = 10,
  seconds = 600,
) {
  const row = normalizeConfirmedGame(await confirmedPdfFixture()).find(
    (r) => r.played && r.advanced,
  )!;
  row.gameId = pubId(1000 + n);
  row.scoring = {
    origin: { kind: "pdf", version: row.source.version },
    points: 2 * made,
    twoMade: made,
    threeMade: 0,
    freeMade: 0,
  };
  row.advanced!.statistics = {
    points: 2 * made,
    secondsPlayed: seconds,
    fieldGoals: { made, attempted },
    twoPoints: { made, attempted },
    threePoints: { made: 0, attempted: 0 },
    freeThrows: { made: 0, attempted: 0 },
    offensiveRebounds: 3,
    defensiveRebounds: 2,
    rebounds: 5,
    assists: 1,
    turnovers: 2,
    steals: 1,
    blocks: 1,
    foulsCommitted: 1,
    plusMinus: null,
    efficiency: 3 * made - attempted + 6,
  };
  row.foulsCommitted = { origin: row.advanced!.origin, value: 1 };
  return confirmedPlayerFactSchema.parse(row);
}
it("manual usa participação real, zero conhecido e ausência de tentativas/minutos", () => {
  const facts = normalizeConfirmedGame(confirmedManualFixture(true)),
    rows = aggregateConfirmedStatistics(facts, {
      mode: "total",
      minimumSeconds: 600,
    }),
    scorer = rows.find((r) => r.personId === pubId(1))!;
  expect(scorer.gamesPlayed).toBe(1);
  expect(scorer.metrics.points).toEqual({ status: "available", value: 2 });
  expect(scorer.metrics.minutes).toEqual({
    status: "unavailable",
    value: null,
  });
  expect(scorer.metrics.fieldGoalPercentage).toEqual({
    status: "unavailable",
    value: null,
  });
  const bench = rows.find((r) => r.personId === pubId(7));
  expect(bench?.gamesPlayed ?? 0).toBe(0);
  if (bench) expect(bench.metrics.points.value).toBeNull();
});
it("percentual pondera tentativas e médias usam os jogos cobertos", async () => {
  const a = await advancedFact(1, 5, 10),
    b = await advancedFact(2, 1, 2),
    manual = normalizeConfirmedGame(confirmedManualFixture()).find(
      (r) => r.person.id === pubId(1),
    )!;
  manual.person = a.person;
  manual.registration = a.registration;
  const [row] = aggregateConfirmedStatistics([a, b, manual], {
    mode: "per-game",
    minimumSeconds: 600,
  });
  expect(row.gamesPlayed).toBe(3);
  expect(row.metrics.fieldGoalPercentage).toEqual({
    status: "available",
    value: 50,
  });
  expect(row.metrics.rebounds).toEqual({ status: "available", value: 5 });
  expect(row.metrics.points).toEqual({ status: "available", value: 4.7 });
  expect(row.coverage).toMatchObject({
    scoringGames: 3,
    advancedGames: 2,
    foulGames: 3,
    foulsReceivedGames: 0,
  });
});
it("por30 usa pontos avançados e seus segundos, sem incorporar fallback ou minuto ausente", async () => {
  const pdf = await advancedFact(1, 6, 10, 1200);
  pdf.scoring = {
    origin: { kind: "sheet", version: 3 },
    points: 99,
    twoMade: 0,
    threeMade: 0,
    freeMade: 99,
  };
  const manual = normalizeConfirmedGame(confirmedManualFixture())[0];
  manual.person = pdf.person;
  manual.registration = pdf.registration;
  const [row] = aggregateConfirmedStatistics([pdf, manual], {
    mode: "per-30",
    minimumSeconds: 600,
  });
  expect(row.metrics.points).toEqual({ status: "available", value: 18 });
  expect(row.metrics.games).toEqual({ status: "available", value: 2 });
  expect(row.metrics.minutes).toEqual({ status: "unavailable", value: null });
  expect(row.metrics.plusMinus).toEqual({ status: "unavailable", value: null });
});
it("amostra insuficiente difere de métrica ausente e de zero conhecido", async () => {
  const row = await advancedFact(1, 0, 0, 599);
  expect(
    aggregateConfirmedStatistics([row], {
      mode: "per-30",
      minimumSeconds: 600,
    })[0].metrics.points,
  ).toEqual({ status: "insufficient-sample", value: null });
  row.advanced!.statistics.secondsPlayed = 600;
  const [enough] = aggregateConfirmedStatistics([row], {
    mode: "per-30",
    minimumSeconds: 600,
  });
  expect(enough.metrics.points).toEqual({ status: "available", value: 0 });
  expect(enough.metrics.fieldGoalPercentage).toEqual({
    status: "unavailable",
    value: null,
  });
});
it("identidades/inscrições/contextos e revisões não são fundidos silenciosamente", () => {
  const a = normalizeConfirmedGame(confirmedManualFixture())[0],
    b = structuredClone(a);
  b.gameId = pubId(901);
  b.registration.registrationId = pubId(55);
  b.registration.name = "Segunda inscrição";
  b.jersey = "77";
  expect(
    aggregateConfirmedStatistics([a, b], {
      mode: "total",
      minimumSeconds: 600,
    }),
  ).toHaveLength(2);
  expect(() =>
    aggregateConfirmedStatistics([a, structuredClone(a)], {
      mode: "total",
      minimumSeconds: 600,
    }),
  ).toThrow();
  b.disputeId = pubId(999);
  expect(() =>
    aggregateConfirmedStatistics([a, b], {
      mode: "total",
      minimumSeconds: 600,
    }),
  ).toThrow();
});
