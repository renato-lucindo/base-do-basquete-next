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
    withBoxscore?: boolean;
    largeList?: boolean;
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
  if (options.withBoxscore) {
    const snapshot = await confirmedPdfFixture();
    snapshot.disputeId = source.disputeId;
    snapshot.id = "f9300000-0000-4000-8000-000000000999";
    snapshot.context = structuredClone(source.games[0].snapshot.context);
    for (const p of snapshot.facts.players)
      p.person.name = `Atleta do boxscore ${p.jersey}`;
    source.games.push({ snapshot, phase: null });
  }
  if (options.largeList) {
    for (let i = 0; i < 7; i++) {
      const game = structuredClone(source.games[0]);
      game.snapshot.id = `f9300000-0000-4000-8000-${String(8000 + i).padStart(12, "0")}`;
      game.snapshot.facts.players.forEach((player, index) => {
        player.person.id = `f9300000-0000-4000-8000-${String(9000 + i * 20 + index).padStart(12, "0")}`;
        player.person.name = `Atleta extra ${i}-${index}`;
      });
      for (const side of ["home", "away"] as const) {
        const captain = game.snapshot.facts.players.find(
          (p) => p.side === side && p.captain,
        )!.person;
        game.snapshot.staff[side] = {
          captain,
          coach: captain,
          assistant: null,
          captainIsCoach: true,
        };
      }
      source.games.push(game);
    }
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
    pageRowCount: buildStatisticsPage(
      source,
      parseStatisticsQuery(new URLSearchParams("scope=all&pageSize=100")),
    ).rows.length,
    state,
    url: `http://127.0.0.1:5174/estatisticas.html#${source.disputeId}?scope=all`,
  };
}
