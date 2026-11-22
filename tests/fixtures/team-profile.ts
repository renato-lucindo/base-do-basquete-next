import { teamStatisticsFixture } from "./team-statistics";
import { publicRegulationFixture } from "./public-regulation";
import { buildPublicStandings } from "../../src/regulation/public";
import { pubId } from "./publication";
import { catalogPageSchema } from "../../src/public-ui/catalog-contract";
import type { Page } from "@playwright/test";
import { buildTeamsList } from "../../src/team-statistics/list-domain";
import { parseTeamsListQuery } from "../../src/team-statistics/list-query";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../../src/statistics/query";

/** A complete public competition assembled solely from synthetic test inputs. */
export function teamProfileFixture() {
  const source = teamStatisticsFixture();
  source.games[1].snapshot.game.away = {
    registrationId: pubId(8),
    name: "Águias",
    team: { id: pubId(10), name: "Águias Clube", abbreviation: "AGU" },
  };
  source.games[2].snapshot.game.home = structuredClone(
    source.games[0].snapshot.game.away,
  );
  source.games[2].snapshot.game.away = structuredClone(
    source.games[1].snapshot.game.away,
  );
  source.games.forEach(({ snapshot }, i) => {
    snapshot.game.date = `2026-10-${String(23 + i).padStart(2, "0")}`;
    snapshot.game.time = "18:00";
    for (const player of snapshot.facts.players)
      player.registrationId = snapshot.game[player.side].registrationId;
  });
  const template = publicRegulationFixture();
  const registrations = [
    ...new Map(
      source.games.flatMap(({ snapshot }) =>
        [snapshot.game.home, snapshot.game.away].map(
          ({ registrationId, ...r }) => [
            registrationId,
            { id: registrationId, ...r },
          ],
        ),
      ),
    ).values(),
  ];
  registrations.push({
    id: pubId(11),
    name: "Estrela",
    team: { id: pubId(12), name: "Estrela Clube", abbreviation: null },
  });
  const phaseId = pubId(300),
    groupA = pubId(301),
    groupB = pubId(302),
    pendingId = pubId(20010);
  const games = source.games.map(({ snapshot }) => ({
    ...template.games[0],
    id: snapshot.id,
    disputeId: source.disputeId,
    version: 1,
    homeRegistrationId: snapshot.game.home.registrationId,
    awayRegistrationId: snapshot.game.away.registrationId,
    date: snapshot.game.date,
    time: snapshot.game.time,
  }));
  games.push({
    ...games[0],
    id: pendingId,
    homeRegistrationId: pubId(5),
    awayRegistrationId: pubId(8),
    date: "2026-12-10",
  });
  // The second group exists to prove embedded selection without changing team ID.
  const standings = buildPublicStandings({
    ...template,
    disputeId: source.disputeId,
    context: source.games[0].snapshot.context,
    definition: {
      ...template.definition,
      registrationIds: registrations.map((r) => r.id),
      groupPhases: [
        {
          ...template.definition.groupPhases[0],
          phaseId,
          groups: [
            {
              id: groupA,
              name: "Grupo A",
              registrationIds: registrations.slice(0, 3).map((r) => r.id),
              gameIds: games.map((g) => g.id),
            },
            {
              id: groupB,
              name: "Grupo B",
              registrationIds: [pubId(11)],
              gameIds: [],
            },
          ],
        },
      ],
    },
    registrations,
    games,
    publishedGames: source.games.map(({ snapshot }) => ({
      ...template.publishedGames[0],
      gameId: snapshot.id,
      disputeId: source.disputeId,
      homeRegistrationId: snapshot.game.home.registrationId,
      awayRegistrationId: snapshot.game.away.registrationId,
      publicationVersion: snapshot.version,
      homePoints: snapshot.facts.teams.home.points,
      awayPoints: snapshot.facts.teams.away.points,
    })),
  });
  const catalog = catalogPageSchema.parse({
    games: source.games.map(({ snapshot: g }) => ({
      id: g.id,
      disputeId: g.disputeId,
      context: g.context,
      game: g.game,
      score: {
        home: g.facts.teams.home.points,
        away: g.facts.teams.away.points,
      },
    })),
    next: null,
    disputes: [
      {
        disputeId: source.disputeId,
        context: source.games[0].snapshot.context,
        registrations,
      },
    ],
  });
  return {
    source,
    standings,
    catalog,
    teamId: pubId(9),
    registrationId: pubId(5),
    phaseId,
    groupA,
    groupB,
  };
}

export async function teamProfileBrowserFixture(page: Page) {
  const f = teamProfileFixture();
  const state = {
    alienStatistics: false,
    failCatalogue: false,
    calls: [] as { path: string; preview: string | undefined }[],
  };
  await page.route("**/api/public/**", async (route) => {
    const u = new URL(route.request().url());
    state.calls.push({
      path: u.pathname + u.search,
      preview: route.request().headers()["x-dispute-preview"],
    });
    if (u.pathname.endsWith("catalog"))
      return state.failCatalogue
        ? route.fulfill({ status: 503, json: { message: "Indisponível" } })
        : route.fulfill({ json: f.catalog });
    if (u.pathname.includes("dispute-status"))
      return route.fulfill({ json: "in_progress" });
    if (u.pathname.includes("standings"))
      return route.fulfill({ json: f.standings });
    if (u.pathname.includes("achievements"))
      return route.fulfill({
        json: {
          disputeId: f.source.disputeId,
          version: 1,
          confirmedAt: "2026-10-25T12:00:00Z",
          context: f.catalog.disputes[0].context,
          placements: [
            {
              position: 1,
              registrations: [
                {
                  registrationId: f.registrationId,
                  teamId: f.teamId,
                  name: "Lobos",
                },
              ],
            },
          ],
          honors: [],
        },
      });
    if (u.pathname.includes("discovery"))
      return route.fulfill({
        json: {
          query: u.searchParams.get("q"),
          type: "teams",
          entityId: f.teamId,
          page: 1,
          totalPages: 1,
          counts: { teams: 1, players: 0, competitions: 0 },
          results: [
            {
              kind: "teams",
              id: f.teamId,
              name: "Lobos Clube",
              abbreviation: "LOB",
              participations: f.catalog.disputes[0].registrations
                .filter((r) => r.team.id === f.teamId)
                .map((r) => ({
                  disputeId: f.source.disputeId,
                  context: f.catalog.disputes[0].context,
                  registrationId: r.id,
                  name: r.name,
                  hasResults: true,
                })),
            },
          ],
        },
      });
    if (u.pathname.includes("/teams/"))
      return route.fulfill({
        json: buildTeamsList(f.source, parseTeamsListQuery(u.searchParams)),
      });
    if (u.pathname.includes("/statistics/")) {
      if (state.alienStatistics) u.searchParams.set("registrationId", pubId(6));
      return route.fulfill({
        json: buildStatisticsPage(
          f.source,
          parseStatisticsQuery(u.searchParams),
        ),
      });
    }
    return route.fulfill({ status: 404, json: { message: "Não publicado" } });
  });
  return {
    ...f,
    state,
    url: `http://127.0.0.1:5174/equipe.html#${f.teamId}?disputeId=${f.source.disputeId}&registrationId=${f.registrationId}`,
  };
}
