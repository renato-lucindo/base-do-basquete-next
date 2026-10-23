import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("docs/evidencias", { recursive: true });
const browser = await chromium.launch();
for (const [name, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto("http://127.0.0.1:5173/#/competicao");
  await page
    .getByRole("heading", { name: "Informações do campeonato" })
    .waitFor();
  await page.screenshot({
    path: `docs/evidencias/${name}-campeonato.png`,
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:5173/#/equipes");
  await page
    .locator("details.roster summary")
    .filter({ hasText: "Lobos" })
    .click();
  await page.screenshot({
    path: `docs/evidencias/${name}-elencos.png`,
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:5173/#/importar");
  await page.getByRole("button", { name: "Carregar lote de exemplo" }).click();
  await page.screenshot({
    path: `docs/evidencias/${name}-pdfs.png`,
    fullPage: true,
  });
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("http://127.0.0.1:5173/#/sumula");
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page.getByLabel("Beatriz Costa jogou").check();
  await page.screenshot({
    path: `docs/evidencias/${name}-sumula.png`,
    fullPage: true,
  });
  await page.close();
}
await browser.close();
process.stdout.write("8 composições salvas em docs/evidencias.\n");
