import { expect, it } from "vitest";
import { buildStatisticsPage, compareStatisticsRows } from "./query";
import {
  parseStatisticsQuery,
  serializeStatisticsQuery,
} from "./query-contract";
import { statisticsPageSchema } from "./page-contract";
import { selectStatisticsFacts } from "./source";
import { aggregateConfirmedStatistics } from "./aggregate";
import {
  confirmedManualFixture,
  confirmedPdfFixture,
} from "../../tests/fixtures/statistics-publications";
import { publicationSheet, pubId } from "../../tests/fixtures/publication";

function sourceFixture() {
  return {
    kind: "confirmed-statistics-v1" as const,
    disputeId: pubId(801),
    version: 1,
    confirmedAt: "2026-11-05T12:00:00Z",
    minimumSeconds: 600,
    games: Array.from({ length: 4 }, (_, i) => {
      const sheet = publicationSheet();
      if (i === 3)
        sheet.events.push({
          id: pubId(200),
          side: "home",
          period: 1,
          target: "0",
          code: "T1",
        });
      const snapshot = confirmedManualFixture(false, sheet);
      snapshot.id = pubId(900 + i);
      for (const p of snapshot.facts.players) {
        p.person.id = pubId(1000 + i * 100 + Number(p.person.id.slice(-3)));
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
      return { snapshot, phase: null };
    }),
  };
}
const query = (s = "") =>
  parseStatisticsQuery(new URLSearchParams(`scope=all&mode=total&${s}`));

it("preserva DTO legado de20 e valida30 linhas, última página incompleta e tamanho inválido", () => {
  const source = sourceFixture();
  const legacy = buildStatisticsPage(source, query());
  expect(legacy.pageSize).toBe(20);
  expect(legacy.rows).toHaveLength(20);
  expect(legacy).not.toHaveProperty("hasBoxscore");
  expect(query("pageSize=21").pageSize).toBe(20);
  const requested = query("pageSize=30&sort=player&dir=asc");
  expect(parseStatisticsQuery(serializeStatisticsQuery(requested))).toEqual(
    requested,
  );
  const first = buildStatisticsPage(source, requested);
  expect(first.pageSize).toBe(30);
  expect(first.rows).toHaveLength(30);
  expect(first.totalPages).toBe(2);
  expect(first.hasBoxscore).toBe(false);
  const last = buildStatisticsPage(source, { ...requested, page: 99 });
  expect(last.page).toBe(2);
  expect(last.rows).toHaveLength(10);
  expect(statisticsPageSchema.parse(last)).toEqual(last);
  expect(
    statisticsPageSchema.safeParse({ ...last, pageSize: 20 }).success,
  ).toBe(false);
  expect(
    statisticsPageSchema.safeParse({ ...first, hasBoxscore: undefined })
      .success,
  ).toBe(false);
});

it("detecta boxscore na fonte inteira mesmo fora do escopo, filtros, conjunto e página", async () => {
  const source = sourceFixture();
  const pdf = await confirmedPdfFixture();
  pdf.id = pubId(999);
  const mixed = {
    ...source,
    games: [...source.games, { snapshot: pdf, phase: "knockout" }],
  };
  const result = buildStatisticsPage(
    mixed,
    query("pageSize=30&scope=regular&q=inexistente&team=&page=99"),
  );
  expect(result.rows).toEqual([]);
  expect(result.hasBoxscore).toBe(true);
  expect(
    buildStatisticsPage(source, query("pageSize=30&dataset=boxscore"))
      .hasBoxscore,
  ).toBe(false);
});

it("destaca maior falta positiva fora da página, empates e filtro sem inverter comparação", () => {
  const source = sourceFixture();
  const first = buildStatisticsPage(
    source,
    query("pageSize=30&sort=player&dir=asc"),
  );
  for (const metric of ["foulsCommitted", "technicalFouls"] as const) {
    expect(first.leaders[metric]).toEqual([
      { personId: pubId(1301), registrationId: pubId(5) },
    ]);
    expect(first.rows.some((r) => r.personId === pubId(1301))).toBe(false);
    const last = buildStatisticsPage(
      source,
      query("pageSize=30&sort=player&dir=asc&page=2"),
    );
    const high = last.rows.find((r) => r.personId === pubId(1301))!;
    expect(compareStatisticsRows(first.rows[0], high, metric)).toEqual({
      left: "better",
      right: "worse",
    });
  }
  for (const metric of [
    "unsportsmanlikeFouls",
    "fiveFouls",
    "disqualifications",
  ] as const)
    expect(first.leaders[metric]).toBeUndefined();
  const filtered = buildStatisticsPage(
    source,
    query("pageSize=30&q=Atleta%200"),
  );
  expect(filtered.leaders.foulsCommitted).toBeUndefined();
  source.games[2].snapshot.facts.players[0].fouls = 1;
  expect(
    buildStatisticsPage(source, query("pageSize=30")).leaders.foulsCommitted,
  ).toHaveLength(2);
});

it("projeta camisa modal por inscrição contando relacionados sem jogar e preserva0/00 e histórico", () => {
  const source = sourceFixture();
  source.games = ["0", "00", "00", "0"].map((jersey, i) => {
    const sheet = publicationSheet();
    sheet.participants.push({
      rosterEntryId: pubId(7),
      side: "home",
      jersey: "9",
      played: false,
      starter: false,
    });
    const snapshot = confirmedManualFixture(false, sheet);
    snapshot.id = pubId(950 + i);
    // Avoid a duplicate jersey on the same team.
    snapshot.facts.players[0].jersey = "8";
    snapshot.facts.players[1].jersey = "7";
    snapshot.facts.players.find((p) => p.person.id === pubId(7))!.jersey =
      jersey;
    return { snapshot, phase: null };
  });
  const find = () =>
    buildStatisticsPage(source, query("pageSize=30")).rows.find(
      (r) => r.personId === pubId(7),
    )!;
  expect(find().jerseys).toEqual(["0", "00"]);
  expect(find().gamesPlayed).toBe(0);
  source.games.pop();
  expect(find().jerseys).toEqual(["00"]);
  expect(
    aggregateConfirmedStatistics(
      selectStatisticsFacts(source, "all").facts,
    ).find((r) => r.personId === pubId(7))!.jerseys,
  ).toEqual(["0", "00"]);
  const different = structuredClone(source.games[0]);
  different.snapshot.id = pubId(999);
  different.snapshot.game.home.registrationId = pubId(55);
  for (const p of different.snapshot.facts.players.filter(
    (p) => p.side === "home",
  ))
    p.registrationId = pubId(55);
  source.games.push(different);
  const rows = buildStatisticsPage(source, query("pageSize=30")).rows.filter(
    (r) => r.personId === pubId(7),
  );
  expect(rows.map((r) => [r.registrationId, r.jerseys])).toEqual([
    [pubId(5), ["00"]],
    [pubId(55), ["0"]],
  ]);
});

it("T/U/5F/GD destacam todos os máximos positivos disponíveis; ausência não lidera", async () => {
  const source = sourceFixture();
  for (const index of [2, 3]) {
    const players = source.games[index].snapshot.facts.players;
    players[1].unsportsmanlike = 1;
    players[1].status = "GD";
    players[2].status = "excluded";
  }
  for (const mode of ["total", "per-game"] as const) {
    const page = buildStatisticsPage(source, query(`pageSize=30&mode=${mode}`));
    expect(page.leaders.unsportsmanlikeFouls).toHaveLength(2);
    expect(page.leaders.fiveFouls).toHaveLength(2);
    expect(page.leaders.disqualifications).toHaveLength(2);
  }
  const pdf = await confirmedPdfFixture();
  pdf.id = pubId(998);
  const page = buildStatisticsPage(
    { ...source, games: [...source.games, { snapshot: pdf, phase: null }] },
    query("pageSize=30&dataset=boxscore"),
  );
  expect(page.leaders.unsportsmanlikeFouls).toBeUndefined();
  expect(page.leaders.fiveFouls).toBeUndefined();
  expect(page.leaders.disqualifications).toBeUndefined();
});
