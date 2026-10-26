import { expect, it } from "vitest";
import {
  parseStatisticsQuery,
  serializeStatisticsQuery,
  updateStatisticsQuery,
  buildStatisticsPage,
  compareStatisticsRows,
} from "./query";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
function sourceFixture() {
  return {
    kind: "confirmed-statistics-v1" as const,
    disputeId: pubId(801),
    version: 7,
    confirmedAt: "2026-10-25T16:00:00Z",
    minimumSeconds: 600,
    games: [0, 1, 2].map((i) => {
      const snapshot = confirmedManualFixture();
      snapshot.id = pubId(900 + i);
      for (const p of snapshot.facts.players) {
        p.person.id = pubId(10000 + i * 100 + Number(p.person.id.slice(-3)));
        p.person.name = `Atleta ${i}-${p.jersey}`;
      }
      for (const side of ["home", "away"] as const) {
        const captain = snapshot.facts.players.find(
          (p) => p.side === side && p.captain,
        )!.person;
        snapshot.staff[side] = {
          captain,
          coach: captain,
          assistant: null,
          captainIsCoach: true,
        };
      }
      return {
        snapshot,
        phase:
          i === 0
            ? ("round_robin" as const)
            : i === 1
              ? ("knockout" as const)
              : null,
      };
    }),
  };
}
it("consulta normaliza allowlist, cinco filtros,80caracteres,32equipes e doisUUIDs canônicos", () => {
  const p = new URLSearchParams({
    mode: "per-30",
    scope: "all",
    sort: "minutes",
    dir: "bad",
    page: "99999999999999999",
    q: "á".repeat(90),
    filters:
      "minutes:>:10;points:>=:5;drop:>:1;points:=:;games:>=:0;rebounds:>:2",
    compare: `${pubId(2).toUpperCase()},${pubId(2)},${pubId(3)},${pubId(4)}`,
    columns: "minutes,points,drop,points",
  });
  for (let i = 0; i < 34; i++) p.append("team", pubId(100 + i));
  const query = parseStatisticsQuery(p);
  expect(query).toMatchObject({
    mode: "per-30",
    scope: "all",
    sort: "points",
    direction: "desc",
    page: 1,
    compare: [pubId(2), pubId(3)],
    columns: ["minutes", "points"],
  });
  expect(query.search).toHaveLength(80);
  expect(query.teams).toHaveLength(32);
  expect(query.filters).toEqual([
    { metric: "points", operator: ">=", value: 5 },
    { metric: "games", operator: ">=", value: 0 },
  ]);
  expect(parseStatisticsQuery(serializeStatisticsQuery(query))).toEqual(query);
});
it("seleção vazia explícita difere de nenhuma restrição e MIN é restaurada na troca de modo", () => {
  expect(parseStatisticsQuery(new URLSearchParams()).teams).toBeNull();
  expect(parseStatisticsQuery(new URLSearchParams("team=")).teams).toEqual([]);
  const initial = parseStatisticsQuery(
    new URLSearchParams(
      "scope=all&page=3&columns=games,minutes,points&sort=minutes",
    ),
  );
  const per30 = updateStatisticsQuery(initial, { mode: "per-30" });
  expect(per30.page).toBe(1);
  expect(per30.sort).toBe("points");
  const page = buildStatisticsPage(sourceFixture(), per30);
  expect(page.columns).toEqual(["games", "points"]);
  expect(updateStatisticsQuery(per30, { mode: "total" }).columns).toEqual([
    "games",
    "minutes",
    "points",
  ]);
  expect(updateStatisticsQuery(initial, { scope: "regular" }).page).toBe(1);
});
it("líderes consideram conjunto filtrado antes da página e preservam empates por inscrição", () => {
  const source = sourceFixture(),
    query = parseStatisticsQuery(
      new URLSearchParams("mode=total&scope=all&sort=player&dir=asc&page=2"),
    );
  const result = buildStatisticsPage(source, query);
  expect(result.total).toBe(30);
  expect(result.rows).toHaveLength(10);
  expect(result.pageSize).toBe(20);
  expect(result.leaders.points).toHaveLength(3);
  expect(result.leaders.points).toContainEqual({
    personId: pubId(10201),
    registrationId: pubId(5),
  });
  const none = buildStatisticsPage(source, { ...query, teams: [] });
  expect(none.total).toBe(0);
  expect(none.page).toBe(1);
  expect(none.leaders).toEqual({});
});
it("comparação recupera todas as inscrições dos dois atletas fora da página/filtro, sem primeiro vínculo", () => {
  const source = sourceFixture(),
    first = source.games[0].snapshot.facts.players[0],
    third = source.games[2].snapshot;
  third.facts.players[0].person.id = first.person.id;
  third.game.home.registrationId = pubId(55);
  for (const p of third.facts.players.filter((p) => p.side === "home"))
    p.registrationId = pubId(55);
  third.staff.home.captain = third.facts.players[0].person;
  third.staff.home.coach = third.facts.players[0].person;
  const query = parseStatisticsQuery(
    new URLSearchParams(
      `scope=all&mode=total&q=sem-correspondencia&compare=${first.person.id},${pubId(10101)}`,
    ),
  );
  const result = buildStatisticsPage(source, query);
  expect(result.rows).toEqual([]);
  expect(result.compared.map((r) => [r.personId, r.registrationId])).toEqual([
    [first.person.id, pubId(5)],
    [first.person.id, pubId(55)],
    [pubId(10101), pubId(5)],
  ]);
  expect(
    result.comparisonSummaries.map((r) => [
      r.personId,
      r.gamesPlayed,
      r.metrics.points.value,
    ]),
  ).toEqual([
    [first.person.id, 2, 4],
    [pubId(10101), 1, 2],
  ]);
  expect(result.comparisonStates.points).toEqual({
    left: "better",
    right: "worse",
  });
  expect(result.comparisonStates.minutes).toEqual({
    left: "unavailable",
    right: "unavailable",
  });
});
it("busca ignora acentos incluindo apelido/equipe e filtro só considera células disponíveis", () => {
  const source = sourceFixture();
  source.games[0].snapshot.facts.players[0].person.nickname = "João";
  const query = parseStatisticsQuery(
    new URLSearchParams("scope=all&q=joao&filters=points:>=:2"),
  );
  expect(buildStatisticsPage(source, query).total).toBe(1);
  expect(
    buildStatisticsPage(source, {
      ...query,
      filters: [{ metric: "fieldGoalPercentage", operator: ">=", value: 0 }],
    }).total,
  ).toBe(0);
  expect(buildStatisticsPage(source, { ...query, search: "Lobos" }).total).toBe(
    3,
  );
});
it("ausentes ordenam por último nas duas direções, amostra insuficiente fica visível sem liderar", async () => {
  const source = sourceFixture(),
    pdf = await confirmedPdfFixture();
  pdf.id = pubId(999);
  for (const p of pdf.facts.players)
    p.person.id = pubId(20000 + Number(p.person.id.slice(-3)));
  for (const side of ["home", "away"] as const) {
    const captain = pdf.facts.players.find(
      (p) => p.side === side && p.captain,
    )!.person;
    pdf.staff[side] = {
      captain,
      coach: captain,
      assistant: null,
      captainIsCoach: true,
    };
  }
  const mixed = {
    ...source,
    games: [...source.games, { snapshot: pdf, phase: null }],
  };
  for (const dir of ["asc", "desc"] as const) {
    const result = buildStatisticsPage(
      mixed,
      parseStatisticsQuery(
        new URLSearchParams(`scope=all&sort=rebounds&dir=${dir}`),
      ),
    );
    expect(result.rows[0].metrics.rebounds.status).toBe("available");
  }
  const per30 = buildStatisticsPage(
    { ...mixed, minimumSeconds: 2147483647 },
    parseStatisticsQuery(new URLSearchParams("mode=per-30&scope=all")),
  );
  expect(per30.total).toBeGreaterThan(30);
  expect(per30.leaders.points).toBeUndefined();
  expect(
    buildStatisticsPage(
      { ...mixed, minimumSeconds: 2147483647 },
      parseStatisticsQuery(
        new URLSearchParams("mode=per-30&scope=all&filters=points:>=:0"),
      ),
    ).total,
  ).toBe(0);
});
it("comparação usa direção de melhor valor e não inventa empate com ausência", () => {
  const result = buildStatisticsPage(
    sourceFixture(),
    parseStatisticsQuery(new URLSearchParams("scope=all")),
  );
  const a = structuredClone(result.rows[0]),
    b = structuredClone(a);
  a.metrics.turnovers = { status: "available", value: 1 };
  b.metrics.turnovers = { status: "available", value: 3 };
  expect(compareStatisticsRows(a, b, "turnovers")).toEqual({
    left: "better",
    right: "worse",
  });
  b.metrics.turnovers = { status: "unavailable", value: null };
  expect(compareStatisticsRows(a, b, "turnovers")).toEqual({
    left: "unavailable",
    right: "unavailable",
  });
});
it("preset de súmula exibe apenas dados simples e compartilha a preferência na URL", () => {
  const query = parseStatisticsQuery(
    new URLSearchParams("preset=simple&scope=all"),
  );
  expect(query.columns).toEqual([
    "games",
    "points",
    "pointsPerGame",
    "twoMade",
    "threeMade",
    "freeMade",
    "foulsCommitted",
    "disqualifications",
  ]);
  expect(parseStatisticsQuery(serializeStatisticsQuery(query))).toEqual(query);
});
