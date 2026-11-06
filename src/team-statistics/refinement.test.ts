import { expect, it } from "vitest";
import { teamStatisticsFixture } from "../../tests/fixtures/team-statistics";
import { pubId } from "../../tests/fixtures/publication";
import { confirmedPdfFixture } from "../../tests/fixtures/statistics-publications";
import { buildTeamsPage } from "./domain";
import { parseTeamsQuery } from "./query-contract";
import { buildTeamsList } from "./list-domain";
import { parseTeamsListQuery, serializeTeamsListQuery } from "./list-query";
const query = (s = "") => parseTeamsListQuery(new URLSearchParams(s));
it("abre por jogo/Todos/PTS desc e combina seleção por inscrição com busca normalizada", () => {
  const s = teamStatisticsFixture();
  expect(query()).toMatchObject({
    mode: "per-game",
    scope: "all",
    sort: "points",
    direction: "desc",
    pageSize: "all",
    selection: "all",
  });
  const p = buildTeamsList(
    s,
    query("q=LoBÓs&selection=custom&registrationId=" + pubId(5)),
  );
  expect(p.rows.map((r) => r.registrationId)).toEqual([pubId(5)]);
  expect(p.options).toHaveLength(2);
  expect(buildTeamsList(s, query("selection=none")).rows).toEqual([]);
  expect(
    buildTeamsList(s, query("q=inexistente&scope=playoffs")).options,
  ).toHaveLength(2);
  expect(
    parseTeamsListQuery(new URLSearchParams(serializeTeamsListQuery(p.query))),
  ).toEqual(p.query);
});
it("retorna mais de20 inscrições e preserva o contrato legado", () => {
  const s = teamStatisticsFixture(),
    seed = s.games[0];
  s.games = Array.from({ length: 13 }, (_, i) => {
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
  expect(buildTeamsList(s, query()).rows).toHaveLength(26);
  const legacy = buildTeamsPage(s, parseTeamsQuery(new URLSearchParams()));
  expect(legacy.rows).toHaveLength(20);
  expect(legacy).not.toHaveProperty("options");
  expect(legacy).not.toHaveProperty("hasBoxscore");
  expect(legacy.rows[0].statistics).not.toHaveProperty("benchPoints");
});
it("uniformiza PTS e todas as contagens sem arredondar; PB zero comprovado e percentual indefinido com PTS zero", () => {
  const s = teamStatisticsFixture(),
    p = buildTeamsList(s, query());
  const r = p.rows.find((r) => r.registrationId === pubId(5))!;
  expect(r.statistics.points.value).toBe(4 / 3);
  expect(r.metrics.pointsFor).toBe(4 / 3);
  expect(r.statistics.benchPoints.value).toBe(0);
  expect(r.statistics.benchPointsShare.value).toBe(0);
  expect(
    buildTeamsList(s, query("scope=playoffs")).rows.find(
      (r) => r.registrationId === pubId(6),
    )!.statistics.benchPointsShare.value,
  ).toBeNull();
});
it("hasBoxscore considera fonte completa antes de filtros e médias PDF uniformes", async () => {
  const s = teamStatisticsFixture(),
    g = await confirmedPdfFixture();
  s.games = [
    { snapshot: g, phase: "knockout" },
    { snapshot: { ...structuredClone(g), id: pubId(39000) }, phase: null },
  ];
  const p = buildTeamsList(s, query()),
    r = p.rows[0];
  expect(p.hasBoxscore).toBe(true);
  expect(r.statistics.points.value).toBe(
    g.facts.teams[r.registrationId === pubId(5) ? "home" : "away"].points,
  );
  expect(
    buildTeamsList(s, query("q=inexistente&scope=regular")).hasBoxscore,
  ).toBe(true);
});

it("aceita1000 inscrições sem corte e recusa1002 antes de qualquer filtro", () => {
  const s = teamStatisticsFixture(),
    seed = s.games[0];
  s.games = Array.from({ length: 501 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = pubId(50000 + i);
    for (const side of ["home", "away"] as const) {
      const id = pubId(60000 + i * 2 + (side === "home" ? 0 : 1));
      g.snapshot.game[side].registrationId = id;
      for (const p of g.snapshot.facts.players.filter((p) => p.side === side))
        p.registrationId = id;
    }
    return g;
  });
  const extra = s.games.pop()!;
  const p = buildTeamsList(s, query());
  expect(p.rows).toHaveLength(1000);
  expect(p.options).toHaveLength(1000);
  s.games.push(extra);
  expect(() => buildTeamsList(s, query("selection=none"))).toThrow(
    "capacidade",
  );
});
it("ranking usa precisão integral, empates1,1,3 e ausentes/nome sem posição", () => {
  const s = teamStatisticsFixture();
  s.games = s.games.slice(0, 2);
  const first = structuredClone(s.games[0]);
  first.snapshot.id = pubId(38000);
  for (const side of ["home", "away"] as const) {
    const id = pubId(side === "home" ? 98 : 99);
    first.snapshot.game[side].registrationId = id;
    for (const p of first.snapshot.facts.players.filter((p) => p.side === side))
      p.registrationId = id;
  }
  s.games.push(first);
  const p = buildTeamsList(s, query());
  expect(p.rows.map((r) => r.rank)).toEqual([1, 1, 3, 3]);
  expect(
    buildTeamsList(s, query("sort=name")).rows.every((r) => r.rank === null),
  ).toBe(true);
  expect(
    buildTeamsList(s, query("sort=assists")).rows.every((r) => r.rank === null),
  ).toBe(true);
});

it("busca a identidade pública completa mesmo quando a fase contém um nome anterior", () => {
  const s = teamStatisticsFixture();
  s.games[2].snapshot.game.home.name = "Lóbos Norte";
  const p = buildTeamsList(s, query("scope=regular&q=LOBOS%20NORTE"));
  expect(p.rows).toHaveLength(1);
  expect(p.rows[0].name).toBe("Lóbos Norte");
  expect(p.rows[0].gamesPlayed).toBe(1);
});

it("arredondamento igual não cria empate ou máximo falso", () => {
  const s = teamStatisticsFixture(),
    seed = s.games[0];
  const extra = Array.from({ length: 7 }, (_, i) => {
    const g = structuredClone(seed);
    g.snapshot.id = pubId(57000 + i);
    for (const side of ["home", "away"] as const) {
      const id = pubId(side === "home" ? 98 : 99);
      g.snapshot.game[side].registrationId = id;
      const points = side === "home" ? (i === 0 ? 9 : 0) : i === 0 ? 0 : 2;
      const t = g.snapshot.facts.teams[side];
      t.points = points;
      t.periods = [0, 0, 0, points];
      if ("freeMade" in t) {
        t.freeMade = points % 2;
        t.freeTaken = points % 2;
      }
      const players = g.snapshot.facts.players.filter((p) => p.side === side);
      players.forEach((p) => {
        p.registrationId = id;
        p.points = 0;
        p.two = 0;
        p.three = 0;
        p.free = 0;
      });
      players[0].points = points;
      players[0].two = Math.floor(points / 2);
      players[0].free = points % 2;
    }
    return g;
  });
  s.games.push(...extra);
  const p = buildTeamsList(s, query()),
    a = p.rows.find((r) => r.registrationId === pubId(5))!,
    b = p.rows.find((r) => r.registrationId === pubId(98))!;
  expect(a.statistics.points.value).toBe(4 / 3);
  expect(b.statistics.points.value).toBe(9 / 7);
  expect(a.statistics.points.value!.toFixed(1)).toBe(
    b.statistics.points.value!.toFixed(1),
  );
  expect(a.rank).toBeLessThan(b.rank!);
});
