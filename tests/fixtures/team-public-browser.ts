import type { Page } from "@playwright/test";
import { teamStatisticsFixture } from "./team-statistics";
import { pubId } from "./publication";
import { buildTeamsPage } from "../../src/team-statistics/domain";
import { buildTeamDetail } from "../../src/team-statistics/detail";
import { parseTeamsQuery } from "../../src/team-statistics/query-contract";
import { parseTeamDetailQuery } from "../../src/team-statistics/detail-query";
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
    const data = parts[5]
      ? buildTeamDetail(
          source,
          parts[5],
          url.searchParams.get("registrationId"),
          parseTeamDetailQuery(url.searchParams),
        )
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
