import { test, expect } from "@playwright/test";
import { regulationBrowserFixture } from "./fixtures/regulation-browser";
import { tid } from "./fixtures/text-import";
import { scanAccessibility } from "./fixtures/accessibility";
import { achievementBrowserFixture } from "./fixtures/achievement-browser";
import {
  profileBrowserFixture,
  openProfilePublication,
} from "./fixtures/player-profile-browser";
import { decisionBrowserFixture } from "./fixtures/decisions-browser";
import {
  transferBrowserFixture,
  openTransfer,
} from "./fixtures/transfer-browser";

test("transferência mantém controles alinhados quando o rótulo da camisa ocupa duas linhas", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop");
  await page.setViewportSize({ width: 1366, height: 768 });
  await transferBrowserFixture(page);
  await openTransfer(page);
  await page.addStyleTag({
    content:
      ".compact-pilot .transfer-fields .transfer-destination, .compact-pilot .transfer-fields .transfer-jersey { font-size:18px; }",
  });
  const destination = page.getByLabel("Inscrição de destino", { exact: true }),
    jersey = page.getByLabel("Camisa no destino", { exact: true });
  await expect(destination).toBeEnabled();
  const a = await destination.boundingBox(),
    b = await jersey.boundingBox();
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(3);
});

for (const width of [1366, 1920])
  test(`regulamento compacto desktop ${width} expõe regras e campos proporcionais`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await regulationBrowserFixture(page);
    await page.goto(
      `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
    );
    const transfers = page.getByRole("group", {
      name: "Transferências de atletas",
      exact: true,
    });
    const wo = page.getByRole("group", { name: "Regra de W.O.", exact: true });
    await expect(transfers).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    const phase = process.env.ADMIN_CAPTURE_BASELINE ? "before" : "after";
    await page.screenshot({
      path: `.preview-artifacts/admin-expansion-${phase}-regulation-${width}.png`,
      fullPage: true,
    });
    const left = await transfers.boundingBox(),
      right = await wo.boundingBox();
    expect(Math.abs(left!.y - right!.y)).toBeLessThan(3);
    expect(right!.x).toBeGreaterThan(left!.x + left!.width);
    await page
      .getByRole("button", { name: "Adicionar pontos corridos", exact: true })
      .click();
    const win = page.getByLabel("Pontos por vitória", { exact: true });
    await win.fill("2");
    await page.getByLabel("Pontos por derrota", { exact: true }).fill("1");
    expect((await win.boundingBox())!.width).toBeLessThanOrEqual(160);
    await expect(
      page.getByLabel("Nome da fase", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Incluir Lobos", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page
      .getByRole("button", { name: "Adicionar eliminatória", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Adicionar confronto", exact: true })
      .click();
    const a = await page
      .getByRole("group", { name: "Confronto 1: equipe A", exact: true })
      .boundingBox();
    const b = await page
      .getByRole("group", { name: "Confronto 1: equipe B", exact: true })
      .boundingBox();
    expect(a!.width).toBeGreaterThan(350);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(3);
    await scanAccessibility(page, info, `admin-expanded-regulation-${width}`);
  });

for (const width of [1366, 1920]) {
  test(`perfil compacto desktop ${width} agrupa dados da conferência`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await profileBrowserFixture(page);
    await openProfilePublication(page);
    const fields = page
      .getByRole("region", { name: "Dados públicos do perfil", exact: true })
      .locator("dl > div");
    const phase = process.env.ADMIN_CAPTURE_BASELINE ? "before" : "after";
    await page.screenshot({
      path: `.preview-artifacts/admin-expansion-${phase}-profile-${width}.png`,
      fullPage: true,
    });
    const name = await fields.nth(0).boundingBox(),
      year = await fields.nth(2).boundingBox();
    expect(Math.abs(name!.y - year!.y)).toBeLessThan(3);
    await expect(
      page.getByRole("button", { name: "Conferir publicação", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("region", {
        name: "Dados públicos do perfil",
        exact: true,
      }),
    ).not.toContainText("Data de nascimento");
    await scanAccessibility(page, info, `admin-expanded-profile-${width}`);
  });

  test(`decisão compacta desktop ${width} aproxima campos relacionados`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await decisionBrowserFixture(page);
    const type = page.getByRole("combobox", {
      name: "Tipo da ocorrência",
      exact: true,
    });
    await expect(type).toBeEnabled();
    await type.selectOption("administrative");
    expect(
      (await page.getByLabel("Número do jogo", { exact: true }).boundingBox())!
        .width,
    ).toBeLessThanOrEqual(140);
    const effect = page.getByRole("combobox", {
      name: "Efeito administrativo",
      exact: true,
    });
    const phase = process.env.ADMIN_CAPTURE_BASELINE ? "before" : "after";
    await page.screenshot({
      path: `.preview-artifacts/admin-expansion-${phase}-decision-${width}.png`,
      fullPage: true,
    });
    const x = await type.boundingBox(),
      y = await effect.boundingBox();
    expect(Math.abs(x!.y - y!.y)).toBeLessThan(3);
    expect(y!.x).toBeGreaterThan(x!.x);
    await expect(
      page.getByRole("textbox", { name: "Motivo da ocorrência", exact: true }),
    ).toBeVisible();
    await scanAccessibility(page, info, `admin-expanded-decision-${width}`);
  });

  test(`premiações compactas desktop ${width} mantém fontes lado a lado`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await achievementBrowserFixture(page);
    await page.goto(
      `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/regulamento`,
    );
    await page
      .getByRole("button", { name: "Colocações e honrarias", exact: true })
      .click();
    const mode = page.getByLabel("Origem da sugestão", { exact: true });
    await expect(mode).toBeEnabled();
    await mode.selectOption("series");
    const final = page.getByLabel("Confronto da final", { exact: true });
    const bronze = page.getByLabel("Confronto do bronze", { exact: true });
    await page.evaluate(() => scrollTo(0, 0));
    const phase = process.env.ADMIN_CAPTURE_BASELINE ? "before" : "after";
    await page.screenshot({
      path: `.preview-artifacts/admin-expansion-${phase}-achievements-${width}.png`,
      fullPage: true,
    });
    const x = await mode.boundingBox(),
      y = await final.boundingBox(),
      z = await bronze.boundingBox();
    expect(x!.width).toBeLessThan(550);
    expect(Math.abs(x!.y - y!.y)).toBeLessThan(3);
    expect(Math.abs(y!.y - z!.y)).toBeLessThan(3);
    expect(z!.x).toBeGreaterThan(y!.x);
    await scanAccessibility(page, info, `admin-expanded-achievements-${width}`);
  });

  test(`transferência compacta desktop ${width} alinha destino e camisa`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await transferBrowserFixture(page);
    await openTransfer(page);
    const destination = page.getByLabel("Inscrição de destino", {
      exact: true,
    });
    await expect(destination).toBeEnabled();
    const jersey = page.getByLabel("Camisa no destino", { exact: true });
    await page.evaluate(() => scrollTo(0, 0));
    const phase = process.env.ADMIN_CAPTURE_BASELINE ? "before" : "after";
    await page.screenshot({
      path: `.preview-artifacts/admin-expansion-${phase}-transfer-${width}.png`,
      fullPage: true,
    });
    const x = await destination.boundingBox(),
      y = await jersey.boundingBox();
    expect(y!.width).toBeLessThanOrEqual(140);
    expect(Math.abs(x!.y - y!.y)).toBeLessThan(3);
    expect(y!.x).toBeGreaterThan(x!.x);
    await jersey.fill("00");
    await expect(jersey).toHaveValue("00");
    await scanAccessibility(page, info, `admin-expanded-transfer-${width}`);
  });
}
