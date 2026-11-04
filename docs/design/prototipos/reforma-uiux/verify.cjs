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
async function screenshot(page, name, fullPage = false) {
  await page.screenshot({
    path: path.join(out, `${name}.png`),
    fullPage,
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
  const fixtureBundle = esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: [path.join(__dirname, "fixtures.ts")],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "browser",
  });
  const fixtureModule = { exports: {} };
  new Function(
    "module",
    "exports",
    "window",
    fixtureBundle.outputFiles[0].text,
  )(fixtureModule, fixtureModule.exports, {});
  const domain = fixtureModule.exports;
  await test("Fixtures: identidade, participação, placar, parciais, totais e ausência consistentes", async () => {
    assert.equal(
      new Set(domain.players.map((p) => p.id)).size,
      domain.players.length,
    );
    for (const team of domain.teams) {
      const roster = domain.players.filter((p) => p.team.id === team.id);
      assert.equal(roster.length, 12);
      assert.equal(new Set(roster.map((p) => p.shirt)).size, 12);
      assert(
        roster.some((p) => p.shirt === "0") &&
          roster.some((p) => p.shirt === "00"),
      );
    }
    for (const game of domain.publishedGames) {
      const seen = new Set();
      for (const side of ["home", "away"]) {
        const team = game.sheet[side];
        assert.equal(team.players.filter((p) => p.starter).length, 5);
        assert.equal(
          team.periods.reduce((a, b) => a + b, 0),
          team.points,
        );
        assert.equal(team.points, game[`${side}Points`]);
        assert.equal(
          team.players.reduce((sum, p) => sum + (p.points ?? 0), 0),
          team.points,
        );
        for (const [i, points] of team.periods.entries())
          assert.equal(
            team.players.reduce(
              (sum, p) => sum + (p.quarters[i].points ?? 0),
              0,
            ),
            points,
          );
        for (const player of team.players) {
          assert(
            !seen.has(player.id),
            "Identidade não pode atuar pelas duas equipes na mesma partida",
          );
          seen.add(player.id);
          for (const period of player.quarters) {
            if (period.played)
              assert.equal(
                period.points,
                2 * period.two + 3 * period.three + period.free,
              );
            else
              for (const key of ["points", "two", "three", "free", "fouls"])
                assert.equal(period[key], null);
          }
          for (const key of ["points", "two", "three", "free"])
            assert.equal(
              player[key],
              player.played
                ? player.quarters.reduce((sum, p) => sum + (p[key] ?? 0), 0)
                : null,
            );
          if (player.fouls !== null)
            assert.equal(player.fouls, player.foulEvents.length);
        }
      }
    }
    for (const player of domain.players) {
      const records = domain.appearances(player.id);
      assert(
        records.every(
          (row) => row.player.id === player.id && row.player.played,
        ),
      );
      assert.equal(
        player.games,
        records.filter((row) => row.game.year === 2026).length,
      );
      assert.equal(
        player.points,
        records
          .filter((row) => row.game.year === 2026)
          .reduce((sum, row) => sum + row.player.points, 0),
      );
    }
    assert.equal(
      domain.appearances("player-7").length,
      0,
      "Relacionado sem atuação não ganha jogos no perfil",
    );
    assert.equal(domain.participations("player-1").length, 3);
    assert(
      domain
        .participations("player-1")
        .some((row) => row.games === 0 && row.fouls === null),
    );
  });
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
    await test("Perfil mobile: essenciais, seletor de colunas persistente e gráfico por teclado", async () => {
      const page = await pageAt(
        "publico/jogador/player-1?secao=estatisticas",
        390,
        844,
      );
      const table = page.getByRole("region", {
        name: "Estatísticas da carreira por competição",
        exact: true,
      });
      await expect(table.locator("thead th")).toHaveCount(4);
      const siglas = page.getByRole("button", { name: "Siglas", exact: true });
      await siglas.click();
      await expect(page.getByRole("dialog")).toContainText("Pontos");
      await page.keyboard.press("Escape");
      await expect(siglas).toBeFocused();
      await expect(table).toContainText("Álvares Cabral · 4");
      await screenshot(page, "perfil-estatisticas-mobile");
      const columns = page.locator(".bb-column-picker");
      await columns.locator("summary").click();
      await page.setViewportSize({ width: 320, height: 844 });
      await noOverflow(page);
      await columns.getByRole("checkbox", { name: /^F / }).check();
      await page.keyboard.press("Escape");
      await expect(columns.locator("summary")).toBeFocused();
      await page.setViewportSize({ width: 1366, height: 768 });
      await expect(
        table.getByRole("columnheader", { name: "F", exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        table.getByRole("columnheader", { name: "F", exact: true }),
      ).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      const chart = page.locator("figure");
      await chart.focus();
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => chart.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      await page.getByRole("tab", { name: "Jogos", exact: true }).click();
      await expect(
        page.getByRole("columnheader", { name: "F", exact: true }),
      ).toBeVisible();
      await noOverflow(page);
      await page.context().close();
    });
    await test("Retorno do perfil restaura contexto e posição da tabela no celular", async () => {
      const page = await pageAt(
        "publico/jogadores?competition=Copa+ES&year=2026&gender=Masculino&category=Sub-15",
        390,
        844,
      );
      await page.evaluate(() => scrollTo(0, 160));
      const before = await page.evaluate(() => scrollY);
      assert(before > 100);
      const link = page.locator("tbody .bb-row-link").nth(5);
      await expect(link).toHaveAttribute("href", /competition=Copa\+ES/);
      await link.click();
      await expect(
        page.getByRole("tab", { name: "Resumo", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await page
        .getByRole("link", { name: "Voltar a jogadores", exact: true })
        .click();
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(before);
      assert.equal(
        new URLSearchParams(page.url().split("?")[1]).get("gender"),
        "Masculino",
      );
      await page.context().close();
    });
    await test("Súmula: parciais, recortes sincronizados, faltas, zero, ausência e cenários publicados", async () => {
      const page = await pageAt("publico/jogo/game-1", 1366, 768);
      const teams = page.locator(".bb-score-team");
      await expect(teams).toHaveCount(2);
      for (const team of await teams.all()) {
        await expect(team.locator("tbody tr")).toHaveCount(12);
        await expect(team.locator(".bb-starter")).toHaveCount(5);
        await expect(team.locator(".bb-captain")).toHaveCount(1);
      }
      const visible = await teams
        .first()
        .locator("tbody tr")
        .evaluateAll(
          (rows) =>
            rows.filter(
              (row) => row.getBoundingClientRect().bottom <= innerHeight,
            ).length,
        );
      assert(
        visible >= 6,
        "Primeira tela desktop deve mostrar pelo menos seis atletas completos por equipe",
      );
      const scores = await page.locator(".bb-final-score").allTextContents();
      await page.getByRole("button", { name: "1ª PR", exact: true }).click();
      await expect(teams.first().locator("tfoot td").first()).toHaveText("12");
      await expect(teams.last().locator("tfoot td").first()).toHaveText("7");
      assert.deepEqual(
        await page.locator(".bb-final-score").allTextContents(),
        scores,
      );
      const zero = teams.first().locator('[data-player="player-alvares-6"]');
      await page.getByRole("button", { name: "1º Q", exact: true }).click();
      await expect(zero.locator("td").nth(1)).toHaveText("—");
      await page.getByRole("button", { name: "2º Q", exact: true }).click();
      await expect(zero.locator("td").nth(1)).toHaveText("0");
      await page
        .getByRole("button", { name: "Jogo todo", exact: true })
        .click();
      const trigger = teams.first().getByRole("button", {
        name: "Faltas de Ruan Pereira: 5",
        exact: true,
      });
      const sizes = await trigger.evaluate((button) => ({
        cell: button.parentElement.getBoundingClientRect().toJSON(),
        button: button.getBoundingClientRect().toJSON(),
      }));
      assert(
        Math.abs(sizes.cell.height - sizes.button.height) < 2 &&
          Math.abs(sizes.cell.width - sizes.button.width) < 2,
        "Toda a célula F deve abrir o detalhe",
      );
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("Excluído por cinco faltas");
      await expect(dialog.locator("li")).toHaveCount(5);
      await expect(dialog.getByText(/Antidesportiva/)).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await screenshot(page, "sumula-desktop", true);
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow(page);
      const first = await teams.first().boundingBox(),
        second = await teams.last().boundingBox();
      assert(second.y > first.y + first.height);
      await screenshot(page, "sumula-mobile", true);
      await page.goto(`${origin}/#publico/jogo/game-2`);
      await expect(page.locator(".bb-free-summary").first()).toContainText(
        "17/—",
      );
      await expect(page.locator(".bb-parcials")).toContainText("— FC");
      await page.getByRole("button", { name: /não informadas/ }).click();
      await expect(dialog).toContainText("Faltas não informadas neste recorte");
      await page.keyboard.press("Escape");
      await page.goto(`${origin}/#publico/jogo/game-3`);
      for (const summary of await page.locator(".bb-free-summary").all())
        await expect(summary).toContainText("0/0 · —");
      await page.goto(`${origin}/#publico/jogo/game-24`);
      await expect(page.locator(".bb-game-header")).toContainText("Agendado");
      await expect(page.locator(".bb-score-team")).toHaveCount(0);
      await expect(page.locator(".bb-final-score").first()).toHaveText("—");
      await page.context().close();
    });
    await test("Perfil: carreira completa, filtros compartilháveis, participação real e retorno do jogo", async () => {
      const page = await pageAt(
        "publico/jogador/player-1?competition=Copa+ES&year=2026&gender=Masculino&category=Sub-15",
      );
      await expect(
        page.getByRole("tab", { name: "Resumo", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(page.locator(".bb-participation-list li")).toHaveCount(3);
      await expect(page.locator(".bb-career-numbers dd").first()).toHaveText(
        "10",
      );
      await expect(page.locator(".bb-context-wrap")).toHaveCount(0);
      await screenshot(page, "perfil-resumo-desktop");
      await page
        .getByRole("tab", { name: "Estatísticas", exact: true })
        .click();
      await expect(page.locator('[name="profile-year"]')).toHaveValue("all");
      const table = page.getByRole("region", {
        name: "Estatísticas da carreira por competição",
        exact: true,
      });
      await expect(table.locator("tbody tr")).toHaveCount(3);
      await page.getByRole("button", { name: "Totais", exact: true }).click();
      await expect(
        table.locator("tbody tr").first().locator("td").nth(3),
      ).toHaveText("92");
      await expect(table.locator("tbody tr").last()).toContainText("—");
      await screenshot(page, "perfil-estatisticas-desktop");
      await page.locator('[name="profile-year"]').selectOption("2025");
      await expect(table.locator("tbody tr")).toHaveCount(1);
      await expect(table).toContainText("GS Nice de Paula");
      await page.reload();
      await expect(
        page.getByRole("tab", { name: "Estatísticas", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(page.locator('[name="profile-year"]')).toHaveValue("2025");
      await expect(
        page.getByRole("button", { name: "Totais", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("tab", { name: "Jogos", exact: true }).click();
      await expect(page.locator("tbody tr")).toHaveCount(2);
      await page.locator("tbody a").first().click();
      await expect(page.locator(".bb-context-detail")).toHaveText(
        "2025 · Masculino · Sub-14",
      );
      await page
        .getByRole("link", { name: "Voltar ao perfil", exact: true })
        .click();
      await expect(
        page.getByRole("tab", { name: "Jogos", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(page.locator('[name="profile-year"]')).toHaveValue("2025");
      await page
        .getByRole("button", { name: "Limpar filtros", exact: true })
        .click();
      await expect(page.locator("tbody tr")).toHaveCount(10);
      await page.locator(".team-filter > button").click();
      await page
        .getByRole("button", { name: "Não selecionar nenhuma equipe" })
        .click();
      await page.keyboard.press("Escape");
      await expect(page.locator("tbody")).toContainText(
        "Nenhum jogo com participação",
      );
      await page.reload();
      await expect(page.locator("#team-filter-value")).toHaveText(
        "Nenhuma equipe",
      );
      await page
        .getByRole("button", { name: "Limpar filtros", exact: true })
        .click();
      await page.getByRole("tab", { name: "Histórico", exact: true }).click();
      await expect(page.locator(".bb-participation-list li")).toHaveCount(3);
      await page
        .getByRole("tab", { name: "Conquistas e honrarias", exact: true })
        .click();
      await expect(page.locator(".bb-honors li")).toHaveCount(2);
      await page.goto(`${origin}/#publico/jogador/player-7?secao=jogos`);
      await expect(page.locator("tbody")).toContainText(
        "Nenhum jogo com participação",
      );
      await page
        .getByRole("tab", { name: "Conquistas e honrarias", exact: true })
        .click();
      await expect(
        page.getByText("Nenhuma conquista publicada para este jogador."),
      ).toBeVisible();
      await page.goto(`${origin}/#publico/jogador/player-1`);
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow(page);
      await screenshot(page, "perfil-resumo-mobile");
      await page.context().close();
    });
    await test("Jogo: contexto centralizado acima do placar e tipografia proporcional", async () => {
      for (const width of [320, 390, 1366, 1920]) {
        const page = await pageAt("publico/jogo/game-1", width, 844);
        const header = page.locator(".bb-game-header");
        const geometry = await header.evaluate((element) => {
          const scores = [...element.querySelectorAll(".bb-final-score")];
          const score = scores[0];
          const meta = element.querySelector(".bb-game-meta");
          const team = element.querySelector(".bb-score-side > a");
          const rect = score.getBoundingClientRect();
          const parent = element
            .querySelector(".bb-match-score")
            .getBoundingClientRect();
          const second = scores[1].getBoundingClientRect();
          return {
            blockCenterDelta: (parent.left + parent.right) / 2 - innerWidth / 2,
            centerDelta:
              ((rect.left + rect.right + second.left + second.right) / 2 -
                parent.left -
                parent.right) /
              2,
            metaBottom: meta.getBoundingClientRect().bottom,
            scoreTop: rect.top,
            scoreSize: parseFloat(getComputedStyle(score).fontSize),
            teamSize: parseFloat(getComputedStyle(team).fontSize),
            metaSize: parseFloat(getComputedStyle(meta).fontSize),
          };
        });
        assert(Math.abs(geometry.blockCenterDelta) < 1);
        if (width >= 640) assert(Math.abs(geometry.centerDelta) < 1);
        assert(geometry.metaBottom <= geometry.scoreTop);
        assert(
          geometry.scoreSize / geometry.teamSize >= 1 &&
            geometry.scoreSize / geometry.teamSize <= 1.8,
        );
        assert(geometry.metaSize < geometry.teamSize);
        await expect(header).toContainText("Encerrado");
        await noOverflow(page);
        if (width === 390 || width === 1366)
          await screenshot(page, `jogo-cabecalho-${width}`);
        await page.context().close();
      }
    });
    await test("Detalhes: nomes longos sem colisão com o placar e PTS recentes visíveis em 320/390", async () => {
      for (const width of [320, 390]) {
        const page = await pageAt("publico/jogo/game-1", width, 844);
        await page.locator(".bb-score-home a").evaluate((link) => {
          link.textContent = "Associação de Basquetebol de São José dos Campos";
        });
        await page.locator(".bb-score-away a").evaluate((link) => {
          link.textContent = "Clube de Regatas e Esportes Saldanha da Gama";
        });
        await page
          .locator(".bb-athlete-name a")
          .first()
          .evaluate((link) => {
            link.textContent = "José Antônio de Albuquerque e Vasconcelos";
          });
        const home = await page.locator(".bb-score-home").boundingBox();
        const away = await page.locator(".bb-score-away").boundingBox();
        assert(home.y + home.height <= away.y);
        for (const side of await page.locator(".bb-score-side").all()) {
          const label = await side.locator("a").boundingBox();
          const score = await side.locator(".bb-final-score").boundingBox();
          assert(
            label.x + label.width <= score.x,
            "Nome completo e placar não podem se sobrepor",
          );
        }
        await noOverflow(page);
        if (width === 320) await screenshot(page, "sumula-nomes-longos-320");
        await page.goto(`${origin}/#publico/jogador/player-1`);
        const recent = page.getByRole("region", {
          name: "Jogos recentes do jogador",
          exact: true,
        });
        const bounds = await recent.boundingBox();
        for (const cell of await recent.locator("tbody td:last-child").all()) {
          const rect = await cell.boundingBox();
          assert(
            rect.x >= bounds.x &&
              rect.x + rect.width <= bounds.x + bounds.width + 1,
            "PTS de jogos recentes deve estar visível sem rolar horizontalmente",
          );
        }
        await page.locator("h1").evaluate((heading) => {
          heading.textContent = "José Antônio de Albuquerque e Vasconcelos";
        });
        await noOverflow(page);
        if (width === 320) await screenshot(page, "perfil-nome-longo-320");
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
      await page.locator('[name="minimum-games"]').fill("99");
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
      await page.keyboard.press("Escape");
      await search.fill("");
      const foulsHeader = page.getByRole("columnheader", {
        name: "F",
        exact: true,
      });
      await foulsHeader.getByRole("button").click();
      await expect(
        page.locator("tbody tr").first().locator("td").first(),
      ).toHaveText("1");
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
      await expect(page.locator("main")).toBeFocused();
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
        .getByRole("button", { name: /^Editar João Pedro Silva, camisa 4$/ })
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
          "publico/jogo/game-1",
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
        await page.goto(`${origin}/#publico/jogador/player-1`);
        for (const label of [
          "Resumo",
          "Estatísticas",
          "Conquistas e honrarias",
          "Jogos",
          "Histórico",
        ]) {
          await page.getByRole("tab", { name: label, exact: true }).click();
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
            `Perfil ${label} em ${width}`,
          );
        }
        await page
          .getByRole("tab", { name: "Estatísticas", exact: true })
          .click();
        await page.locator(".team-filter > button").click();
        const teamsMenu = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.deepEqual(
          teamsMenu.violations.map((v) => v.id),
          [],
          `Checkboxes em ${width}`,
        );
        await page.keyboard.press("Escape");
        await page.goto(`${origin}/#publico/jogo/game-1`);
        await page.locator(".bb-foul-trigger").first().click();
        const fouls = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.deepEqual(
          fouls.violations.map((v) => v.id),
          [],
          `Faltas em ${width}`,
        );
        await page.keyboard.press("Escape");
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
      for (const route of [
        "publico/jogo/game-1",
        "publico/jogador/player-1?secao=estatisticas",
      ]) {
        const detail = await pageAt(route, 320, 844);
        await noOverflow(detail);
        await detail.setViewportSize({ width: 1366, height: 768 });
        await detail.evaluate(() => {
          document.body.style.zoom = "2";
        });
        await noOverflow(detail);
        await detail.context().close();
      }
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
