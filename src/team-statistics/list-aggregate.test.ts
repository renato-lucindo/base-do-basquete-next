import { expect, it } from "vitest";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { confirmedPdfFixture } from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
import { buildTeamsList } from "./list-domain";
import { parseTeamsListQuery } from "./list-query";
import { aggregateBenchPoints } from "./list-aggregate";
function weighted() {
  const s = teamStatisticsFixture();
  s.games = s.games.slice(0, 2);
  s.games.forEach(({ snapshot: g }, i) => {
    const p = g.facts.players.filter((p) => p.side === "home"),
      reserve = p.find((p) => !p.starter)!;
    p.forEach((p) => {
      p.points = 0;
      p.two = 0;
      p.three = 0;
      p.free = 0;
    });
    if (i) {
      p[0].starter = false;
      reserve.starter = true;
    }
    const scorer = i ? reserve : p[0],
      bench = i ? p[0] : reserve;
    scorer.played = true;
    scorer.points = i ? 70 : 40;
    scorer.two = scorer.points / 2;
    bench.played = true;
    bench.points = i ? 30 : 10;
    bench.two = bench.points / 2;
    g.facts.teams.home.points = i ? 100 : 50;
    g.facts.teams.home.periods = [0, 0, 0, i ? 100 : 50];
  });
  return s;
}
const query = (s = "") => parseTeamsListQuery(new URLSearchParams(s));
it("titular em uma partida e reserva na outra:40PB,20por jogo,26,7% ponderados", () => {
  const s = weighted();
  for (const mode of ["total", "per-game"]) {
    const p = buildTeamsList(s, query("mode=" + mode)),
      r = p.rows.find((r) => r.registrationId === pubId(5))!;
    expect(r.statistics.benchPoints.value).toBe(mode === "total" ? 40 : 20);
    expect(r.statistics.benchPointsShare.value).toBe((100 * 40) / 150);
  }
  expect(
    buildTeamsList(s, query("scope=regular")).rows.find(
      (r) => r.registrationId === pubId(5),
    )!.statistics.benchPoints.value,
  ).toBe(10);
});
it("banco ausente/parcial nunca vira zero ou subtotal e sem partidas não produz média", () => {
  const s = weighted(),
    a = s.games.map((g) => ({ snapshot: g.snapshot, side: "home" as const }));
  const unknown = structuredClone(a);
  unknown[1].snapshot.facts.players.find(
    (p) => p.side === "home" && p.starter,
  )!.starter = false;
  expect(
    aggregateBenchPoints(unknown, "per-game").benchPoints.value,
  ).toBeNull();
  expect(aggregateBenchPoints([], "per-game").benchPoints.value).toBeNull();
  expect(aggregateBenchPoints([], "total").benchPointsShare.value).toBeNull();
});
it("boxscore usa coletivo uma vez; pontos manuais usam atletas da mesma fonte autoritativa", async () => {
  const g = await confirmedPdfFixture("Box Score FIBA ALC vs AVA 09 maio.pdf"),
    s = teamStatisticsFixture();
  s.games = [{ snapshot: g, phase: null }];
  g.facts.teams.home.advanced!.benchPoints = 7;
  expect(
    buildTeamsList(s, query()).rows.find((r) => r.registrationId === pubId(5))!
      .statistics.benchPoints.value,
  ).toBe(7);
  g.facts.origins.scorePoints = { kind: "sheet", version: 1 };
  const expected = g.facts.players
    .filter((p) => p.side === "home" && !p.starter)
    .reduce((n, p) => n + p.points, 0);
  expect(
    buildTeamsList(s, query()).rows.find((r) => r.registrationId === pubId(5))!
      .statistics.benchPoints.value,
  ).toBe(expected);
});
it("recusa titulares desconhecidos em vez de inferir reservas", () => {
  const s = weighted();
  Reflect.deleteProperty(s.games[0].snapshot.facts.players[0], "starter");
  expect(() => buildTeamsList(s, query())).toThrow();
});

it("fontes mistas contam cada partida uma vez sem somar coletivo PDF aos reservas", async () => {
  const s = weighted(),
    pdf = await confirmedPdfFixture("Box Score FIBA ALC vs AVA 09 maio.pdf");
  pdf.facts.teams.home.advanced!.benchPoints = 7;
  s.games = [s.games[0], { snapshot: pdf, phase: "knockout" }];
  for (const mode of ["total", "per-game"]) {
    const r = buildTeamsList(s, query("mode=" + mode)).rows.find(
      (r) => r.registrationId === pubId(5),
    )!;
    expect(r.gamesPlayed).toBe(2);
    expect(r.statistics.benchPoints.value).toBe(mode === "total" ? 17 : 8.5);
    expect(r.statistics.benchPointsShare.value).toBe(
      1700 / (50 + pdf.facts.teams.home.points),
    );
  }
});
