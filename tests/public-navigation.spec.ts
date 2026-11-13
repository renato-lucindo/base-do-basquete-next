import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { publicNavigationFixture } from "./fixtures/public-navigation";
import { disputeLink } from "../src/public-ui/catalog-contract";
const origin = "http://127.0.0.1:5174";

test("descoberta hierárquica, teclado e quatro seções preservam a disputa", async ({
  page,
}, info) => {
  const f = await publicNavigationFixture(page),
    c = f.games.find((g) => g.disputeId === f.source.disputeId)!.context;
  await page.goto(origin + "/publico.html");
  await expect(
    page.getByRole("heading", { name: "Competições", exact: true }),
  ).toBeVisible();
  const summary = page.locator(".competition-tree > details > summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Masculino", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Feminino", exact: true }),
  ).toBeVisible();
  const genders = await page
    .locator(".gender-columns section")
    .evaluateAll((nodes) =>
      nodes.slice(0, 2).map((n) => ({
        x: n.getBoundingClientRect().x,
        y: n.getBoundingClientRect().y,
      })),
    );
  if (info.project.name === "desktop") expect(genders[0].y).toBe(genders[1].y);
  else expect(genders[1].y).toBeGreaterThan(genders[0].y);
  await page.screenshot({
    path: `.preview-artifacts/public-navigation-home-after-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("combobox", { name: /Buscar competições/ }).fill(c.name);
  await page
    .getByRole("button", { name: "Buscar na base", exact: true })
    .click();
  const target = page.locator(
    `.public-search-entity a[href="${disputeLink(f.source.disputeId)}"]`,
  );
  await target.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Classificação ainda não disponível" }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Seções da disputa" });
  await expect(
    nav.getByRole("link", { name: "Classificação", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  for (const section of ["Jogos", "Equipes", "Jogadores"]) {
    await nav.getByRole("link", { name: section, exact: true }).click();
    await expect(
      nav.getByRole("link", { name: section, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveURL(new RegExp(f.source.disputeId));
  }
  await expect(
    page.getByRole("table", { name: "Estatísticas dos atletas", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    nav.getByRole("link", { name: "Jogadores", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(
    nav.getByRole("link", { name: "Equipes", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(
    nav.getByRole("link", { name: "Jogadores", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("detalhes de atletas, equipes e jogos retornam à consulta compartilhável", async ({
  page,
}, info) => {
  const f = await publicNavigationFixture(page);
  await page.goto(f.url);
  const table = page.getByRole("table", {
    name: "Estatísticas dos atletas",
    exact: true,
  });
  await table.locator('a[href^="/atleta.html"]').first().click();
  await expect(
    page.getByRole("navigation", { name: "Seções da disputa" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/returnTo=/);
  await page.reload();
  await page.getByRole("link", { name: /^Voltar à origem/ }).click();
  await expect(table).toBeVisible();
  const source = page.url();
  await table.locator('a[href^="/equipe.html"]').first().click();
  await expect(
    page.getByRole("navigation", { name: "Seções da equipe" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: /^Voltar à origem/ }).click();
  expect(page.url()).toBe(source);
  await page.goto(origin + disputeLink(f.source.disputeId, "jogos"));
  await expect(
    page.getByRole("list", { name: "Jogos por data" }),
  ).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar jogo" }).fill("Lobos");
  const gamesSource = page.url();
  const row = page.locator(`[data-game-id="${f.source.games[0].snapshot.id}"]`);
  await row.locator(".public-game-score a").focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("table", { name: "Participações e estatísticas publicadas" })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: `.preview-artifacts/public-navigation-result-after-${info.project.name}.png`,
    fullPage: false,
  });
  await page.reload();
  await page.getByRole("link", { name: /^Voltar à origem/ }).click();
  await expect(
    page.getByRole("heading", { name: "Jogos publicados", exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(gamesSource);
  await expect(
    page.getByRole("searchbox", { name: "Buscar jogo" }),
  ).toHaveValue("Lobos");
  for (const side of ["home", "away"]) {
    await row.locator(`.public-game-${side} a`).click();
    await expect(
      page.getByRole("navigation", { name: "Seções da equipe" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /^Voltar à origem/ }).click();
    expect(page.url()).toBe(gamesSource);
  }
});

test("busca pública repete o mesmo termo após falha transitória", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  let attempts = 0;
  await page.route("**/api/public/discovery?*", async (route) => {
    attempts += 1;
    if (attempts === 1)
      await route.fulfill({
        status: 503,
        json: { error: { code: "unavailable", message: "Indisponível" } },
      });
    else await route.fallback();
  });
  await page.goto(origin + "/publico.html");
  const name = f.source.games[0].snapshot.facts.players[0].person.name;
  await page.getByRole("combobox", { name: /Buscar competições/ }).fill(name);
  const submit = page.getByRole("button", {
    name: "Buscar na base",
    exact: true,
  });
  await submit.click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível buscar agora",
  );
  const failedUrl = page.url();
  await submit.click();
  await expect(
    page.locator('.public-search-entity-list a[href^="/atleta.html"]').first(),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(page.url()).toBe(failedUrl);
  expect(attempts).toBe(2);
});

test("busca global encontra equipes e jogadores sem buscar jogos", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  await page.goto(origin + "/publico.html");
  const name = f.source.games[0].snapshot.facts.players[0].person.name;
  await page.getByRole("combobox", { name: /Buscar competições/ }).fill(name);
  await page
    .getByRole("button", { name: "Buscar na base", exact: true })
    .click();
  await expect(
    page.locator('.public-search-entity-list a[href^="/atleta.html"]').first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: /Buscar competições/ }),
  ).toHaveValue(name);
  await expect(
    page.locator('.public-search-entity-list a[href^="/atleta.html"]').first(),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: /Buscar competições/ })
    .fill(f.games[0].game.home.name);
  await page
    .getByRole("button", { name: "Buscar na base", exact: true })
    .click();
  await expect(
    page.locator('.public-search-entity-list a[href^="/equipe.html"]').first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toHaveCount(0);
});

test("troca rápida pesquisável abre classificação e respeita naipe único sem divisão", async ({
  page,
}, info) => {
  const f = await publicNavigationFixture(page);
  await page.goto(origin + disputeLink(f.source.disputeId));
  const toggle = page.locator(".public-competition-trigger");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".public-context")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await expect(page.getByText("Trocar disputa", { exact: true })).toHaveCount(
    0,
  );
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Escolher disputa" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await page
    .getByRole("searchbox", { name: "Buscar competição ou disputa" })
    .fill("Sub-14");
  await expect(
    page.locator(".public-selector-panel .gender-columns section"),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".public-selector-panel")
      .getByRole("link", { name: "Sem divisão" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: `.preview-artifacts/public-navigation-selector-after-${info.project.name}.png`,
    fullPage: false,
  });
  const link = page
    .locator(".public-selector-panel")
    .getByRole("link", { name: "Sub-14", exact: true });
  const href = await link.getAttribute("href");
  const newPage = await page.context().newPage();
  await publicNavigationFixture(newPage);
  await newPage.goto(origin + href);
  await expect(
    newPage.getByRole("heading", {
      name: "Classificação ainda não disponível",
    }),
  ).toBeVisible();
  await newPage.close();
  await link.focus();
  await page.keyboard.press("Enter");
  expect(page.url()).toBe(origin + href);
  await expect(
    page.getByRole("dialog", { name: "Escolher disputa" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Classificação ainda não disponível" }),
  ).toBeVisible();
});

test("vazio, erro e contexto inválido oferecem recuperação sem bloquear outras seções", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  f.state.failed = true;
  await page.goto(origin + "/publico.html");
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await page
    .getByRole("combobox", { name: /Buscar competições/ })
    .fill(f.source.games[0].snapshot.facts.players[0].person.name);
  await page
    .getByRole("button", { name: "Buscar na base", exact: true })
    .click();
  await expect(
    page.locator('.public-search-entity-list a[href^="/atleta.html"]').first(),
  ).toBeVisible();
  f.state.failed = false;
  await page.getByRole("combobox", { name: /Buscar competições/ }).fill("");
  await page
    .getByRole("button", { name: "Buscar na base", exact: true })
    .click();
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.locator(".competition-tree")).toBeVisible();
  f.state.missing = true;
  await page.goto(origin + disputeLink(f.source.disputeId));
  await expect(
    page.getByText(
      "Disputa não encontrada ou sem consulta pública autorizada.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Seções da disputa" })
      .getByRole("link"),
  ).toHaveCount(4);
  await page.goto(origin + "/publico.html#bad");
  await expect(page.getByRole("alert")).toContainText("Disputa inválida");
});

test("perfil independente pode ser descoberto e retornar à busca sem catálogo de disputas", async ({
  page,
}) => {
  const f = await publicNavigationFixture(page);
  f.state.missing = true;
  f.state.profileOnly = true;
  await page.goto(origin + "/publico.html");
  const name = f.source.games[0].snapshot.facts.players[0].person.name;
  await page.getByRole("combobox", { name: /Buscar competições/ }).fill(name);
  await page
    .getByRole("button", { name: "Buscar na base", exact: true })
    .click();
  await page
    .locator('.public-search-entity-list a[href^="/atleta.html"]')
    .first()
    .click();
  await expect(
    page.getByRole("tablist", { name: "Seções do perfil" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Seções da disputa" }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("link", { name: /^Voltar à origem/ }).click();
  await expect(
    page.getByRole("combobox", { name: /Buscar competições/ }),
  ).toHaveValue(name);
});

test("axe, foco visível, reflow 320px e zoom 200%", async ({ page }, info) => {
  const f = await publicNavigationFixture(page);
  for (const game of f.games) {
    game.context.name = "Competição".repeat(12);
    game.context.category = "Categoria".repeat(8);
  }
  await page.goto(origin + "/publico.html");
  await page.locator(".competition-tree > details > summary").first().click();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.goto(origin + disputeLink(f.source.disputeId));
  await page.locator(".public-competition-trigger").click();
  await expect(
    page.getByRole("searchbox", { name: "Buscar competição ou disputa" }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Buscar competição ou disputa" })
    .focus();
  await expect(
    page.getByRole("searchbox", { name: "Buscar competição ou disputa" }),
  ).toBeFocused();
  const openScan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(openScan.violations).toEqual([]);
  for (const width of [320, 720]) {
    await page.setViewportSize({ width, height: 844 });
    if (width === 720)
      await page.evaluate(() => {
        document.documentElement.style.zoom = "2";
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: `.preview-artifacts/public-navigation-reflow-after-${info.project.name}.png`,
    fullPage: true,
  });
});
