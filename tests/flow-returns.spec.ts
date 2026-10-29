import { test, expect } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import {
  desktopSheetFixture,
  openDesktopSheet,
} from "./fixtures/sheet-desktop";

test.skip(({ isMobile }) => isMobile, "Desktop flow review.");

test("saved game exposes return without scrolling and preserves the games search", async ({
  page,
}) => {
  await gamesFixture(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByLabel("Buscar jogo", { exact: true }).fill("Lobos");
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await page
    .getByLabel("Inscrição mandante", { exact: true })
    .selectOption(tid(5));
  await page
    .getByLabel("Inscrição visitante", { exact: true })
    .selectOption(tid(6));
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  await page.screenshot({ path: ".preview-artifacts/flow-game-saved.png" });
  const back = page.getByRole("button", {
    name: "Voltar à lista de jogos",
    exact: true,
  });
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(back).toBeInViewport();
    await page.screenshot({
      path: `.preview-artifacts/flow-game-saved-${width}.png`,
    });
  }
  // Check clipping too: Playwright's visible state alone allows offscreen buttons.
  await expect
    .poll(() =>
      back.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    )
    .toBe(true);
  await back.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Buscar jogo", { exact: true })).toHaveValue(
    "Lobos",
  );
  await expect(
    page.getByRole("button", { name: "Novo jogo", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await expect(
    page.getByLabel("Inscrição mandante", { exact: true }),
  ).toHaveValue(tid(5));
});

test("scoresheet offers visible returns and protects unsaved preparation", async ({
  page,
}) => {
  await desktopSheetFixture(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await openDesktopSheet(page);
  await expect(
    page.getByLabel("Titular Jogador A 1", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".preview-artifacts/flow-sheet-preparation.png",
  });
  const back = page.getByRole("button", {
    name: "Voltar à lista de jogos",
    exact: true,
  });
  await expect(back).toBeInViewport();
  await page.getByLabel("Titular Jogador A 1", { exact: true }).check();
  await page.evaluate(() => window.scrollTo(0, 0));
  let prompts = 0;
  page.once("dialog", async (dialog) => {
    prompts++;
    await dialog.dismiss();
  });
  await back.click();
  await expect(
    page.getByLabel("Titular Jogador A 1", { exact: true }),
  ).toBeChecked();
  expect(prompts).toBe(1);
  page.once("dialog", async (dialog) => {
    prompts++;
    await dialog.accept();
  });
  await back.click();
  await expect(
    page.getByRole("button", {
      name: "Abrir jogo Lobos × Lobos B",
      exact: true,
    }),
  ).toBeVisible();
  expect(prompts).toBe(2);
});

test("saved preparation returns through game data and list without losing the saved lineup", async ({
  page,
}) => {
  const f = await desktopSheetFixture(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openDesktopSheet(page);
  await page.getByLabel("Titular Jogador A 1", { exact: true }).check();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Rascunho da súmula salvo" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const data = page.getByRole("button", {
    name: "Voltar aos dados do jogo",
    exact: true,
  });
  await expect(data).toBeInViewport();
  await data.click();
  await expect(
    page.getByRole("dialog", { name: "Editar jogo", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir jogo Lobos × Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparar súmula", exact: true })
    .click();
  await expect(
    page.getByLabel("Titular Jogador A 1", { exact: true }),
  ).toBeChecked();
  expect(f.commands).toHaveLength(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toBeFocused();
});
