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

async function main() {
  const engine = process.argv.includes("--webkit") ? webkit : chromium;
  const browser = await engine.launch();
  const prefix = engine === webkit ? "catalogo-webkit" : "catalogo";
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
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
    await expect(page.getByRole("status")).toHaveText(
      "Local salvo como Quadra da Enseada.",
    );
    await expect(trigger).toBeFocused();
    console.log(
      "Catálogo validado em 6 larguras, com ordenação, busca, paginação, teclado, diálogo, erro, feedback e axe.",
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
