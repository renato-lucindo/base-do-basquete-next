import { expect, it } from "vitest";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { confirmedPdfFixture } from "../../tests/fixtures/statistics-publications";
import { pubId } from "../../tests/fixtures/publication";
import { buildTeamsPage } from "./domain";
import { parseTeamsQuery, serializeTeamsQuery } from "./query-contract";
import { teamsPageSchema } from "./contract";
import { publicPdfGameSchema } from "../publication/pdf-contract";

const query = (text = "") =>
  parseTeamsQuery(new URLSearchParams(`mode=total&${text}`));
function freeThrows(
  source: ReturnType<typeof teamStatisticsFixture>,
  game: number,
  made: number,
  taken: number,
) {
  const g = source.games[game].snapshot,
    t = g.facts.teams.home;
  if (!("freeTaken" in t)) throw Error("Fixture de súmula necessária");
  const p = g.facts.players.find((p) => p.side === "home" && p.played)!;
  p.free += made;
  p.points += made;
  t.points += made;
  t.periods[t.periods.length - 1] += made;
  t.freeMade = made;
  t.freeTaken = taken;
}
it("LL% de súmula soma convertidos e tentados, e conserva o valor em total/média", () => {
  const s = teamStatisticsFixture();
  freeThrows(s, 0, 1, 1);
  freeThrows(s, 1, 0, 9);
  for (const mode of ["total", "per-game"] as const) {
    const r = buildTeamsPage(s, { ...query(), mode }).rows.find(
      (r) => r.registrationId === pubId(5),
    )!;
    expect(r.statistics.freeThrowPercentage).toEqual({
      status: "available",
      value: 10,
    });
    expect(r.metricCoverage.freeThrowPercentage).toBe(3);
    expect(r.statistics.points).toEqual({ status: "available", value: 5 });
    expect(r.statistics.pointsPerGame.value).toBe(5 / 3);
    expect(r.statistics.twoMade.value).toBe(mode === "total" ? 2 : 2 / 3);
  }
});
it("zero conhecido difere de ausência de tentativas e de fonte coletiva", () => {
  const s = teamStatisticsFixture();
  const before = buildTeamsPage(s, query()).rows[0];
  expect(before.statistics.freeThrowPercentage).toEqual({
    status: "unavailable",
    value: null,
  });
  expect(before.statistics.freeMade).toEqual({ status: "available", value: 0 });
  for (const key of [
    "rebounds",
    "offensiveRebounds",
    "turnovers",
    "efficiency",
    "minutes",
    "plusMinus",
    "pointsShare",
  ] as const) {
    expect(before.statistics[key]).toEqual({
      status: "unavailable",
      value: null,
    });
    expect(before.metricCoverage[key]).toBe(0);
  }
  freeThrows(s, 0, 0, 2);
  expect(
    buildTeamsPage(s, query()).rows[0].statistics.freeThrowPercentage,
  ).toEqual({ status: "available", value: 0 });
});
it("fase usa só atribuições públicas; duas inscrições da mesma equipe não são fundidas", () => {
  const s = teamStatisticsFixture();
  freeThrows(s, 0, 1, 1);
  freeThrows(s, 1, 0, 9);
  expect(
    buildTeamsPage(s, query("scope=regular")).rows[0].statistics
      .freeThrowPercentage.value,
  ).toBe(100);
  expect(
    buildTeamsPage(s, query("scope=playoffs")).rows[0].statistics
      .freeThrowPercentage.value,
  ).toBe(0);
  const all = buildTeamsPage(s, query());
  expect(all.rows).toHaveLength(2);
  expect(all.rows[1].statistics.freeThrowPercentage.value).toBeNull();
  expect(all.rows[0].teamId).toBe(all.rows[1].teamId);
});
it("boxscore preserva percentuais ponderados, aditivos completos e seleção própria", async () => {
  const s = teamStatisticsFixture(),
    g = await confirmedPdfFixture();
  s.games.push({ snapshot: g, phase: "knockout" });
  const r = buildTeamsPage(
    s,
    query("dataset=boxscore&preset=boxscore"),
  ).rows.find((r) => r.registrationId === pubId(5))!;
  const players = g.facts.players.filter((p) => p.side === "home" && p.played);
  const made = players.reduce((n, p) => n + p.advanced!.freeThrows.made, 0),
    attempts = players.reduce(
      (n, p) => n + p.advanced!.freeThrows.attempted,
      0,
    );
  expect(r.gamesPlayed).toBe(1);
  expect(r.statistics.assists.value).toBe(
    players.reduce((n, p) => n + p.advanced!.assists, 0),
  );
  expect(r.statistics.freeThrowPercentage.value).toBe((100 * made) / attempts);
  const mixed = buildTeamsPage(s, query()).rows.find(
    (r) => r.registrationId === pubId(5),
  )!;
  expect(mixed.statistics.assists.value).toBeNull();
  expect(mixed.metricCoverage.assists).toBe(1);
  const p = buildTeamsPage(s, query("preset=all"));
  expect(
    p.query.columns.filter((m) => m === "freeThrowPercentage"),
  ).toHaveLength(1);
  g.facts.origins.playerAdvanced = null;
  g.facts.players.forEach((p) => {
    p.advanced = null;
  });
  expect(buildTeamsPage(s, query("dataset=boxscore")).rows).toEqual([]);
});
it("recusa boxscore com cobertura individual incompleta antes de qualquer filtro", async () => {
  const s = teamStatisticsFixture(),
    g = await confirmedPdfFixture();
  g.facts.players[0].advanced = null;
  expect(publicPdfGameSchema.safeParse(g).success).toBe(false);
  s.games.push({ snapshot: g, phase: "knockout" });
  expect(() =>
    buildTeamsPage(s, query("scope=regular&q=inexistente")),
  ).toThrow();
});
it("ordena LL% com ausentes sempre ao final e conserva seleção em URL/contrato", () => {
  const s = teamStatisticsFixture();
  freeThrows(s, 0, 1, 2);
  for (const direction of ["asc", "desc"] as const) {
    const q = {
      ...query(
        "sort=freeThrowPercentage&preset=custom&columns=games,freeThrowPercentage",
      ),
      direction,
    };
    expect(
      parseTeamsQuery(new URLSearchParams(serializeTeamsQuery(q))),
    ).toEqual(q);
    const p = buildTeamsPage(s, q);
    expect(p.rows[0].registrationId).toBe(pubId(5));
    expect(p.rows[1].statistics.freeThrowPercentage.value).toBeNull();
    const corrupt = structuredClone(p);
    corrupt.rows[0].metricCoverage.freeThrowPercentage = 100;
    expect(teamsPageSchema.safeParse(corrupt).success).toBe(false);
  }
});
