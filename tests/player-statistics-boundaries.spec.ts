import { expect, test } from "@playwright/test";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";

for (const width of [320, 390]) {
  test(`bordas nativas, alinhamento e duas barras em ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    const f = await statisticsBrowserFixture(page);
    await page.goto(f.url);
    await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
    const region = page.getByRole("region", {
      name: "Tabela estatística rolável",
    });
    const top = page.locator(".scrollable-table-top");
    await region.scrollIntoViewIfNeeded();
    const dimensions = await region.evaluate((el) => ({
      x: el.scrollWidth - el.clientWidth,
      y: el.scrollHeight - el.clientHeight,
      height: el.clientHeight,
    }));
    expect(dimensions.x).toBeGreaterThan(60);
    expect(dimensions.y).toBeGreaterThan(100);
    expect(dimensions.height).toBeLessThanOrEqual(844 * 0.7);
    await region.evaluate((el) => el.scrollTo(60, 100));
    await expect
      .poll(() => top.evaluate((el) => el.scrollLeft))
      .toBeCloseTo(60, 0);
    await top.evaluate((el) => el.scrollTo(30, 0));
    await expect
      .poll(() => region.evaluate((el) => el.scrollLeft))
      .toBeCloseTo(30, 0);
    for (const [x, y, dx, dy] of [
      [0, 0, -1200, -1200],
      [dimensions.x, 0, 1200, -1200],
      [dimensions.x, dimensions.y, 1200, 1200],
      [0, dimensions.y, -1200, 1200],
    ]) {
      await region.evaluate((el, p) => el.scrollTo(p.x, p.y), { x, y });
      const box = (await region.boundingBox())!;
      await page.mouse.move(box.x + box.width - 35, box.y + box.height / 2);
      await page.mouse.wheel(dx, dy);
      await expect
        .poll(() =>
          region.evaluate((el) => ({ x: el.scrollLeft, y: el.scrollTop })),
        )
        .toEqual({ x, y });
      await expect
        .poll(() => top.evaluate((el) => el.scrollLeft))
        .toBeCloseTo(x, 0);
      const geometry = await region.evaluate((el) => {
        const header = el.querySelector<HTMLElement>(
          "thead .statistics-player",
        )!;
        const row = [...el.querySelectorAll("tbody .statistics-player")].find(
          (c) => {
            const r = c.getBoundingClientRect();
            return (
              r.top >= el.getBoundingClientRect().top + 40 &&
              r.bottom < el.getBoundingClientRect().bottom
            );
          },
        )!;
        return {
          positionTop: el
            .querySelector("thead .statistics-position")!
            .getBoundingClientRect().top,
          headerLeft: header.getBoundingClientRect().left,
          rowLeft: row.getBoundingClientRect().left,
          headerTop: header.getBoundingClientRect().top,
          viewportTop: el.getBoundingClientRect().top,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(
        Math.abs(geometry.headerLeft - geometry.rowLeft),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(geometry.headerTop - geometry.viewportTop),
      ).toBeLessThanOrEqual(2);
      expect(geometry.overflow).toBe(false);
      expect(
        Math.abs(geometry.positionTop - geometry.viewportTop),
      ).toBeLessThanOrEqual(2);
    }
    await page.screenshot({
      path: `.preview-artifacts/bordas-${width}-${info.project.name}.png`,
    });
    await region.focus();
    await page.keyboard.press("Home");
    await expect(region).toBeFocused();
  });
}

test("a barra superior alcança a última coluna e acompanha redução de colunas", async ({
  page,
}) => {
  const f = await statisticsBrowserFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(f.url);
  await expect(page.locator(".statistics-table tbody tr")).toHaveCount(30);
  const region = page.locator(".statistics-table-wrap");
  const top = page.locator(".scrollable-table-top");
  await top.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await expect
    .poll(() =>
      region.evaluate((el) =>
        Math.abs(el.scrollLeft - (el.scrollWidth - el.clientWidth)),
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: /^Colunas ·/ }).click();
  const options = page.locator("input[data-column-choice]");
  const optionCount = await options.count();
  await expect(
    page.locator('input[data-column-choice="team"]'),
  ).not.toBeChecked();
  await expect(page.locator("input[data-column-choice]:checked")).toHaveCount(
    optionCount - 1,
  );
  // All metrics start selected on mobile. Remove all to verify scroll clamping.
  await page.getByRole("button", { name: "Nenhuma" }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBe(0);
  await expect.poll(() => top.evaluate((el) => el.scrollLeft)).toBe(0);
  await expect(page.locator(".scrollable-table")).not.toHaveAttribute(
    "data-shadow-right",
    "true",
  );
});
