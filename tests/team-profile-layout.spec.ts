import { test, expect } from "@playwright/test";
import { teamProfileBrowserFixture } from "./fixtures/team-profile";

test("seleção por nível sobrepõe sem mover conteúdo e devolve foco", async ({
  page,
}) => {
  const f = await teamProfileBrowserFixture(page);
  await page.goto(f.url);
  const status = page.locator(".public-dispute-status");
  await expect(status).toHaveCSS("font-size", "14px");
  await expect(status).toHaveCSS("border-top-width", "0px");
  const nav = page.getByRole("navigation", { name: "Seções da disputa" });
  const before = await nav.boundingBox();
  const levels = page.locator(".public-dispute-breadcrumb button");
  for (const trigger of await levels.all()) {
    await trigger.click();
    const panel = page.getByRole("navigation", { name: "Disputas da edição" });
    await expect(panel).toBeVisible();
    expect((await nav.boundingBox())!.y).toBe(before!.y);
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await levels.first().click();
  await levels.nth(1).click();
  await expect(levels.nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".public-selector-panel")).toHaveCount(1);
  await page
    .getByRole("heading", { name: "Classificação", exact: true })
    .click();
  await expect(page.locator(".public-selector-panel")).toHaveCount(0);
  await expect(levels.nth(1)).toBeFocused();
});

for (const width of [320, 390, 639, 640, 1366, 1920]) {
  test(`oito abas seguem legenda, contorno e controles em ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const f = await teamProfileBrowserFixture(page);
    await page.goto(f.url);
    await expect(page.locator(".team-profile-games")).toBeVisible();
    const standings = page.locator(".standings-explorer");
    expect(
      await standings.evaluate((el) =>
        Math.abs(
          el.getBoundingClientRect().left -
            el.parentElement!.getBoundingClientRect().left,
        ),
      ),
    ).toBeLessThan(3);
    const mode = page.locator(".team-profile-collective .segmented");
    const phase = page.locator(".team-profile-collective select");
    if (width >= 640) {
      const m = (await mode.boundingBox())!,
        p = (await phase.boundingBox())!;
      expect(Math.abs(m.y + m.height / 2 - p.y - p.height / 2)).toBeLessThan(3);
    }
    const check = async () => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      const legend = page.locator(".team-profile-workspace .reference-legend");
      expect(await legend.count()).toBeLessThanOrEqual(1);
      if (await legend.count()) {
        await expect(legend.locator("dl")).toHaveCSS("display", "grid");
        const pairs = await legend.locator("dl > div").evaluateAll((items) =>
          items.map((el) => {
            const dt = el.querySelector("dt")!.getBoundingClientRect(),
              dd = el.querySelector("dd")!.getBoundingClientRect();
            return { offset: dd.left - dt.left, top: dd.top - dt.top };
          }),
        );
        expect(
          Math.max(...pairs.map((p) => p.offset)) -
            Math.min(...pairs.map((p) => p.offset)),
        ).toBeLessThan(1);
        expect(Math.max(...pairs.map((p) => Math.abs(p.top)))).toBeLessThan(3);
      }
    };
    await check();
    for (const name of ["Jogadores", "Jogos"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(
        page.locator(".team-profile-workspace table").first(),
      ).toBeVisible();
      await check();
    }
    await page
      .getByRole("link", { name: "Ver perfil geral", exact: true })
      .click();
    for (const name of [
      "Visão geral",
      "Competições",
      "Elencos",
      "Jogos",
      "Estatísticas",
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const year = page.getByRole("combobox", { name: "Ano", exact: true });
      await expect(year).toHaveCount(1);
      expect(
        await year.evaluate((el) => el.closest('[role="tablist"]') === null),
      ).toBe(true);
      const rect = (await year.boundingBox())!,
        bar = (await page.locator(".team-profile-tabbar").boundingBox())!;
      expect(rect.width).toBeLessThan(120);
      expect(rect.x + rect.width).toBeGreaterThan(bar.x + bar.width - 30);
      if (name === "Competições") await expect(year).toHaveValue("");
      if (name === "Elencos" && width < 640) {
        await page.locator(".team-profile-rosters > nav a").first().click();
      }
      await expect(
        page.locator(".team-profile-workspace table").first(),
      ).toBeVisible();
      if (name === "Estatísticas") {
        const table = page.locator(".team-profile-participation-table");
        await expect(table.locator("th").first()).toHaveCSS(
          "text-align",
          "center",
        );
        await expect(table.locator('th[scope="row"]').first()).toHaveCSS(
          "text-align",
          "center",
        );
        await expect(
          page.getByRole("region", { name: "Estatísticas por participação" }),
        ).toHaveCSS("border-top-width", "1px");
        const modeBox = (await page
            .locator(".team-profile-workspace .segmented")
            .boundingBox())!,
          tableBox = (await table.boundingBox())!;
        expect(tableBox.y - modeBox.y - modeBox.height).toBeLessThan(40);
      }
      await check();
    }
    // Text enlargement must preserve the tabbar and visible, associated fields.
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await check();
  });
}

test("perfil mantém tabela durante ordenação, ordem canônica e títulos sem repetição", async ({
  page,
}) => {
  const f = await teamProfileBrowserFixture(page);
  await page.goto(f.url);
  await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await expect(table).toBeVisible();
  const centering = await table.evaluate((el) => {
    const area = el
      .closest(".team-profile-player-results")!
      .getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      fits: rect.width < area.width,
      delta: Math.abs(rect.left + rect.width / 2 - area.left - area.width / 2),
    };
  });
  if (centering.fits) expect(centering.delta).toBeLessThan(2);
  const columns = await table.locator("thead th").allTextContents();
  expect(columns.indexOf("PPJ")).toBeLessThan(columns.indexOf("PP%"));
  expect(columns.indexOf("2P")).toBeLessThan(columns.indexOf("F"));
  await expect(
    page.getByRole("heading", { name: "Jogadores na disputa", exact: true }),
  ).not.toBeVisible();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/public/statistics/**", async (route) => {
    await held;
    await route.fallback();
  });
  const pageHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const height = await table.evaluate(
    (el) => el.getBoundingClientRect().height,
  );
  const request = page.waitForRequest((r) =>
    r.url().includes("/api/public/statistics/"),
  );
  await table.getByRole("button", { name: /Ordenar por.*Jogos/i }).click();
  await request;
  await expect(page.locator(".team-profile-player-results")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(table).toBeVisible();
  expect(await table.evaluate((el) => el.getBoundingClientRect().height)).toBe(
    height,
  );
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    pageHeight,
  );
  release();
  await page.getByRole("tab", { name: "Jogos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Jogos da equipe", exact: true }),
  ).not.toBeVisible();
  await expect(page.locator(".public-footer")).toContainText(
    "Dados a partir de 2026",
  );
});

test("breadcrumb, destaque equivalente e contornos seguem o conteúdo", async ({
  page,
}) => {
  const f = await teamProfileBrowserFixture(page);
  await page.goto(f.url);
  await expect(
    page.getByRole("navigation", { name: "Contexto da disputa" }),
  ).toBeVisible();
  await expect(page.locator(".public-dispute-status")).toHaveText(
    "Em andamento",
  );
  const selected = page.locator('tr[data-profile-selected="true"]');
  await expect(selected).toHaveCount(2);
  const styles = await selected.evaluateAll((rows) =>
    rows.map((r) => {
      const s = getComputedStyle(r.children[1]);
      return { weight: s.fontWeight, background: s.backgroundColor };
    }),
  );
  expect(styles[0]).toEqual(styles[1]);
  expect(Number(styles[0].weight)).toBeGreaterThanOrEqual(600);
  for (const link of await selected.locator('th[scope="row"] a').all()) {
    const appearance = await link.evaluate((el) => ({
      color: getComputedStyle(el).color,
      parent: getComputedStyle(el.parentElement!).color,
      decoration: getComputedStyle(el).textDecorationLine,
    }));
    expect(appearance.color).toBe(appearance.parent);
    expect(appearance.decoration).toBe("none");
  }
  for (const region of await page
    .locator(".team-profile-page .statistics-table-wrap")
    .all()) {
    const sizes = await region.evaluate((el) => ({
      viewport: el.getBoundingClientRect().width,
      table: el.querySelector("table")!.getBoundingClientRect().width,
    }));
    expect(sizes.viewport).toBeLessThanOrEqual(sizes.table + 3);
  }
});

test("eliminatórias vazias, seletor legível e placares alinhados", async ({
  page,
}) => {
  const f = await teamProfileBrowserFixture(page);
  f.source.games.forEach((g) => {
    g.phase = "round_robin";
  });
  await page.goto(f.url);
  await page.getByRole("tab", { name: "Jogos", exact: true }).click();
  const centers = await page
    .locator(".team-profile-games .team-profile-match strong")
    .evaluateAll((items) =>
      items.map((e) => {
        const r = e.getBoundingClientRect();
        return r.left + r.width / 2;
      }),
    );
  expect(centers.length).toBeGreaterThan(1);
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2);
  await page.getByRole("tab", { name: "Jogadores", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Colunas ·/ }).click();
  const choices = page.locator(".column-options label");
  await expect(choices.first()).toHaveCSS("flex-direction", "row");
  await expect(choices.first()).toHaveCSS("font-size", "15px");
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Fase", exact: true })
    .selectOption("playoffs");
  await expect(
    page.getByText("Ainda não há jogos disponíveis na fase eliminatória.", {
      exact: true,
    }),
  ).toBeVisible();
});
