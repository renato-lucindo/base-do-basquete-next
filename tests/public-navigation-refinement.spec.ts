import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { teamProfileBrowserFixture } from "./fixtures/team-profile";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import { publicRegulationFixture } from "./fixtures/public-regulation";
import { buildPublicStandings } from "../src/regulation/public";

const origin = "http://127.0.0.1:5174";

for (const width of [320, 375, 390, 430, 639, 640, 768, 1366, 1920]) {
  test(`refinamento público: contexto, classificação e rodapé em ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const f = await teamProfileBrowserFixture(page);
    await page.goto(`${origin}/publico.html#${f.source.disputeId}`);
    const table = page.locator(".standings-explorer table");
    await expect(table).toBeVisible();
    const context = page.locator(".public-dispute-breadcrumb li");
    await expect(context.first()).toHaveText(
      String(f.source.games[0].snapshot.context.year),
    );
    if (width >= 768) {
      const baselines = await context.evaluateAll((items) =>
        items.map((item) => {
          const range = document.createRange();
          range.selectNodeContents(item.querySelector("button, span")!);
          return range.getBoundingClientRect().bottom;
        }),
      );
      expect(Math.max(...baselines) - Math.min(...baselines)).toBeLessThan(2);
    }
    const search = page.getByRole("combobox", { name: /Buscar competições/ });
    const submit = page.getByRole("button", {
      name: "Buscar na base",
      exact: true,
    });
    if (width < 640) {
      await expect(submit).toBeHidden();
      await expect(search).toHaveAttribute("placeholder", "Buscar na base");
    } else await expect(submit).toBeVisible();
    const block = page.locator(".standings-explorer");
    const legend = block.getByRole("region", {
      name: "Legenda da classificação",
    });
    await expect(legend).toBeVisible();
    const geometry = await block.evaluate((el) => {
      const area = el.getBoundingClientRect();
      const table = el.querySelector("table")!.getBoundingClientRect();
      const legend = el.querySelector(".table-legend")!.getBoundingClientRect();
      const region = el
        .querySelector(".statistics-table-wrap")!
        .getBoundingClientRect();
      const parent = el.closest("main")!.getBoundingClientRect();
      return {
        area: { x: area.x, width: area.width },
        table: { y: table.bottom, width: table.width },
        legend: { x: legend.x, y: legend.y, width: legend.width },
        region: region.width,
        center: Math.abs(area.x + area.width / 2 - parent.x - parent.width / 2),
      };
    });
    expect(geometry.center).toBeLessThan(2);
    expect(Math.abs(geometry.legend.x - geometry.area.x)).toBeLessThan(2);
    expect(Math.abs(geometry.legend.width - geometry.region)).toBeLessThan(2);
    expect(geometry.area.width).toBeLessThanOrEqual(geometry.table.width + 2);
    const cells = await table.evaluate((el) =>
      [...el.querySelector("tbody tr")!.children].map((cell, index) => {
        const header = el.querySelectorAll("thead th")[index];
        const c = cell.getBoundingClientRect(),
          h = header.getBoundingClientRect();
        return {
          index,
          align: getComputedStyle(cell).textAlign,
          weight: getComputedStyle(cell).fontWeight,
          delta: Math.max(
            Math.abs(c.left - h.left),
            Math.abs(c.right - h.right),
          ),
        };
      }),
    );
    for (const cell of cells) {
      expect(cell.delta).toBeLessThan(1);
      if (cell.index < 11)
        expect(cell.align).toBe(cell.index === 1 ? "left" : "center");
    }
    expect(Number(cells[1].weight)).toBeGreaterThanOrEqual(600);
    expect(Number(cells[2].weight)).toBeGreaterThanOrEqual(700);
    const criteria = block.locator("details");
    if (await criteria.count()) {
      expect(
        await criteria.evaluate(
          (el) =>
            !!(
              el.compareDocumentPosition(el.nextElementSibling!) &
              Node.DOCUMENT_POSITION_FOLLOWING
            ),
        ),
      ).toBe(true);
      await criteria.locator("summary").click();
      await expect(criteria).toHaveAttribute("open", "");
    }
    const levels = page.locator(".public-dispute-breadcrumb button");
    const before = await page.locator("main").boundingBox();
    await levels.first().click();
    await expect(page.locator(".public-selector-panel")).toBeVisible();
    expect((await page.locator("main").boundingBox())!.y).toBe(before!.y);
    await page.keyboard.press("Escape");
    await expect(levels.first()).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const footer = await page.locator(".public-footer").boundingBox();
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(footer!.y + footer!.height).toBeGreaterThanOrEqual(1000 - 1);
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(height + 1);
    if ([390, 1366].includes(width)) {
      await page.screenshot({
        path: `.preview-artifacts/pr89-refinamento-${info.project.name}-${width}.png`,
        fullPage: true,
      });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page.goto(f.url);
    const profileBlock = page.locator(".standings-explorer");
    await expect(profileBlock).toBeVisible();
    expect(
      await profileBlock.evaluate((el) =>
        Math.abs(
          el.getBoundingClientRect().left -
            el.parentElement!.getBoundingClientRect().left,
        ),
      ),
    ).toBeLessThan(2);
    await expect(page.locator(".public-return a")).toHaveCount(1);
    await expect(page.locator(".public-return")).not.toContainText("Lobos");
  });
}

test("refinamento público: retorno de jogadores conserva filtros e histórico", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table).toBeVisible();
  const from = page.url();
  await table.locator('a[href^="/atleta.html"]').first().click();
  await expect(page.locator(".public-return a")).toHaveCount(1);
  await page
    .getByRole("link", { name: "← Voltar aos jogadores", exact: true })
    .click();
  expect(page.url()).toBe(from);
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "← Voltar aos jogadores", exact: true }),
  ).toBeVisible();
});

test("refinamento público: sugestão fora da busca preserva termo e Enter sem seleção pesquisa uma vez", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  await page.goto(f.url);
  const search = page.getByRole("combobox", { name: /Buscar competições/ });
  const name = f.source.games[0].snapshot.facts.players[0].person.name;
  await search.fill(name);
  await page
    .locator(".public-search-types")
    .getByRole("button", { name: "Jogadores", exact: true })
    .click();
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible();
  await search.press("ArrowDown");
  const href = await option.getAttribute("href");
  await search.press("Enter");
  await expect(page).toHaveURL(origin + href);
  await page
    .getByRole("link", { name: "← Voltar à busca", exact: true })
    .click();
  await expect(search).toHaveValue(name);
  await expect(page).toHaveURL(/type=players/);
  await search.fill("Lobos");
  let submits = 0;
  await page.exposeFunction("recordSubmit", () => {
    submits++;
  });
  await search.evaluate((el) =>
    el.closest("form")!.addEventListener("submit", () => {
      void (window as unknown as { recordSubmit: () => void }).recordSubmit();
    }),
  );
  await search.press("Enter");
  await expect(page).toHaveURL(/#\?q=Lobos&type=players$/);
  expect(submits).toBe(1);
});

test("refinamento público: critérios precedem legenda, nomes longos, vazio e zoom200%", async ({
  page,
}) => {
  await publicNavigationFixture(page);
  const source = publicRegulationFixture();
  source.context.name =
    "Campeonato com nome longo para conferir quebra em telas pequenas";
  source.registrations[0].name =
    "Equipe com identificação extensa e nome completo preservado";
  const value = buildPublicStandings(source);
  const standings = value.projection.groupPhases[0].groups[0].standings;
  standings.tieSteps.push({
    criterion: "wins",
    registrationIds: source.registrations.map((r) => r.id),
    gameCount: 1,
    blocked: false,
    values: source.registrations.map((r) => ({
      registrationId: r.id,
      value: 1,
    })),
  });
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: value }),
  );
  await page.setViewportSize({ width: 683, height: 384 });
  await page.goto(`${origin}/publico.html#${source.disputeId}`);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const block = page.locator(".standings-explorer");
  const criteria = block.locator("details");
  await expect(criteria).toBeVisible();
  await expect(block.locator(":scope > :last-child")).toHaveClass(
    /table-legend/,
  );
  const before = await criteria.boundingBox();
  const legend = await block.locator(".table-legend").boundingBox();
  const region = await block.locator(".statistics-table-wrap").boundingBox();
  expect(Math.abs(before!.x - region!.x)).toBeLessThan(2);
  expect(Math.abs(before!.width - region!.width)).toBeLessThan(2);
  expect(before!.y - region!.y - region!.height).toBeLessThanOrEqual(9);
  expect(legend!.y).toBeGreaterThanOrEqual(before!.y + before!.height);
  await criteria.locator("summary").click();
  await expect(criteria.locator("ol")).toContainText("Vitórias");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const bottom = await page.locator("main").boundingBox();
  const footer = await page.locator("footer").boundingBox();
  expect(footer!.y).toBeGreaterThanOrEqual(bottom!.y + bottom!.height - 1);
  await page.screenshot({
    path: ".preview-artifacts/pr89-refinamento-zoom.png",
    fullPage: true,
  });
  source.publishedGames = [];
  await page.unroute("**/api/public/standings/**");
  await page.route("**/api/public/standings/**", (r) =>
    r.fulfill({ json: buildPublicStandings(source) }),
  );
  await page.reload();
  await expect(page.getByText(/Sem resultados aplicados/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Legenda da classificação" }),
  ).toBeVisible();
});

test("refinamento público: acesso direto tem destino e toque abre sugestão", async ({
  page,
}, info) => {
  const f = await publicNavigationFixture(page);
  await page.goto(f.url);
  await page
    .getByRole("table", { name: "Estatísticas dos atletas", exact: true })
    .locator('a[href^="/atleta.html"]')
    .first()
    .click();
  const direct = new URL(page.url());
  direct.search = "";
  await page.goto(direct.href);
  await expect(
    page.getByRole("link", { name: "← Voltar aos jogadores", exact: true }),
  ).toHaveAttribute(
    "href",
    `/estatisticas.html#${f.source.disputeId}?scope=all`,
  );
  const search = page.getByRole("combobox", { name: /Buscar competições/ });
  await search.fill(f.source.games[0].snapshot.facts.players[0].person.name);
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible();
  const href = await option.getAttribute("href");
  if (info.project.use.hasTouch) await option.tap();
  else await option.click();
  await expect(page).toHaveURL(origin + href);
  await expect(
    page.getByRole("link", { name: "← Voltar à busca", exact: true }),
  ).toBeVisible();
});
