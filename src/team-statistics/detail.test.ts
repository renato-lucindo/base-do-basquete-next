import { expect, it } from "vitest";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
import { confirmedPdfFixture } from "../../tests/fixtures/statistics-publications";
import { buildTeamDetail } from "./detail";
import { parseTeamDetailQuery, serializeTeamDetailQuery } from "./detail-query";
const query = () =>
  parseTeamDetailQuery(new URLSearchParams("mode=total&scope=all"));
it("mesma equipe com duas inscrições exige seleção explícita e não usa a primeira", () => {
  const p = buildTeamDetail(teamStatisticsFixture(), pubId(9), null, query());
  expect(p?.kind).toBe("confirmed-team-selection-v1");
  if (p?.kind !== "confirmed-team-selection-v1")
    throw Error("seleção esperada");
  expect(p.registrations.map((r) => r.registrationId).sort()).toEqual([
    pubId(5),
    pubId(6),
  ]);
  expect(p).not.toHaveProperty("roster");
  expect(
    buildTeamDetail(teamStatisticsFixture(), pubId(9), pubId(999), query()),
  ).toBeNull();
  expect(
    buildTeamDetail(teamStatisticsFixture(), pubId(99), pubId(5), query()),
  ).toBeNull();
});
it("participantes históricos preservam homônimos, 0/00, DNP e zero observado", () => {
  const p = buildTeamDetail(
    teamStatisticsFixture(),
    pubId(9),
    pubId(5),
    query(),
  );
  if (p?.kind !== "confirmed-team-detail-v1") throw Error("detalhe esperado");
  expect(p.identity.name).toBe("Lobos");
  expect(p.statistics?.gamesPlayed).toBe(3);
  expect(p.roster.total).toBe(6);
  expect(new Set(p.roster.items.map((r) => r.personId)).size).toBe(6);
  expect(p.roster.items.flatMap((r) => r.jerseys)).toEqual(
    expect.arrayContaining(["0", "00"]),
  );
  expect(
    p.roster.items.find((r) => r.personId === pubId(7))?.statistics,
  ).toBeNull();
  expect(
    p.roster.items.find((r) => r.personId === pubId(2))?.statistics?.metrics
      .points,
  ).toEqual({ status: "available", value: 0 });
  expect(p.roster.items.some((r) => r.personId === pubId(11))).toBe(false);
  expect(p.games.items).toHaveLength(3);
  expect(
    p.games.items.every((g) => g.game.date === null && g.game.time === null),
  ).toBe(true);
  expect(
    p.games.items.every(
      (g) => g.collective === null && g.collectiveOrigin === null,
    ),
  ).toBe(true);
  expect(p.identity).not.toHaveProperty("currentRoster");
});
it("escopo sem jogos tem vazio explícito e mantém identidade já publicada", () => {
  const s = teamStatisticsFixture();
  for (const g of s.games) g.phase = null;
  const p = buildTeamDetail(s, pubId(9), pubId(5), {
    ...query(),
    scope: "regular",
  });
  if (p?.kind !== "confirmed-team-detail-v1") throw Error("detalhe esperado");
  expect(p.statistics).toBeNull();
  expect(p.games.total).toBe(0);
  expect(p.roster.total).toBe(0);
  expect(p.identity.name).toBe("Lobos");
});
it("páginas próprias de jogos e participantes não cortam números coletivos", () => {
  const s = teamStatisticsFixture(),
    seed = s.games[0];
  s.games = Array.from({ length: 25 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = pubId(60000 + i);
    for (const [n, p] of g.snapshot.facts.players
      .filter((p) => p.side === "home")
      .entries())
      p.person.id = pubId(61000 + i * 10 + n);
    const cap = g.snapshot.facts.players.find(
      (p) => p.side === "home" && p.captain,
    )!.person;
    g.snapshot.staff.home.captain = cap;
    g.snapshot.staff.home.coach = cap;
    return g;
  });
  const q = parseTeamDetailQuery(
    new URLSearchParams(
      "section=participantes&mode=total&scope=all&page=2&rosterPage=2",
    ),
  );
  expect(
    parseTeamDetailQuery(new URLSearchParams(serializeTeamDetailQuery(q))),
  ).toEqual(q);
  const p = buildTeamDetail(s, pubId(9), pubId(5), q);
  if (p?.kind !== "confirmed-team-detail-v1") throw Error("detalhe esperado");
  expect(p.games.items).toHaveLength(5);
  expect(p.roster.items).toHaveLength(20);
  expect(p.roster.total).toBe(150);
  expect(p.statistics?.gamesPlayed).toBe(25);
  expect(p.statistics?.metrics.pointsFor).toBe(50);
  const c = buildTeamDetail(s, pubId(9), pubId(5), {
    ...q,
    page: 999,
    rosterPage: 999,
  });
  if (c?.kind !== "confirmed-team-detail-v1") throw Error("detalhe esperado");
  expect(c.query.page).toBe(2);
  expect(c.query.rosterPage).toBe(8);
});
it("coletivos FIBA conservam partida e origem; Site não ganha domínio ausente", async () => {
  for (const filename of [undefined, "Boxscore-site.pdf"]) {
    const s = teamStatisticsFixture(),
      snapshot = await confirmedPdfFixture(filename);
    s.games = [{ phase: null, snapshot }];
    const p = buildTeamDetail(s, pubId(9), pubId(5), query());
    if (p?.kind !== "confirmed-team-detail-v1") throw Error("detalhe esperado");
    expect(p.games.items[0].collective).toEqual(
      snapshot.facts.teams.home.advanced,
    );
    expect(p.games.items[0].collectiveOrigin).toEqual(
      snapshot.facts.origins.teamAdvanced,
    );
  }
});
