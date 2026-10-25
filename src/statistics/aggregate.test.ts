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
  expect(scorer.metrics.twoMade).toEqual({ status: "available", value: 1 });
  expect(scorer.metrics.threeMade).toEqual({ status: "available", value: 0 });
  expect(scorer.metrics.freeMade).toEqual({ status: "available", value: 0 });
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

it("faltas por30 usam somente segundos dos jogos que cobrem a própria métrica", async () => {
  const a = await advancedFact(1, 5, 10, 600),
    b = await advancedFact(2, 5, 10, 1200),
    manual = normalizeConfirmedGame(confirmedManualFixture())[0];
  a.foulsReceived = { origin: a.advanced!.origin, value: 2 };
  manual.person = a.person;
  manual.registration = a.registration;
  manual.foulsCommitted!.value = 5;
  const input = [a, b, manual],
    before = structuredClone(input);
  const [totals] = aggregateConfirmedStatistics(input, {
    mode: "total",
    minimumSeconds: 600,
  });
  const [averages] = aggregateConfirmedStatistics(input, {
    mode: "per-game",
    minimumSeconds: 600,
  });
  const [per30] = aggregateConfirmedStatistics(input, {
    mode: "per-30",
    minimumSeconds: 600,
  });
  expect(totals.metrics.foulsCommitted.value).toBe(7);
  expect(averages.metrics.foulsCommitted.value).toBe(2.3);
  expect(averages.metrics.foulsReceived.value).toBe(2);
  expect(per30.metrics.foulsCommitted.value).toBe(2);
  expect(per30.metrics.foulsReceived.value).toBe(6);
  expect(input).toEqual(before);
});
it("plus/minus não recebe zero de jogos sem cobertura nem escala por30; arredonda negativos", async () => {
  const a = await advancedFact(1, 5, 10, 599),
    b = await advancedFact(2, 5, 10, 599);
  a.advanced!.statistics.plusMinus = -1;
  const missing = structuredClone(b);
  missing.gameId = pubId(3000);
  b.advanced!.statistics.plusMinus = -2;
  const [row] = aggregateConfirmedStatistics([a, b, missing], {
    mode: "per-30",
    minimumSeconds: 600,
  });
  expect(row.metrics.plusMinus).toEqual({ status: "unavailable", value: null });
  expect(row.coverage.plusMinusGames).toBe(2);
  const [covered] = aggregateConfirmedStatistics([a, b], {
    mode: "per-30",
    minimumSeconds: 600,
  });
  expect(covered.metrics.plusMinus).toEqual({
    status: "available",
    value: -1.5,
  });
  const negative = await advancedFact(4, 0, 0);
  negative.advanced!.statistics.turnovers = 9;
  negative.advanced!.statistics.efficiency = 999; // EF is derived, never trusted as an independent observation.
  const [result] = aggregateConfirmedStatistics([negative], {
    mode: "per-30",
    minimumSeconds: 600,
  });
  expect(result.metrics.efficiency.value).toBe(-3);
});

it("casos portáveis: 6/14→42,9% e meia unidade negativa mantém Math.round", async () => {
  const a = await advancedFact(1, 5, 10),
    b = await advancedFact(2, 1, 4);
  expect(
    aggregateConfirmedStatistics([a, b])[0].metrics.fieldGoalPercentage.value,
  ).toBe(42.9);
  const games = await Promise.all([1, 2, 3, 4].map((n) => advancedFact(n)));
  games.forEach((r, i) => {
    r.advanced!.statistics.plusMinus = i === 0 ? -5 : 0;
  });
  expect(aggregateConfirmedStatistics(games)[0].metrics.plusMinus.value).toBe(
    -1.2,
  );
});
it("percentuais são invariantes de modo e não exigem amostra temporal; minutos zero não viraDNP", async () => {
  const a = await advancedFact(1, 1, 3, 0);
  for (const mode of ["total", "per-game", "per-30"] as const) {
    const [row] = aggregateConfirmedStatistics([a], {
      mode,
      minimumSeconds: 600,
    });
    expect(row.gamesPlayed).toBe(1);
    expect(row.metrics.fieldGoalPercentage).toEqual({
      status: "available",
      value: 33.3,
    });
    expect(row.metrics.points).toEqual(
      mode === "per-30"
        ? { status: "insufficient-sample", value: null }
        : { status: "available", value: 2 },
    );
    expect(row.metrics.minutes).toEqual(
      mode === "per-30"
        ? { status: "unavailable", value: null }
        : { status: "available", value: 0 },
    );
  }
});
it("catálogos contextuais preservam variações de nome/camisa com ordem reprodutível", () => {
  const a = normalizeConfirmedGame(confirmedManualFixture())[0],
    b = structuredClone(a);
  b.gameId = pubId(901);
  b.person.name = "Zeca";
  b.person.nickname = "Z";
  b.jersey = "00";
  b.registration.name = "Equipe renomeada";
  const config = { mode: "total" as const, minimumSeconds: 600 };
  const result = aggregateConfirmedStatistics([a, b], config);
  expect(result[0].names).toEqual(["Atleta", "Zeca"]);
  expect(result[0].jerseys).toEqual(["0", "00"]);
  expect(aggregateConfirmedStatistics([b, a], config)).toEqual(result);
});
it("recusa versões diferentes do mesmo jogo mesmo entre atletas distintos", () => {
  const [a, b] = normalizeConfirmedGame(confirmedManualFixture());
  b.publicationVersion++;
  expect(() => aggregateConfirmedStatistics([a, b])).toThrow();
});
it("uma inscrição não pode mudar de equipe global ao agregar outra pessoa", () => {
  const [a, b] = normalizeConfirmedGame(confirmedManualFixture());
  b.gameId = pubId(901);
  b.registration.team.id = pubId(99);
  expect(() => aggregateConfirmedStatistics([a, b])).toThrow();
});
it("não aceita domínios inventados ou origens incompatíveis com o snapshot", async () => {
  const a = await advancedFact(1);
  a.advanced!.origin.version++;
  expect(() => aggregateConfirmedStatistics([a])).toThrow();
  const b = await advancedFact(2);
  b.scoring!.points += 1;
  b.scoring!.freeMade += 1;
  expect(() => aggregateConfirmedStatistics([b])).toThrow();
  const c = normalizeConfirmedGame(confirmedManualFixture())[0];
  c.foulsReceived = { origin: { kind: "sheet", version: 1 }, value: 3 };
  expect(() => aggregateConfirmedStatistics([c])).toThrow();
});
it("valida modos/amostra e campos extras sem normalizar um contexto adulterado", () => {
  const a = normalizeConfirmedGame(confirmedManualFixture())[0];
  for (const minimumSeconds of [0, -1, 1.5, Infinity])
    expect(() =>
      aggregateConfirmedStatistics([a], { mode: "total", minimumSeconds }),
    ).toThrow();
  expect(() =>
    aggregateConfirmedStatistics([{ ...a, birthDate: "1990-01-01" }]),
  ).toThrow();
  expect(aggregateConfirmedStatistics([])).toEqual([]);
});
