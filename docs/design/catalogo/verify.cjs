const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium, webkit, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

const directory = path.join(__dirname, "../.preview-artifacts/catalogo");
const url = pathToFileURL(path.join(directory, "index.html")).href;

async function checkAccessibility(page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  assert.deepEqual(
    violations.map(({ id, nodes }) => ({
      id,
      elements: nodes.map(({ target }) => target),
    })),
    [],
  );
}

async function checkExamples(page) {
  const search = page.getByRole("combobox", {
    name: "Buscar jogadores, equipes ou campeonatos",
  });
  await search.fill("nautico");
  await expect(
    page.getByRole("option", { name: /Clube Náutico/ }),
  ).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Selecionado:" }),
  ).toHaveText("Selecionado: Clube Náutico da Enseada");

  const stats = page.getByRole("table", { name: "Estatísticas por atleta" });
  await expect(stats.getByRole("rowheader").first()).toHaveCSS(
    "text-align",
    "left",
  );
  await expect(stats.getByRole("cell").first()).toHaveCSS(
    "text-align",
    "right",
  );
  const games = stats.getByRole("button", { name: "Ordenar por J (Jogos)" });
  await games.focus();
  await expect(page.getByRole("tooltip")).toHaveText("Jogos");
  await games.press("Enter");
  await expect(
    stats.getByRole("columnheader", { name: "Jogos" }),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(stats.getByRole("rowheader").first()).toHaveText(
    "Isabela Martins",
  );
  await games.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();

  const filter = page.getByRole("button", { name: /Equipe.*Todas as equipes/ });
  await filter.press("Enter");
  const team = page.getByRole("checkbox", { name: "Clube Náutico da Enseada" });
  await team.uncheck();
  await expect(stats.getByRole("rowheader")).toHaveCount(2);
  await team.press("Escape");
  await expect(
    page.getByRole("button", { name: /Equipe.*Equipes/ }),
  ).toBeFocused();

  const picker = page.getByRole("button", { name: /Colunas · 2 de 2/ });
  await picker.press("Enter");
  const gamesChoice = page.getByRole("checkbox", { name: "J · Jogos" });
  await gamesChoice.uncheck();
  await expect(stats.getByRole("columnheader", { name: "Jogos" })).toHaveCount(
    0,
  );
  const legend = page.getByRole("region", { name: "Legenda" });
  await expect(legend).toHaveCount(1);
  await expect(legend.getByText("Jogos", { exact: true })).toHaveCount(0);
  await expect(legend.getByText("Pontos", { exact: true })).toBeVisible();
  await checkAccessibility(page);
  await gamesChoice.press("Escape");
  await expect(
    page.getByRole("button", { name: /Colunas · 1 de 2/ }),
  ).toBeFocused();

  const number = page.getByRole("spinbutton", { name: "Nº do jogo" });
  await number.fill("15");
  await page.getByRole("radio", { name: "Encerrado" }).check();
  await page.getByRole("button", { name: "Salvar jogo" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo de exemplo salvo." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restaurar exemplo" }).click();
  await expect(number).toHaveValue("12");
  await expect(page.getByRole("radio", { name: "Agendado" })).toBeChecked();

  const states = page.getByRole("group", { name: "Estado da consulta" });
  await expect(
    page.getByRole("heading", { name: "Nenhum jogo encontrado" }),
  ).toBeVisible();
  await states.getByRole("button", { name: "Carregando" }).click();
  await expect(
    page.getByRole("heading", { name: "Carregando jogos…" }),
  ).toBeVisible();
  await states.getByRole("button", { name: "Erro" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar os jogos",
  );
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Agenda atualizada." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mostrar notificação" }).click();
  const toast = page.getByRole("region", { name: "Notificação" });
  await expect(toast).toContainText("Local de jogo salvo");
  await toast.getByRole("button", { name: "Dispensar notificação" }).click();
  await expect(toast).toBeHidden();
}

async function main() {
  const engine = process.argv.includes("--webkit") ? webkit : chromium;
  const browser = await engine.launch();
  const prefix = engine === webkit ? "catalogo-webkit" : "catalogo";
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    context.setDefaultTimeout(8000);
    const page = await context.newPage();
    for (const width of [320, 390, 639, 640, 1366, 1920]) {
      await page.setViewportSize({ width, height: width < 640 ? 844 : 768 });
      await page.goto(url);
      await expect(
        page.getByRole("heading", { name: "Design system" }),
      ).toBeVisible();
      await expect(page.getByText("#075fca", { exact: true })).toBeVisible();
      const layout = await page.evaluate(() => {
        const root = document.documentElement;
        return {
          fits: root.scrollWidth <= root.clientWidth,
          scale: getComputedStyle(root).fontSize,
        };
      });
      assert.deepEqual(
        layout,
        { fits: true, scale: width < 640 ? "16px" : "24px" },
        `${width} CSS px`,
      );
      if (width === 390 || width === 1366) {
        await checkAccessibility(page);
        await page.screenshot({
          path: path.join(directory, `${prefix}-${width}.png`),
          fullPage: true,
        });
      }
    }

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => {
      document.body.style.zoom = "2";
    });
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      true,
      "Zoom CSS de 200% deve preservar a largura da página",
    );
    await page.reload();

    const classification = page.getByRole("tab", { name: "Classificação" });
    const games = page.getByRole("tab", { name: "Jogos" });
    await classification.focus();
    await page.keyboard.press("ArrowRight");
    await expect(games).toBeFocused();
    await expect(page.getByRole("tabpanel", { name: "Jogos" })).toBeVisible();
    await page.keyboard.press("Home");
    await expect(classification).toBeFocused();

    const table = page.getByRole("table", {
      name: "Classificação da Liga do Litoral",
    });
    const search = page.getByRole("searchbox", { name: "Buscar equipe" });
    await page.getByRole("button", { name: "Próxima página" }).click();
    await expect(table.getByRole("rowheader").first()).toHaveText(
      "Basquete Vila do Sol",
    );
    await table.getByRole("button", { name: "Vitórias" }).click();
    await expect(
      table.getByRole("columnheader", { name: "Vitórias" }),
    ).toHaveAttribute("aria-sort", "ascending");
    await expect(table.getByRole("rowheader").first()).toHaveText(
      "Basquete Vila do Sol",
    );
    await search.fill("nautico");
    await expect(table.getByRole("rowheader")).toHaveText(
      "Clube Náutico da Enseada",
    );
    await search.fill("equipe inexistente");
    await expect(
      table.getByText("Nenhuma equipe encontrada. Tente outro nome."),
    ).toBeVisible();

    await page.setViewportSize({ width: 320, height: 844 });
    await checkExamples(page);

    const trigger = page.getByRole("button", { name: "Editar local" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Editar local de jogo" });
    const field = dialog.getByRole("textbox", { name: "Nome do local" });
    await expect(field).toBeFocused();
    await field.fill(" ");
    await dialog.getByRole("button", { name: "Salvar local" }).click();
    await expect(field).toBeFocused();
    await expect(field).toHaveAccessibleDescription("Informe o nome do local.");
    await checkAccessibility(page);
    await page.screenshot({
      path: path.join(directory, `${prefix}-dialogo.png`),
    });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await field.fill("Quadra da Enseada");
    await dialog.getByRole("button", { name: "Salvar local" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Local salvo" }),
    ).toHaveText("Local salvo como Quadra da Enseada.");
    await expect(trigger).toBeFocused();
    console.log(
      "Catálogo validado em 6 larguras, com navegação, buscas, filtros, legendas, formulário, diálogo, estados, toast e axe.",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
