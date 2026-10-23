// Ephemeral service credential arrives encrypted for a private key held in memory.
import {
  generateKeyPairSync,
  privateDecrypt,
  constants,
  createHash,
  randomUUID,
  randomBytes,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

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
    () => reject(new Error("Credential delivery timeout")),
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
const origin =
  "https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev";
const manifest = JSON.parse(
  readFileSync(".worker-artifacts/foundation-manifest.json", "utf8"),
);
let stage = "Access propagation";
let status;
let browser;
let currentPage;
const browserFailures = [];
try {
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await fetch(`${origin}/?ready=${randomUUID()}`, {
      headers,
      redirect: "manual",
    });
    status = response.status;
    await response.arrayBuffer();
    if (status === 200) break;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  assert.equal(status, 200);
  for (const [path, file] of Object.entries(manifest.manifest)) {
    stage = `artifact ${path}`;
    const response = await fetch(`${origin}${path}?smoke=${randomUUID()}`, {
      headers,
      redirect: "manual",
    });
    status = response.status;
    assert.equal(status, 200);
    assert.equal(response.headers.get("x-bdb-source"), manifest.sourceCommit);
    assert.equal(
      createHash("sha256")
        .update(Buffer.from(await response.arrayBuffer()))
        .digest("hex"),
      file.hash,
    );
  }
  stage = "health and private session";
  const health = await fetch(`${origin}/api/health`, { headers });
  status = health.status;
  assert.equal(status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  const session = await fetch(`${origin}/api/session`, { headers });
  status = session.status;
  assert.equal(status, 401);
  await session.arrayBuffer();
  const privateModule = await fetch(`${origin}/worker.js`, { headers });
  status = privateModule.status;
  assert.equal(status, 404);
  await privateModule.arrayBuffer();
  stage = "real Auth invalid login";
  const invalid = await fetch(`${origin}/api/session`, {
    method: "POST",
    headers: { ...headers, Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `smoke-${randomUUID()}@example.invalid`,
      password: randomBytes(32).toString("base64url"),
    }),
  });
  status = invalid.status;
  assert.equal(status, 401);
  const rejection = await invalid.json();
  stage = "Auth error contract";
  assert.equal(rejection.error.code, "invalid_session");
  // Access can set its own cookies; failed password login must not mint an app session.
  stage = "no application cookie on invalid password";
  assert.ok(
    !invalid.headers
      .getSetCookie()
      .some((cookie) => cookie.startsWith("__Host-bdb-session=")),
  );
  browser = await chromium.launch({ headless: true });
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    stage = `browser ${name}`;
    const context = await browser.newContext({
      viewport,
      extraHTTPHeaders: headers,
    });
    const page = await context.newPage();
    currentPage = page;
    const errors = [];
    page.on("pageerror", () => errors.push("pageerror"));
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      browserFailures.push({
        path: url.origin + url.pathname,
        failure: request.failure()?.errorText,
      });
    });
    const document = await page.goto(origin, { waitUntil: "domcontentloaded" });
    status = document?.status();
    assert.equal(status, 200);
    stage = `browser ${name} ready`;
    await page
      .getByRole("heading", { name: "Acesso administrativo" })
      .waitFor();
    stage = `browser ${name} screenshot`;
    await page.screenshot({
      path: `.preview-artifacts/access-${name}.png`,
      fullPage: true,
    });
    assert.deepEqual(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
      })),
      { local: 0, session: 0 },
    );
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    JSON.stringify({
      success: true,
      sourceCommit: manifest.sourceCommit,
      files: Object.keys(manifest.manifest).length,
      browsers: 2,
      realAuthInvalidLogin: true,
      ownerLoginPending: true,
    }),
  );
} catch {
  const diagnostic = currentPage
    ? {
        title: await currentPage.title(),
        text: (await currentPage.locator("body").innerText()).slice(0, 500),
        requests: browserFailures,
      }
    : undefined;
  if (currentPage)
    await currentPage
      .screenshot({
        path: ".preview-artifacts/access-remote-failure.png",
        fullPage: true,
      })
      .catch(() => undefined);
  console.error(JSON.stringify({ success: false, stage, status, diagnostic }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
