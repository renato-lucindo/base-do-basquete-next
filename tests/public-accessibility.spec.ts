import { test, expect } from "@playwright/test";
import { scanAccessibility as scan } from "./fixtures/accessibility";
import { publishedSheet, publishedSite } from "./fixtures/published-game";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";
import { playerPublicFixture } from "./fixtures/player-public-browser";
import { teamPublicFixture } from "./fixtures/team-public-browser";

for (const kind of ["sheet", "site"] as const)
  test(`axe: resultado confirmado ${kind}`, async ({ page }, info) => {
    const r = kind === "sheet" ? publishedSheet() : await publishedSite();
    await page.route(`**/api/public/games/${r.id}`, (route) =>
      route.fulfill({ json: r }),
    );
    await page.goto(`http://127.0.0.1:5174/resultado.html#${r.id}`);
    await expect(page.getByRole("table").first()).toBeVisible();
    await scan(page, info, `result-${kind}`);
  });
test("axe: estatísticas e escolha de colunas", async ({ page }, info) => {
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toBeVisible();
  for (const button of await page.locator("button.statistics-sort").all()) {
    const visible = (await button.innerText())
      .trim()
      .replace(/[↑↓]/gu, "")
      .trim();
    const escaped = visible.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    await expect(button).toHaveAccessibleName(new RegExp(escaped, "u"));
  }
  await scan(page, info, "statistics");
  const columns = page.getByRole("button", { name: /^Colunas ·/u });
  await expect(columns).toBeVisible();
  await columns.click();
  await expect(
    page.getByRole("group", { name: "Colunas da tabela", exact: true }),
  ).toBeVisible();
  await scan(page, info, "statistics-columns");
});
test("axe: perfil contínuo, painéis e seleção por checkboxes", async ({
  page,
}, info) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url);
  await expect(
    page.getByRole("heading", { name: "AP", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".player-full-name")).toHaveText("Ana Pública");
  await scan(page, info, "player-continuous");
  for (const [name, target] of [
    ["Jogos", "#jogos"],
    ["Histórico", "#historico"],
    ["Evolução", "#evolucao"],
  ]) {
    await page
      .getByRole("navigation", { name: "Seções do perfil" })
      .getByRole("link", { name, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(target)).toBeFocused();
    await scan(page, info, `player-${name}`);
  }
  for (const name of ["Equipes", "Colunas"]) {
    await page
      .locator(".player-options > summary")
      .filter({ hasText: name })
      .click();
    await scan(page, info, `player-options-${name}`);
    await page.keyboard.press("Escape");
  }
});

test("axe: lista de equipes longa e escolha explícita da inscrição", async ({
  page,
}, info) => {
  const f = await teamPublicFixture(page, { longList: true });
  await page.goto(f.listUrl);
  await expect(
    page.getByRole("table", {
      name: "Estatísticas das equipes",
      exact: true,
    }),
  ).toBeVisible();
  await scan(page, info, "teams-list");
});
test("axe: escolha e seções do detalhe da equipe", async ({ page }, info) => {
  const f = await teamPublicFixture(page, { longDetail: true });
  await page.goto(f.detailUrl.replace(/&registrationId=[^&]+/u, ""));
  await expect(page.getByRole("main")).toContainText("Lobos B");
  await scan(page, info, "team-selection");
  await page.goto(f.detailUrl);
  await expect(
    page.getByRole("heading", { name: "Lobos", exact: true }),
  ).toBeVisible();
  await scan(page, info, "team-summary");
  for (const [section, state] of [
    ["Participantes", "participants"],
    ["Jogos", "games"],
  ]) {
    const link = page
      .getByRole("navigation", { name: "Seções da equipe" })
      .getByRole("link", { name: section, exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: section, exact: true }),
    ).toBeFocused();
    await scan(page, info, `team-${state}`);
  }
});
test("320px e texto200% preservam controles, foco e rolagem interna", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const stats = await statisticsBrowserFixture(page);
  await page.goto(stats.url);
  const sort = page.getByRole("button", {
    name: "Ordenar por PTS (Pontos)",
    exact: true,
  });
  await expect(sort).toBeVisible();
  const font = await sort.evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize),
  );
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(
    await sort.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(font * 2);
  const searchAction = page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .first();
  expect(
    await searchAction.evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await sort.focus();
  await expect(sort).toBeFocused();
  await scan(page, info, "statistics-320-text200");
  const team = await teamPublicFixture(page, { longDetail: true });
  await page.goto(team.detailUrl + "&section=jogos");
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toBeVisible();
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const region = page.getByRole("region", {
    name: "Tabela de jogos da inscrição",
    exact: true,
  });
  await region.focus();
  await expect(region).toBeFocused();
  const before = await region.evaluate((el) => el.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(before);
  const link = region.getByRole("link").first();
  await link.focus();
  await expect(link).toBeFocused();
  await scan(page, info, "team-games-320-text200");
  await page.screenshot({
    path: `.preview-artifacts/a11y-team-focus-320-${info.project.name}.png`,
  });
});
