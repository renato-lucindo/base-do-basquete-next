const { chromium, firefox, webkit } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { fileURLToPath } = require("node:url");
const output = __dirname;
async function main() {
  const provenance = JSON.parse(
    fs.readFileSync(path.join(__dirname, "provenance.json"), "utf8"),
  );
  const sha = (bytes) =>
    crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(
    sha(fs.readFileSync(path.resolve(__dirname, provenance.archive))),
    provenance.archiveSha256,
  );
  for (const source of provenance.sources)
    assert.equal(
      sha(fs.readFileSync(path.join(__dirname, source.local))),
      source.sha256,
    );
  const bundleInputs = JSON.parse(
    fs.readFileSync(path.join(__dirname, "dist/metafile.json"), "utf8"),
  ).inputs;
  for (const component of provenance.runtimeComponents)
    assert.ok(bundleInputs[component], component);
  const testedURL =
    process.env.STATS_URL ||
    require("node:url").pathToFileURL(path.join(__dirname, "preview.html"))
      .href;
  assert.equal(
    sha(fs.readFileSync(fileURLToPath(testedURL))),
    provenance.build.htmlSha256,
  );
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.STATS_URL ||
      require("node:url").pathToFileURL(path.join(__dirname, "preview.html"))
        .href,
  );
  await page.waitForSelector("tr[data-athlete]");
  const rows = () => page.evaluate(() => window.prototypeStatistics.rows());
  let initial = await rows();
  assert.equal(initial.length, 16);
  assert.equal(await page.locator("thead th").count(), 15);
  assert.equal(
    await page.locator("#column-picker-toggle").count(),
    1,
    "Controle de colunas disponível",
  );
  assert.deepEqual(
    await page
      .locator("thead th")
      .allTextContents()
      .then((labels) =>
        labels
          .slice(-5)
          .map((t) =>
            t.trim().split("Ordenação")[0].split("Sem ordenação")[0].trim(),
          ),
      ),
    ["F", "T", "U", "5F", "GD"],
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.renderer),
    "react",
  );
  assert.ok(
    await page
      .locator("#root")
      .evaluate((e) =>
        Object.keys(e).some((k) => k.startsWith("__reactContainer$")),
      ),
  );
  assert.equal(await page.locator(".scrollable-table-top").count(), 1);
  assert.ok(
    await page
      .locator('[data-athlete="joao-pinheiros"] .player-name')
      .evaluate((e) =>
        Boolean(
          e.compareDocumentPosition(
            e.parentElement.querySelector(".player-jersey"),
          ) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
  );
  assert.deepEqual(
    initial.slice(0, 3).map((a) => a.rank),
    [1, 1, 3],
  );
  assert.equal(initial[0].id, "joao-pinheiros");
  assert.equal(initial[0].pts, 245);
  assert.equal(
    await page
      .locator('[data-athlete="joao-pinheiros"] [data-value="pp"]')
      .innerText(),
    "32,4%",
  );
  const fixtures = await page.evaluate(() =>
    window.prototypeStatistics.fixtures(),
  );
  for (const a of fixtures) {
    assert.ok(a.games.length > 0);
    for (const g of a.games) {
      assert.ok(
        g.two * 2 + g.three * 3 + g.ft <= g.teamPoints || g.teamPoints === null,
      );
      assert.ok(g.five === null || g.five === Number(g.fouls === 5));
      assert.ok(g.gd === 0 || g.gd === 1);
    }
  }
  for (const r of initial) {
    assert.equal(r.pts, r.two * 2 + r.three * 3 + r.ft);
    assert.equal(r.ppj, r.pts / r.j);
  }
  const getCells = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll("[data-athlete]")].map((r) => [
          r.dataset.athlete,
          Object.fromEntries(
            [...r.querySelectorAll("[data-value]")].map((c) => [
              c.dataset.value,
              c.textContent,
            ]),
          ),
        ]),
      ),
    );
  const totals = await getCells();
  const columnToggle = page.locator("#column-picker-toggle");
  const columnPanel = page.locator("#column-picker-panel");
  const choice = (key) => columnPanel.locator(`[data-column-choice="${key}"]`);
  await columnToggle.focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await columnPanel
      .getByRole("button", { name: "Nenhuma", exact: true })
      .count(),
    1,
  );
  assert.equal(await choice("team").count(), 1);
  assert.equal(await columnPanel.locator("input:checked").count(), 13);
  await page.screenshot({
    path: path.join(output, "colunas-1440.png"),
    fullPage: true,
  });
  assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
  await choice("threePointMade").uncheck();
  assert.equal(await page.locator("thead th").count(), 14);
  assert.equal(await page.locator('[data-value="three"]').count(), 0);
  assert.equal(await columnPanel.isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(
    await columnToggle.evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator("#search").fill("lucas");
  await page.locator("#minimum").fill("4");
  assert.deepEqual(
    (await rows()).map((r) => r.id),
    ["lucas-bauru"],
  );
  await page.locator("#averages").click();
  await page.locator("#clear").click();
  assert.equal(await page.locator('[data-sort="three"]').count(), 0);
  await columnToggle.click();
  await choice("threePointMade").focus();
  await page.keyboard.press("Space");
  assert.match(await page.locator('[data-sort="three"]').innerText(), /^3P\/J/);
  await page.locator("#totals").click();
  assert.equal(await columnPanel.count(), 0, "Clique externo fecha o painel");
  await page.locator('[data-sort="t"]').click();
  await columnToggle.click();
  await choice("technical").uncheck();
  assert.equal(
    await page
      .locator('th[aria-sort="descending"]')
      .getAttribute("data-column"),
    "pts",
  );
  assert.deepEqual(
    (await rows()).slice(0, 3).map((r) => r.rank),
    [1, 1, 3],
  );
  const checkedKeys = await columnPanel
    .locator("input:checked")
    .evaluateAll((inputs) => inputs.map((e) => e.dataset.columnChoice));
  for (const key of checkedKeys)
    if (key !== "points") await choice(key).uncheck();
  assert.equal(await choice("points").isDisabled(), false);
  assert.equal(await page.locator(".team-name").count(), 0);
  assert.equal(
    await page
      .locator('[data-value="pts"]')
      .first()
      .evaluate((e) => getComputedStyle(e).textAlign),
    "right",
  );
  assert.equal(await page.locator("thead th").count(), 3);
  assert.equal(
    await page.locator("tbody tr").first().locator("td,th").count(),
    3,
  );
  const retainedRanks = (await rows()).map((r) => [r.id, r.rank]);
  await choice("points").uncheck();
  assert.equal(await page.locator("thead th").count(), 2);
  assert.equal(await columnPanel.locator("input:checked").count(), 0);
  assert.deepEqual(
    (await rows()).map((r) => [r.id, r.rank]),
    retainedRanks,
  );
  assert.equal(await page.locator('col[span="0"]').count(), 0);
  assert.equal(await page.locator(".table-legend").count(), 0);
  assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
  await columnPanel.getByRole("button", { name: "Todas", exact: true }).click();
  assert.equal(await page.locator("thead th").count(), 15);
  await columnPanel
    .getByRole("button", { name: "Nenhuma", exact: true })
    .click();
  assert.equal(await page.locator("thead th").count(), 2);
  assert.equal(await columnPanel.locator("input:checked").count(), 0);
  assert.equal(await columnPanel.isVisible(), true);
  await choice("team").check();
  assert.equal(await page.locator("thead th").count(), 3);
  assert.equal(await page.locator(".team-name").count(), 16);
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForSelector("tr[data-athlete]");
  await page.locator("#search").focus();
  await page.locator('[data-sort="pts"]').hover();
  assert.equal(
    await page.locator("#metric-tooltip").innerText(),
    "Pontos totais",
  );
  await page.keyboard.press("Escape");
  await page.locator("#averages").click();
  const averages = await getCells();
  for (const id of Object.keys(totals))
    for (const key of ["j", "pts", "ppj", "pp", "five", "gd"])
      assert.equal(totals[id][key], averages[id][key]);
  assert.equal(averages["joao-pinheiros"].two, "7,5");
  assert.equal(averages["joao-pinheiros"].fouls, "2,4");
  assert.equal(averages["joao-pinheiros"].t, "0,2");
  assert.equal(averages["joao-pinheiros"].u, "0,1");
  assert.equal(averages["felipe-mogi"].t, "—");
  assert.equal(averages["matheus-saoJose"].u, "—");
  assert.equal(averages["vicente-bauru"].t, "0,0");
  await page.locator('[data-sort="three"]').click();
  const orderedAverage = await rows();
  assert.deepEqual(
    orderedAverage.slice(0, 3).map((a) => a.rank),
    [1, 1, 3],
  );
  assert.equal(orderedAverage[0].id, "lucas-bauru");
  assert.equal(orderedAverage[1].id, "lucas-pinheiros");
  await page.locator("#totals").click();
  assert.equal((await rows())[0].id, "gabriel-franca");
  await page.locator('[data-sort="t"]').click();
  assert.equal((await rows())[0].id, "gabriel-franca");
  await page.locator("#averages").click();
  assert.equal((await rows())[0].id, "lucas-pinheiros");
  await page.locator("#totals").click();
  assert.equal((await rows())[0].id, "gabriel-franca");
  await page.locator('[data-sort="u"]').click();
  assert.deepEqual(
    (await rows()).slice(0, 2).map((r) => r.rank),
    [1, 1],
  );
  await page.locator("#averages").click();
  assert.equal((await rows())[0].id, "lucas-pinheiros");
  await page.screenshot({
    path: path.join(output, "faltas-por-jogo.png"),
    fullPage: true,
  });
  await page.locator("#totals").click();
  for (const key of [
    "j",
    "pts",
    "ppj",
    "pp",
    "two",
    "three",
    "ft",
    "fouls",
    "t",
    "u",
    "five",
    "gd",
  ]) {
    await page.locator(`[data-sort="${key}"]`).click();
    let aria = await page
      .locator(`th[data-column="${key}"]`)
      .getAttribute("aria-sort");
    assert.ok(["ascending", "descending"].includes(aria));
    await page.locator(`[data-sort="${key}"]`).click();
    assert.notEqual(
      await page.locator(`th[data-column="${key}"]`).getAttribute("aria-sort"),
      aria,
    );
  }
  await page.locator("#search").fill("joao");
  assert.equal((await rows()).length, 1);
  await page.locator("#clear").click();
  const teamToggle = page.locator("#team-filter-toggle");
  const panel = page.locator("#team-filter-panel");
  await teamToggle.click();
  assert.equal(await panel.isVisible(), true);
  assert.equal(await panel.locator("input:checked").count(), 6);
  await page
    .getByRole("button", { name: "Não selecionar nenhuma equipe", exact: true })
    .click();
  assert.equal((await rows()).length, 0);
  assert.equal(await panel.isVisible(), true);
  assert.match(await teamToggle.innerText(), /Nenhuma equipe/);
  await panel.locator('[data-team="pinheiros"]').check();
  assert.equal((await rows()).length, 3);
  assert.match(await teamToggle.innerText(), /Equipes · 1 de 6/);
  await panel.locator('[data-team="bauru"]').check();
  assert.equal((await rows()).length, 6);
  assert.match(await teamToggle.innerText(), /Equipes · 2 de 6/);
  await page.screenshot({
    path: path.join(output, "equipes-checkboxes-1440.png"),
    fullPage: true,
  });
  const panelDesktopAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    panelDesktopAxe.violations.map((v) => ({ id: v.id, impact: v.impact })),
    [],
  );
  await page.keyboard.press("Escape");
  assert.equal(await panel.count(), 0);
  assert.equal(
    await teamToggle.evaluate((e) => e === document.activeElement),
    true,
  );
  await page.locator("#search").fill("lucas");
  assert.equal((await rows()).length, 2);
  await page.locator("#minimum").fill("4");
  assert.deepEqual(
    (await rows()).map((r) => r.id),
    ["lucas-bauru"],
  );
  await page.locator("#clear").click();
  assert.equal((await rows()).length, 16);
  await teamToggle.focus();
  await page.keyboard.press("Enter");
  await panel.locator('[data-team="bauru"]').focus();
  await page.keyboard.press("Space");
  assert.equal((await rows()).length, 13);
  assert.equal(await panel.isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(
    await teamToggle.evaluate((e) => e === document.activeElement),
    true,
  );
  await teamToggle.click();
  await page.locator("#minimum").click();
  assert.equal(await panel.count(), 0);
  await teamToggle.click();
  await page
    .getByRole("button", { name: "Selecionar todas as equipes", exact: true })
    .click();
  assert.equal((await rows()).length, 16);
  assert.equal(await panel.isVisible(), true);
  await page
    .getByRole("button", { name: "Não selecionar nenhuma equipe", exact: true })
    .click();
  await panel.locator('[data-team="pinheiros"]').check();
  await page.keyboard.press("Escape");
  await page.locator("#minimum").fill("10");
  assert.equal((await rows()).length, 1);
  await page.locator("#clear").click();
  await page.locator("#search").fill("<script>");
  await page.getByText("Nenhum atleta encontrado", { exact: true }).waitFor();
  await page.locator("#empty-clear").click();
  assert.equal((await rows()).length, 16);
  assert.equal(
    await page
      .locator(".avatar, .info, .team-name i, .season-status, #guide")
      .count(),
    0,
  );
  assert.equal(await page.locator(".sort-arrow").count(), 1);
  assert.equal(await page.locator(".table-legend dt").count(), 12);
  assert.equal(
    await page
      .locator('[data-athlete="joao-pinheiros"] .player-jersey')
      .innerText(),
    "#11",
  );
  assert.equal(
    await page
      .locator('[data-athlete="lucas-bauru"] .player-jersey')
      .innerText(),
    "#12",
  );
  const jerseyChecks = await page.evaluate(() => {
    const choose = window.prototypeStatistics.preferredJersey;
    return [
      choose([{ jersey: 0 }]),
      choose([{ jersey: 5 }, { jersey: 12 }, { jersey: 5 }, { jersey: 12 }]),
      choose([{ jersey: 5 }, { jersey: 5 }, { jersey: 12 }]),
      choose([{ jersey: null }]),
    ];
  });
  assert.deepEqual(jerseyChecks, ["0", "12", "5", null]);
  await page.locator('[data-sort="pp"]').focus();
  assert.equal(await page.locator("#metric-tooltip").isVisible(), true);
  assert.match(
    await page.locator("#metric-tooltip").innerText(),
    /^Participação na pontuação da equipe$/,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#metric-tooltip").isVisible(), false);
  assert.equal(
    await page
      .locator('[data-sort="pp"]')
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page
    .locator('[data-athlete="felipe-mogi"] [data-value="pp"] .missing')
    .click();
  assert.match(
    await page.locator("#metric-tooltip").innerText(),
    /^Informação ausente$/,
  );
  assert.equal(
    await page
      .locator(".missing")
      .first()
      .evaluate((e) => getComputedStyle(e).textDecorationLine),
    "none",
  );
  await page.keyboard.press("Escape");
  await page.locator("#search").focus();
  assert.equal(
    await page
      .locator('[data-athlete="vicente-bauru"] [data-value="pts"]')
      .innerText(),
    "0",
  );
  await page.locator(".demo-controls summary").click();
  await page.locator("#demo-loading").click();
  assert.equal(
    await page.locator("#table-region").getAttribute("aria-busy"),
    "true",
  );
  await page.waitForSelector("tr[data-athlete]");
  await page.locator("#demo-reset").click();
  await page.locator(".demo-controls summary").click();
  await page.screenshot({
    path: path.join(output, "desktop-1440.png"),
    fullPage: true,
  });
  const desktopAxe = await new AxeBuilder({ page }).analyze();
  const desktopViolations = desktopAxe.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.querySelectorAll("thead th").length === 11,
  );
  assert.equal(
    await page
      .locator(
        '[data-sort="t"], [data-sort="u"], [data-sort="five"], [data-sort="gd"]',
      )
      .count(),
    0,
  );
  const mobileTableWidth = await page
    .locator("table")
    .evaluate((e) => e.getBoundingClientRect().width);
  await columnToggle.click();
  assert.equal(await columnPanel.locator("input:checked").count(), 9);
  for (const key of [
    "technical",
    "unsportsmanlike",
    "fiveFoulGames",
    "disqualifications",
  ])
    assert.equal(await choice(key).isChecked(), false);
  await choice("technical").check();
  assert.equal(await page.locator("thead th").count(), 12);
  await page.setViewportSize({ width: 1440, height: 1100 });
  assert.equal(
    await page.locator("thead th").count(),
    12,
    "Escolha manual persiste ao redimensionar",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await columnPanel.getByRole("button", { name: "Todas", exact: true }).click();
  assert.equal(await page.locator("thead th").count(), 15);
  const fullMobileWidth = await page
    .locator("table")
    .evaluate((e) => e.getBoundingClientRect().width);
  assert.ok(
    fullMobileWidth - mobileTableWidth >= 260,
    "Ocultar colunas reduz a largura efetiva",
  );
  await columnPanel
    .getByRole("button", { name: "Nenhuma", exact: true })
    .click();
  assert.equal(await page.locator("thead th").count(), 2);
  assert.equal(await columnPanel.locator("input:checked").count(), 0);
  assert.equal(await page.locator(".team-name").count(), 0);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await choice("team").check();
  assert.equal(await page.locator("thead th").count(), 3);
  await choice("team").uncheck();
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForSelector("tr[data-athlete]");
  await columnToggle.click();
  assert.equal(await page.locator("thead th").count(), 11);
  await page.screenshot({
    path: path.join(output, "colunas-390.png"),
    fullPage: false,
  });
  const mobilePopup = await columnPanel.boundingBox();
  assert.ok(
    mobilePopup.y + mobilePopup.height <= 844,
    "Painel cabe na altura disponível do celular",
  );
  assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations, []);
  await page.keyboard.press("Escape");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const sticky = page.locator("tbody tr[data-athlete] th").first();
  await page
    .locator(".statistics-table-wrap")
    .evaluate((e) => (e.scrollLeft = 100));
  const x1 = (await sticky.boundingBox()).x;
  await page
    .locator(".statistics-table-wrap")
    .evaluate((e) => (e.scrollLeft = 600));
  const x2 = (await sticky.boundingBox()).x;
  assert.ok(Math.abs(x1 - x2) < 1);
  await page
    .locator(".statistics-table-wrap")
    .evaluate((e) => (e.scrollLeft = 0));
  // The source component releases its sync guard on the next animation frame.
  // Finish that interaction before driving the other scrollbar.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page
    .locator(".scrollable-table-top")
    .evaluate((e) => (e.scrollLeft = 220));
  await page.waitForFunction(
    () =>
      Math.abs(
        document.querySelector(".statistics-table-wrap").scrollLeft - 220,
      ) < 2,
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page
    .locator(".statistics-table-wrap")
    .evaluate((e) => (e.scrollLeft = 500));
  await page.waitForFunction(
    () =>
      Math.abs(
        document.querySelector(".scrollable-table-top").scrollLeft - 500,
      ) < 2,
  );
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.locator(".statistics-table-wrap").evaluate((e) => {
    e.scrollLeft = 0;
    e.scrollTop = 0;
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".statistics-table-wrap").scrollLeft === 0 &&
      document.querySelector(".scrollable-table-top").scrollLeft === 0,
  );
  await page.screenshot({
    path: path.join(output, "mobile-390.png"),
    fullPage: true,
  });
  const mobileAxe = await new AxeBuilder({ page }).analyze();
  await teamToggle.click();
  await page
    .getByRole("button", { name: "Não selecionar nenhuma equipe", exact: true })
    .click();
  await panel.locator('[data-team="pinheiros"]').check();
  await panel.locator('[data-team="bauru"]').check();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(output, "equipes-checkboxes-390.png"),
    fullPage: true,
  });
  const panelMobileAxe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    panelMobileAxe.violations.map((v) => ({ id: v.id, impact: v.impact })),
    [],
  );
  await page.keyboard.press("Escape");
  await page.locator("#clear").click();
  await page.locator("#search").fill("zzzz");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(output, "mobile-empty.png"),
    fullPage: true,
  });
  await page.locator("#empty-clear").click();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.locator(".demo-controls summary").click();
  await page.locator("#demo-threes").click();
  await page.locator(".demo-controls summary").click();
  await page.screenshot({
    path: path.join(output, "ranking-3p-por-jogo.png"),
    fullPage: true,
  });
  await page.locator(".demo-controls summary").click();
  await page.locator("#demo-reset").click();
  await page.locator(".demo-controls summary").click();
  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(
    process.env.STATS_URL ||
      require("node:url").pathToFileURL(path.join(__dirname, "preview.html"))
        .href,
  );
  await touchPage
    .locator(".statistics-table-wrap")
    .evaluate((e) => (e.scrollLeft = 300));
  await touchPage.locator('[data-sort="pp"]').tap();
  assert.equal(await touchPage.locator("#metric-tooltip").isVisible(), true);
  assert.equal(
    await touchPage.locator('th[data-column="pp"]').getAttribute("aria-sort"),
    "descending",
  );
  assert.equal(await touchPage.locator(".sort-arrow").count(), 1);
  await touchPage.locator("#minimum").tap();
  assert.equal(await touchPage.locator("#metric-tooltip").isVisible(), false);
  await touchPage.locator("#team-filter-toggle").tap();
  await touchPage
    .getByRole("button", { name: "Não selecionar nenhuma equipe", exact: true })
    .tap();
  await touchPage.locator('[data-team="pinheiros"]').tap();
  await touchPage.locator('[data-team="bauru"]').tap();
  assert.equal(
    await touchPage.locator("#team-filter-panel input:checked").count(),
    2,
  );
  await touchPage.locator("#minimum").tap();
  assert.equal(await touchPage.locator("#team-filter-panel").count(), 0);
  await touchPage.locator("#clear").tap();
  assert.equal(await touchPage.locator("thead th").count(), 11);
  await touchPage.locator("#column-picker-toggle").tap();
  await touchPage.locator('[data-column-choice="technical"]').tap();
  assert.equal(
    await touchPage.locator("#column-picker-panel").isVisible(),
    true,
  );
  await touchPage.locator("#minimum").tap();
  assert.equal(await touchPage.locator("#column-picker-panel").count(), 0);
  await touchPage
    .locator(".statistics-table-wrap")
    .evaluate((e) => (e.scrollLeft = 660));
  await touchPage.locator('[data-sort="t"]').tap();
  assert.equal(
    await touchPage.locator("#metric-tooltip").innerText(),
    "Faltas técnicas",
  );
  await touchContext.close();
  const report = {
    renderer:
      "React; ScoresheetStatisticsTable/SortHeader/SortButton extracted and adapted from ZIP; ScrollableTable and ResourceState original; original control helpers",
    provenance: JSON.parse(
      fs.readFileSync(path.join(__dirname, "provenance.json"), "utf8"),
    ).build,
    checks:
      "16 registros; 15 colunas desktop e 11 mobile por padrão; seletor do ZIP com 13 opções, incluindo Equipe; Todas/Nenhuma; todas as opções desmarcáveis; nenhuma mantém só posição/atleta e ranking anterior; equipe pode ser única opção ou ocultada; zero colunas métricas sem span inválido ou legenda vazia; T/U/5F/GD ocultas mobile e recuperáveis; largura efetiva reduzida; seleção preservada em filtros/modos/resize; fallback de ordenação quando houver outra métrica visível; teclado/toque/Escape/foco/clique externo; axe com ambos os painéis e nenhuma coluna opcional; cálculos/T/U/equipes/empates preservados; barras sincronizadas e atleta fixo; 390/1440px; camisa após nome e tooltips curtos",
    errors,
    desktopViolations,
    mobileViolations: mobileAxe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  };
  fs.writeFileSync(
    path.join(output, "verification.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  assert.deepEqual(errors, []);
  assert.deepEqual(desktopViolations, []);
  assert.deepEqual(mobileAxe.violations, []);
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
