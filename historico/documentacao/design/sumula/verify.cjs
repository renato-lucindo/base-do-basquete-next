const { chromium, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const output = __dirname;
const url =
  process.env.PROTOTYPE_URL ||
  pathToFileURL(path.join(__dirname, "Sumula do jogo publicado.html")).href;
const report = {
  url,
  checks: [],
  axe: [],
  errors: [],
  externalRequests: [],
  screenshots: [],
};
const pass = (name) => {
  report.checks.push(name);
  console.log(`PASS ${name}`);
};
async function save(page, name) {
  await page.screenshot({
    path: path.join(output, name),
    fullPage: !name.includes("faltas"),
  });
  report.screenshots.push(name);
}
async function checkMath(page) {
  const game = await page.evaluate(() => window.scoresheetPrototype.snapshot());
  for (const team of [game.home, game.away]) {
    assert.equal(team.players.filter((p) => p.starter).length, 5);
    assert.equal(team.players.filter((p) => p.captain).length, 1);
    assert.equal(
      new Set(team.players.map((p) => p.jersey)).size,
      team.players.length,
    );
    const played = team.players.filter((p) => p.played);
    for (const player of played) {
      assert.equal(
        player.points,
        2 * player.two + 3 * player.three + player.free,
      );
      if (player.fouls !== null)
        assert.equal(
          player.fouls,
          player.personal +
            player.technical +
            player.unsportsmanlike +
            player.disqualifying,
        );
      assert.ok(!player.starter || player.played);
    }
    assert.equal(
      played.reduce((n, p) => n + p.points, 0),
      team.points,
    );
    assert.equal(
      team.periods.reduce((n, p) => n + p, 0),
      team.points,
    );
    assert.equal(team.periods.length, team.foulsByPeriod.length);
    const made = played.reduce((n, p) => n + p.free, 0);
    if (team.freeTaken !== null) assert.ok(made <= team.freeTaken);
  }
  if (game.overtime)
    assert.equal(
      game.home.periods.slice(0, 4).reduce((a, b) => a + b),
      game.away.periods.slice(0, 4).reduce((a, b) => a + b),
    );
  assert.notEqual(game.home.points, game.away.points);
}
async function scan(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  report.axe.push({
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        failureSummary: n.failureSummary,
      })),
    })),
    incomplete: result.incomplete.map((v) => ({
      id: v.id,
      nodes: v.nodes.length,
    })),
  });
  assert.equal(
    result.violations.length,
    0,
    JSON.stringify(report.axe.at(-1), null, 2),
  );
  pass(`axe: ${label}, zero violações automáticas`);
}
async function noOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    table: document.querySelector(".table-scroll").scrollWidth,
    region: document.querySelector(".table-scroll").clientWidth,
  }));
  if (geometry.document > geometry.width) {
    console.log(
      "OVERFLOW DIAGNOSTIC",
      await page.evaluate(() => ({
        scrollX,
        active: document.activeElement.outerHTML,
        overflow: [...document.querySelectorAll("body *")]
          .filter((e) => e.getBoundingClientRect().right > innerWidth)
          .map((e) => ({
            tag: e.tagName,
            cls: e.className,
            right: e.getBoundingClientRect().right,
            width: e.getBoundingClientRect().width,
            text: e.textContent.slice(0, 60),
            scrollLeft: e.scrollLeft,
          })),
      })),
    );
    await page.screenshot({
      path: path.join(output, "overflow-diagnostic.png"),
      fullPage: true,
    });
  }
  assert.ok(geometry.document <= geometry.width, JSON.stringify(geometry));
  assert.ok(geometry.body <= geometry.width, JSON.stringify(geometry));
  pass(`Sem transbordamento da página: ${label}`);
  return geometry;
}
async function main() {
  const build = JSON.parse(fs.readFileSync(path.join(output, "build.json")));
  assert.equal(
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(__dirname, build.output)))
      .digest("hex"),
    build.sha256,
  );
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") report.errors.push(m.text());
    });
    page.on("request", (r) => {
      if (!r.url().startsWith(url) && !r.url().startsWith("data:"))
        report.externalRequests.push(r.url());
    });
    const response = await page.goto(url);
    if (url.startsWith("http")) assert.equal(response.status(), 200);
    await expect(page.locator(".roster-table tbody tr")).toHaveCount(20);
    await expect(page.locator(".starter")).toHaveCount(10);
    await expect(
      page.locator(".captain").filter({ hasText: "CAP" }),
    ).toHaveCount(3); // two in tables, one in legend
    await expect(
      page.locator('[data-team=away] tr[data-jersey="13"]'),
    ).not.toHaveClass(/starter/);
    for (const side of ["home", "away"]) {
      const jerseys = await page
        .locator(`[data-team=${side}] tbody .jersey-cell`)
        .allTextContents();
      assert.deepEqual(jerseys.slice(0, 2), ["0", "00"]);
      await expect(
        page.locator(`[data-team=${side}] tr[data-jersey="00"] .points-cell`),
      ).toHaveText("—");
    }
    await expect(
      page.locator('[data-team=home] tr[data-jersey="17"] .points-cell'),
    ).toHaveText("0");
    await expect(page.locator("[data-team=home] .total-free")).toContainText(
      "17/24",
    );
    await expect(page.locator("[data-team=home] .total-free small")).toHaveText(
      "70,8%",
    );
    await expect(page.locator("[data-team=away] .total-free small")).toHaveText(
      "65,0%",
    );
    assert.equal(
      await page
        .locator(".roster-table")
        .first()
        .evaluate((el) => el.rows[0].cells.length),
      7,
    );
    await checkMath(page);
    pass(
      "Fixtures, cinco titulares, CAP reserva, 0/00, participação e totais de LL",
    );
    const desktop = await page.locator(".team-section").evaluateAll((els) =>
      els.map((el) => ({
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
      })),
    );
    assert.equal(desktop[0].y, desktop[1].y);
    assert.ok(desktop[1].x > desktop[0].x);
    await noOverflow(page, "1440px");
    await save(page, "desktop-1440.png");
    await scan(page, "desktop fechado");
    const foul = page.locator('[data-foul-side=home][data-foul-jersey="14"]');
    await foul.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog")).toBeVisible();
    await expect(page.locator("#close-dialog")).toBeFocused();
    await expect(page.locator(".discipline-status")).toHaveText(
      "Excluído por cinco faltas",
    );
    assert.deepEqual(
      await page.locator(".foul-codes .foul-kind").allTextContents(),
      ["P", "P", "U", "P", "P"],
    );
    await save(page, "desktop-faltas.png");
    await scan(page, "desktop diálogo aberto");
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog")).not.toBeVisible();
    await expect(foul).toBeFocused();
    await page.locator('[data-foul-side=away][data-foul-jersey="13"]').click();
    await expect(page.locator(".discipline-status")).toHaveText(
      "Desqualificado (GD)",
    );
    await page.locator("#close-dialog").click();
    await page.locator('[data-foul-side=home][data-foul-jersey="17"]').click();
    await expect(page.locator(".foul-summary strong")).toHaveText("0");
    await expect(page.locator(".discipline-status")).toHaveCount(0);
    await page.mouse.click(4, 4);
    await expect(page.locator("dialog")).not.toBeVisible();
    pass(
      "Detalhes de faltas: Enter, foco inicial, Escape, retorno de foco, backdrop, zero, cinco faltas e GD",
    );
    await page.locator(".demo-controls summary").click();
    await page.locator("[data-scenario=regulation]").click();
    await checkMath(page);
    await expect(page.locator(".period-table thead th")).toHaveCount(6);
    pass("Cenário sem prorrogação com pontos consistentes");
    await page.locator("[data-scenario=missing]").click();
    await checkMath(page);
    await expect(page.locator("[data-team=home] .total-free small")).toHaveText(
      "—",
    );
    await expect(page.locator("[data-team=home] tfoot td").last()).toHaveText(
      "—",
    );
    await page.locator('[data-foul-side=home][data-foul-jersey="21"]').click();
    await expect(page.locator(".missing-note")).toHaveText(
      "Faltas não informadas.",
    );
    await page.locator("#close-dialog").click();
    pass("Cobertura ausente preserva travessão, total incompleto e explicação");
    await page.locator("[data-scenario=no-free-throws]").click();
    await checkMath(page);
    for (const side of ["home", "away"]) {
      await expect(
        page.locator(`[data-team=${side}] .total-free span`),
      ).toHaveText("0/0");
      await expect(
        page.locator(`[data-team=${side}] .total-free small`),
      ).toHaveText("—");
    }
    pass(
      "Sem tentativas de LL: 0/0 e percentual indisponível, pontos e prorrogação coerentes",
    );
    await page.locator("[data-scenario=overtime]").click();
    await page.locator(".demo-controls summary").click();
    // Same page at intermediate widths and 200% equivalent CSS viewport.
    for (const width of [1200, 1199, 1024, 768, 720, 600, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page, `${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    const mobile = await page.locator(".team-section").evaluateAll((els) =>
      els.map((el) => ({
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
      })),
    );
    assert.equal(mobile[0].x, mobile[1].x);
    assert.ok(mobile[1].y > mobile[0].y);
    const sticky = page
      .locator("[data-team=home] tbody tr")
      .first()
      .locator(".athlete-cell");
    const before = (await sticky.boundingBox()).x;
    await page
      .locator("[data-team=home] .table-scroll")
      .evaluate((el) => (el.scrollLeft = el.scrollWidth));
    assert.ok(Math.abs((await sticky.boundingBox()).x - before) < 1);
    const totalLabel = await page
      .locator("[data-team=home] .total-label")
      .boundingBox();
    assert.ok(
      Math.abs(totalLabel.x - 17) < 1,
      "Rótulo de total acompanha a identificação fixa",
    );
    const region = await page
      .locator("[data-team=home] .table-scroll")
      .boundingBox();
    const finalFoul = await page
      .locator('[data-foul-side=home][data-foul-jersey="0"]')
      .boundingBox();
    assert.ok(
      finalFoul.x >= region.x &&
        finalFoul.x + finalFoul.width <= region.x + region.width + 1,
    );
    await save(page, "mobile-390-scroll.png");
    pass(
      "Celular: equipes empilhadas, nome fixo e coluna F acessível na rolagem",
    );
    await page
      .locator(".table-scroll")
      .evaluateAll((els) => els.forEach((el) => (el.scrollLeft = 0)));
    await save(page, "mobile-390.png");
    await scan(page, "celular fechado");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
    const touchPage = await mobileContext.newPage();
    await touchPage.goto(url);
    const touchButton = touchPage.locator(
      '[data-foul-side=away][data-foul-jersey="13"]',
    );
    await touchButton.tap();
    await expect(touchPage.locator("dialog")).toBeVisible();
    await expect(touchPage.locator(".discipline-status")).toHaveText(
      "Desqualificado (GD)",
    );
    await noOverflow(touchPage, "390px com toque e diálogo");
    await save(touchPage, "mobile-faltas.png");
    await scan(touchPage, "celular diálogo aberto");
    await touchPage.locator("#close-dialog").tap();
    await expect(touchPage.locator("dialog")).not.toBeVisible();
    pass("Emulação de toque abre/fecha o detalhe no celular");
    // Self-contained artifact also works directly from disk, without preview server.
    const offline = await browser.newPage();
    await offline.context().setOffline(true);
    await offline.goto(pathToFileURL(path.join(__dirname, build.output)).href);
    await expect(offline.locator(".roster-table tbody tr")).toHaveCount(20);
    await offline
      .locator('[data-foul-side=home][data-foul-jersey="11"]')
      .click();
    await expect(offline.locator("dialog")).toBeVisible();
    pass("HTML autocontido abre por arquivo local e funciona sem rede");
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalRequests, []);
    pass(
      "Sem erros de console/JavaScript nem requisições externas na página principal",
    );
    report.status = "passed";
    report.htmlSha256 = build.sha256;
    report.completedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(output, "verification.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      `RESULTADO: ${report.checks.length} grupos de verificações aprovados.`,
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  report.status = "failed";
  report.failure = e.stack;
  fs.writeFileSync(
    path.join(output, "verification.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.error(e);
  process.exitCode = 1;
});
