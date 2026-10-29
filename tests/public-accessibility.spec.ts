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
    const visible = (await button.innerText()).trim();
    const escaped = visible.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    await expect(button).toHaveAccessibleName(new RegExp(escaped, "u"));
  }
  await scan(page, info, "statistics");
  const columns = page
    .locator(".statistics-quickbar .statistics-popover > summary")
    .filter({ hasText: /^Colunas$/u });
  await expect(columns).toBeVisible();
  await columns.click();
  await expect(
    page.getByRole("group", { name: "Colunas visíveis" }),
  ).toBeVisible();
  await scan(page, info, "statistics-columns");
});
test("axe: cinco seções do perfil preservam semântica e navegação de teclado", async ({
  page,
}, info) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url);
  await expect(
    page.getByRole("heading", { name: "Ana Pública", exact: true }),
  ).toBeVisible();
  await scan(page, info, "player-summary");
  for (const [section, state] of [
    ["Estatísticas", "statistics"],
    ["Conquistas e honrarias", "honors"],
    ["Jogos", "games"],
    ["Histórico", "history"],
  ]) {
    const link = page
      .getByRole("navigation", { name: "Seções do perfil" })
      .getByRole("link", { name: section, exact: true });
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: section, exact: true }),
    ).toBeFocused();
    if (section === "Jogos" || section === "Histórico") {
      const label =
        section === "Jogos" ? "Paginação de jogos" : "Paginação de inscrições";
      expect(
        await page
          .getByRole("navigation", { name: label, exact: true })
          .count(),
      ).toBe(1);
    }
    await scan(page, info, `player-${state}`);
  }
});
test("axe: lista de equipes longa e escolha explícita da inscrição", async ({
  page,
}, info) => {
  const f = await teamPublicFixture(page, { longList: true });
  await page.goto(f.listUrl);
  await expect(
    page.getByRole("table", {
      name: "Equipes com resultados confirmados",
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
    const link = page.getByRole("link", { name: section, exact: true });
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
