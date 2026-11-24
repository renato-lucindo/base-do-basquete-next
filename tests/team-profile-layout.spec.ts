import { test, expect } from "@playwright/test";
import { teamProfileBrowserFixture } from "./fixtures/team-profile";

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
