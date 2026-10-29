import { test, expect } from "@playwright/test";
import { tid } from "./fixtures/text-import";
import {
  desktopSheetFixture,
  openDesktopSheet,
  chooseFive,
} from "./fixtures/sheet-desktop";
test.describe("desktop scoresheet MVP", () => {
  test("desktop action history uses horizontal columns at both requested viewports", async ({
    page,
  }) => {
    await desktopSheetFixture(page);
    await openDesktopSheet(page);
    await chooseFive(page);
    await page
      .getByRole("button", {
        name: "Concluir preparação e lançar ações",
        exact: true,
      })
      .click();
    for (let i = 0; i < 10; i++) {
      await page.getByLabel("Camisa ou alvo", { exact: true }).fill("1");
      await page.keyboard.press("Enter");
      await page.getByLabel("Ação", { exact: true }).fill("1");
      await page.keyboard.press("Enter");
    }
    const history = page.getByRole("region", {
      name: "Ações de pontos",
      exact: true,
    });
    const items = history.locator(".sheet-actions li");
    await expect(items).toHaveCount(10);
    for (const [width, height] of [
      [1366, 768],
      [1920, 1080],
    ]) {
      await page.setViewportSize({ width, height });
      const first = await items.nth(0).boundingBox();
      const second = await items.nth(1).boundingBox();
      expect(first && second).toBeTruthy();
      expect(Math.abs(first!.y - second!.y)).toBeLessThan(3);
      expect(second!.x).toBeGreaterThan(first!.x + 20);
      await history.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `dist/ui-ux-captures/sheet-history-after-${width}x${height}.png`,
        animations: "disabled",
      });
      const firstAction = items.first();
      await firstAction.getByRole("button", { name: /Excluir ação/ }).click();
      const dialog = page.getByRole("dialog", {
        name: "Excluir esta ação?",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await page.screenshot({
        path: `dist/ui-ux-captures/sheet-delete-after-${width}x${height}.png`,
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });
  test("editing actions uses a modal with cancel, save and toast at desktop widths", async ({
    page,
  }) => {
    await desktopSheetFixture(page);
    await openDesktopSheet(page);
    await chooseFive(page);
    await page
      .getByRole("button", {
        name: "Concluir preparação e lançar ações",
        exact: true,
      })
      .click();
    await page.getByLabel("Camisa ou alvo", { exact: true }).fill("1");
    await page.keyboard.press("Enter");
    await page.getByLabel("Ação", { exact: true }).fill("1");
    await page.keyboard.press("Enter");
    const action = page.getByRole("button", {
      name: "Editar ação 1",
      exact: true,
    });
    const dialog = page.getByRole("dialog", {
      name: "Editar ação da súmula",
      exact: true,
    });
    await action.click();
    await expect(dialog).toBeVisible();
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({
        path: `dist/ui-ux-captures/sheet-edit-modal-after-${viewport.width}x${viewport.height}.png`,
        animations: "disabled",
      });
    }
    await page.getByLabel("Ação", { exact: true }).fill("2");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator(".sheet-actions li")).toContainText(["1p"]);
    await action.click();
    await page.getByLabel("Ação", { exact: true }).fill("2");
    await dialog
      .getByRole("button", { name: "Salvar edição da ação", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(".sheet-actions li")).toContainText(["2p"]);
    const toast = page.getByRole("region", { name: "Notificação" });
    await expect(toast).toContainText("Ação editada no rascunho");
    await toast.getByRole("button", { name: "Dispensar notificação" }).click();
    await expect(toast).toHaveCount(0);
  });

  test("overtimes stay in player Q4, team periods stay separate and foul borders follow the actual half", async ({
    page,
  }) => {
    await desktopSheetFixture(page);
    await openDesktopSheet(page);
    await chooseFive(page);
    await page
      .getByRole("button", {
        name: "Concluir preparação e lançar ações",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Períodos da súmula", { exact: true })
      .selectOption("6");
    const add = async (
      side: "home" | "away",
      period: number,
      code: string,
      shirt = "1",
    ) => {
      await page
        .getByLabel("Equipe da ação", { exact: true })
        .selectOption(side);
      await page
        .getByLabel("Quarto ou prorrogação", { exact: true })
        .selectOption(String(period));
      await page.getByLabel("Camisa ou alvo", { exact: true }).fill(shirt);
      await page.keyboard.press("Enter");
      await page.getByLabel("Ação", { exact: true }).fill(code);
      await page.keyboard.press("Enter");
    };
    await add("home", 4, "2");
    await add("home", 5, "3");
    await add("home", 6, "1");
    const a = page.getByRole("table", { name: "Súmula equipe A", exact: true }),
      b = page.getByRole("table", { name: "Súmula equipe B", exact: true });
    const player = a.getByRole("row").filter({
      has: page.getByRole("rowheader", {
        name: "Jogador A 1 * C",
        exact: true,
      }),
    });
    await expect(player.locator("td").nth(5)).toHaveText("6");
    await expect(player.locator(".sheet-black-total")).toHaveText("6");
    const partials = page.getByRole("table", {
      name: "Parciais das equipes",
      exact: true,
    });
    await expect(
      partials.getByRole("columnheader", { name: "OT1", exact: true }),
    ).toBeVisible();
    await expect(
      partials.getByRole("columnheader", { name: "OT2", exact: true }),
    ).toBeVisible();
    const team = partials.getByRole("row").filter({
      has: page.getByRole("rowheader", { name: "A · Lobos", exact: true }),
    });
    await expect(team.getByRole("cell")).toHaveText([
      "0",
      "0",
      "0",
      "2",
      "3",
      "1",
      "6",
    ]);
    await add("away", 1, "P");
    await add("away", 2, "P");
    await add("away", 3, "TC");
    await add("away", 3, "U2");
    await expect(page.getByRole("alert")).toContainText(
      "Indique explicitamente outro atleta elegível",
    );
    await page
      .getByLabel("Indique o atleta que assumirá como técnico")
      .selectOption(tid(201));
    await page.getByRole("button", { name: "Registrar ação" }).click();
    const fouls = b
      .getByRole("row")
      .filter({
        has: page.getByRole("rowheader", {
          name: "Jogador B 1 * C",
          exact: true,
        }),
      })
      .locator(".sheet-foul-cell");
    await expect(fouls).toHaveCount(5);
    await expect(fouls.nth(0)).toHaveClass(/sheet-first-half/);
    await expect(fouls.nth(1)).toHaveClass(/sheet-first-half/);
    await expect(fouls.nth(2)).not.toHaveClass(/sheet-first-half/);
    await expect(
      page.getByRole("region", { name: "Ações de faltas", exact: true }),
    ).toContainText("Tc (3)");
    await expect(
      page.getByRole("region", { name: "Ações de faltas", exact: true }),
    ).toContainText("U2 (GD)");
    for (let n = 0; n < 11; n++) await add("home", 1, "1", "11");
    await expect(page.locator(".sheet-actions li")).toHaveCount(10);
    await expect(
      page.getByLabel("Entrou Jogador A 11", { exact: true }),
    ).toBeChecked();
    const quarters = page.getByRole("group", { name: "Quartos", exact: true });
    for (const q of ["Q2", "Q3", "Q4", "OT1", "OT2"])
      await quarters.getByLabel(q, { exact: true }).uncheck();
    await page
      .getByRole("group", { name: "Equipes", exact: true })
      .getByLabel("Equipe A", { exact: true })
      .uncheck();
    await expect(page.locator(".sheet-actions li")).toHaveCount(1);
    await expect(page.locator(".sheet-actions li")).toContainText(
      "4. Q1 - B - #1 - P (1)",
    );
    await page.locator(".sheet-desktop-teams").last().screenshot({
      path: ".preview-artifacts/sheet-desktop-periods-fouls.png",
    });
  });
  test("reopening preserves the saved participants and roles instead of applying a new suggestion", async ({
    page,
  }) => {
    const f = await desktopSheetFixture(page);
    await openDesktopSheet(page);
    await chooseFive(page);
    await page
      .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
    ).toBeVisible();
    f.context.sides.home.lastJerseys[f.context.sides.home.roster[0].id] = "77";
    await page.reload();
    await page
      .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Preparar súmula", exact: true })
      .click();
    await expect(
      page.getByLabel("Camisa de Jogador A 1", { exact: true }),
    ).toHaveValue("1");
    await expect(
      page.getByLabel("Titular Jogador A 1", { exact: true }),
    ).toBeChecked();
  });

  test("game roles accept either registered role, reject duplicate persons and persist linked D/B2", async ({
    page,
  }) => {
    const f = await desktopSheetFixture(page, 11, true);
    await openDesktopSheet(page);
    await chooseFive(page);
    const coach = page.getByLabel("Técnico A", { exact: true });
    await coach.selectOption(tid(300)); // Registered as assistant.
    const assistant = page.getByLabel("Ass. Técnico A", { exact: true });
    await expect(assistant.locator(`option[value="${tid(302)}"]`)).toHaveCount(
      0,
    );
    await expect(assistant.locator(`option[value="${tid(300)}"]`)).toHaveCount(
      0,
    );
    await assistant.selectOption(tid(301)); // Registered as head.
    await page
      .getByRole("button", { name: "Concluir preparação e lançar ações" })
      .click();
    const add = async (target: string, code: string) => {
      await page.getByLabel("Equipe da ação").selectOption("home");
      await page.getByLabel("Camisa ou alvo").fill(target);
      await page.keyboard.press("Enter");
      await page.getByLabel("Ação", { exact: true }).fill(code);
      await page.keyboard.press("Enter");
    };
    await add("C", "B1");
    await add("AT", "D2");
    const staff = page
      .locator(".sheet-desktop-teams:visible .sheet-team-card")
      .first()
      .locator(".sheet-coach-fouls");
    await expect(staff).toContainText("Treinador A 1");
    await expect(staff).toContainText("Treinador A 2");
    await expect(staff).toContainText("B1");
    await expect(staff).toContainText("B2");
    await expect(staff).toContainText("D2");
    await expect(staff).toContainText("Técnico em exercício");
    await expect(page.locator(".sheet-actions li")).toHaveCount(2);
    await page.getByRole("button", { name: "Desfazer ação ou ajuste" }).click();
    await expect(staff).not.toContainText("B2");
    await page.getByRole("button", { name: "Refazer ação ou ajuste" }).click();
    await expect(staff).toContainText("B2");
    await page
      .getByRole("button", { name: "Salvar rascunho da súmula" })
      .click();
    expect(f.snapshot()?.document.formatVersion).toBe(2);
    expect(f.snapshot()?.document.events).toMatchObject([
      { target: "C", actorId: tid(300), code: "B1" },
      { target: "AT", actorId: tid(301), code: "D2" },
    ]);
    await page.reload();
    await page
      .getByRole("button", { name: "Abrir jogo Lobos × Lobos B" })
      .click();
    await page.getByRole("button", { name: "Preparar súmula" }).click();
    await page.getByRole("button", { name: "Revisar preparação" }).click();
    await expect(page.getByLabel("Técnico A", { exact: true })).toHaveValue(
      tid(300),
    );
    await expect(
      page.getByLabel("Ass. Técnico A", { exact: true }),
    ).toHaveValue(tid(301));
    await page
      .getByRole("button", { name: "Concluir preparação e lançar ações" })
      .click();
    await expect(page.locator(".sheet-coach-fouls").first()).toContainText(
      "Treinador A 1",
    );
  });

  test("a disqualified coach passes the role to the assistant without transferring prior fouls", async ({
    page,
  }) => {
    const f = await desktopSheetFixture(page, 11, true);
    await openDesktopSheet(page);
    await chooseFive(page);
    await page.getByLabel("Técnico A", { exact: true }).selectOption(tid(301));
    await page
      .getByLabel("Ass. Técnico A", { exact: true })
      .selectOption(tid(300));
    await page
      .getByRole("button", { name: "Concluir preparação e lançar ações" })
      .click();
    const add = async (code: string) => {
      await page.getByLabel("Equipe da ação").selectOption("home");
      await page.getByLabel("Camisa ou alvo").fill("C");
      await page.keyboard.press("Enter");
      await page.getByLabel("Ação", { exact: true }).fill(code);
      await page.keyboard.press("Enter");
    };
    await add("C1");
    await add("D2");
    await add("B1");
    const staff = page
      .locator(".sheet-desktop-teams:visible .sheet-team-card")
      .first()
      .locator(".sheet-coach-fouls");
    await expect(staff).toContainText("Técnico em exercício");
    await expect(staff).toContainText("Treinador A 1");
    await expect(staff).toContainText("Treinador A 2");
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(staff).toBeVisible();
      expect((await staff.boundingBox())!.width).toBeLessThan(viewport.width);
    }
    await page
      .getByRole("button", { name: "Salvar rascunho da súmula" })
      .click();
    expect(
      f.snapshot()?.document.events.map((e) => [e.actorId, e.code]),
    ).toEqual([
      [tid(301), "C1"],
      [tid(301), "D2"],
      [tid(300), "B1"],
    ]);
  });

  test.skip(
    ({ isMobile }) => isMobile,
    "Desktop-only MVP; no mobile adaptation in this unit.",
  );
  test("eleven athletes arrive automatically in twelve slots and preparation gates both sides", async ({
    page,
  }) => {
    const f = await desktopSheetFixture(page);
    await openDesktopSheet(page);
    const a = page.getByRole("table", {
        name: "Preparação equipe A",
        exact: true,
      }),
      b = page.getByRole("table", { name: "Preparação equipe B", exact: true });
    await expect(a.getByRole("combobox")).toHaveCount(12);
    await expect(b.getByRole("combobox")).toHaveCount(12);
    await expect(
      page.getByLabel("Atleta A vaga 1", { exact: true }),
    ).toHaveValue("Jogador A 1");
    await expect(
      page.getByLabel("Atleta A vaga 12", { exact: true }),
    ).toHaveValue("");
    await page
      .locator(".sheet-desktop-teams")
      .first()
      .screenshot({ path: ".preview-artifacts/sheet-desktop-preparation.png" });
    await page
      .getByRole("button", {
        name: "Concluir preparação e lançar ações",
        exact: true,
      })
      .click();
    await expect(page.getByRole("alert")).toContainText("5 titulares");
    await chooseFive(page);
    await page
      .getByRole("button", {
        name: "Concluir preparação e lançar ações",
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel("Camisa ou alvo", { exact: true }),
    ).toBeFocused();
    expect(f.snapshot()?.document.participants).toHaveLength(22);
    const left = await page
        .getByRole("table", { name: "Súmula equipe A", exact: true })
        .boundingBox(),
      right = await page
        .getByRole("table", { name: "Súmula equipe B", exact: true })
        .boundingBox();
    expect(left && right && left.x + left.width <= right.x + 2).toBeTruthy();
    expect(Math.abs(left!.y - right!.y)).toBeLessThan(4);
    await page
      .locator(".sheet-desktop-teams")
      .last()
      .screenshot({ path: ".preview-artifacts/sheet-desktop-live.png" });
  });
  test("dropdown excludes selected athletes and replaces one identity using the last shirt", async ({
    page,
  }) => {
    const f = await desktopSheetFixture(page, 14);
    f.context.sides.home.lastJerseys[f.context.sides.home.roster[13].id] = "77";
    await openDesktopSheet(page);
    const name = page.getByLabel("Atleta A vaga 1", { exact: true });
    await name.click();
    await name.fill("Jogador A");
    await expect(
      page.getByRole("option", { name: "Jogador A 1", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("option", { name: "Jogador A 2", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("option", { name: "Jogador A 14", exact: true })
      .click();
    await expect(
      page.getByLabel("Camisa de Jogador A 14", { exact: true }),
    ).toHaveValue("77");
    await page.getByLabel("Camisa de Jogador A 14", { exact: true }).fill("55");
    await page.getByLabel("Camisa de Jogador A 14", { exact: true }).blur();
    await expect(
      page.getByLabel("Camisa de Jogador A 14", { exact: true }),
    ).toHaveValue("55");
  });
  test("sixth starter is refused and an incomplete draft can still be saved", async ({
    page,
  }) => {
    const f = await desktopSheetFixture(page);
    await openDesktopSheet(page);
    await chooseFive(page);
    await page.getByLabel("Titular Jogador A 6", { exact: true }).click();
    await expect(
      page.getByLabel("Titular Jogador A 6", { exact: true }),
    ).not.toBeChecked();
    await page.getByLabel("Titular Jogador B 5", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
    ).toBeVisible();
    expect(
      f
        .snapshot()
        ?.document.participants.filter((p) => p.side === "away" && p.starter),
    ).toHaveLength(4);
  });
});

test("scoresheet reflows at CSS widths equivalent to 200% desktop zoom", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop");
  await desktopSheetFixture(page);
  await openDesktopSheet(page);
  await chooseFive(page);

  const zoomedViewports = [
    { width: 683, height: 384, origin: "1366x768" },
    { width: 960, height: 540, origin: "1920x1080" },
  ];
  const inspectTeams = async (phase: string, source: string) => {
    // The live grid stays mounted under `hidden` while preparing the teams.
    // Inspect the active stage, otherwise zero rectangles pass and its screenshot waits forever.
    const grid = page.locator(".sheet-desktop-teams:visible");
    await expect(grid).toHaveCount(1);
    await expect(grid).toBeVisible();
    const boxes = await grid.locator(".sheet-team-card").evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }),
    );
    expect(boxes).toHaveLength(2);
    for (const box of boxes) expect(box.bottom).toBeGreaterThan(box.top);
    expect(boxes[1].top).toBeGreaterThanOrEqual(boxes[0].bottom - 1);
    const overflow = await grid.evaluate(
      (node) => node.scrollWidth > node.clientWidth + 1,
    );
    expect(overflow).toBe(false);
    await grid.screenshot({
      path: `.preview-artifacts/sheet-zoom200-${phase}-after-${source}.png`,
      animations: "disabled",
    });
  };

  for (const viewport of zoomedViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await inspectTeams("preparation", viewport.origin);
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  await page
    .getByRole("button", {
      name: "Concluir preparação e lançar ações",
      exact: true,
    })
    .click();
  await page.getByLabel("Camisa ou alvo", { exact: true }).fill("1");
  await page.keyboard.press("Enter");
  await page.getByLabel("Ação", { exact: true }).fill("1");
  await page.keyboard.press("Enter");

  for (const viewport of zoomedViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await inspectTeams("live", viewport.origin);
    if (viewport.width === 683) {
      const scroller = page.getByRole("region", {
        name: "Súmula da equipe A com rolagem horizontal",
        exact: true,
      });
      await scroller.evaluate((node) => {
        node.scrollLeft = 0;
      });
      await scroller.focus();
      await expect(scroller).toBeFocused();
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => scroller.evaluate((node) => node.scrollLeft))
        .toBeGreaterThan(0);
    }
  }

  const edit = page.getByRole("button", {
    name: "Editar ação 1",
    exact: true,
  });
  await edit.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Editar ação da súmula",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const focusIsInsideDialog = () =>
    dialog.evaluate((node) => node.contains(document.activeElement));
  await expect.poll(focusIsInsideDialog).toBe(true);
  await page.keyboard.press("Tab");
  await expect.poll(focusIsInsideDialog).toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect.poll(focusIsInsideDialog).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(edit).toBeFocused();
});
