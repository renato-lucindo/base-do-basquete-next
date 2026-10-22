// Credencial transitória recebida por stdin, cifrada para chave mantida só em memória.
import {
  generateKeyPairSync,
  privateDecrypt,
  createHash,
  constants,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
console.log(
  JSON.stringify({
    publicKey: publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
  }),
);
const input = createInterface({ input: process.stdin, terminal: false });
const ciphertext = await new Promise((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error("Prazo de recebimento expirou.")),
    240000,
  );
  input.once("line", (line) => {
    clearTimeout(timer);
    resolve(line);
  });
});
input.close();
const credential = JSON.parse(
  privateDecrypt(
    {
      key: privateKey,
      oaepHash: "sha256",
      padding: constants.RSA_PKCS1_OAEP_PADDING,
    },
    Buffer.from(ciphertext, "base64"),
  ).toString(),
);
const headers = {
  "CF-Access-Client-ID": credential.client_id,
  "CF-Access-Client-Secret": credential.client_secret,
  "Cache-Control": "no-cache, no-store",
};
const base = "https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev";
const manifest = JSON.parse(
  readFileSync(".preview-artifacts/manifest.json", "utf8"),
);
let stage = "início";
let observedStatus;
let browserDocument;
const nonce = Date.now();
const filesToCheck = process.argv.includes("--browser-only")
  ? []
  : manifest.files;
try {
  stage = "aguardar propagação Access";
  for (let attempt = 0; attempt < 10; attempt++) {
    const ready = await fetch(base + "/?ready=" + nonce + "-" + attempt, {
      headers,
      redirect: "manual",
    });
    observedStatus = ready.status;
    if (ready.status === 200) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  assert.equal(observedStatus, 200);
  for (const file of filesToCheck) {
    stage = `HTTP ${file.path}`;
    let response;
    for (let attempt = 0; attempt < 5; attempt++) {
      response = await fetch(
        base + file.path + "?smoke=" + nonce + "-" + attempt,
        {
          headers,
          redirect: "manual",
        },
      );
      if (response.status !== 302) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    observedStatus = response.status;
    if (response.status !== 200)
      console.error(
        JSON.stringify({
          diagnostic: true,
          status: response.status,
          cacheControl: response.headers.get("cache-control"),
          cacheStatus: response.headers.get("cf-cache-status"),
          server: response.headers.get("server"),
        }),
      );
    assert.equal(response.status, 200, `HTTP incorreto: ${file.path}`);
    assert.equal(
      response.headers.get("x-prototype-source"),
      manifest.applicationCommit,
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    stage = `hash ${file.path}`;
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      file.sha256,
      `Hash divergente: ${file.path}`,
    );
  }
  console.log(
    JSON.stringify({
      hashesVerified: filesToCheck.length,
      sourceCommit: manifest.sourceCommit,
    }),
  );
  stage = "Chromium";
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({
        viewport,
        extraHTTPHeaders: headers,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("response", (response) => {
        if (response.request().isNavigationRequest())
          browserDocument = {
            status: response.status(),
            host: new URL(response.url()).hostname,
            path: new URL(response.url()).pathname,
          };
      });
      const errors = [];
      page.on("dialog", (dialog) => dialog.accept());
      page.on("pageerror", () => errors.push("pageerror"));
      stage = `campeonatos ${viewport.width}`;
      await page.goto(base);
      await page
        .getByRole("button", { name: "+ Novo campeonato", exact: true })
        .waitFor();
      stage = `PDFs ${viewport.width}`;
      await page.goto(base + "/#/importar");
      await page
        .getByRole("button", { name: "Carregar lote de exemplo" })
        .waitFor();
      await page
        .getByRole("button", { name: "Carregar lote de exemplo" })
        .click();
      await page
        .getByRole("row")
        .filter({ hasText: "Estrelas x Aurora.pdf" })
        .waitFor();
      stage = `súmula ${viewport.width}`;
      await page.goto(base + "/#/sumula");
      await page
        .getByRole("heading", { name: "Súmula por teclado", exact: true })
        .waitFor();
      if (process.argv.includes("--scoresheet-staff")) {
        stage = `comissão técnica ${viewport.width}`;
        const staff = page.getByRole("group", {
          name: "Comissão técnica de Lobos",
          exact: true,
        });
        assert.equal(
          await staff.getByLabel("Técnico", { exact: true }).inputValue(),
          "Ana da Silva",
        );
        assert.equal(
          await staff.getByLabel("Ass. Técnico", { exact: true }).count(),
          0,
        );
        await staff.getByLabel("Capitão", { exact: true }).selectOption("2");
        assert.equal(
          await staff.getByLabel("Técnico", { exact: true }).inputValue(),
          "Beatriz Costa",
        );
        await staff
          .getByLabel("Sem técnico: capitão assume", { exact: true })
          .uncheck();
        await staff
          .getByLabel("Técnico", { exact: true })
          .fill("Patrícia Lima");
        await staff
          .getByLabel("Ass. Técnico", { exact: true })
          .fill("Joana Silva");
        assert.equal(
          await staff.getByLabel("Ass. Técnico", { exact: true }).inputValue(),
          "Joana Silva",
        );
        await staff
          .getByLabel("Sem técnico: capitão assume", { exact: true })
          .check();
        assert.equal(
          await staff.getByLabel("Ass. Técnico", { exact: true }).count(),
          0,
        );
      }
      if (process.argv.includes("--scoresheet-review")) {
        stage = `revisão de ações ${viewport.width}`;
        await page.keyboard.press("Alt+b");
        assert.equal(
          await page.getByLabel("Equipe", { exact: true }).inputValue(),
          "away",
        );
        await page.keyboard.press("Alt+a");
        assert.equal(
          await page.getByLabel("Equipe", { exact: true }).inputValue(),
          "home",
        );
        for (const period of ["2", "1"]) {
          await page.keyboard.press("Alt+" + period);
          await page.keyboard.type("7");
          await page.keyboard.press("Enter");
          assert.equal(
            await page.evaluate(() => document.activeElement?.id),
            "entry-code",
          );
          await page.keyboard.type("2");
          await page.keyboard.press("Enter");
          assert.equal(
            await page.evaluate(() => document.activeElement?.id),
            "entry-target",
          );
        }
        await page.getByLabel("Ordem das ações").selectOption("period");
        await page
          .getByRole("button", { name: "Editar ação 1", exact: true })
          .click();
        await page.getByLabel("Código", { exact: true }).fill("3");
        await page
          .getByRole("button", { name: "Salvar alteração", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Excluir ação 2", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Confirmar exclusão", exact: true })
          .click();
        assert.equal(await page.locator(".score").textContent(), "3×0");
        assert.equal(
          await page.locator(".entry-workspace tbody tr").count(),
          1,
        );
      }
      stage = `galeria ${viewport.width}`;
      await page.goto(base + "/docs/evidencias/");
      await page.locator("img").first().waitFor();
      assert.equal(
        await page
          .locator("img")
          .evaluateAll((images) =>
            images.every((image) => image.complete && image.naturalWidth > 0),
          ),
        true,
      );
      assert.equal(errors.length, 0);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(
    JSON.stringify({
      success: true,
      hashes: filesToCheck.length,
      viewports: 2,
      flows: 3,
      gallery: true,
      scoresheetReview: process.argv.includes("--scoresheet-review"),
      keyboardCycle: process.argv.includes("--scoresheet-review"),
      scoresheetStaff: process.argv.includes("--scoresheet-staff"),
      applicationCommit: manifest.applicationCommit,
      sourceCommit: manifest.sourceCommit,
    }),
  );
} catch {
  console.error(
    JSON.stringify({ success: false, stage, observedStatus, browserDocument }),
  );
  process.exitCode = 1;
}
