import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
mkdirSync(".preview-artifacts", { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto("http://127.0.0.1:5173/#/sumula");
    const staff = page.getByRole("group", {
      name: "Comissão técnica de Águias",
      exact: true,
    });
    await staff
      .getByLabel("Sem técnico: capitão assume", { exact: true })
      .uncheck();
    await staff.getByLabel("Técnico", { exact: true }).fill("Renata Lima");
    await staff
      .getByLabel("Ass. Técnico", { exact: true })
      .fill("Mariana Alves");
    for (const period of ["3", "1", "2", "4"]) {
      await page.getByLabel("Período", { exact: true }).selectOption(period);
      await page.getByLabel("Código", { exact: true }).fill("2");
      await page.getByLabel("Código", { exact: true }).press("Enter");
    }
    await page.getByLabel("Ordem das ações").selectOption("period");
    await page.screenshot({
      path: `docs/evidencias/${name}-sumula.png`,
      fullPage: true,
    });
    await page
      .locator(".roster-columns")
      .screenshot({ path: `.preview-artifacts/${name}-comissao.png` });
    await page
      .getByRole("button", { name: "Editar ação 2", exact: true })
      .click();
    await page
      .locator(".entry-workspace")
      .screenshot({ path: `.preview-artifacts/${name}-sumula-edicao.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(
  "Duas capturas da súmula atualizadas; seis composições inalteradas reutilizadas.",
);
