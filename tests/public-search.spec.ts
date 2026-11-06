import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import {
  publicSearchFixture,
  searchFixtureHits,
} from "./fixtures/public-search";
import type { SearchHit } from "../src/public-ui/search-contract";
import { pubId } from "./fixtures/publication";
const base = "http://127.0.0.1:5174";
async function setup(page: Parameters<typeof publicNavigationFixture>[0]) {
  const f = await publicNavigationFixture(page);
  const players: SearchHit[] = Array.from({ length: 27 }, (_, i) => ({
    kind: "players",
    id: pubId(170000 + i),
    name: i === 0 ? "Álvares" : `Álvares ${String(i).padStart(2, "0")}`,
    nickname: null,
    disputeId: null,
  }));
  const games = structuredClone(f.games);
  for (const g of games) {
    g.context.name = "Copa Álvares";
    g.game.home.team.name = "Álvares Cabral";
    g.game.home.name = "Álvares Cabral";
    g.game.home.team.abbreviation = "AC";
  }
  const hits = searchFixtureHits(games, [], players);
  const search = await publicSearchFixture(page, () => hits);
  return { ...f, hits, search };
}
test("autocomplete exige2 caracteres, agrupa5/tipo e permite navegar por teclado sem alterar a busca", async ({
  page,
}, info) => {
  const f = await setup(page);
  await page.goto(base + "/publico.html");
  const input = page.getByRole("combobox", { name: /Buscar competições/ });
  await input.focus();
  await input.fill("a");
  await expect(
    page.getByText("Digite pelo menos 2 caracteres para buscar."),
  ).toBeVisible();
  expect(f.search.calls).toHaveLength(0);
  await input.fill("ALVARES");
  const list = page.getByRole("listbox", { name: "Sugestões da busca" });
  await expect(list.getByRole("option")).toHaveCount(7);
  await expect(
    list
      .getByRole("group", { name: "Jogadores", exact: true })
      .getByRole("option"),
  ).toHaveCount(5);
  await expect(
    list
      .getByRole("group", { name: "Equipes", exact: true })
      .getByRole("option"),
  ).toHaveCount(1);
  const geometry = await list.evaluate((el) => {
    const panel = el.closest(".public-autocomplete")!,
      types = panel.querySelector(".public-search-types")!,
      option = el.querySelector('[role="option"]')!;
    return {
      panel: panel.getBoundingClientRect().width,
      list: el.getBoundingClientRect().width,
      option: option.getBoundingClientRect().width,
      typesBottom: types.getBoundingClientRect().bottom,
      listTop: el.getBoundingClientRect().top,
    };
  });
  expect(geometry.list).toBeGreaterThanOrEqual(
    geometry.panel - (info.project.name === "desktop" ? 36 : 24),
  );
  expect(geometry.option).toBeGreaterThanOrEqual(
    geometry.panel - (info.project.name === "desktop" ? 36 : 24),
  );
  expect(geometry.listTop).toBeGreaterThan(geometry.typesBottom);
  await expect(input).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const first = list.getByRole("option").first();
  await expect(first).toHaveAttribute("aria-selected", "true");
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await first.getAttribute("id")) as string,
  );
  await page.keyboard.press("End");
  await expect(list.getByRole("option").last()).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(input).toHaveValue("ALVARES");
  await expect(input).toBeFocused();
  await input.focus();
  await page.keyboard.press("ArrowDown");
  await expect(list.getByRole("option")).toHaveCount(7);
  await expect(
    new AxeBuilder({ page }).analyze().then((r) => r.violations),
  ).resolves.toEqual([]);
  await page.screenshot({
    path: `.preview-artifacts/search-autocomplete-${info.project.name}.png`,
    fullPage: false,
  });
});
test("busca global mantém nome completo em destaque e apelido como complemento", async ({
  page,
}) => {
  const f = await setup(page);
  const player = f.hits.find(
    (hit) => hit.kind === "players" && hit.name === "Álvares",
  );
  if (!player || player.kind !== "players")
    throw Error("Atleta de teste ausente.");
  player.nickname = "Alvinho";
  await page.goto(base + "/publico.html#?q=alvares&type=players");
  const results = page.getByRole("region", { name: "Resultados da busca" });
  const first = results.locator(".public-search-entity-list > li").first();
  await expect(first.locator("strong")).toHaveText("Álvares");
  await expect(first.locator("small")).toHaveText("Alvinho");
});

test("debounce/cancelamento descarta resposta atrasada e retry mantém foco e termo", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(base + "/publico.html");
  const input = page.getByRole("combobox", { name: /Buscar competições/ });
  f.search.delayNext = 800;
  await input.fill("alva");
  await expect.poll(() => f.search.calls.length).toBe(1);
  await input.fill("sem resultado");
  await expect(
    page.getByText("Nenhum resultado. Tente outro nome ou termo."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("listbox", { name: "Sugestões da busca" })
      .getByRole("option"),
  ).toHaveCount(0);
  await expect(input).toHaveValue("sem resultado");
  f.search.failNext = true;
  await input.fill("Álvares");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível buscar",
  );
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page
      .getByRole("listbox", { name: "Sugestões da busca" })
      .getByRole("option"),
  ).toHaveCount(7);
  await expect(input).toHaveValue("Álvares");
  await page.getByRole("button", { name: "Equipes", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(input).toBeFocused();
});
test("tipo, paginação e seleção da equipe preservam a URL e suas participações únicas", async ({
  page,
}, info) => {
  await setup(page);
  await page.goto(base + "/publico.html#?q=alvares&type=players");
  const results = page.getByRole("region", { name: "Resultados da busca" });
  await expect(results.locator(".public-search-entity-list>li")).toHaveCount(
    20,
  );
  await page
    .getByRole("navigation", { name: "Paginação da busca" })
    .getByRole("link", { name: "Próxima", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(results.locator(".public-search-entity-list>li")).toHaveCount(7);
  await page.reload();
  await expect(results.locator(".public-search-entity-list>li")).toHaveCount(7);
  await page
    .getByRole("navigation", { name: "Tipos de resultado" })
    .getByRole("link", { name: "Equipes", exact: true })
    .click();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(results.locator(".public-search-entity-list>li")).toHaveCount(1);
  await expect(
    results.getByRole("link", { name: /Copa Álvares/ }).first(),
  ).toBeVisible();
  const input = page.getByRole("combobox", { name: /Buscar competições/ });
  await input.fill("alvares");
  await expect(
    page
      .getByRole("listbox", { name: "Sugestões da busca" })
      .getByRole("option"),
  ).toHaveCount(1);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/entityId=/);
  await expect(results.locator(".public-search-entity-list>li")).toHaveCount(1);
  await page.screenshot({
    path: `.preview-artifacts/search-team-choice-${info.project.name}.png`,
    fullPage: true,
  });
});
test("abertura por outra rota, 320px, texto200%, alvos e axe mantêm sugestões contidas", async ({
  page,
}, info) => {
  const f = await setup(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(base + `/estatisticas.html#${f.source.disputeId}`);
  const input = page.getByRole("combobox", { name: /Buscar competições/ });
  await input.fill("alvares");
  await expect(
    page
      .getByRole("listbox", { name: "Sugestões da busca" })
      .getByRole("option"),
  ).toHaveCount(7);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    new AxeBuilder({ page }).analyze().then((r) => r.violations),
  ).resolves.toEqual([]);
  await page.addStyleTag({ content: "html{font-size:200%!important}" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".header-inner .brand")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(140);
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
  await input.press("ArrowDown");
  await expect(
    page
      .getByRole("listbox", { name: "Sugestões da busca" })
      .getByRole("option"),
  ).toHaveCount(7);
  await page.screenshot({
    path: `.preview-artifacts/search-reflow-320-${info.project.name}.png`,
    fullPage: false,
  });
});

test("disputa identificada pelo contexto abre Classificação diretamente", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto(base + "/publico.html");
  const input = page.getByRole("combobox", { name: /Buscar competições/ });
  await input.fill("Sub-14");
  const option = page.getByRole("listbox").getByRole("option");
  await expect(option).toHaveCount(1);
  await expect(option).toContainText("Sub-14");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(
      f.games.find((g) => g.context.category === "Sub-14")!.disputeId +
        "\\?secao=classificacao",
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Classificação", exact: true }),
  ).toBeVisible();
});
