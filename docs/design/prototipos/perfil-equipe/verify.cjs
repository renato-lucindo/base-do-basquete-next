const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium, webkit, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

const directory = path.join(
  __dirname,
  "../../.preview-artifacts/perfil-equipe",
);
const url = pathToFileURL(path.join(directory, "index.html")).href;
const team = "Associação Atlética da Serra";
const registration = "copa-sub17-m";
const selectedQuery = "inscricao=copa-sub17-m&disputa=copa-2026-sub17-m";

async function fits(page) {
  assert.equal(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
    true,
    "A página precisa caber na largura da janela",
  );
}

async function layout(page, width, height, file) {
  await page.setViewportSize({ width, height });
  await page.goto(url + "#equipe?aba=visao-geral");
  await expect(page.getByRole("heading", { name: team })).toBeVisible();
  await fits(page);
  const awards = await page
    .getByRole("heading", { name: "Conquistas" })
    .boundingBox();
  const tabs = await page.getByRole("tablist").boundingBox();
  assert.equal(
    awards.y > tabs.y,
    width < 1000,
    "A posição das conquistas precisa acompanhar o layout",
  );
  const recent = page
    .getByRole("table", { name: "Em andamento" })
    .getByRole("row", { name: /Copa do Litoral/ });
  const row = await recent.boundingBox();
  for (const button of await recent.getByRole("button").all()) {
    const box = await button.boundingBox();
    assert.ok(
      box.width >= 24 &&
        box.height >= 24 &&
        box.x + box.width <= row.x + row.width + 1,
    );
  }
  if (file)
    await page.screenshot({ path: path.join(directory, file), fullPage: true });
}

async function axe(page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((n) => n.target),
    })),
    [],
  );
}

async function overview(page) {
  await page.goto(url);
  const search = page.getByRole("combobox", {
    name: "Buscar jogadores, equipes ou campeonatos",
  });
  await search.fill("atletica da serra");
  await expect(
    page.getByRole("option", { name: new RegExp(team) }),
  ).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page.getByRole("tab", { name: "Visão geral" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  assert.ok(
    !new URLSearchParams(new URL(page.url()).hash.split("?")[1]).has(
      "inscricao",
    ),
  );
  const active = page.getByRole("table", { name: "Em andamento" });
  const history = page.getByRole("table", { name: "Histórico" });
  await expect(
    active.getByRole("row", { name: /Copa do Litoral/ }),
  ).toContainText("2º · Grupo A");
  await expect(
    active.getByRole("row", { name: /Liga Metropolitana/ }),
  ).toContainText("Semifinal");
  await expect(
    active.getByRole("row", { name: /Torneio Regional/ }),
  ).toContainText("—");
  await expect(
    history.getByRole("row", { name: /Liga Metropolitana/ }),
  ).toContainText("1º lugar");
  await expect(
    history.getByRole("row", { name: /2024 · Sub-17 · Feminino/ }),
  ).toContainText("—");
  await expect(
    page.getByRole("table", { name: "Situação não informada" }),
  ).toContainText("Festival da Serra");

  const indicators = active
    .getByRole("row", { name: /Copa do Litoral/ })
    .getByRole("button");
  await expect(indicators).toHaveCount(5);
  await expect(indicators.first()).toHaveAccessibleName(/09\/10\/2026/);
  await expect(indicators.last()).toHaveAccessibleName(
    /13\/11\/2026.*Resultado mais recente/,
  );
  await indicators.last().focus();
  await expect(page.getByRole("tooltip")).toHaveText("AAS 82 x 69 EV - 13/11");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();

  await page.getByText("Ver conquistas", { exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conquistas" }).getByRole("listitem"),
  ).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Conquistas" })).toContainText(
    "2024 · Sub-15 · Masculino",
  );

  const tab = page.getByRole("tab", { name: "Visão geral" });
  await tab.focus();
  await tab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Estatísticas" })).toBeFocused();
  await expect(
    page.getByRole("combobox", { name: "Campeonato", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Campeonato", exact: true })
    .selectOption(registration);
  await expect(
    page.getByRole("table", { name: "Estatísticas da equipe" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Campeonato", exact: true }),
  ).toHaveValue(registration);

  await page.getByRole("tab", { name: "Visão geral" }).click();
  await active.getByRole("link", { name: "Copa do Litoral" }).click();
  await expect(page).toHaveURL(
    /#classificacao\?.*fase=classificatoria&grupo=a/,
  );
  await expect(
    page.getByRole("table", { name: "Classificação de Copa do Litoral" }),
  ).toBeVisible();
}

async function tournament(page) {
  const source =
    "#classificacao?disputa=liga-2026-sub17-f&inscricao=liga-sub17-f&fase=classificatoria&grupo=b";
  await page.goto(url + source);
  await expect(page.getByText("Fase classificatória · Grupo B")).toBeVisible();
  await page.getByRole("link", { name: team }).click();
  await expect(page.getByRole("tab", { name: "Estatísticas" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("combobox", { name: "Campeonato", exact: true }),
  ).toHaveValue("liga-sub17-f");
  await expect(
    page.getByRole("button", { name: "Por jogo", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const table = page.getByRole("table", { name: "Estatísticas da equipe" });
  await expect(
    table.getByRole("row").nth(1).getByRole("cell").nth(3),
  ).toHaveText("14");
  await page.getByRole("button", { name: "Totais" }).click();
  await expect(
    table.getByRole("row").nth(1).getByRole("cell").nth(3),
  ).toHaveText("28");
  await table.getByRole("button", { name: "J, Jogos" }).focus();
  await expect(page.getByRole("tooltip")).toHaveText("Jogos");
  await expect(
    page
      .getByRole("region", { name: "Legenda" })
      .getByText("Jogos", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Jogos" }).click();
  const games = page.getByRole("table", { name: "Jogos da equipe" });
  await expect(
    games.getByRole("row", { name: /29\/11\/2026/ }).getByRole("link"),
  ).toHaveCount(0);
  await games
    .getByRole("link", { name: /Ver partida/ })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Resultado da partida" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar aos jogos" }).click();
  await expect(page.getByRole("tab", { name: "Jogos" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("combobox", { name: "Campeonato", exact: true }),
  ).toHaveValue("liga-sub17-f");
  await page
    .getByRole("link", { name: "Liga Metropolitana", exact: true })
    .click();
  await expect(page).toHaveURL(url + source);
}

async function mobile(contextBrowser, screenshot) {
  const context = await contextBrowser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  context.setDefaultTimeout(8000);
  try {
    const page = await context.newPage();
    await page.goto(url + "#equipe?aba=visao-geral");
    const result = page
      .getByRole("table", { name: "Em andamento" })
      .getByRole("button")
      .last();
    await result.tap();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.getByRole("tab", { name: "Elencos" }).tap();
    const list = page.getByRole("navigation", {
      name: "Campeonatos dos elencos",
    });
    const item = list.getByRole("link", {
      name: /Copa do Litoral.*2026 · Sub-17/,
    });
    await item.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await item.tap();
    await expect(list).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Copa do Litoral" }),
    ).toBeFocused();
    const roster = page.getByRole("table", {
      name: "Jogadores e estatísticas do elenco",
    });
    await expect(
      roster.getByRole("button", { name: "GD, Desqualificações" }),
    ).toHaveCount(1);
    const last = roster.getByRole("row", { name: /Pedro Oliveira/ });
    await expect(last.getByRole("cell").first()).toHaveText("0");
    await expect(last.getByRole("cell").nth(1)).toHaveText("—");
    const scroll = page.getByRole("region", {
      name: "Jogadores e estatísticas do elenco",
    });
    const pinned = roster.getByRole("rowheader").first();
    const left = (await pinned.boundingBox()).x;
    await scroll.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    assert.ok(await scroll.evaluate((element) => element.scrollLeft > 0));
    assert.ok(
      Math.abs((await pinned.boundingBox()).x - left) < 2,
      "A identificação deve ficar fixa",
    );
    await scroll.evaluate((element) => {
      element.scrollLeft = 0;
    });
    await fits(page);
    await axe(page);
    if (screenshot)
      await page.screenshot({
        path: path.join(directory, "elenco-390.png"),
        fullPage: true,
      });
    await page.getByRole("link", { name: "Voltar aos elencos" }).tap();
    await expect(item).toBeFocused();
    assert.ok(Math.abs((await page.evaluate(() => scrollY)) - before) < 3);
    await expect(page).toHaveURL(/elenco=lista/);
    await page.reload();
    await expect(list).toBeVisible();
    await page.setViewportSize({ width: 390, height: 550 });
    const historic = list.getByRole("link", { name: /Torneio Regional.*2024/ });
    await historic.scrollIntoViewIfNeeded();
    const listOffset = await page.evaluate(() => scrollY);
    assert.ok(listOffset > 0, "O teste precisa partir de uma lista rolada");
    await historic.tap();
    await expect(
      page.getByRole("heading", { name: "Torneio Regional" }),
    ).toBeFocused();
    await page.getByRole("link", { name: "Voltar aos elencos" }).tap();
    await expect(historic).toBeFocused();
    assert.ok(Math.abs((await page.evaluate(() => scrollY)) - listOffset) < 3);
  } finally {
    await context.close();
  }
}

async function verify() {
  const engine = process.argv.includes("--webkit") ? webkit : chromium;
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    context.setDefaultTimeout(8000);
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    context.on("request", (request) => {
      if (request.url().startsWith("http")) requests.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    for (const [width, height] of [
      [320, 800],
      [390, 844],
      [1366, 768],
      [1920, 1080],
    ]) {
      await layout(
        page,
        width,
        height,
        engine === chromium ? `visao-geral-${width}.png` : undefined,
      );
    }
    await axe(page);
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => {
      document.body.style.zoom = "2";
    });
    await fits(page);
    await page.reload();
    await overview(page);
    await tournament(page);

    await page.goto(url + "#equipe?aba=elencos&" + selectedQuery);
    await expect(
      page.getByRole("navigation", { name: "Campeonatos dos elencos" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Jogadores e estatísticas do elenco" }),
    ).toBeVisible();
    await fits(page);
    if (engine === chromium)
      await page.screenshot({
        path: path.join(directory, "elenco-1366.png"),
        fullPage: true,
      });

    await page.goto(
      url +
        "#equipe?aba=estatisticas&inscricao=regional-sub15-f&disputa=regional-2026-sub15-f",
    );
    await expect(
      page.getByText("Nenhuma estatística publicada nesta disputa."),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Elencos" }).click();
    await expect(
      page.getByText("Nenhum atleta em jogos publicados nesta disputa."),
    ).toBeVisible();

    await mobile(browser, engine === chromium);
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log(
      `Perfil de equipe validado em ${engine.name()}: navegação, 4 larguras, zoom CSS 200%, seleção, toque, teclado, elencos, métricas, partidas e axe.`,
    );
  } finally {
    await browser.close();
  }
}

verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
