import { expect, it } from "vitest";
import { statisticsSourceSchema, selectStatisticsFacts } from "./source";
import { aggregateConfirmedStatistics } from "./aggregate";
import { confirmedManualFixture } from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
import { buildStatisticsPage, parseStatisticsQuery } from "./query";
function sourceFixture() {
  const games = (["round_robin", "knockout", null] as const).map((phase, i) => {
    const snapshot = confirmedManualFixture();
    snapshot.id = pubId(900 + i);
    return { phase, snapshot };
  });
  return {
    kind: "confirmed-statistics-v1" as const,
    disputeId: pubId(801),
    version: 1,
    confirmedAt: "2026-10-25T16:00:00Z",
    minimumSeconds: 600,
    games,
  };
}
it("correção do nome substitui grafias antigas inclusive em fases anteriores e na comparação", () => {
  const input = sourceFixture();
  const personId = input.games[0].snapshot.facts.players[0].person.id;
  for (const game of input.games)
    game.snapshot.facts.players[0].person.name = "Nome anterior";
  input.games[1].snapshot.publishedAt = "2026-10-26T13:00:00Z";
  input.games[1].snapshot.facts.players[0].person.name = "Nome corrigido";
  const before = structuredClone(input);
  for (const games of [input.games, [...input.games].reverse()]) {
    const page = buildStatisticsPage(
      { ...input, games },
      parseStatisticsQuery(
        new URLSearchParams({
          scope: "regular",
          q: "Nome corrigido",
          compare: personId,
        }),
      ),
    );
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].names).toEqual(["Nome corrigido"]);
    expect(page.rows[0].metrics.points.value).toBe(2);
    expect(page.comparisonSummaries[0].names).toEqual(["Nome corrigido"]);
  }
  expect(
    buildStatisticsPage(
      input,
      parseStatisticsQuery(new URLSearchParams({ q: "Nome anterior" })),
    ).rows,
  ).toEqual([]);
  expect(input).toEqual(before);
});
it("nove cruzamentos modo/escopo contam só fases congeladas, desconhecidas sóall", () => {
  const input = sourceFixture(),
    before = structuredClone(input);
  for (const mode of ["total", "per-game", "per-30"] as const)
    for (const scope of ["regular", "playoffs", "all"] as const) {
      const selected = selectStatisticsFacts(input, scope);
      const [row] = aggregateConfirmedStatistics(selected.facts, {
        mode,
        minimumSeconds: selected.minimumSeconds,
      });
      expect(row.gamesPlayed).toBe(scope === "all" ? 3 : 1);
      expect(selected.coverage).toEqual({
        regularGames: 1,
        playoffGames: 1,
        unclassifiedGames: 1,
      });
      expect(row.metrics.points.value).toBe(
        mode === "per-30" ? null : mode === "total" && scope === "all" ? 6 : 2,
      );
    }
  expect(input).toEqual(before);
});
it("não adivinha fase por nome final/data e conserva mínimo/versionamento da fonte", () => {
  const input = sourceFixture();
  input.minimumSeconds = 1200;
  input.version = 8;
  for (const g of input.games) g.phase = null;
  expect(selectStatisticsFacts(input, "regular").facts).toEqual([]);
  expect(selectStatisticsFacts(input, "playoffs").facts).toEqual([]);
  expect(selectStatisticsFacts(input, "all")).toMatchObject({
    version: 8,
    minimumSeconds: 1200,
  });
});
it("valida toda a fonte antes de filtrar, impedindo revisão duplicada/contexto adulterado/privacidade", () => {
  const input = sourceFixture();
  expect(
    statisticsSourceSchema.safeParse({ ...input, actorId: pubId(50) }).success,
  ).toBe(false);
  const duplicate = structuredClone(input);
  duplicate.games[1].snapshot.id = duplicate.games[0].snapshot.id.toUpperCase();
  expect(() => selectStatisticsFacts(duplicate, "regular")).toThrow();
  const context = structuredClone(input);
  context.games[1].snapshot.disputeId = pubId(999);
  expect(() => selectStatisticsFacts(context, "regular")).toThrow();
  const hidden = structuredClone(input);
  Object.assign(hidden.games[2].snapshot.facts.players[0].person, {
    birthDate: "2000-01-01",
  });
  expect(() => selectStatisticsFacts(hidden, "regular")).toThrow();
  expect(
    statisticsSourceSchema.safeParse({ ...input, minimumSeconds: 0 }).success,
  ).toBe(false);
});
