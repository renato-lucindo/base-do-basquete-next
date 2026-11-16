import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { playerPublicFixture } from "./fixtures/player-public-browser";
import { pubId } from "./fixtures/publication";
import { statisticsBrowserFixture } from "./fixtures/statistics-browser";
import { teamPublicFixture } from "./fixtures/team-public-browser";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import {
  publicSearchFixture,
  searchFixtureHits,
} from "./fixtures/public-search";

test("refinamento: capturas das quatro abas e reflow", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Matriz explícita de larguras");
  const f = await playerPublicFixture(page);
  for (const width of [320, 390, 640, 1366, 1920]) {
    await page.setViewportSize({ width, height: width >= 1366 ? 1080 : 900 });
    await page.goto(f.url);
    await expect(page.locator(".player-identity h1")).toHaveText("AP");
    for (const name of [
      "Visão geral",
      "Estatísticas",
      "Carreira",
      "Ver jogos",
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(page.getByRole("tabpanel")).toBeVisible();
      await expect(page.locator(".player-legend")).toHaveCount(1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await page.screenshot({
        path: `.preview-artifacts/refinement/${process.env.REFINE_PHASE ?? "after"}-${width}-${name}.png`,
        fullPage: true,
      });
      if (!process.env.REFINE_PHASE && [390, 1366].includes(width))
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
    }
  }
});

test("refinamento: somente atuações confirmadas, incluindo zero, e trajetória permanente", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  const played = f.source.participations.filter((g) => g.fact.played);
  const absent = structuredClone(played[0]);
  absent.fact.gameId = pubId(190001);
  absent.fact.disputeId = pubId(190002);
  absent.fact.registration.registrationId = pubId(190004);
  absent.game[absent.fact.side] = structuredClone(absent.fact.registration);
  absent.fact.context.year = 2030;
  absent.fact.context.championshipId = pubId(190003);
  absent.fact.context.name = "Apenas inscrita";
  Object.assign(absent.fact, {
    played: false,
    starter: false,
    captain: false,
    scoring: null,
    advanced: null,
    foulsCommitted: null,
    foulsReceived: null,
    discipline: null,
  });
  f.source.participations.push(absent);
  played[0].fact.scoring = {
    ...played[0].fact.scoring!,
    points: 0,
    twoMade: 0,
    threeMade: 0,
    freeMade: 0,
  };
  await page.goto(f.url + "?secao=jogos");
  await expect(page.locator(".player-games-page tbody tr")).toHaveCount(
    played.length,
  );
  await expect(page.locator(".player-games-count")).toHaveText(
    `${played.length} jogos encontrados`,
  );
  await expect(
    page
      .getByRole("tabpanel")
      .locator(`tr[data-game="${played[0].fact.gameId}"] .player-game-points`),
  ).toHaveText("0");
  await page
    .getByRole("button", { name: "Filtrar e ajustar", exact: true })
    .click();
  await expect(
    page.locator('select[name="gameYear"] option[value="2030"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('select[name="gameChampionship"] option', {
      hasText: "Apenas inscrita",
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("tab", { name: "Carreira", exact: true }).click();
  await expect(page.locator(".player-trajectory")).toBeVisible();
  await expect(page.locator(".player-team-history summary")).toHaveCount(0);
});

test("refinamento: limpar colunas restaura FC e reabrir mantém seleção e legenda", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?secao=estatisticas&colunasPerfil=points");
  await page
    .getByRole("button", { name: "Filtrar e ajustar", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "FC · Faltas cometidas", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "FC · Faltas cometidas", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.locator(".player-legend dt").last()).toHaveText("FC");
  await page.reload();
  await expect(page.locator(".player-legend dt").last()).toHaveText("FC");
});

for (const width of [390, 640, 1366, 1920]) {
  test(`refinamento: abas preservam scroll e altura mínima em ${width}px`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Matriz explícita");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const f = await playerPublicFixture(page);
    await page.setViewportSize({ width, height: 1080 });
    await page.goto(f.url);
    await expect(page.locator(".player-identity h1")).toHaveText("AP");
    const geometry = [];
    for (const name of [
      "Visão geral",
      "Estatísticas",
      "Carreira",
      "Ver jogos",
    ]) {
      // Keep the sticky tabs on screen. Keyboard activation must not reposition the page.
      await page
        .getByRole("tab", { name, exact: true })
        .evaluate((el) => (el as HTMLElement).focus({ preventScroll: true }));
      const previous = await page.evaluate(() => window.scrollY);
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("tab", { name, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      expect(await page.evaluate(() => window.scrollY)).toBe(previous);
      geometry.push(
        await page.getByRole("tabpanel").evaluate((el) => ({
          height: el.getBoundingClientRect().height,
          minimum: parseFloat(getComputedStyle(el).minHeight),
          overflow: getComputedStyle(el).overflowY,
          footer:
            document.querySelector(".public-footer")!.getBoundingClientRect()
              .top + scrollY,
        })),
      );
    }
    expect(errors).toEqual([]);
    if (width < 640) expect(geometry.every((g) => g.minimum === 0)).toBe(true);
    else {
      expect(
        geometry.every(
          (g) =>
            g.minimum > 0 &&
            g.height + 1 >= g.minimum &&
            g.overflow === "visible",
        ),
        JSON.stringify(geometry),
      ).toBe(true);
      if (width >= 1366)
        expect(
          Math.max(...geometry.map((g) => g.footer)) -
            Math.min(...geometry.map((g) => g.footer)),
          JSON.stringify(geometry),
        ).toBeLessThan(2);
    }
  });
}

test("refinamento: entrada direta em Estatísticas mantém rodapé ao abrir Visão geral", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "Verificação desktop de entrada direta",
  );
  const f = await playerPublicFixture(page);
  await page.setViewportSize({ width: 1366, height: 1080 });
  await page.goto(f.url + "?secao=estatisticas");
  await expect(page.locator(".player-stats-table")).toBeVisible();
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(
    page.getByRole("table", {
      name: "Resumo de temporada e carreira",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".player-overview-panel")).toHaveAttribute(
    "inert",
    "",
  );
  const footerTop = () =>
    page
      .locator(".public-footer")
      .evaluate((el) => el.getBoundingClientRect().top + scrollY);
  const before = await footerTop();
  await page.getByRole("tab", { name: "Visão geral", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(Math.abs((await footerTop()) - before)).toBeLessThan(2);
});

test("refinamento: FC padrão, seleção explícita, categoria inline e títulos sem redundância", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?secao=estatisticas");
  await expect(
    page.getByRole("columnheader", {
      name: "Ordenar por FC (Faltas cometidas)",
    }),
  ).toBeVisible();
  await expect(page.locator(".player-legend dt")).toHaveText([
    "J",
    "PTS",
    "2P",
    "3P",
    "LL",
    "FC",
  ]);
  await expect(page.locator(".player-championships h2")).toHaveCount(0);
  await expect(page.locator("tbody .player-champ")).not.toContainText([
    "Adulto",
  ]);
  await page.goto(f.url + "?secao=estatisticas&colunasPerfil=points");
  await expect(page.locator(".player-legend dt")).toHaveText(["J", "PTS"]);
  await expect(
    page.getByRole("columnheader", { name: /Ordenar por FC/ }),
  ).toHaveCount(0);
});

test("refinamento: categoria na linha do campeonato preserva nomes completos em 320px", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  const championship = "Copa Estadual de Basquete de Formação 2026";
  for (const g of f.source.participations) {
    g.fact.context.name = championship;
    g.fact.context.category = "Sub-15";
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(f.url + "?secao=estatisticas");
  const cell = page.locator("tbody .player-champ").first();
  await expect(cell.locator(".player-competition-name")).toHaveText(
    `${championship} · Sub-15`,
  );
  await expect(cell.locator("small")).toHaveCount(1);
  await expect(page.locator("tbody .player-champ a")).toHaveText(
    [...f.source.participations]
      .sort((a, b) => b.fact.context.year - a.fact.context.year)
      .map((g) => g.fact.registration.name),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("refinamento: paginação conta somente participação, zero não é recorde e lista cresce sem corte", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  Object.assign(f.source.participations[0].fact, {
    played: false,
    starter: false,
    captain: false,
    scoring: null,
    advanced: null,
    foulsCommitted: null,
    foulsReceived: null,
    discipline: null,
  });
  await page.goto(f.url + "?secao=jogos&page=500");
  await expect(page.locator(".player-games-count")).toHaveText(
    "24 jogos encontrados",
  );
  await expect(page.getByText("Página 2 de 2", { exact: true })).toBeVisible();
  await expect(page.locator(".player-games-page tbody tr")).toHaveCount(12);
  await expect(
    page.locator(`tr[data-game="${f.source.participations[0].fact.gameId}"]`),
  ).toHaveCount(0);
  const panel = await page.getByRole("tabpanel").boundingBox();
  const table = await page.locator(".player-games-page table").boundingBox();
  expect(panel!.height).toBeGreaterThanOrEqual(table!.height);
  await page.getByRole("tab", { name: "Carreira", exact: true }).click();
  await expect(page.locator('[data-metric="threeMade"]')).toContainText(
    "Nenhuma marca positiva.",
  );
  await expect(page.locator('[data-metric="threeMade"] button')).toHaveCount(0);
});

test("refinamento: tipografia compartilhada e capturas de Jogadores, Equipes e busca", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Matriz explícita");
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await publicNavigationFixture(page);
    const stats = await statisticsBrowserFixture(page);
    const team = await teamPublicFixture(page);
    const player = await playerPublicFixture(page);
    const typography = [];
    for (const [name, url] of [
      ["jogadores", stats.url],
      ["equipes", team.listUrl],
      ["perfil", player.url],
    ]) {
      await page.goto(url);
      const legend = page.locator(".reference-legend");
      await expect(legend).toBeVisible();
      typography.push(
        await legend.evaluate((el) => {
          const heading = getComputedStyle(el.querySelector("h2")!);
          const text = getComputedStyle(el.querySelector("dl")!);
          return [heading.fontSize, heading.fontWeight, text.fontSize];
        }),
      );
      await page.screenshot({
        path: `.preview-artifacts/refinement/after-${width}-${name}.png`,
        fullPage: true,
      });
    }
    expect(typography[0]).toEqual(typography[1]);
    expect(typography[0]).toEqual(typography[2]);
    const nav = await publicNavigationFixture(page);
    await publicSearchFixture(page, () =>
      searchFixtureHits(
        nav.games,
        [],
        [
          {
            kind: "players",
            id: player.source.personId,
            name: "Ana Pública",
            nickname: "AP",
            disputeId: null,
          },
        ],
      ),
    );
    await page.goto("http://127.0.0.1:5174/publico.html");
    await page
      .getByRole("combobox", { name: /Buscar competições/ })
      .fill("Ana");
    const option = page.getByRole("option").first();
    await expect(option.locator("small")).toHaveText("AP");
    await expect(option).not.toContainText("Apelido:");
    await page.screenshot({
      path: `.preview-artifacts/refinement/after-${width}-busca.png`,
      fullPage: true,
    });
  }
});

test("refinamento: perfil com texto200% e viewport equivalente a zoom200%", async ({
  page,
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop", "Matriz explícita");
  const f = await playerPublicFixture(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(f.url);
  await expect(page.locator(".player-identity h1")).toHaveText("AP");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  for (const name of ["Visão geral", "Estatísticas", "Carreira", "Ver jogos"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    if (name === "Visão geral") {
      const summary = page.getByRole("region", {
        name: "Resumo de temporada e carreira",
        exact: true,
      });
      await summary.focus();
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => summary.evaluate((el) => el.scrollLeft))
        .toBeGreaterThan(0);
    }
    await page.screenshot({
      path: `.preview-artifacts/refinement/text200-${name}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("body *")]
        .filter(
          (el) =>
            el.getBoundingClientRect().right > innerWidth + 1 &&
            getComputedStyle(el).position !== "absolute" &&
            !el.closest(
              ".player-records, .player-summary, .player-games-scroll, .player-record-preview, .player-scroll, .bb-tabs",
            ),
        )
        .slice(0, 12)
        .map((el) => ({
          class: el.className,
          tag: el.tagName,
          text: el.textContent?.slice(0, 60),
          parent: el.parentElement?.className,
          right: el.getBoundingClientRect().right,
          width: el.getBoundingClientRect().width,
        })),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${name}: ${JSON.stringify(overflow)}`,
    ).toBe(true);
  }
  const context = await browser.newContext({
    viewport: { width: 683, height: 384 },
    deviceScaleFactor: 2,
  });
  try {
    const zoomed = await context.newPage();
    const fixture = await playerPublicFixture(zoomed);
    await zoomed.goto(fixture.url);
    await expect(zoomed.locator(".player-identity h1")).toHaveText("AP");
    for (const name of [
      "Visão geral",
      "Estatísticas",
      "Carreira",
      "Ver jogos",
    ]) {
      await zoomed.getByRole("tab", { name, exact: true }).click();
      expect(
        await zoomed.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await zoomed.screenshot({
      path: ".preview-artifacts/refinement/after-zoom200.png",
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});
