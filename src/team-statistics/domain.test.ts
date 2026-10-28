import { expect, it } from "vitest";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
import { confirmedPdfFixture } from "../../tests/fixtures/statistics-publications";
import { buildTeamsPage } from "./domain";
import { parseTeamsQuery, serializeTeamsQuery } from "./query-contract";
const query = () =>
  parseTeamsQuery(new URLSearchParams("mode=total&scope=all"));
it("duas inscrições da mesma equipe conservam linhas e Jcoletivo por partida", () => {
  const s = teamStatisticsFixture(),
    p = buildTeamsPage(s, query());
  expect(p.rows).toHaveLength(2);
  expect(new Set(p.rows.map((r) => r.teamId)).size).toBe(1);
  const a = p.rows.find((r) => r.registrationId === pubId(5))!,
    b = p.rows.find((r) => r.registrationId === pubId(6))!;
  expect(a.gamesPlayed).toBe(3);
  expect(a.metrics).toEqual({ pointsFor: 4, pointsAgainst: 6, difference: -2 });
  expect(b.metrics).toEqual({ pointsFor: 6, pointsAgainst: 4, difference: 2 });
  expect(p.total).toBe(2);
});
it("médias somam placares e dividem por partidas, preservando saldo negativo", () => {
  const p = buildTeamsPage(teamStatisticsFixture(), {
    ...query(),
    mode: "per-game",
  });
  expect(p.rows.find((r) => r.registrationId === pubId(5))!.metrics).toEqual({
    pointsFor: 1.3,
    pointsAgainst: 2,
    difference: -0.7,
  });
});
it("seis cruzamentos de modo e fase não deduzem fase pelo nome final", () => {
  for (const mode of ["total", "per-game"] as const)
    for (const scope of ["regular", "playoffs", "all"] as const) {
      const p = buildTeamsPage(teamStatisticsFixture(), {
        ...query(),
        mode,
        scope,
      });
      expect(p.rows[0].gamesPlayed).toBe(scope === "all" ? 3 : 1);
      expect(p.coverage).toEqual({
        regularGames: 1,
        playoffGames: 1,
        unknownGames: 1,
      });
    }
});
it("busca aliases da ocasião e correção muda totais sem trocar identidade", () => {
  const s = teamStatisticsFixture();
  s.games[2].snapshot.game.home.name = "Lóbos Norte";
  const before = buildTeamsPage(s, { ...query(), search: "LOBOS NORTE" });
  expect(before.rows).toHaveLength(1);
  expect(before.rows[0].name).toBe("Lóbos Norte");
  expect(before.rows[0].names).toContain("Lobos");
  expect(before.rows[0].origin.gameId).toBe(s.games[2].snapshot.id);
  s.games[2].snapshot.facts.teams.home.points = 2;
  s.games[2].snapshot.facts.teams.home.periods = [0, 0, 0, 2];
  const player = s.games[2].snapshot.facts.players[0];
  player.points = 2;
  player.two = 1;
  s.version++;
  s.games[2].snapshot.version++;
  const after = buildTeamsPage(s, query()).rows.find(
    (r) => r.registrationId === pubId(5),
  )!;
  expect(after.metrics.difference).toBe(0);
  expect(after.registrationId).toBe(before.rows[0].registrationId);
});
it("valida fonte inteira antes de filtro e recusa inscrição trocando de equipe", () => {
  const s = teamStatisticsFixture();
  s.games[2].snapshot.game.home.team.id = pubId(99);
  expect(() => buildTeamsPage(s, { ...query(), scope: "regular" })).toThrow();
  const clean = teamStatisticsFixture();
  expect(() =>
    buildTeamsPage({ ...clean, actorId: pubId(98) }, query()),
  ).toThrow();
  clean.games.push(structuredClone(clean.games[0]));
  expect(() => buildTeamsPage(clean, query())).toThrow();
});
it("contexto de exibição usa publicação mais recente, sem depender da ordem da fonte", () => {
  const s = teamStatisticsFixture();
  s.games[2].snapshot.context.name = "Nome público atualizado";
  expect(buildTeamsPage(s, query()).context?.name).toBe(
    "Nome público atualizado",
  );
  s.games.reverse();
  expect(buildTeamsPage(s, query()).context?.name).toBe(
    "Nome público atualizado",
  );
});
it("PDF com placar manual usa PP/PC oficiais, sem somar pontos avançados", async () => {
  const s = teamStatisticsFixture(),
    g = await confirmedPdfFixture("Boxscore-site.pdf");
  g.facts.origins.scorePoints = { kind: "sheet", version: 1 };
  for (const p of g.facts.players) {
    p.points = 0;
    p.two = 0;
    p.three = 0;
    p.free = 0;
  }
  const a = g.facts.players.find((p) => p.side === "home" && p.played)!,
    b = g.facts.players.find((p) => p.side === "away" && p.played)!;
  a.points = 2;
  a.two = 1;
  b.points = 3;
  b.three = 1;
  g.facts.teams.home.points = 2;
  g.facts.teams.away.points = 3;
  s.games = [{ phase: null, snapshot: g }];
  const p = buildTeamsPage(s, query());
  expect(p.rows.find((r) => r.registrationId === pubId(5))!.metrics).toEqual({
    pointsFor: 2,
    pointsAgainst: 3,
    difference: -1,
  });
});
it("1000 inscrições são aceitas e1002 excedem limite mesmo fora da busca", () => {
  const s = teamStatisticsFixture(),
    seed = s.games[0];
  s.games = Array.from({ length: 501 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = pubId(30000 + i);
    for (const side of ["home", "away"] as const) {
      const id = pubId(40000 + i * 2 + (side === "home" ? 0 : 1));
      g.snapshot.game[side].registrationId = id;
      for (const p of g.snapshot.facts.players.filter((p) => p.side === side))
        p.registrationId = id;
    }
    return g;
  });
  const extra = s.games.pop()!;
  expect(buildTeamsPage(s, query()).total).toBe(1000);
  s.games.push(extra);
  expect(() => buildTeamsPage(s, { ...query(), search: "não existe" })).toThrow(
    "capacidade",
  );
});
it("URL normaliza controles e paginação20 mantém total de inscrições antes da página", () => {
  const s = teamStatisticsFixture(),
    seed = s.games[0];
  s.games = Array.from({ length: 13 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = pubId(22000 + i);
    for (const side of ["home", "away"] as const) {
      const id = pubId(23000 + i * 2 + (side === "home" ? 0 : 1));
      g.snapshot.game[side].registrationId = id;
      g.snapshot.game[side].name =
        `Inscrição ${String(i * 2 + (side === "home" ? 0 : 1)).padStart(2, "0")}`;
      for (const p of g.snapshot.facts.players.filter((p) => p.side === side))
        p.registrationId = id;
    }
    return g;
  });
  const q = parseTeamsQuery(
    new URLSearchParams("mode=total&scope=all&page=2&sort=name&direction=asc"),
  );
  expect(parseTeamsQuery(new URLSearchParams(serializeTeamsQuery(q)))).toEqual(
    q,
  );
  const p = buildTeamsPage(s, q);
  expect(p.rows).toHaveLength(6);
  expect(p.total).toBe(26);
  expect(p.totalPages).toBe(2);
  expect(p.page).toBe(2);
  expect(buildTeamsPage(s, { ...q, page: 999 }).page).toBe(2);
  expect(buildTeamsPage(s, { ...q, search: "não existe" }).rows).toEqual([]);
});
