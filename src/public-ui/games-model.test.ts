import { describe, expect, it } from "vitest";
import { publicKnockoutFixture } from "../../tests/fixtures/public-regulation";
import { buildPublicStandings } from "../regulation/public";
import { regulationId as id } from "../../tests/fixtures/regulation";
import { publicGamesFixture } from "../../tests/fixtures/public-games";
import { publicScheduleRows, selectPublicGames } from "./games-model";
import { catalogGameSchema } from "./catalog-contract";

describe("lista pública de jogos", () => {
  it("liga somente destinos publicados da mesma disputa com IDs de equipe e inscrição", () => {
    const value = buildPublicStandings(publicGamesFixture());
    const game = value.games[0];
    const team = (id: string) => {
      const r = value.registrations.find((r) => r.id === id)!;
      return { registrationId: r.id, name: r.name, team: r.team };
    };
    const published = catalogGameSchema.parse({
      id: game.id,
      disputeId: value.disputeId,
      context: value.context,
      game: {
        home: team(game.homeRegistrationId),
        away: team(game.awayRegistrationId),
        date: game.date,
        time: game.time,
        timeZone: game.timeZone,
        venue: game.venue,
        number: game.number,
      },
      score: { home: 20, away: 0 },
    });
    const rows = publicScheduleRows(value, [published]);
    expect(rows[0]).toMatchObject({
      published: true,
      homeProfile: {
        teamId: published.game.home.team.id,
        registrationId: game.homeRegistrationId,
      },
      awayProfile: {
        teamId: published.game.away.team.id,
        registrationId: game.awayRegistrationId,
      },
    });
    expect(rows.slice(1).every((g) => !g.published)).toBe(true);
    expect(
      publicScheduleRows(value, [{ ...published, disputeId: id(999) }])[0],
    ).toMatchObject({ published: false, homeProfile: null, awayProfile: null });
  });
  it("valida a mesma amostra de 41 jogos usada no navegador e no preview", () => {
    const value = buildPublicStandings(publicGamesFixture());
    expect(value.games).toHaveLength(41);
    expect(value.games.filter((g) => g.walkover)).toHaveLength(2);
  });
  it("usa número oficial, fase e slot explícito, sem numerar jogo único", () => {
    const source = publicKnockoutFixture();
    source.definition.series[0].format = "best_of_3";
    source.definition.series[0].games[0].slot = 2;
    source.games.find((g) => g.id === id(103))!.number = "134";
    const rows = publicScheduleRows(buildPublicStandings(source));
    expect(rows.find((g) => g.id === id(103))).toMatchObject({
      number: "134",
      phase: "Semifinais",
      seriesGame: 2,
    });
    expect(rows.find((g) => g.id === id(104))).toMatchObject({
      phase: "Semifinais",
      seriesGame: null,
    });
  });
  it("ordena datas e horários decrescentes, desconhecidos no final e empates estáveis", () => {
    const seed = publicScheduleRows(
      buildPublicStandings(publicKnockoutFixture()),
    )[0];
    const games = [
      { ...seed, id: "b", date: "2026-11-10", time: "19:00" },
      { ...seed, id: "a", date: "2026-11-10", time: "19:00" },
      { ...seed, id: "undated", date: null, time: "22:00" },
      { ...seed, id: "future", date: "2027-01-01", time: null },
      { ...seed, id: "unknown-time", date: "2026-11-10", time: null },
      { ...seed, id: "early", date: "2026-11-10", time: "18:00" },
    ];
    expect(selectPublicGames(games, "").map((g) => g.id)).toEqual([
      "future",
      "b",
      "a",
      "early",
      "unknown-time",
      "undated",
    ]);
    expect(games[0].id).toBe("b");
  });
  it("busca toda a lista por equipe e local sem acentos, preservando zero e ausência", () => {
    const seed = publicScheduleRows(
      buildPublicStandings(publicKnockoutFixture()),
    )[0];
    const games = Array.from({ length: 35 }, (_, n) => ({
      ...seed,
      id: String(n),
      home: n === 34 ? "São Gabriel" : "Lobos",
      venue: n === 34 ? "Ginásio das Águas" : null,
      score: n === 34 ? { home: 0, away: 20 } : null,
    }));
    expect(selectPublicGames(games, "  SAO GABRIEL ")).toEqual([games[34]]);
    expect(selectPublicGames(games, "aguas")[0].score).toEqual({
      home: 0,
      away: 20,
    });
    expect(selectPublicGames(games, "")).toHaveLength(35);
    expect(selectPublicGames(games, "")[0].score).toBeNull();
    expect(selectPublicGames(games, "inexistente")).toEqual([]);
  });
});
