const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const { chromium, expect } = require("@playwright/test");
const { default: AxeBuilder } = require("@axe-core/playwright");
const esbuild = require("esbuild");
const root = path.resolve(__dirname, "../../../..");
const out = path.resolve(__dirname, "../../.preview-artifacts/reforma-uiux");
fs.mkdirSync(out, { recursive: true });
const report = {
  scenarios: [],
  screenshots: [],
  errors: [],
  limits:
    "Fixtures locais; não comprova API, persistência, busca real, deploy, WCAG integral ou aceite humano.",
};
async function test(name, action) {
  await action();
  report.scenarios.push(name);
  console.log(`PASS ${name}`);
}
async function screenshot(page, name) {
  await page.screenshot({
    path: path.join(out, `${name}.png`),
    fullPage: false,
  });
  report.screenshots.push(`${name}.png`);
}
async function noOverflow(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "A página não pode ter rolagem horizontal",
  );
}
async function main() {
  execFileSync(
    process.execPath,
    [
      require.resolve("typescript/bin/tsc"),
      "--noEmit",
      "-p",
      path.join(__dirname, "tsconfig.json"),
    ],
    { cwd: root, stdio: "inherit" },
  );
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(fs.readFileSync(path.join(__dirname, "Piloto UIUX.html")));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  async function pageAt(route, width = 1366, height = 768) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.goto(`${origin}/#${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    return page;
  }
  try {
    await test("Jogo: contexto centralizado acima do placar e tipografia proporcional", async () => {
      for (const width of [320, 390, 1366, 1920]) {
        const page = await pageAt("publico/jogo/game-1", width, 844);
        const header = page.locator(".bb-game-header");
        const geometry = await header.evaluate((element) => {
          const score = element.querySelector(".bb-scoreboard > strong");
          const meta = element.querySelector(".bb-game-meta");
          const team = element.querySelector(".bb-scoreboard > a");
          const rect = score.getBoundingClientRect();
          const parent = element.getBoundingClientRect();
          return {
            centerDelta:
              (rect.left + rect.right - parent.left - parent.right) / 2,
            metaBottom: meta.getBoundingClientRect().bottom,
            scoreTop: rect.top,
            scoreSize: parseFloat(getComputedStyle(score).fontSize),
            teamSize: parseFloat(getComputedStyle(team).fontSize),
            metaSize: parseFloat(getComputedStyle(meta).fontSize),
          };
        });
        assert(Math.abs(geometry.centerDelta) < 1);
        assert(geometry.metaBottom <= geometry.scoreTop);
        assert.equal(geometry.scoreSize - geometry.teamSize, 4);
        assert(geometry.metaSize < geometry.teamSize);
        await expect(header).toContainText("Encerrado");
        await noOverflow(page);
        if (width === 390 || width === 1366)
          await screenshot(page, `jogo-cabecalho-${width}`);
        await page.context().close();
      }
    });
    await test("Tabelas compactas à esquerda e equipes por checkboxes combinadas aos filtros", async () => {
      for (const width of [1366, 1920]) {
        for (const route of [
          "publico/jogadores",
          "publico/equipes",
          "admin/jogos",
        ]) {
          const page = await pageAt(route, width, 1080);
          const geometry = await page
            .locator(".bb-table-scroll")
            .first()
            .evaluate((region) => {
              const table = region.querySelector("table");
              const primary = table.querySelector(".bb-primary-cell");
              return {
                start:
                  table.getBoundingClientRect().left -
                  region.getBoundingClientRect().left,
                width: table.getBoundingClientRect().width,
                regionWidth: region.getBoundingClientRect().width,
                primaryWidth: primary.getBoundingClientRect().width,
                numericAlign: getComputedStyle(
                  table.querySelector(".bb-numeric"),
                ).textAlign,
              };
            });
          assert(Math.abs(geometry.start) < 2);
          assert(
            geometry.primaryWidth <= 361,
            "Identificação não pode absorver a largura excedente",
          );
          assert.equal(geometry.numericAlign, "right");
          if (width === 1920 && route === "publico/jogadores")
            assert(
              geometry.width < geometry.regionWidth - 100,
              "Largura excedente deve ficar após a última coluna",
            );
          await noOverflow(page);
          await page.context().close();
        }
      }
      const page = await pageAt("publico/jogadores");
      const filter = page.locator(".team-filter");
      await filter
        .getByRole("button", { name: /Equipe Todas as equipes/ })
        .click();
      await filter
        .getByRole("button", { name: "Não selecionar nenhuma equipe" })
        .click();
      await expect(page.locator("tbody")).toContainText(
        "Nenhum resultado encontrado",
      );
      await filter
        .getByRole("checkbox", { name: "Álvares Cabral", exact: true })
        .check();
      await filter
        .getByRole("checkbox", { name: "Saldanha da Gama", exact: true })
        .check();
      await expect(filter.locator("#team-filter-value")).toHaveText(
        "Equipes · 2 de 6",
      );
      await page.keyboard.press("Escape");
      await expect(filter.locator("button").first()).toBeFocused();
      const search = page.getByRole("searchbox", {
        name: "Buscar jogador na tabela",
      });
      await search.fill("joao");
      await expect(page.locator("tbody tr")).toHaveCount(2);
      await page.locator('[name="minimum-games"]').fill("6");
      await expect(page.locator("tbody")).toContainText(
        "Nenhum resultado encontrado",
      );
      await page.locator('[name="minimum-games"]').fill("0");
      await page.locator("tbody .bb-row-link").first().click();
      await page.getByRole("link", { name: "Voltar a jogadores" }).click();
      await expect(search).toHaveValue("joao");
      await expect(filter.locator("#team-filter-value")).toHaveText(
        "Equipes · 2 de 6",
      );
      await filter.locator("button").first().click();
      await filter
        .getByRole("button", { name: "Selecionar todas as equipes" })
        .click();
      await expect(filter.getByRole("checkbox", { checked: true })).toHaveCount(
        6,
      );
      await page.context().close();
    });
    await test("Público mobile: essenciais, busca no topo e reflow em 390/320 CSS px", async () => {
      const page = await pageAt("publico/jogadores", 390, 844);
      await expect(page.locator("table thead th")).toHaveCount(5);
      assert(
        (
          await page
            .getByRole("combobox", {
              name: "Buscar jogadores, equipes ou campeonatos",
            })
            .boundingBox()
        ).y < 140,
      );
      await noOverflow(page);
      const visibleRows = await page
        .locator("tbody tr")
        .evaluateAll(
          (rows) =>
            rows.filter(
              (row) => row.getBoundingClientRect().bottom <= innerHeight,
            ).length,
        );
      assert(
        visibleRows >= 5,
        "Mobile deve mostrar pelo menos cinco atletas completos na primeira tela",
      );
      await screenshot(page, "publico-mobile");
      await page.setViewportSize({ width: 320, height: 844 });
      await noOverflow(page);
      const columns = page.locator(".bb-column-picker");
      await columns.locator("summary").click();
      await columns.getByRole("checkbox", { name: /^T / }).check();
      await columns.locator("summary").click();
      await page.setViewportSize({ width: 1366, height: 768 });
      await expect(
        page.getByRole("columnheader", { name: "T", exact: true }),
      ).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        page.getByRole("columnheader", { name: "T", exact: true }),
      ).toBeAttached();
      await columns.locator("summary").click();
      for (const cb of await columns.getByRole("checkbox").all())
        await cb.uncheck();
      await columns.locator("summary").click();
      await expect(page.locator("table thead th")).toHaveCount(2);
      await page.reload();
      await expect(page.locator("table thead th")).toHaveCount(2);
      await page.context().close();
    });
    await test("Autocomplete: acentos, caixa, filtros, teclado e participação sem duplicar equipe", async () => {
      const page = await pageAt("publico/jogadores", 390, 844);
      const search = page.getByRole("combobox", {
        name: "Buscar jogadores, equipes ou campeonatos",
      });
      await search.fill("ÁLVARES");
      await expect(
        page.getByRole("option", { name: /Álvares Cabral Vitória/ }),
      ).toHaveCount(1);
      await screenshot(page, "busca-mobile");
      await page.getByRole("button", { name: "Equipes", exact: true }).click();
      await expect(
        page
          .getByRole("listbox", { name: "Sugestões de busca" })
          .getByRole("option"),
      ).toHaveCount(1);
      await search.fill("alvares");
      await expect(
        page
          .getByRole("listbox", { name: "Sugestões de busca" })
          .getByRole("option"),
      ).toHaveCount(1);
      await search.press("ArrowDown");
      await search.press("Enter");
      await expect(
        page.getByRole("heading", { name: "Álvares Cabral", exact: true }),
      ).toBeVisible();
      await page.getByRole("link", { name: /2025 · Masculino/ }).click();
      await expect(page.locator(".bb-context-detail")).toHaveText(
        "2025 · Masculino · Sub-15",
      );
      await search.fill("zzzzsemresultado");
      await expect(
        page.getByText("Nenhum resultado para “zzzzsemresultado”."),
      ).toBeVisible();
      await search.press("Escape");
      await expect(search).toHaveAttribute("aria-expanded", "false");
      await expect(search).toBeFocused();
      await page.context().close();
    });
    await test("Estatísticas: filtro e ordenação preservados ao voltar do perfil", async () => {
      const page = await pageAt("publico/jogadores");
      const visibleRows = await page
        .locator("tbody tr")
        .evaluateAll(
          (rows) =>
            rows.filter(
              (row) => row.getBoundingClientRect().bottom <= innerHeight,
            ).length,
        );
      assert(
        visibleRows >= 10,
        "Desktop deve mostrar pelo menos dez atletas completos na primeira tela",
      );
      await screenshot(page, "publico-desktop");
      const search = page.getByRole("searchbox", {
        name: "Buscar jogador na tabela",
      });
      await search.fill("joao");
      await expect(page.locator("table tbody tr")).toHaveCount(2);
      await page
        .getByRole("columnheader", { name: "Atleta" })
        .getByRole("button")
        .click();
      await page.locator("tbody .bb-row-link").first().click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await page.getByRole("link", { name: "Voltar a jogadores" }).click();
      await expect(search).toHaveValue("joao");
      await expect(
        page.getByRole("columnheader", { name: "Atleta" }),
      ).toHaveAttribute("aria-sort", "ascending");
      await page.context().close();
    });
    await test("Jogos: ordenação da coleção completa antes da paginação, datas, locais e ausentes", async () => {
      const page = await pageAt("admin/jogos");
      await screenshot(page, "jogos-desktop");
      const head = (name) =>
        page
          .getByRole("columnheader", { name, exact: true })
          .getByRole("button");
      await head("Nº").click();
      await expect(
        page.locator("tbody tr").first().locator("td").first(),
      ).toHaveText("1");
      await head("Nº").click();
      await expect(
        page.locator("tbody tr").first().locator("td").first(),
      ).toHaveText("100");
      await page.getByRole("button", { name: "Próxima página" }).click();
      await expect(
        page.locator("tbody tr").last().locator("td").first(),
      ).toHaveText("—");
      await head("Data").click();
      await expect(page.getByText("Página 1 de 2")).toBeVisible();
      const dates = await page
        .locator("tbody tr td:nth-child(3)")
        .allTextContents();
      assert.equal(dates[0], "01/04/2026");
      await head("Local").click();
      await expect(
        page.getByRole("columnheader", { name: "Local" }),
      ).toHaveAttribute("aria-sort", "ascending");
      await noOverflow(page);
      await page.context().close();
    });
    await test("Cadastro de jogo: foco, validação, cancelamento e salvamento contextual", async () => {
      const page = await pageAt("admin/jogos");
      const opener = page.getByRole("button", { name: "Novo jogo" });
      await opener.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      assert(await dialog.evaluate((d) => d.contains(document.activeElement)));
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(opener).toBeFocused();
      await opener.click();
      await dialog.getByLabel("Equipe visitante").selectOption("alvares");
      await dialog.getByRole("button", { name: "Salvar jogo" }).click();
      await expect(dialog.getByRole("alert")).toContainText(
        "equipes diferentes",
      );
      await dialog.getByLabel("Equipe visitante").selectOption("saldanha");
      await dialog.getByLabel("Nº do jogo").fill("101");
      await screenshot(page, "jogo-dialogo");
      await dialog.getByRole("button", { name: "Salvar jogo" }).click();
      await expect(page.getByRole("status")).toContainText(
        "Jogo salvo nesta sessão",
      );
      await page.context().close();
    });
    await test("Informações: campos proporcionais e guarda de alterações por abas e histórico", async () => {
      const page = await pageAt("admin/informacoes");
      const category = page.getByRole("textbox", {
        name: "Categoria da disputa 1.1",
        exact: true,
      });
      const size = await category.boundingBox();
      assert(size.width >= 100 && size.width <= 180);
      await screenshot(page, "informacoes-desktop");
      await category.fill("Adulto alterado");
      page.once("dialog", (dialog) => dialog.dismiss());
      await page.getByRole("link", { name: "Jogos", exact: true }).click();
      await expect(category).toHaveValue("Adulto alterado");
      await page.getByRole("button", { name: "Salvar campeonato" }).click();
      await expect(page.getByRole("status")).toHaveText("Salvo nesta sessão");
      await category.fill("Adulto novamente");
      page.once("dialog", (dialog) => dialog.dismiss());
      await page.evaluate(() => {
        location.hash = "admin/jogos";
      });
      await expect(category).toHaveValue("Adulto novamente");
      await page.context().close();
    });
    await test("Equipes: dois painéis, 12 atletas, camisa 00, foco e retorno no celular", async () => {
      const page = await pageAt("admin/equipes");
      await expect(
        page.getByText("Selecione uma equipe para ver o elenco."),
      ).toBeVisible();
      await page
        .getByRole("searchbox", { name: "Buscar equipe inscrita" })
        .fill("alvares");
      await page
        .getByRole("button", { name: /Álvares Cabral 12 atletas/ })
        .click();
      await expect(page.locator("tbody tr")).toHaveCount(12);
      await page
        .getByRole("searchbox", { name: "Buscar equipe inscrita" })
        .fill("");
      const sidebar = await page.locator(".bb-team-sidebar").boundingBox(),
        roster = await page.locator(".bb-roster-panel").boundingBox();
      assert(sidebar.x + sidebar.width < roster.x);
      assert(roster.width > sidebar.width * 2);
      await screenshot(page, "elenco-desktop");
      await page
        .getByRole("searchbox", { name: "Buscar equipe inscrita" })
        .fill("alvares");
      await page
        .getByRole("button", { name: /^Editar João Pedro Silva$/ })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Camisa", { exact: true }).fill("00");
      page.once("dialog", (d) => d.dismiss());
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Salvar atleta" }).click();
      await expect(dialog.getByRole("alert")).toContainText(
        "Esta camisa já está em uso",
      );
      await dialog.getByLabel("Camisa", { exact: true }).fill("99");
      await dialog.getByRole("button", { name: "Salvar atleta" }).click();
      await expect(
        page.locator("tbody tr").first().locator("td").first(),
      ).toHaveText("99");
      await expect(
        page.locator("tbody td").getByText("00", { exact: true }),
      ).toHaveCount(1);
      await expect(
        page.locator("tbody td").getByText("0", { exact: true }),
      ).toHaveCount(1);
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow(page);
      await page.getByRole("button", { name: "Voltar às equipes" }).click();
      await expect(
        page.getByRole("searchbox", { name: "Buscar equipe inscrita" }),
      ).toHaveValue("alvares");
      await page.context().close();
    });
    await test("Busca compartilhada: erro recuperável, resposta antiga descartada e expansão dos resultados", async () => {
      const bundle = await esbuild.build({
        absWorkingDir: root,
        stdin: {
          resolveDir: root,
          loader: "tsx",
          contents: `import React from "react"; import {createRoot} from "react-dom/client"; import {GlobalSearch} from "./src/ui-system/global-search"; let failed=false; const provider=async(q,type,signal)=>{await new Promise(r=>setTimeout(r,q==="antigo"?800:20)); if(q==="falha"&&!failed){failed=true;throw Error("fixture");} return [{type:"players",label:"Jogadores",items:Array.from({length:8},(_,i)=>({id:String(i),type:"players",label:q+" "+i,description:"Fixture"}))}];}; createRoot(document.getElementById("root")).render(<main><GlobalSearch provider={provider} onSelect={()=>{}}/></main>);`,
        },
        bundle: true,
        write: false,
        format: "iife",
        jsx: "automatic",
        define: { "process.env.NODE_ENV": '"production"' },
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setContent(
        '<html lang="pt-BR"><body><div id="root"></div></body></html>',
      );
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      const search = page.getByRole("combobox");
      await search.fill("falha");
      await expect(page.getByText("Não foi possível buscar.")).toBeVisible();
      await page.getByRole("button", { name: "Tentar novamente" }).click();
      await expect(
        page
          .getByRole("listbox", { name: "Sugestões de busca" })
          .getByRole("option"),
      ).toHaveCount(5);
      await page.getByRole("button", { name: "Ver mais resultados" }).click();
      await expect(
        page
          .getByRole("listbox", { name: "Sugestões de busca" })
          .getByRole("option"),
      ).toHaveCount(8);
      await search.fill("antigo");
      await page.waitForTimeout(350);
      await search.fill("novo");
      await expect(
        page
          .getByRole("listbox", { name: "Sugestões de busca" })
          .getByRole("option")
          .first(),
      ).toContainText("novo");
      await page.waitForTimeout(600);
      await expect(
        page
          .getByRole("listbox", { name: "Sugestões de busca" })
          .getByRole("option")
          .first(),
      ).toContainText("novo");
      await context.close();
    });
    await test("Acessibilidade e reflow nas telas representativas, menus e diálogos", async () => {
      for (const [width, height] of [
        [390, 844],
        [1366, 768],
        [1920, 1080],
      ]) {
        const page = await pageAt("publico/jogadores", width, height);
        for (const route of [
          "publico/jogadores",
          "publico/equipes",
          "publico/classificacao",
          "publico/campeonatos",
          "publico/jogador/player-1",
          "admin/jogos",
          "admin/informacoes",
          "admin/equipes",
        ]) {
          await page.goto(`${origin}/#${route}`);
          await expect(page.locator("main h1")).toBeVisible();
          await noOverflow(page);
          const result = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze();
          assert.deepEqual(
            result.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
            [],
            `${route} em ${width}`,
          );
        }
        await page.goto(`${origin}/#admin/jogos`);
        await page.getByRole("button", { name: "Novo jogo" }).click();
        const modal = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.deepEqual(
          modal.violations.map((v) => v.id),
          [],
          `Diálogo em ${width}`,
        );
        await page.keyboard.press("Escape");
        await page.goto(`${origin}/#publico/jogadores`);
        await page.locator(".bb-column-picker summary").click();
        const menu = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.deepEqual(
          menu.violations.map((v) => v.id),
          [],
          `Seletor de colunas em ${width}`,
        );
        await page.keyboard.press("Escape");
        await page
          .getByRole("combobox", {
            name: "Buscar jogadores, equipes ou campeonatos",
          })
          .fill("joao");
        await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(
          2,
        );
        const autocomplete = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.deepEqual(
          autocomplete.violations.map((v) => v.id),
          [],
          `Autocomplete em ${width}`,
        );
        await page.context().close();
      }
      const page = await pageAt("admin/informacoes");
      await page.evaluate(() => {
        document.body.style.zoom = "2";
      });
      await noOverflow(page);
      await screenshot(page, "informacoes-zoom200");
      await page.context().close();
    });
    assert.deepEqual(report.errors, [], "Erros JavaScript no navegador");
  } finally {
    fs.writeFileSync(
      path.join(out, "verification.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(
    `Piloto UI/UX: ${report.scenarios.length} cenários PASS; ${report.screenshots.length} capturas.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
