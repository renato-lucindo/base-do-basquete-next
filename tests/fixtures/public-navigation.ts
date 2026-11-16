import { publicSearchFixture, searchFixtureHits } from "./public-search";
import type { Page } from "@playwright/test";
import { statisticsBrowserFixture } from "./statistics-browser";
import { catalogGameSchema } from "../../src/public-ui/catalog-contract";
import { buildTeamsPage } from "../../src/team-statistics/domain";
import { buildTeamDetail } from "../../src/team-statistics/detail";
import { parseTeamsQuery } from "../../src/team-statistics/query-contract";
import { parseTeamDetailQuery } from "../../src/team-statistics/detail-query";
import { normalizeConfirmedGame } from "../../src/statistics/confirmed-facts";
import { buildPlayerProfile } from "../../src/player-profile/domain";
import { parseProfileQuery } from "../../src/player-profile/query-contract";
import { pubId } from "./publication";

export async function publicNavigationFixture(page: Page) {
  const f = await statisticsBrowserFixture(page);
  const games = f.source.games.map(({ snapshot: g }) =>
    catalogGameSchema.parse({
      id: g.id,
      disputeId: g.disputeId,
      context: g.context,
      game: g.game,
      score: {
        home: g.facts.teams.home.points,
        away: g.facts.teams.away.points,
      },
    }),
  );
  const first = games[0];
  games.push(
    {
      ...structuredClone(first),
      id: pubId(90001),
      disputeId: pubId(90002),
      context: {
        ...first.context,
        gender: first.context.gender === "masculino" ? "feminino" : "masculino",
        category: "Sub-14",
        division: null,
      },
    },
    {
      ...structuredClone(first),
      id: pubId(90003),
      disputeId: pubId(90004),
      context: { ...first.context, category: "Adulto", division: "Prata" },
    },
  );
  const confirmed = [
    {
      disputeId: pubId(90005),
      context: {
        ...first.context,
        year: first.context.year - 1,
        category: "Sub-12",
      },
      registrations: [],
    },
    {
      disputeId: pubId(90006),
      context: { ...first.context, category: "Sub-11" },
      registrations: [],
    },
  ];
  games.sort((a, b) => a.id.localeCompare(b.id));
  const state = {
    missing: false,
    failed: false,
    profileOnly: false,
    calls: [] as string[],
  };
  await page.route("**/api/public/catalog?*", (route) => {
    const u = new URL(route.request().url());
    state.calls.push(u.pathname);
    if (state.failed)
      return route.fulfill({
        status: 503,
        json: { error: { message: "Indisponível" } },
      });
    const id = u.searchParams.get("disputeId");
    return route.fulfill({
      json: {
        games: state.missing
          ? []
          : games.filter((g) => !id || g.disputeId === id),
        next: null,
        disputes: state.missing
          ? []
          : confirmed.filter((d) => !id || d.disputeId === id),
      },
    });
  });
  await page.route("**/api/public/standings/**", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/public/teams/**", (route) => {
    const u = new URL(route.request().url()),
      parts = u.pathname.split("/");
    return route.fulfill({
      json: parts[5]
        ? buildTeamDetail(
            f.source,
            parts[5],
            u.searchParams.get("registrationId"),
            parseTeamDetailQuery(u.searchParams),
          )
        : buildTeamsPage(f.source, parseTeamsQuery(u.searchParams)),
    });
  });
  await page.route("**/api/public/games/**", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    return route.fulfill({
      json: f.source.games.find((g) => g.snapshot.id === id)?.snapshot,
    });
  });
  await page.route("**/api/public/players/**", (route) => {
    const u = new URL(route.request().url()),
      personId = u.pathname.split("/").pop()!;
    const participations = f.source.games.flatMap(({ snapshot, phase }) =>
      normalizeConfirmedGame(snapshot)
        .filter((f) => f.person.id === personId)
        .map((fact) => ({
          kind: "confirmed-player-game-v1" as const,
          statisticsVersion: f.source.version,
          minimumSeconds: f.source.minimumSeconds,
          fact: { ...fact, phase },
          game: snapshot.game,
        })),
    );
    return route.fulfill({
      json: buildPlayerProfile(
        {
          kind: "confirmed-player-career-v1",
          personId,
          profile: null,
          participations,
          honors: [],
          teamPlacements: [],
        },
        parseProfileQuery(u.searchParams),
      ),
    });
  });
  await page.route("**/api/public/search?*", (route) => {
    const q = new URL(route.request().url()).searchParams
      .get("q")!
      .toLowerCase();
    const players = [
      ...new Map(
        f.source.games
          .flatMap(({ snapshot }) =>
            snapshot.facts.players.map((p) => ({ person: p.person })),
          )
          .filter((p) => p.person.name.toLowerCase().includes(q))
          .map((p) => [
            p.person.id,
            {
              person: p.person,
              disputeId: state.profileOnly ? null : f.source.disputeId,
            },
          ]),
      ).values(),
    ];
    return route.fulfill({ json: { players, hasMore: false } });
  });
  const discovery = await publicSearchFixture(page, () =>
    searchFixtureHits(
      state.missing ? [] : games,
      [],
      [
        ...new Map(
          f.source.games
            .flatMap(({ snapshot }) =>
              snapshot.facts.players.map((p) => ({
                kind: "players" as const,
                id: p.person.id,
                name: p.person.name,
                nickname: p.person.nickname,
                disputeId: state.profileOnly ? null : snapshot.disputeId,
              })),
            )
            .map((p) => [p.id, p]),
        ).values(),
      ],
    ),
  );
  return { ...f, games, confirmed, state, discovery };
}
