import { test, expect } from "@playwright/test";
import { teamStatisticsFixture } from "./fixtures/team-statistics";
import { pubId } from "./fixtures/publication";
import { buildTeamsList } from "../src/team-statistics/list-domain";
import { parseTeamsListQuery } from "../src/team-statistics/list-query";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../src/statistics/query";
test("perfil geral e disputa preservam identidade e apresentam as tabelas aceitas", async ({
  page,
}) => {
  const source = teamStatisticsFixture(),
    g = source.games[0].snapshot;
  const participations = [g.game.home, g.game.away].map((r) => ({
    disputeId: source.disputeId,
    context: g.context,
    registrationId: r.registrationId,
    name: r.name,
    hasResults: true,
  }));
  await page.route("**/api/public/**", async (route) => {
    const u = new URL(route.request().url());
    const p = u.pathname;
    if (p.endsWith("catalog"))
      return route.fulfill({
        json: {
          games: source.games.map(({ snapshot: s }) => ({
            id: s.id,
            disputeId: s.disputeId,
            context: s.context,
            game: s.game,
            score: {
              home: s.facts.teams.home.points,
              away: s.facts.teams.away.points,
            },
          })),
          disputes: [],
          next: null,
        },
      });
    if (p.endsWith("discovery"))
      return route.fulfill({
        json: {
          query: u.searchParams.get("q"),
          type: "teams",
          entityId: pubId(9),
          page: 1,
          totalPages: 1,
          counts: { players: 0, teams: 1, competitions: 0 },
          results: [
            {
              kind: "teams",
              id: pubId(9),
              name: "Lobos Clube",
              abbreviation: null,
              participations,
            },
          ],
        },
      });
    if (p.includes("dispute-status"))
      return route.fulfill({ json: "in_progress" });
    if (p.includes("/teams/"))
      return route.fulfill({
        json: buildTeamsList(source, parseTeamsListQuery(u.searchParams)),
      });
    if (p.includes("/statistics/"))
      return route.fulfill({
        json: buildStatisticsPage(source, parseStatisticsQuery(u.searchParams)),
      });
    return route.fulfill({
      status: 404,
      json: { message: "Ainda não publicado." },
    });
  });
  await page.goto(`http://127.0.0.1:5174/equipe.html#${pubId(9)}`);
  await expect(page.getByRole("tab")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Lobos Clube", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: g.context.name, exact: true })
    .first()
    .click();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await expect(
    page.getByRole("table", { name: "Estatísticas das equipes", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-profile-selected="true"]')).toHaveCount(1);
  await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
  const athletes = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(athletes).toBeVisible();
  await expect(athletes.locator("thead th")).toHaveCount(14);
  await expect(page.getByRole("button", { name: /Colunas/ })).toBeVisible();
  await expect(page.locator(".table-legend")).toBeVisible();
  await page.getByRole("tab", { name: "Jogos", exact: true }).click();
  await expect(page.locator(".team-profile-games thead th")).toHaveCount(2);
  await expect(
    page.getByRole("columnheader", { name: "Resultado", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "Jogos", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("link", { name: "Ver perfil geral", exact: true })
    .click();
  await expect(page.getByRole("tab")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
