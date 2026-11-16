import { describe, expect, it } from "vitest";
import { playerCareerFixture } from "../../tests/fixtures/player-career";
import { buildPlayerProfile } from "./domain";
import { parseProfileQuery } from "./query-contract";
import {
  rankCareerGames,
  teamTrajectory,
  groupPlacements,
  groupHonors,
} from "./presentation";

describe("approved player profile presentation", () => {
  it("ranks only covered appearances, keeps confirmed zero and resolves ties by game date", () => {
    const games = playerCareerFixture().participations;
    games[0].fact.scoring!.points = 0;
    games[1].fact.scoring!.points = 0;
    games[0].game.date = "2026-01-01";
    games[1].game.date = "2026-02-01";
    expect(rankCareerGames(games, "points").map((g) => g.fact.gameId)).toEqual([
      games[1].fact.gameId,
      games[0].fact.gameId,
    ]);
    games[1].fact.played = false;
    expect(rankCareerGames(games, "points")).toHaveLength(1);
    games[0].fact.scoring = null;
    expect(rankCareerGames(games, "points")).toEqual([]);
  });
  it("limits rankings to five distinct games, with unknown dates after known dates", () => {
    const source = playerCareerFixture().participations[0];
    const games = Array.from({ length: 7 }, (_, i) => {
      const g = structuredClone(source);
      g.fact.gameId = String(i);
      g.game.date = i === 0 ? null : `2026-01-0${i}`;
      return g;
    });
    expect(rankCareerGames(games, "twoMade").map((g) => g.fact.gameId)).toEqual(
      ["6", "5", "4", "3", "2"],
    );
  });
  it("groups consecutive registrations of a team across championships and retains a later return", () => {
    const s = playerCareerFixture(),
      page = buildPlayerProfile(s, parseProfileQuery(new URLSearchParams()));
    const a = structuredClone(page.history[0]);
    a.context.year = 2024;
    const b = structuredClone(a);
    b.context.year = 2025;
    b.registration.registrationId = "another-registration";
    const c = structuredClone(a);
    c.context.year = 2026;
    c.registration.team.id = "another-team";
    const d = structuredClone(a);
    d.context.year = 2027;
    const passages = teamTrajectory([d, b, c, a]);
    expect(passages.map((p) => [p.team.id, p.firstYear, p.lastYear])).toEqual([
      [a.registration.team.id, 2024, 2025],
      ["another-team", 2026, 2026],
      [a.registration.team.id, 2027, 2027],
    ]);
  });
  it("groups competition occurrences under their real medal and omits absent positions", () => {
    const f = playerCareerFixture().participations[0].fact;
    const award = {
      disputeId: f.disputeId,
      context: f.context,
      version: 1,
      confirmedAt: f.publishedAt,
      position: 1,
      registration: {
        registrationId: f.registration.registrationId,
        teamId: f.registration.team.id,
        name: f.registration.name,
      },
    };
    const second = {
      ...structuredClone(award),
      disputeId: "another",
      context: { ...f.context, year: 2025 },
    };
    const bronze = {
      ...structuredClone(award),
      disputeId: "bronze",
      position: 3,
    };
    const groups = groupPlacements([award, second, bronze]);
    expect(groups.map((g) => g.position)).toEqual([1, 3]);
    expect(groups[0].competitions[0].editions).toHaveLength(2);
    expect(groups[1].competitions[0].editions).toHaveLength(1);
  });
  it("keeps MVP separate from other individual awards without assigning medals", () => {
    const f = playerCareerFixture().participations[0].fact;
    const h = {
      disputeId: f.disputeId,
      context: f.context,
      version: 1,
      confirmedAt: f.publishedAt,
      honor: { id: "mvp", title: "MVP" },
      recipient: {
        personId: f.person.id,
        name: f.person.name,
        nickname: null,
        publicBirthYear: null,
      },
    };
    const groups = groupHonors([
      h,
      { ...h, honor: { id: "scorer", title: "Cestinha" } },
      { ...h, disputeId: "older", context: { ...h.context, year: 2025 } },
    ]);
    expect(groups.map((g) => g.title)).toEqual(["MVP", "Cestinha"]);
    expect(groups[0].editions).toHaveLength(2);
  });
});
