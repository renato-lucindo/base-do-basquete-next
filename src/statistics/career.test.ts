import { expect, it } from "vitest";
import {
  aggregateCareerStatistics,
  aggregateConfirmedStatistics,
} from "./aggregate";
import {
  normalizeConfirmedGame,
  confirmedPlayerFactSchema,
} from "./confirmed-facts";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";

function context<T extends ReturnType<typeof normalizeConfirmedGame>[number]>(
  row: T,
  n: number,
) {
  const v = structuredClone(row);
  v.gameId = pubId(2000 + n);
  v.disputeId = pubId(3000 + n);
  v.context.seasonId = pubId(4000 + n);
  v.context.championshipId = pubId(5000 + n);
  v.registration.registrationId = pubId(6000 + n);
  return v;
}
const options = { mode: "per-game" as const, minimumSeconds: 600 };
it("carreira soma todas as inscrições sem enfraquecer a consulta de uma disputa", () => {
  const a = normalizeConfirmedGame(confirmedManualFixture())[0],
    b = context(a, 1);
  b.scoring = {
    origin: a.scoring!.origin,
    points: 8,
    twoMade: 4,
    threeMade: 0,
    freeMade: 0,
  };
  b.jersey = "77";
  b.person.name = "Outro nome público";
  const row = aggregateCareerStatistics([a, b], a.person.id, options)!;
  expect(row.gamesPlayed).toBe(2);
  expect(row.metrics.points).toEqual({ status: "available", value: 5 });
  expect(row.registrationIds).toEqual([
    a.registration.registrationId,
    b.registration.registrationId,
  ]);
  expect(row.names).toEqual(["Atleta", "Outro nome público"]);
  expect(() => aggregateConfirmedStatistics([a, b], options)).toThrow(
    "Contextos estatísticos incompatíveis",
  );
});
it("carreira recusa duplicidade global, homônimo errado e inscrição em duas disputas", () => {
  const a = normalizeConfirmedGame(confirmedManualFixture())[0],
    b = context(a, 1);
  b.gameId = a.gameId;
  expect(() =>
    aggregateCareerStatistics([a, b], a.person.id, options),
  ).toThrow();
  b.gameId = pubId(2001);
  b.person.id = pubId(99);
  expect(() =>
    aggregateCareerStatistics([a, b], a.person.id, options),
  ).toThrow();
  b.person.id = a.person.id;
  b.registration.registrationId = a.registration.registrationId;
  expect(() =>
    aggregateCareerStatistics([a, b], a.person.id, options),
  ).toThrow();
});
it("percentuais e médias de carreira usam observações, nunca médias intermediárias", async () => {
  const original = normalizeConfirmedGame(await confirmedPdfFixture()).find(
    (r) => r.played && r.advanced,
  )!;
  const pdf = (n: number, made: number, attempted: number) => {
    const r = context(original, n);
    r.advanced!.statistics = {
      ...r.advanced!.statistics,
      points: 2 * made,
      secondsPlayed: 600,
      fieldGoals: { made, attempted },
      twoPoints: { made, attempted },
      threePoints: { made: 0, attempted: 0 },
      freeThrows: { made: 0, attempted: 0 },
      offensiveRebounds: 3,
      defensiveRebounds: 2,
      rebounds: 5,
    };
    r.scoring = {
      origin: { kind: "pdf", version: r.source.version },
      points: 2 * made,
      twoMade: made,
      threeMade: 0,
      freeMade: 0,
    };
    return confirmedPlayerFactSchema.parse(r);
  };
  const a = pdf(1, 5, 10),
    b = pdf(2, 1, 4),
    manual = context(normalizeConfirmedGame(confirmedManualFixture())[0], 3);
  manual.person = a.person;
  const result = aggregateCareerStatistics(
    [a, b, manual],
    a.person.id,
    options,
  )!;
  expect(result.metrics.fieldGoalPercentage).toEqual({
    status: "available",
    value: 42.9,
  });
  expect(result.metrics.points).toEqual({ status: "available", value: 4.7 });
  expect(result.metrics.rebounds).toEqual({ status: "available", value: 5 });
  expect(result.coverage.advancedGames).toBe(2);
});
it("DNP não aumenta denominadores, ausência não vira zero e carreira vazia não fabrica linha", () => {
  const [a] = normalizeConfirmedGame(confirmedManualFixture()),
    bench = context(
      normalizeConfirmedGame(confirmedManualFixture(true)).find(
        (r) => !r.played,
      )!,
      1,
    );
  bench.person = a.person;
  const result = aggregateCareerStatistics([a, bench], a.person.id, options)!;
  expect(result.gamesPlayed).toBe(1);
  expect(result.metrics.points.value).toBe(2);
  expect(result.metrics.minutes.value).toBeNull();
  expect(aggregateCareerStatistics([], a.person.id, options)).toBeNull();
});
