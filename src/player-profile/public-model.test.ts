import { describe, expect, it } from "vitest";
import { buildPlayerProfile } from "./domain";
import { parseProfileQuery } from "./query-contract";
import { playerCareerFixture } from "../../tests/fixtures/player-career";
import {
  careerStatistics,
  chronologicalGames,
  validatePublicCareer,
} from "./public-model";
import { safePublicReturn } from "../public-ui/navigation";

describe("public career presentation", () => {
  it("counts explicit appearances, keeps zero and refuses partial foul averages", () => {
    const source = playerCareerFixture();
    const games = source.participations;
    games[0].fact.foulsCommitted = {
      ...games[0].fact.foulsCommitted!,
      value: 0,
    };
    games[1].fact.foulsCommitted = null;
    const result = careerStatistics(games, source.personId)!;
    expect(result.gamesPlayed).toBe(2);
    expect(result.metrics.foulsCommitted.status).toBe("unavailable");
    expect(
      careerStatistics([games[0]], source.personId)!.metrics.foulsCommitted
        .value,
    ).toBe(0);
    Object.assign(games[1].fact, {
      played: false,
      starter: false,
      captain: false,
      scoring: null,
      advanced: null,
      foulsReceived: null,
      discipline: null,
    });
    expect(careerStatistics(games, source.personId)!.gamesPlayed).toBe(1);
    expect(
      careerStatistics([games[1]], source.personId)!.metrics.points.status,
    ).toBe("unavailable");
  });
  it("orders by game date, not the date a correction was published", () => {
    const games = playerCareerFixture().participations;
    games[0].game.date = "2026-01-01";
    games[0].fact.publishedAt = "2028-01-01T00:00:00Z";
    games[1].game.date = "2027-01-01";
    expect(chronologicalGames(games)[0].fact.gameId).toBe(games[1].fact.gameId);
  });
  it("rejects incomplete or repeated career pages before presenting aggregates", () => {
    const source = playerCareerFixture(),
      page = buildPlayerProfile(
        source,
        parseProfileQuery(new URLSearchParams()),
      );
    expect(() =>
      validatePublicCareer({
        page,
        games: source.participations.slice(0, 1),
        history: page.history,
      }),
    ).toThrow();
    expect(() =>
      validatePublicCareer({
        page,
        games: [source.participations[0], source.participations[0]],
        history: page.history,
      }),
    ).toThrow();
    expect(
      validatePublicCareer({
        page,
        games: source.participations,
        history: page.history,
      }).games,
    ).toHaveLength(2);
  });
  it("preserves a career return across disputes without accepting an external target", () => {
    const source = playerCareerFixture();
    const href = `/atleta.html#${source.personId}?anoPerfil=2026&equipesPerfil=&paineisPerfil=jogos&page=2`;
    expect(
      safePublicReturn(href, source.participations[1].fact.disputeId),
    ).toBe(href);
    expect(safePublicReturn("//evil.test" + href, null)).toBeNull();
    expect(safePublicReturn("/atleta.html#invalid", null)).toBeNull();
  });
});
