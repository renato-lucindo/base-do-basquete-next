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
