import { test, expect } from "@playwright/test";
import { teamStatisticsFixture } from "./fixtures/team-statistics";
import { pubId } from "./fixtures/publication";
import {
  teamProfileFixture,
  teamProfileBrowserFixture,
} from "./fixtures/team-profile";
import AxeBuilder from "@axe-core/playwright";
import { buildTeamsList } from "../src/team-statistics/list-domain";
import { parseTeamsListQuery } from "../src/team-statistics/list-query";
import {
  buildStatisticsPage,
  parseStatisticsQuery,
} from "../src/statistics/query";
test("resultados publicados aparecem mesmo com classificação confirmada sem fases", async ({
  page,
}) => {
  const f = await teamProfileBrowserFixture(page);
  f.standings.games = [];
  f.standings.registrations = [];
  f.standings.definition.registrationIds = [];
  f.standings.definition.groupPhases = [];
  f.standings.definition.knockoutPhases = [];
  f.standings.definition.series = [];
  f.standings.projection.groupPhases = [];
  f.standings.projection.series = [];
  f.standings.projection.lineage = [];
  await page.goto(f.url);
  await expect(page.locator(".team-profile-games tbody tr")).toHaveCount(2);
  await expect(
    page.getByText("Nenhuma fase configurada nesta versão pública."),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Ver perfil geral", exact: true })
    .click();
  await expect(page.locator(".team-profile-campaigns tbody tr")).toHaveCount(2);
  const campaign = page.locator(".team-profile-campaigns tbody tr").first();
  await expect(campaign.locator("td").nth(2)).toHaveText("2");
  await expect(campaign.locator(".standings-results li")).toHaveCount(2);
  await expect(page.locator(".team-profile-games tbody tr")).toHaveCount(3);
  await page.getByRole("tab", { name: "Jogos", exact: true }).click();
  await expect(page.locator(".team-profile-games tbody tr")).toHaveCount(3);
  await expect(
    page.getByRole("columnheader", { name: "Resultado", exact: true }),
  ).toHaveCount(0);
});

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
  await page.getByRole("tab", { name: "Competições", exact: true }).click();
  const globalSource = page.url();
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
  await expect(
    athletes.getByRole("columnheader", { name: "Camisa", exact: true }),
  ).toHaveCount(0);
  await expect(athletes.locator(".player-jersey").first()).toHaveText(/^#/);
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
  expect(page.url()).toBe(globalSource);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("resposta de outra inscrição é recusada, e erro transitório permite nova tentativa", async ({
  page,
}) => {
  const f = await teamProfileBrowserFixture(page);
  f.state.alienStatistics = true;
  await page.goto(f.url + "&secao=jogadores");
  await expect(page.getByRole("alert")).toContainText("outra inscrição");
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toHaveCount(0);
  f.state.alienStatistics = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toBeVisible();
});

test("prévia permanece em uma disputa e não consulta busca global", async ({
  page,
}, info) => {
  const f = await teamProfileBrowserFixture(page);
  const [base, hash] = f.url.split("#");
  await page.goto(`${base}?previa=${f.source.disputeId}#${hash}`);
  await expect(
    page.getByRole("heading", { name: "Lobos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Ver perfil geral", exact: true })
    .click();
  await expect(page.getByRole("tab")).toHaveCount(5);
  expect(f.state.calls.some((c) => c.path.includes("discovery"))).toBe(false);
  expect(f.state.calls.every((c) => c.preview === f.source.disputeId)).toBe(
    true,
  );
  await page.getByRole("tab", { name: "Elencos", exact: true }).click();
  await page.locator(".team-profile-rosters > nav a").first().click();
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toBeVisible();
  expect(f.state.calls.every((c) => c.path.includes(f.source.disputeId))).toBe(
    true,
  );
  if (info.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Voltar às participações", exact: true })
      .click();
    await expect(
      page.locator(".team-profile-rosters > nav a").first(),
    ).toBeFocused();
  }
});

test("apresentação aceita, legenda expandida, teclado e reflow", async ({
  page,
}, info) => {
  const f = await teamProfileBrowserFixture(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(f.url);
  await expect(
    page.getByRole("table", { name: "Estatísticas das equipes", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".table-legend")).toHaveCount(1);
  await expect(page.locator(".table-legend")).toContainText("Jogos");
  expect(
    await page.locator(".table-legend").evaluate((el) => el.closest("details")),
  ).toBeNull();
  await expect(page.locator(".team-profile-honors")).toContainText("Campeão");
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/team-profile-overview-${info.project.name}.png`,
    fullPage: true,
  });
  const tab = page.getByRole("tab", { name: "Visão geral", exact: true });
  await tab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Jogadores", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    expect(
      (await page
        .getByRole("combobox", { name: "Fase", exact: true })
        .boundingBox())!.width,
    ).toBeGreaterThanOrEqual(105);
  const playersAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(playersAxe.violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/team-profile-players-${info.project.name}.png`,
    fullPage: true,
  });
  if (info.project.name === "desktop") {
    for (const width of [1366, 1920]) {
      await page.setViewportSize({
        width,
        height: width === 1366 ? 768 : 1080,
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
    }
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/team-profile-players-320-text200-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("classificação completa embutida mantém equipe, inscrição e grupo após recarga", async ({
  page,
}) => {
  const f = teamProfileFixture();
  await page.route("**/api/public/**", async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith("catalog"))
      return route.fulfill({ json: f.catalog });
    if (u.pathname.includes("dispute-status"))
      return route.fulfill({ json: "in_progress" });
    if (u.pathname.includes("standings"))
      return route.fulfill({ json: f.standings });
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
              name: "Lobos",
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
    return route.fulfill({ status: 404, json: { message: "Não publicado" } });
  });
  await page.goto(
    `http://127.0.0.1:5174/equipe.html#${f.teamId}?disputeId=${f.source.disputeId}&registrationId=${f.registrationId}`,
  );
  await expect(
    page.getByText("Classificação ainda indisponível nesta disputa."),
  ).toHaveCount(0);
  await expect(page.locator(".public-standings tbody tr")).toHaveCount(3);
  await expect(
    page.locator('.public-standings [data-profile-selected="true"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("table", { name: "Estatísticas das equipes", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".table-legend")).toHaveCount(1);
  const pointsMeanings = page.locator(".table-legend dl div").filter({
    has: page.locator("dt").filter({ hasText: /^PTS$/ }),
  });
  await expect(pointsMeanings.locator("dd")).toHaveText([
    "Pontos de classificação",
    "Pontos marcados",
  ]);
  await page
    .getByRole("combobox", { name: "Grupo", exact: true })
    .selectOption(f.groupB);
  await expect(page).toHaveURL(
    new RegExp(
      `${f.teamId}.*registrationId=${f.registrationId}.*grupo=${f.groupB}`,
    ),
  );
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Grupo", exact: true }),
  ).toHaveValue(f.groupB);
  await page.getByRole("tab", { name: "Jogos", exact: true }).click();
  await expect(page.locator(".team-profile-games tbody tr")).toHaveCount(3);
  await expect(page.locator(".team-profile-games")).toContainText("Agendado");
  await page.getByRole("tab", { name: "Visão geral", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Grupo", exact: true }),
  ).toHaveValue(f.groupB);
  await page
    .getByRole("combobox", { name: "Grupo", exact: true })
    .selectOption(f.groupA);
  await expect(page.locator(".public-standings tbody tr")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Lobos", exact: true }),
  ).toBeVisible();
});
