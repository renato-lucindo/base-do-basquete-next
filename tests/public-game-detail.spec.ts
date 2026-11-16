import { expect, test } from "@playwright/test";
import { publicGameDetailFixture } from "./fixtures/public-game-detail";
import AxeBuilder from "@axe-core/playwright";
import {
  gameRows,
  gameLeaders,
  scoringKeys,
} from "../src/publication/game-view";

test("partida aceita: 12 linhas, 00 ao final, parciais sem faltas e legenda compartilhada", async ({
  page,
}) => {
  const result = publicGameDetailFixture();
  await page.route("**/api/public/games/" + result.id, (r) =>
    r.fulfill({ json: result }),
  );
  await page.goto("http://127.0.0.1:5174/resultado.html#" + result.id);
  for (const side of ["home", "away"]) {
    const body = page.locator(`[data-team="${side}"] tbody`);
    await expect(body.locator("tr")).toHaveCount(12);
    await expect(
      body.locator("tr[data-jersey]").last().locator(".jersey-cell"),
    ).toHaveText("00");
  }
  await expect(page.locator(".period-fouls")).toHaveCount(0);
  await expect(
    page
      .locator(".legend dt")
      .filter({ hasText: /^(Negrito|Parciais|0|2P \/ 3P)$/u }),
  ).toHaveCount(0);
  await expect(
    page.locator(".legend dt").filter({ hasText: /^2P$/u }),
  ).toHaveCount(1);
  await expect(
    page.locator(".legend dt").filter({ hasText: /^3P$/u }),
  ).toHaveCount(1);
  await expect(page.locator('[data-team="home"] .filler')).toHaveCount(2);
});

test("máximos e totais permanecem coerentes em todos os períodos", async ({
  page,
}) => {
  const r = publicGameDetailFixture();
  await page.route("**/api/public/games/" + r.id, (route) =>
    route.fulfill({ json: r }),
  );
  await page.goto("http://127.0.0.1:5174/resultado.html#" + r.id);
  for (const period of ["all", 1, 2, 3, 4, 5] as const) {
    await page
      .locator(".period-filter button")
      .nth(period === "all" ? 0 : period)
      .click();
    for (const side of ["home", "away"] as const) {
      const rows = gameRows(r, side, period),
        leaders = gameLeaders(rows);
      for (const key of scoringKeys) {
        const expected = rows
          .filter(
            (p) =>
              p.played === true &&
              p[key] !== null &&
              p[key]! > 0 &&
              p[key] === leaders[key],
          )
          .map((p) => p.jersey);
        expect(
          await page
            .locator(`[data-team="${side}"] [data-stat="${key}"] .stat-leader`)
            .evaluateAll((els) =>
              els.map((e) => e.closest("tr")!.getAttribute("data-jersey")),
            ),
        ).toEqual(expected);
      }
      const points =
        period === "all"
          ? r.facts.teams[side].points
          : r.details.periods[period - 1].teams[side].points;
      await expect(
        page.locator(`[data-team="${side}"] tfoot .points-cell`),
      ).toHaveText(String(points));
    }
  }
});

for (const width of [1366, 1920, 320, 390])
  test(`${width}px: alinhamento, DNP, rolagem, tooltip e acessibilidade`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width >= 1366 ? 900 : 844 });
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    const r = publicGameDetailFixture();
    await page.route("**/api/public/games/" + r.id, (route) =>
      route.fulfill({ json: r }),
    );
    await page.goto("http://127.0.0.1:5174/resultado.html#" + r.id);
    await expect(page.locator(".roster-table")).toHaveCount(2);
    const dimensions = await page.evaluate(() => {
      const tables = [
        ...document.querySelectorAll<HTMLTableElement>(".roster-table"),
      ];
      const heights = tables.map((t) =>
        [...t.tBodies[0].rows].map((r) => r.getBoundingClientRect().height),
      );
      const widths = tables.map((t) =>
        [...t.tHead!.rows[0].cells].map((c) => c.getBoundingClientRect().width),
      );
      const dnp = tables.every((t) => {
        const a = t.querySelector('tr[data-played="true"]')!,
          b = t.querySelector('tr[data-played="false"]')!;
        return [".athlete-cell", ".points-cell", '[data-stat="two"]'].every(
          (s) => {
            const x = getComputedStyle(a.querySelector(s)!),
              y = getComputedStyle(b.querySelector(s)!);
            return (
              x.color === y.color && x.backgroundColor === y.backgroundColor
            );
          },
        );
      });
      const centeredFoulDash = tables.every((t) => {
        const cell = t.querySelector('tr[data-played="false"] .foul-cell')!;
        const dash = cell.querySelector("span")!.getBoundingClientRect();
        const bounds = cell.getBoundingClientRect();
        return (
          Math.abs(dash.x + dash.width / 2 - bounds.x - bounds.width / 2) < 1
        );
      });
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        heights,
        widths,
        dnp,
        centeredFoulDash,
        filler: [...tables[0].querySelectorAll(".filler")].every(
          (r) => !r.textContent && !r.querySelector("a,button"),
        ),
      };
    });
    expect(dimensions.overflow).toBe(false);
    expect(dimensions.heights[0]).toEqual(dimensions.heights[1]);
    expect(dimensions.widths[0]).toEqual(dimensions.widths[1]);
    expect(
      dimensions.dnp && dimensions.filler && dimensions.centeredFoulDash,
    ).toBe(true);
    const scroll = page.locator('[data-team="away"] .table-scroll');
    await scroll.evaluate((e) => (e.scrollLeft = 9999));
    const gd = page.locator(
      '[data-team="away"] tr[data-jersey="3"] .foul-button',
    );
    await gd.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`partida-${width}-modal.png`),
    });
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(gd).toBeFocused();
    await page
      .locator('[data-team="home"] .table-scroll')
      .evaluate((e) => (e.scrollLeft = 9999));
    const header = page.locator('[data-team="home"] .game-header-tip').last();
    if (info.project.name === "mobile") await header.tap();
    else await header.focus();
    await expect(page.locator(".game-tooltip:popover-open")).toHaveText(
      "Faltas cometidas",
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath(`partida-${width}.png`),
      fullPage: true,
    });
    expect(pageErrors).toEqual([]);
  });
test("recortes atualizam máximos, faltas e GD sem antecipar cronologia", async ({
  page,
}) => {
  const result = publicGameDetailFixture();
  await page.route("**/api/public/games/" + result.id, (r) =>
    r.fulfill({ json: result }),
  );
  await page.goto("http://127.0.0.1:5174/resultado.html#" + result.id);
  await page
    .locator(".period-filter button")
    .filter({ hasText: "3º Q" })
    .click();
  await expect(
    page.locator('[data-team="away"] tr[data-jersey="2"] .foul-cell button'),
  ).not.toContainText("GD");
  await page
    .locator(".period-filter button")
    .filter({ hasText: "4º Q" })
    .click();
  await expect(
    page.locator('[data-team="home"] tr[data-jersey="2"] .foul-cell button'),
  ).toHaveText("2");
  await expect(
    page.locator('[data-team="away"] tr[data-jersey="2"] .foul-cell button'),
  ).toHaveText("1 GD");
  await page
    .locator(".period-filter button")
    .filter({ hasText: "Jogo todo" })
    .click();
  const gd = page.locator(
    '[data-team="away"] tr[data-jersey="3"] .foul-cell button',
  );
  await expect(gd).toHaveText("5 GD");
  await gd.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Desqualificado");
  await page.keyboard.press("Escape");
  await expect(gd).toBeFocused();
  await expect(page.locator(".points-cell .stat-leader")).not.toHaveCount(0);
});
