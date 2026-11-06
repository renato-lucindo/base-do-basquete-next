import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";

test("admin conserva leitura, reflow e foco nas abas sem título repetido", async ({
  page,
}) => {
  await gamesFixture(page);
  for (const width of [1920, 1366, 390, 320]) {
    await page.setViewportSize({ width, height: width > 639 ? 1080 : 844 });
    await page.goto(
      `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
    );
    const title = page.getByRole("heading", {
      name: "Equipes e elencos",
      exact: true,
    });
    await expect(title).toHaveClass(/sr-only/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/readability-admin-${width}-${test.info().project.name}.png`,
    });
  }
});

test("filtro apresenta somente a inscrição e preserva a pesquisa pelo nome global", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  const teamId = f.source.games[0].snapshot.game.home.team.id;
  for (const { snapshot } of f.source.games)
    for (const side of ["home", "away"] as const) {
      if (snapshot.game[side].team.id === teamId) {
        snapshot.game[side].name = "LUSB";
        snapshot.game[side].team.name = "Liga Urbana Social de Basquete";
      }
    }
  await page.goto(f.url);
  await page.getByRole("button", { name: /Equipe Todas as equipes/ }).click();
  await expect(
    page.getByRole("checkbox", { name: "LUSB", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Liga Urbana/ })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  const search = page.getByRole("searchbox", {
    name: "Buscar atleta ou equipe",
  });
  await search.fill("Liga Urbana");
  await search.press("Enter");
  await expect(
    page.locator(".statistics-table tbody tr").first(),
  ).toBeVisible();
});

test("menu de colunas permanece dentro da tela quando a tabela encolhe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  await page.getByRole("button", { name: /^Colunas ·/ }).click();
  for (const key of ["pointsPerGame", "pointsShare", "twoMade"]) {
    await page.locator(`input[data-column-choice="${key}"]`).uncheck();
    const bounds = await page.locator("#column-picker-panel").boundingBox();
    expect(bounds!.x, JSON.stringify(bounds)).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1366);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768);
  }
});

test("escala compartilhada amplia desktop e conserva celular", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  await page.setViewportSize(
    mobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
  );
  const fixture = await statisticsBrowserFixture(page);
  await page.goto(fixture.url);
  await expect(
    page.locator(".statistics-table tbody tr").first(),
  ).toBeVisible();
  const root = await page
    .locator("html")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(root).toBe(mobile ? 16 : 24);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.locator(".statistics-table tbody .statistics-player").first(),
  ).toHaveCSS("position", "sticky");
  await page.screenshot({
    path: `.preview-artifacts/readability-players-${info.project.name}.png`,
  });
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("colunas usam os mesmos nomes curtos da legenda", async ({ page }) => {
  const fixture = await statisticsBrowserFixture(page);
  await page.goto(fixture.url);
  await page.getByRole("button", { name: /^Colunas ·/ }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "PP% · Participação nos Pontos",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: "5F · Exclusões por cinco faltas",
      exact: true,
    }),
  ).toBeVisible();
});

test("abas públicas conservam título sem repetir cabeçalho visível", async ({
  page,
}) => {
  await page.route("**/api/public/**", (route) =>
    route.fulfill({ status: 404, json: { error: { message: "Sem dados" } } }),
  );
  const id = "f9300000-0000-4000-8000-000000000001";
  for (const section of ["classificacao", "jogos"]) {
    await page.goto(
      `http://127.0.0.1:5174/publico.html#${id}?secao=${section}`,
    );
    const title = page.locator("main h1");
    await expect(title).toHaveClass(/sr-only/);
    await expect(title).toHaveCount(1);
  }
  await page.goto(`http://127.0.0.1:5174/equipes.html#${id}`);
  await expect(page.locator("main h1")).toHaveClass(/sr-only/);
});
