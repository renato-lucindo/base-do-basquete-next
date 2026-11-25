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
  const metricWidths = () =>
    stats
      .locator("th.bb-metric-column")
      .evaluateAll((items) =>
        items.map((el) => el.getBoundingClientRect().width),
      );
  const totalWidths = await metricWidths();
  const example = page.locator(".catalog-statistics");
  await example.getByRole("button", { name: "Por jogo", exact: true }).click();
  const averageWidths = await metricWidths();
  averageWidths.forEach((width, index) =>
    assert.ok(Math.abs(width - totalWidths[index]) < 1),
  );
  for (const header of await stats.locator("th.bb-metric-column").all())
    await expect(header).toHaveCSS("text-align", "center");
  await example.getByRole("button", { name: "Totais", exact: true }).click();
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
  const legend = page
    .locator(".catalog-statistics")
    .getByRole("region", { name: "Legenda" });
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
  await page.getByRole("button", { name: "Mostrar sucesso" }).click();
  const toast = page.getByRole("region", { name: "Notificação" });
  await expect(toast).toHaveAttribute("data-tone", "success");
  await expect(toast).toContainText("Local de jogo salvo");
  await toast.getByRole("button", { name: "Dispensar notificação" }).click();
  await expect(toast).toBeHidden();
  for (const [label, tone] of [
    ["erro", "error"],
    ["aviso", "warning"],
  ]) {
    await page.getByRole("button", { name: "Mostrar " + label }).click();
    await expect(toast).toHaveAttribute("data-tone", tone);
    await expect(toast.locator(".admin-toast-icon svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    if (tone === "warning") {
      await expect(toast.locator(".admin-toast-icon")).toHaveCSS(
        "color",
        "rgb(0, 0, 0)",
      );
      await expect(toast.locator(".admin-toast-icon")).toHaveCSS(
        "border-top-color",
        "rgb(0, 0, 0)",
      );
    }
    await toast.getByRole("button", { name: "Dispensar notificação" }).click();
    await expect(toast).toBeHidden();
  }
}

async function checkApprovedGuide(page, prefix) {
  const guide = pathToFileURL(
    path.join(directory, "guia-completo-autonomo.html"),
  ).href;
  await page.goto(guide);
  await expect(
    page.getByRole("heading", { name: "Iconografia" }),
  ).toBeVisible();
  const settings = page.locator('[title="settings"] svg');
  await expect(settings).toBeVisible();
  const geometry = await settings.evaluate((svg) => {
    const border = svg.querySelector("path").getBBox();
    const frame = svg.viewBox.baseVal;
    const center = svg.querySelector("circle");
    const stroke = Number(svg.getAttribute("stroke-width"));
    const x = border.x - frame.x;
    const y = border.y - frame.y;
    return {
      square: Math.abs(border.width - border.height) < 0.05,
      centered:
        Math.abs(x + border.width / 2 - frame.width / 2) < 0.05 &&
        Math.abs(y + border.height / 2 - frame.height / 2) < 0.05 &&
        center.cx.baseVal.value === frame.x + frame.width / 2 &&
        center.cy.baseVal.value === frame.y + frame.height / 2,
      unclipped:
        x > stroke / 2 &&
        y > stroke / 2 &&
        x + border.width + stroke / 2 < frame.width &&
        y + border.height + stroke / 2 < frame.height,
    };
  });
  assert.deepEqual(geometry, { square: true, centered: true, unclipped: true });
  await page.locator('[title="settings"]').screenshot({
    path: path.join(directory, `${prefix}-engrenagem.png`),
  });

  const visibility = page.locator("#visibility-open");
  const menu = page.locator("#visibility-panel");
  const confirm = page.locator("#confirm-modal");
  await expect(visibility).toHaveText("Privada");
  await visibility.click();
  await menu.getByRole("button", { name: "Pública", exact: true }).click();
  await confirm.getByRole("button", { name: "Confirmar alteração" }).click();
  await expect(visibility).toHaveText("Pública");
  await visibility.click();
  await menu.getByRole("button", { name: "Privada", exact: true }).click();
  await expect(confirm).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirm).toBeHidden();
  await expect(visibility).toBeFocused();
  await expect(visibility).toHaveText("Pública");

  const sampleCategory = page.locator("#demo-category");
  const sampleAge = page.getByLabel("Faixa Etária", { exact: true });
  await expect(sampleAge).toBeHidden();
  for (const [category, age] of [
    ["Base", "15"],
    ["Master", "35"],
  ]) {
    await sampleCategory.selectOption(category);
    await expect(sampleAge).toBeVisible();
    await sampleAge.selectOption(age);
    await expect(sampleAge).toHaveValue(age);
  }
  await sampleCategory.selectOption("Adulto");
  await expect(sampleAge).toBeHidden();
  const discardSample = page.getByRole("button", {
    name: "Descartar alterações",
    exact: true,
  });
  await expect(discardSample).toHaveCSS("background-color", "rgb(229, 34, 7)");
  await expect(discardSample).toHaveCSS("color", "rgb(255, 255, 255)");
  await discardSample.click();
  await expect(
    confirm.getByRole("button", { name: "Descartar alterações", exact: true }),
  ).toHaveCSS("background-color", "rgb(229, 34, 7)");
  await page.keyboard.press("Escape");
  await expect(confirm).toBeHidden();
  await expect(discardSample).toBeFocused();

  await page
    .getByRole("link", { name: "Abrir exemplo de disputas" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/disputas\.html$/);
  await expect(
    page.getByRole("heading", { name: "Gestão de disputas", level: 1 }),
  ).toBeVisible();
  await page.locator("#new-btn").click();
  const create = page.locator("#create-dialog");
  await expect(
    create.getByRole("button", { name: "Fechar criação" }),
  ).toHaveCSS("background-color", "rgb(229, 34, 7)");
  await expect(
    create.getByRole("button", { name: "Fechar criação" }),
  ).toHaveCSS("color", "rgb(255, 255, 255)");
  for (const [category, age] of [
    ["base", "Sub-15"],
    ["master", "35+"],
  ]) {
    await page.locator("#category").selectOption(category);
    await expect(
      create.getByText("Faixa Etária", { exact: true }),
    ).toBeVisible();
    await page.locator("#age-picker").click();
    await page.getByRole("option", { name: age, exact: true }).click();
    await expect(page.locator("#age-picker")).toHaveText(age);
  }
  await page.locator("#category").selectOption("adulto");
  await expect(page.locator("#age-field")).toBeHidden();
  page.once("dialog", (dialog) => dialog.accept());
  await create.getByRole("button", { name: "Fechar criação" }).click();
  await page.locator("#edit-example").click();
  const edit = page.locator("#edit-dialog");
  const discard = edit.getByRole("button", {
    name: "Descartar alterações",
    exact: true,
  });
  await expect(discard).toHaveCSS("background-color", "rgb(229, 34, 7)");
  await expect(discard).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(edit.getByText("Faixa Etária", { exact: true })).toBeVisible();
  await discard.click();
  await expect(edit).toBeHidden();
  await page.getByRole("link", { name: /Voltar ao catálogo/ }).click();
  await expect(
    page.getByRole("heading", { name: "Design system" }),
  ).toBeVisible();
}

async function checkProfilePatterns(page) {
  const sample = page.locator("#perfis");
  const year = sample.getByRole("combobox", { name: "Ano", exact: true });
  await expect(year).toHaveCount(1);
  assert.equal(
    await year.evaluate((el) => el.closest('[role="tablist"]') === null),
    true,
  );
  await expect(sample.locator(".public-dispute-status")).toHaveCSS(
    "font-size",
    "14px",
  );
  const bar = sample.locator(".team-profile-tabbar");
  const before = await bar.evaluate(
    (el) => el.getBoundingClientRect().top + window.scrollY,
  );
  const trigger = sample.getByRole("button", { name: "Copa ES", exact: true });
  await trigger.click();
  await expect(
    sample.getByRole("navigation", { name: "Seleção de exemplo" }),
  ).toBeVisible();
  assert.equal(
    await bar.evaluate((el) => el.getBoundingClientRect().top + window.scrollY),
    before,
  );
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await year.selectOption("2025");
  await sample.getByRole("tab", { name: "Estatísticas", exact: true }).click();
  await sample.getByRole("button", { name: "Por jogo", exact: true }).click();
  await expect(
    sample.getByRole("cell", { name: "60", exact: true }),
  ).toBeVisible();
  await expect(sample.locator(".reference-legend dl")).toHaveCSS(
    "display",
    "grid",
  );
  await expect(
    sample.getByRole("columnheader", { name: "Participação", exact: true }),
  ).toHaveCSS("text-align", "center");
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
        { fits: true, scale: "16px" },
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

    await checkProfilePatterns(page);
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
    await page.setViewportSize({ width: 390, height: 844 });
    await checkApprovedGuide(page, prefix);
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
