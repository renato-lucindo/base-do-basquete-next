import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";

for (const width of [1366, 1920]) {
  test(`súmula desktop: bloco ajustado e centralizado em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    const f = await statisticsBrowserFixture(page);
    await page.goto(f.url);
    await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
    await expect(page.getByRole("status")).toContainText("Página 1 de 2");
    const geometry = await page
      .locator(".statistics-table-wrap")
      .evaluate((el) => {
        const table = el.querySelector("table")!;
        const r = el.getBoundingClientRect();
        const bounds = el.closest(".statistics")!.getBoundingClientRect();
        return {
          spare: el.clientWidth - table.getBoundingClientRect().width,
          center: Math.abs(
            (r.left + r.right) / 2 - (bounds.left + bounds.right) / 2,
          ),
          width: r.width,
          toolbar: document
            .querySelector(".table-toolbar")!
            .getBoundingClientRect().width,
          legend: document
            .querySelector(".table-legend")!
            .getBoundingClientRect().width,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
    expect(Math.abs(geometry.spare)).toBeLessThanOrEqual(2);
    expect(geometry.center).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.width - geometry.toolbar)).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.width - geometry.legend)).toBeLessThanOrEqual(2);
    expect(geometry.overflow).toBe(false);
    await page.screenshot({
      path: `.preview-artifacts/desktop-centered-${width}-${test.info().project.name}.png`,
      fullPage: true,
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("súmula desktop: colunas reduzidas, paginação e estados vazios não alargam o bloco", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const f = await statisticsBrowserFixture(page);
  await page.goto(f.url);
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
  const block = page.locator(".statistics-results-block");
  const full = (await block.boundingBox())!.width;
  await page.getByRole("button", { name: /^Colunas ·/ }).click();
  for (const key of [
    "pointsPerGame",
    "pointsShare",
    "twoMade",
    "threeMade",
    "freeMade",
    "foulsCommitted",
    "technicalFouls",
    "unsportsmanlikeFouls",
    "fiveFouls",
    "disqualifications",
  ])
    await page.locator(`input[data-column-choice="${key}"]`).uncheck();
  await expect(page.locator(".statistics-table thead th")).toHaveCount(5);
  // Safari does not focus checkboxes on mouse click; exercise Escape from the control.
  await page
    .locator('input[data-column-choice="disqualifications"]')
    .press("Escape");
  await expect(page.getByRole("button", { name: /^Colunas ·/ })).toBeFocused();
  await expect
    .poll(async () => (await block.boundingBox())!.width)
    .toBeLessThan(full - 100);
  expect(
    await page
      .locator(".scrollable-table-top")
      .evaluate((el) => getComputedStyle(el).visibility),
  ).toBe("hidden");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/desktop-centered-reduced-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Próxima página", exact: true })
    .click();
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(3);
  await page
    .getByRole("searchbox", { name: "Buscar atleta ou equipe" })
    .fill("sem-correspondencia");
  await expect(
    page.getByText("Nenhuma participação atende à consulta.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .first()
    .click();
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
  await page.getByRole("button", { name: /^Colunas ·/ }).click();
  await page.getByRole("button", { name: "Nenhuma", exact: true }).click();
  await expect(page.locator(".statistics-table thead th")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Nenhuma", exact: true })
    .press("Escape");
  const controls = await page
    .locator(".table-toolbar")
    .evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  expect(controls.scroll).toBeLessThanOrEqual(controls.width + 1);
});

test("súmula desktop: limite de 1050px, conteúdo largo e zoom preservam rolagem", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  for (const width of [1050, 1051]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(f.url);
    await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
    const result = await page
      .locator(".statistics-results-block")
      .evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        available: el.parentElement!.getBoundingClientRect().width,
        center: Math.abs(
          el.getBoundingClientRect().left +
            el.getBoundingClientRect().right -
            el.parentElement!.getBoundingClientRect().left -
            el.parentElement!.getBoundingClientRect().right,
        ),
      }));
    if (width === 1050)
      expect(Math.abs(result.width - result.available)).toBeLessThanOrEqual(1);
    else expect(result.center).toBeLessThanOrEqual(2);
  }
  await page.addStyleTag({ content: "html {font-size:200%}" });
  const region = page.locator(".statistics-table-wrap");
  await expect
    .poll(() => region.evaluate((el) => el.scrollWidth - el.clientWidth))
    .toBeGreaterThan(0);
  await region.evaluate((el) => el.scrollTo(el.scrollWidth, el.scrollHeight));
  await expect
    .poll(() =>
      page.locator(".scrollable-table-top").evaluate((el) => el.scrollLeft),
    )
    .toBeGreaterThan(0);
  const position = await region.evaluate((el) => ({
    pos: el.querySelector("thead .statistics-position")!.getBoundingClientRect()
      .top,
    athlete: el
      .querySelector("thead .statistics-player")!
      .getBoundingClientRect().top,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  expect(Math.abs(position.pos - position.athlete)).toBeLessThanOrEqual(1);
  expect(position.overflow).toBe(false);
  await page.screenshot({
    path: `.preview-artifacts/desktop-centered-zoom200-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("boxscore conserva a largura anterior no desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const f = await statisticsBrowserFixture(page, { withBoxscore: true });
  await page.goto(f.url);
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
  await expect(page.locator(".statistics-results-block")).not.toHaveAttribute(
    "data-compact-desktop",
  );
  expect(
    await page
      .locator(".statistics-results-block")
      .evaluate((el) =>
        Math.abs(
          el.getBoundingClientRect().width -
            el.parentElement!.getBoundingClientRect().width,
        ),
      ),
  ).toBeLessThanOrEqual(1);
  await expect(
    page.getByText("Mais filtros e opções", { exact: true }),
  ).toBeVisible();
});
