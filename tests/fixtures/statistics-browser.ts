import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { statisticsSourceSchema } from "../../src/statistics/source";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../../src/statistics/query";
import { confirmedPdfFixture } from "./statistics-publications";
export async function statisticsBrowserFixture(
  page: Page,
  options: {
    multipleRegistrations?: boolean;
    insufficient?: boolean;
    empty?: boolean;
  } = {},
) {
  const source = statisticsSourceSchema.parse(
    JSON.parse(await readFile("tests/fixtures/statistics-source.json", "utf8")),
  );
  if (options.multipleRegistrations) {
    const first = source.games[0].snapshot.facts.players[0],
      last = source.games[2].snapshot;
    last.facts.players[0].person.id = first.person.id;
    last.game.home.registrationId = "f9300000-0000-4000-8000-000000000055";
    last.game.home.name = "Outra inscrição";
    for (const p of last.facts.players.filter((p) => p.side === "home"))
      p.registrationId = last.game.home.registrationId;
    last.staff.home.captain = last.facts.players[0].person;
    last.staff.home.coach = last.facts.players[0].person;
  }
  if (options.insufficient) {
    const snapshot = await confirmedPdfFixture();
    snapshot.disputeId = source.disputeId;
    source.games = [{ phase: null, snapshot }];
    source.minimumSeconds = 2147483647;
  }
  const state = {
    failNext: false,
    delayNext: 0,
    empty: options.empty ?? false,
    queries: [] as URLSearchParams[],
  };
  await page.route("**/api/public/statistics/**", async (route) => {
    const url = new URL(route.request().url());
    state.queries.push(url.searchParams);
    if (state.failNext) {
      state.failNext = false;
      await route.fulfill({
        status: 503,
        json: {
          error: {
            code: "unavailable",
            message: "Não foi possível consultar. Tente novamente.",
          },
        },
      });
      return;
    }
    if (state.empty) {
      await route.fulfill({
        status: 404,
        json: {
          error: {
            code: "public_not_found",
            message: "Ainda não há resultados confirmados nesta disputa.",
          },
        },
      });
      return;
    }
    const delay = state.delayNext;
    state.delayNext = 0;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    await route
      .fulfill({
        json: buildStatisticsPage(
          source,
          parseStatisticsQuery(url.searchParams),
        ),
      })
      .catch(() => undefined);
  });
  return {
    source,
    state,
    url: `http://127.0.0.1:5174/estatisticas.html#${source.disputeId}?scope=all`,
  };
}
