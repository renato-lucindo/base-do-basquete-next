import { buildTeamsList } from "../../src/team-statistics/list-domain";
import { parseTeamsListQuery } from "../../src/team-statistics/list-query";
import type { Page } from "@playwright/test";
import { teamStatisticsFixture } from "./team-statistics";
import { pubId } from "./publication";
import { buildTeamsPage } from "../../src/team-statistics/domain";
import { buildTeamDetail } from "../../src/team-statistics/detail";
import { parseTeamsQuery } from "../../src/team-statistics/query-contract";
import { parseTeamDetailQuery } from "../../src/team-statistics/detail-query";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../../src/statistics/query";
export async function teamPublicFixture(
  page: Page,
  options: { longList?: boolean; longDetail?: boolean } = {},
) {
  const source = teamStatisticsFixture(),
    seed = source.games[0];
  if (options.longList || options.longDetail)
    source.games = Array.from(
      { length: options.longDetail ? 25 : 13 },
      (_, i) => {
        const g = structuredClone(seed);
        g.snapshot.id = pubId(70000 + i);
        if (options.longList)
          for (const side of ["home", "away"] as const) {
            const n = i * 2 + (side === "home" ? 0 : 1),
              id = pubId(71000 + n);
            g.snapshot.game[side].registrationId = id;
            g.snapshot.game[side].name =
              `Inscrição ${String(n).padStart(2, "0")}`;
            for (const p of g.snapshot.facts.players.filter(
              (p) => p.side === side,
            ))
              p.registrationId = id;
          }
        if (options.longDetail) {
          for (const [n, p] of g.snapshot.facts.players
            .filter((p) => p.side === "home")
            .entries())
            p.person.id = pubId(72000 + i * 10 + n);
          const cap = g.snapshot.facts.players.find(
            (p) => p.side === "home" && p.captain,
          )!.person;
          g.snapshot.staff.home.captain = cap;
          g.snapshot.staff.home.coach = cap;
        }
        return g;
      },
    );
  const state = {
    missing: false,
    corrupt: false,
    failNext: false,
    delayNext: 0,
    sessionReads: 0,
    queries: [] as string[],
  };
  await page.route("**/api/session", (route) => {
    state.sessionReads++;
    return route.fulfill({
      status: 401,
      json: { error: { message: "login" } },
    });
  });
  await page.route("**/api/public/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("catalog"))
      return route.fulfill({
        json: {
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
          disputes: [],
        },
      });
    if (url.pathname.includes("discovery")) {
      const id = url.searchParams.get("entityId") ?? pubId(9);
      const identities = [
        ...new Map(
          source.games.flatMap(({ snapshot: g }) =>
            [g.game.home, g.game.away]
              .filter((r) => r.team.id === id)
              .map((r) => [
                r.registrationId,
                { ...r, context: g.context, disputeId: g.disputeId },
              ]),
          ),
        ).values(),
      ];
      return route.fulfill({
        json: {
          query: url.searchParams.get("q"),
          type: "teams",
          entityId: id,
          page: 1,
          totalPages: 1,
          counts: { players: 0, teams: 1, competitions: 0 },
          results: [
            {
              kind: "teams",
              id,
              name: identities[0].team.name,
              abbreviation: identities[0].team.abbreviation,
              participations: identities.map((r) => ({
                disputeId: r.disputeId,
                context: r.context,
                registrationId: r.registrationId,
                name: r.name,
                hasResults: true,
              })),
            },
          ],
        },
      });
    }
    if (url.pathname.includes("/statistics/")) {
      const delay = state.delayNext;
      state.delayNext = 0;
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      return route
        .fulfill({
          json: buildStatisticsPage(
            source,
            parseStatisticsQuery(url.searchParams),
          ),
        })
        .catch(() => undefined);
    }
    if (url.pathname.includes("dispute-status"))
      return route.fulfill({ json: "in_progress" });
    return route.fulfill({
      status: 404,
      json: { message: "Ainda não publicado." },
    });
  });
  await page.route("**/api/public/teams/**", async (route) => {
    const url = new URL(route.request().url()),
      parts = url.pathname.split("/");
    state.queries.push(url.pathname + url.search);
    const delay = state.delayNext;
    state.delayNext = 0;
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (state.missing || state.failNext) {
      const missing = state.missing;
      state.failNext = false;
      await route
        .fulfill({
          status: missing ? 404 : 503,
          json: {
            error: {
              message: missing
                ? "Ainda não há resultados publicados para esta equipe ou disputa."
                : "Não foi possível consultar. Tente novamente.",
            },
          },
        })
        .catch(() => undefined);
      return;
    }
    if (route.request().method() === "POST") {
      url.search = route.request().postDataJSON().query;
    }
    const data = parts[5]
      ? buildTeamDetail(
          source,
          parts[5],
          url.searchParams.get("registrationId"),
          parseTeamDetailQuery(url.searchParams),
        )
      : url.searchParams.get("pageSize") === "all"
        ? buildTeamsList(source, parseTeamsListQuery(url.searchParams))
        : buildTeamsPage(source, parseTeamsQuery(url.searchParams));
    await route
      .fulfill({
        json: state.corrupt
          ? { ...data, privateValue: "do-not-display" }
          : data,
      })
      .catch(() => undefined);
  });
  return {
    source,
    state,
    listUrl: `http://127.0.0.1:5174/equipes.html#${source.disputeId}`,
    detailUrl: `http://127.0.0.1:5174/equipe.html#${pubId(9)}?disputeId=${source.disputeId}&registrationId=${pubId(5)}`,
  };
}
