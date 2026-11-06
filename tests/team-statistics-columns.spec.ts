import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { teamPublicFixture } from "./fixtures/team-public-browser";
import { confirmedPdfFixture } from "./fixtures/statistics-publications";
import { pubId } from "./fixtures/publication";
import {
  disciplinarySheet,
  teamReview,
} from "./fixtures/sheet-team-statistics";
import { confirmedManualFixture } from "./fixtures/statistics-publications";

test("súmula usa a ordem contratada, médias de toda a equipe e ranking; seleção persiste na sessão", async ({
  page,
}, info) => {
  const f = await teamPublicFixture(page);
  const first = confirmedManualFixture(
    false,
    disciplinarySheet(),
    teamReview(),
  );
  const second = structuredClone(first);
  second.id = pubId(29000);
  f.source.games = [
    { snapshot: first, phase: "round_robin" },
    { snapshot: second, phase: "knockout" },
  ];
  await page.goto(f.listUrl);
  const table = page.getByRole("table", {
    name: "Estatísticas das equipes",
    exact: true,
  });
  const labels = [
    "Pos.",
    "Equipe",
    "J",
    "PTS",
    "PB",
    "PB%",
    "2P",
    "3P",
    "FC",
    "FR",
    "LLT",
    "LLC",
    "LL%",
    "T",
    "U",
    "GD",
  ];
  await expect(table.locator("thead th")).toHaveText(
    labels.map((label) => new RegExp("^" + label + "[↑↓]?$")),
  );
  const row = () =>
    table
      .locator("tbody tr")
      .filter({ has: page.getByRole("link", { name: "Lobos", exact: true }) });
  await expect(row().locator("td")).toHaveText([
    "1",
    "2",
    "2,0",
    "0",
    "0",
    "1,0",
    "0",
    "3,0",
    "9,0",
    "0",
    "0",
    "—",
    "5,0",
    "2,0",
    "6,0",
  ]);
  await table
    .getByRole("button", {
      name: "Ordenar por T (Faltas técnicas)",
      exact: true,
    })
    .focus();
  await expect(page.getByRole("tooltip")).toHaveText("Faltas técnicas");
  await page.keyboard.press("Enter");
  await expect(table.locator("tbody td.rank")).toHaveText(["1", "2"]);
  await expect(
    table.locator('[data-team-metric="technicalFouls"]'),
  ).toHaveAttribute("aria-sort", "ascending");
  await table
    .getByRole("button", {
      name: "Ordenar por T (Faltas técnicas)",
      exact: true,
    })
    .click();
  await expect(
    table.locator('[data-team-metric="technicalFouls"]'),
  ).toHaveAttribute("aria-sort", "descending");
  await page.getByRole("button", { name: "Totais", exact: true }).click();
  await expect(row().locator("td")).toHaveText([
    "1",
    "2",
    "4",
    "0",
    "0",
    "2",
    "0",
    "6",
    "18",
    "0",
    "0",
    "—",
    "10",
    "4",
    "12",
  ]);
  await table.getByRole("button", { name: /Ordenar por LL%/ }).click();
  await expect(table.locator("tbody td.rank")).toHaveText(["1", "—"]);
  if (info.project.name === "desktop") {
    for (const width of [1366, 1920]) {
      await page.setViewportSize({
        width,
        height: width === 1366 ? 768 : 1080,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1366, height: 768 });
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/team-sheet-${info.project.name}.png`,
    fullPage: true,
  });
  await expect(page.getByRole("button", { name: /Colunas ·/ })).toHaveCount(0);
  await expect(page.getByText("Mais opções", { exact: true })).toHaveCount(0);
  await page.goto(f.listUrl + "?columns=games,points");
  await expect(table.locator("thead th")).toHaveCount(16);
});

test("LL% ponderado, ordenação por cabeçalho e fase conservam fonte e URL", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  for (const [index, made, taken] of [
    [0, 1, 1],
    [1, 0, 9],
  ]) {
    const g = f.source.games[index].snapshot,
      t = g.facts.teams.home;
    if (!("freeTaken" in t)) throw Error("Fixture de súmula esperada");
    t.freeMade = made;
    t.freeTaken = taken;
    t.points += made;
    t.periods[3] += made;
    const p = g.facts.players.find((p) => p.side === "home" && p.played)!;
    p.points += made;
    p.free += made;
  }
  await page.goto(f.listUrl);
  const table = page.getByRole("table", {
    name: "Estatísticas das equipes",
    exact: true,
  });
  const cell = () =>
    table
      .locator("tbody tr")
      .filter({ has: page.getByRole("link", { name: "Lobos", exact: true }) })
      .locator("td")
      .nth(11);
  await expect(cell()).toHaveText("10");
  const sort = table.getByRole("button", {
    name: "Ordenar por LL% (Aproveitamento de lances livres)",
    exact: true,
  });
  await sort.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/sort=freeThrowPercentage/);
  await expect(
    table.locator('[data-team-metric="freeThrowPercentage"]'),
  ).toHaveAttribute("aria-sort", "descending");
  await page.getByRole("button", { name: "Fase regular", exact: true }).click();
  await expect(cell()).toHaveText("100");
  await page.getByRole("button", { name: "Totais", exact: true }).click();
  await expect(cell()).toHaveText("100");
  await page.reload();
  await expect(cell()).toHaveText("100");
  expect(f.state.sessionReads).toBe(0);
});

test("colunas de boxscore mantêm LL% único e retorno do perfil preserva controles", async ({
  page,
}) => {
  const f = await teamPublicFixture(page);
  f.source.games.push({
    snapshot: await confirmedPdfFixture(),
    phase: "knockout",
  });
  await page.goto(f.listUrl);
  await page
    .getByRole("combobox", { name: "Dados", exact: true })
    .selectOption("boxscore");
  await page.getByText("Mais opções", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Colunas", exact: true })
    .selectOption("boxscore");
  const table = page.getByRole("table", {
    name: "Estatísticas das equipes",
    exact: true,
  });
  await expect(
    table.locator('[data-team-metric="freeThrowPercentage"]'),
  ).toHaveCount(1);
  await expect(
    table.locator('[data-team-metric="fieldGoalPercentage"]'),
  ).toHaveCount(1);
  await expect(
    table.locator("tbody tr").first().locator("td").first(),
  ).toHaveText("1");
  await table.getByRole("link", { name: "Lobos", exact: true }).click();
  await page
    .getByRole("link", { name: "Voltar às equipes", exact: true })
    .click();
  await expect(page).toHaveURL(/dataset=boxscore/);
  await expect(
    page.getByRole("combobox", { name: "Colunas", exact: true }),
  ).toHaveValue("boxscore");
  expect(new URLSearchParams(page.url().split("?").at(-1)).get("dataset")).toBe(
    "boxscore",
  );
  await expect(
    table.getByRole("link", { name: "Lobos", exact: true }),
  ).toHaveAttribute(
    "href",
    new RegExp(`registrationId%3D${pubId(5)}|registrationId=${pubId(5)}`),
  );
});

test("muitas colunas, nomes longos, picker, teclado, axe e 320px/zoom ficam contidos", async ({
  page,
}, info) => {
  const f = await teamPublicFixture(page);
  f.source.games.push({
    snapshot: await confirmedPdfFixture(),
    phase: "knockout",
  });
  for (const g of f.source.games)
    g.snapshot.game.home.name = "Equipe " + "NomeMuitoLongo".repeat(6);
  await page.goto(f.listUrl + "?preset=all");
  const table = page.getByRole("table", {
    name: "Estatísticas das equipes",
    exact: true,
  });
  await expect(
    table.locator('[data-team-metric="freeThrowPercentage"]'),
  ).toHaveCount(1);
  await expect(
    table.locator("tbody tr").first().getByText("—", { exact: true }),
  ).not.toHaveCount(0);
  expect(
    await table
      .locator("tbody th")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(180);
  expect(
    await table
      .locator("tbody tr")
      .first()
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(240);
  await page.getByRole("button", { name: /Colunas ·/ }).click();
  await expect(
    page.getByText("A equipe e a posição estatística ficam sempre visíveis."),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "FC · Faltas cometidas", exact: true }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Colunas ·/ })).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/team-columns-after-${info.project.name}.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("region", { name: "Tabela de equipes", exact: true })
    .focus();
  await page.keyboard.press("ArrowRight");
  await page.setViewportSize({ width: 720, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
