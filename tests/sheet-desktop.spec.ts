import { test, expect } from "@playwright/test";
import {
  desktopSheetFixture,
  openDesktopSheet,
  chooseFive,
} from "./fixtures/sheet-desktop";
test.describe("desktop scoresheet MVP", () => {
  test("editing an event opens a native dialog and Escape preserves the event", async ({
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
    await page.getByLabel("Ação", { exact: true }).fill("2");
    await page.keyboard.press("Enter");
    const history = page.getByRole("region", {
      name: "Ações de pontos",
    });
    await history.getByRole("button", { name: "Editar ação 1" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar ação" });
    await expect(dialog).toBeVisible();
    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.screenshot({
        path: `dist/ui-ux-captures/sheet-edit-after-${viewport.width}x${viewport.height}.png`,
        animations: "disabled",
      });
    }
    await dialog.getByLabel("Ação", { exact: true }).fill("3");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(history).toContainText("2p");
    await history.getByRole("button", { name: "Editar ação 1" }).click();
    await dialog.getByLabel("Ação", { exact: true }).fill("3");
    await dialog.getByRole("button", { name: "Salvar edição da ação" }).click();
    await expect(dialog).toBeHidden();
    await expect(history).toContainText("3p");
  });
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
