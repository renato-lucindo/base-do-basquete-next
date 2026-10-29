const { chromium, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const report = { checks: [], axe: [], errors: [] };
const pass = (name) => {
  report.checks.push(name);
  console.log(`PASS ${name}`);
};
const url =
  process.env.PROTOTYPE_URL ||
  require("node:url").pathToFileURL(
    path.join(__dirname, "Sumula do jogo publicado.html"),
  ).href;
async function run() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(url);
    await expect(page.locator("#period-filter [data-period]")).toHaveCount(6);
    await expect(
      page.locator(
        ".section-heading,.period-note,.team-heading>p,.teams-heading>p,.legend-notes",
      ),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Parciais", exact: true }),
    ).toHaveCount(0);
    pass("Textos redundantes removidos, tabela e seletor mantidos");
    const original = await page.evaluate(() =>
      window.scoresheetPrototype.snapshot(),
    );
    const metrics = [
      "points",
      "two",
      "three",
      "free",
      "fouls",
      "personal",
      "technical",
      "unsportsmanlike",
      "disqualifying",
    ];
    const checkModel = async () => {
      const game = await page.evaluate(() =>
        window.scoresheetPrototype.snapshot(),
      );
      for (const [side, team] of [
        ["home", game.home],
        ["away", game.away],
      ]) {
        assert.equal(team.freeTakenByPeriod.length, team.periods.length);
        if (team.freeTaken !== null)
          assert.equal(
            team.freeTakenByPeriod.reduce((a, b) => a + b, 0),
            team.freeTaken,
          );
        for (const p of team.players) {
          assert.equal(p.quarters.length, team.periods.length);
          if (!p.played) {
            assert.ok(p.quarters.every((q) => !q.played));
            continue;
          }
          for (const key of metrics) {
            if (p[key] !== null)
              assert.equal(
                p.quarters.reduce((sum, q) => sum + (q.played ? q[key] : 0), 0),
                p[key],
                `${p.name}: ${key}`,
              );
          }
          for (const q of p.quarters.filter((q) => q.played)) {
            assert.equal(q.points, 2 * q.two + 3 * q.three + q.free);
            if (q.fouls !== null)
              assert.equal(
                q.fouls,
                q.personal + q.technical + q.unsportsmanlike + q.disqualifying,
              );
            if (q.fouls !== null) {
              assert.equal(q.foulEvents.length, q.fouls);
              assert.deepEqual(
                q.foulEvents.map((e) => e.kind),
                q.codes,
              );
              for (const event of q.foulEvents) {
                assert.ok(
                  Number.isInteger(event.freeThrows) &&
                    event.freeThrows >= 0 &&
                    event.freeThrows <= 3,
                );
                assert.equal(event.period, p.quarters.indexOf(q));
              }
            }
          }
        }
        team.periods.forEach((score, i) => {
          assert.equal(
            team.players.reduce(
              (sum, p) => sum + (p.quarters[i].points ?? 0),
              0,
            ),
            score,
          );
          const made = team.players.reduce(
            (sum, p) => sum + (p.quarters[i].free ?? 0),
            0,
          );
          if (team.freeTakenByPeriod[i] !== null)
            assert.ok(made <= team.freeTakenByPeriod[i]);
          const opponent = game[side === "home" ? "away" : "home"];
          const covered = team.players.every(
            (p) => !p.quarters[i].played || p.quarters[i].foulEvents !== null,
          );
          if (covered && opponent.freeTakenByPeriod[i] !== null) {
            const penalties = team.players
              .flatMap((p) => p.quarters[i].foulEvents || [])
              .reduce((n, e) => n + e.freeThrows, 0);
            assert.equal(
              penalties,
              opponent.freeTakenByPeriod[i],
              "LL concedidos por faltas conferem com LL tentados do adversário",
            );
          }
        });
      }
    };
    await checkModel();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      for (const side of ["home", "away"]) {
        const captain = page.locator(
          `[data-team=${side}] .athlete-line>.captain`,
        );
        const geometry = await captain.evaluate((el) => {
          const c = getComputedStyle(el),
            r = el.getBoundingClientRect(),
            cell = el.closest("th"),
            cr = cell.getBoundingClientRect();
          return {
            right: cr.right - r.right,
            padding: parseFloat(getComputedStyle(cell).paddingRight),
            border: c.borderTopWidth,
            background: c.backgroundColor,
          };
        });
        assert.ok(
          Math.abs(geometry.right - geometry.padding - 1) < 2,
          JSON.stringify(geometry),
        );
        assert.equal(geometry.border, "0px");
        assert.equal(geometry.background, "rgba(0, 0, 0, 0)");
      }
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.locator('[data-foul-side=home][data-foul-jersey="14"]').click();
    await expect(page.locator("[data-half=first] .foul-kind")).toHaveCount(2);
    await expect(page.locator("[data-half=second] .foul-kind")).toHaveCount(3);
    assert.deepEqual(await page.locator(".foul-codes abbr").allTextContents(), [
      "P",
      "P2",
      "U2",
      "P2",
      "P",
    ]);
    assert.deepEqual(
      await page
        .locator(".foul-codes li")
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).color)),
      [
        "rgb(180, 35, 24)",
        "rgb(7, 95, 202)",
        "rgb(180, 35, 24)",
        "rgb(7, 95, 202)",
        "rgb(7, 95, 202)",
      ],
    );
    await page.screenshot({
      path: path.join(__dirname, "desktop-faltas-penalidades.png"),
    });
    await page.keyboard.press("Escape");
    pass(
      "CAP sem contorno e à direita; penalidades explícitas, cores e contornos dos tempos",
    );
    for (let i = 0; i < 5; i++) {
      await page.locator(`#period-filter [data-period="${i}"]`).click();
      for (const side of ["home", "away"]) {
        const view = await page.evaluate(
          (side) => window.scoresheetPrototype.view(side),
          side,
        );
        assert.equal(view.points, original[side].periods[i]);
        const foot = page.locator(`[data-team=${side}] tfoot .points-cell`);
        await expect(foot).toHaveText(String(view.points));
      }
      await expect(
        page.locator(
          ".period-table tbody tr:first-child .period-total .period-points",
        ),
      ).toHaveText("88");
      await expect(
        page.locator(
          ".period-table tbody tr:last-child .period-total .period-points",
        ),
      ).toHaveText("83");
    }
    pass("Cinco recortes individuais conferem; placar final preservado");
    await page.locator('#period-filter [data-period="0"]').click();
    await page.locator('[data-foul-side=home][data-foul-jersey="14"]').click();
    await expect(page.locator(".foul-summary strong")).toHaveText("1");
    await expect(page.locator(".dialog-team")).toContainText("1º quarto");
    await expect(page.locator(".discipline-status")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.locator('#period-filter [data-period="2"]').click();
    await page.locator('[data-foul-side=home][data-foul-jersey="14"]').click();
    assert.deepEqual(
      await page.locator(".foul-codes .foul-kind").allTextContents(),
      ["U"],
    );
    await page.keyboard.press("Escape");
    await page.locator('#period-filter [data-period="3"]').click();
    await page.locator('[data-foul-side=away][data-foul-jersey="13"]').click();
    await expect(page.locator(".foul-summary strong")).toHaveText("2");
    assert.deepEqual(
      await page.locator(".foul-codes .foul-kind").allTextContents(),
      ["T", "T"],
    );
    await expect(page.locator(".discipline-status")).toHaveText(
      "Desqualificado (GD)",
    );
    await page.keyboard.press("Escape");
    await page.locator('#period-filter [data-period="4"]').click();
    await expect(
      page.locator('[data-team=away] tr[data-jersey="13"] .points-cell'),
    ).toHaveText("—");
    await expect(
      page.locator('[data-team=home] tr[data-jersey="14"] .points-cell'),
    ).toHaveText("—");
    pass(
      "Tipos de falta e situação disciplinar seguem o quarto, sem ações após exclusão",
    );
    await page.locator('.period-table thead [data-period="1"]').click();
    await expect(
      page.locator('#period-filter [data-period="1"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator('[data-team=home] tr[data-jersey="0"] .points-cell'),
    ).toHaveText("3");
    const keyboard = page.locator('#period-filter [data-period="2"]');
    await keyboard.focus();
    await page.keyboard.press("Space");
    await expect(keyboard).toHaveAttribute("aria-pressed", "true");
    pass("Atalho nas parciais e seleção por teclado sincronizados");
    await page.screenshot({
      path: path.join(__dirname, "desktop-quarto-1440.png"),
      fullPage: true,
    });
    await page.locator(".demo-controls summary").click();
    for (const scenario of [
      "regulation",
      "missing",
      "no-free-throws",
      "overtime",
    ]) {
      await page.locator(`[data-scenario="${scenario}"]`).click();
      await checkModel();
      const game = await page.evaluate(() =>
        window.scoresheetPrototype.snapshot(),
      );
      for (let i = 0; i < game.home.periods.length; i++) {
        await page.locator(`#period-filter [data-period="${i}"]`).click();
        for (const side of ["home", "away"])
          await expect(
            page.locator(`[data-team=${side}] tfoot .points-cell`),
          ).toHaveText(String(game[side].periods[i]));
      }
      if (scenario === "missing") {
        await page.locator('#period-filter [data-period="3"]').click();
        await page
          .locator('[data-foul-side=home][data-foul-jersey="21"]')
          .click();
        await expect(page.locator(".foul-summary strong")).toHaveText("—");
        await page.keyboard.press("Escape");
      }
    }
    pass(
      "Todos os cenários reconciliam quartos, totais, tentativas coletivas e ausências",
    );
    await page.locator(".demo-controls summary").click();
    for (const width of [1440, 1200, 1199, 768, 600, 390, 360, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#period-filter [data-period="3"]').click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: path.join(__dirname, "mobile-quarto-390.png"),
      fullPage: true,
    });
    for (const label of ["quarto, celular", "jogo todo, celular"]) {
      if (label.startsWith("jogo"))
        await page.locator("#period-filter [data-period=all]").click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      report.axe.push({
        label,
        violations: result.violations.map((v) => v.id),
        incomplete: result.incomplete.map((v) => v.id),
      });
      assert.equal(
        result.violations.length,
        0,
        JSON.stringify(result.violations),
      );
    }
    pass(
      "Seletor e tabelas sem transbordamento de 320 a1440px; axe sem violações",
    );
    const touchContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobile = await touchContext.newPage();
    await mobile.goto(url);
    await mobile.locator('#period-filter [data-period="3"]').tap();
    await mobile.locator('[data-foul-side=away][data-foul-jersey="13"]').tap();
    await expect(mobile.locator(".dialog-team")).toContainText("4º quarto");
    await expect(mobile.locator(".foul-summary strong")).toHaveText("2");
    await mobile.screenshot({
      path: path.join(__dirname, "mobile-faltas-quarto.png"),
    });
    await mobile.locator("#close-dialog").tap();
    pass("Toque seleciona quarto e abre exatamente suas faltas");
    assert.deepEqual(report.errors, []);
    report.status = "passed";
    report.completedAt = new Date().toISOString();
  } finally {
    await browser.close();
  }
}
run()
  .catch((e) => {
    report.status = "failed";
    report.failure = e.stack;
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() =>
    fs.writeFileSync(
      path.join(__dirname, "verification-periods.json"),
      JSON.stringify(report, null, 2) + "\n",
    ),
  );
