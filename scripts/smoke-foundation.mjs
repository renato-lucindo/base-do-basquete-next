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
  for (const path of [
    "/api/competitions",
    `/api/competitions/${randomUUID()}`,
    "/api/teams",
    `/api/teams/${randomUUID()}`,
    `/api/registrations?disputeId=${randomUUID()}`,
    `/api/registrations/${randomUUID()}`,
    `/api/games?disputeId=${randomUUID()}`,
    `/api/games/${randomUUID()}`,
    `/api/games/${randomUUID()}/sheet`,
    `/api/games/${randomUUID()}/publication`,
    `/api/games/${randomUUID()}/publication/versions/1`,
    `/api/games/${randomUUID()}/publication/preparation/${randomUUID()}`,
    `/api/regulations/${randomUUID()}`,
    `/api/regulations/${randomUUID()}/versions/1`,
    `/api/achievements/${randomUUID()}`,
    `/api/achievements/${randomUUID()}/athletes?q=&offset=0`,
    `/api/achievements/${randomUUID()}/drafts/1`,
    `/api/achievements/${randomUUID()}/confirmations/1`,
    `/api/games/${randomUUID()}/occurrence`,
    `/api/games/${randomUUID()}/occurrence/versions/1`,
    `/api/registrations/${randomUUID()}/withdrawal`,
    `/api/registrations/${randomUUID()}/withdrawal/versions/1`,
    `/api/pdf-sources?disputeId=${randomUUID()}`,
    `/api/pdf-sources/${randomUUID()}`,
    `/api/pdf-sources/${randomUUID()}/review`,
    `/api/pdf-sources/${randomUUID()}/preparation`,
    "/api/people",
    `/api/people/${randomUUID()}`,
    `/api/people/${randomUUID()}/profile`,
    `/api/people/${randomUUID()}/profile/versions/1`,
    `/api/roster?registrationId=${randomUUID()}`,
    `/api/roster/${randomUUID()}`,
    `/api/roster/${randomUUID()}/transfer?destinationRegistrationId=${randomUUID()}`,
    `/api/staff?registrationId=${randomUUID()}`,
    `/api/staff/${randomUUID()}`,
    `/api/text-import?disputeId=${randomUUID()}`,
    `/api/text-import/${randomUUID()}`,
    `/api/text-import/people/${randomUUID()}?disputeId=${randomUUID()}`,
  ]) {
    stage = `private application route ${path}`;
    const denied = await fetch(`${origin}${path}`, { headers });
    status = denied.status;
    assert.equal(status, 401);
    await denied.arrayBuffer();
  }
  for (const path of [
    `/api/regulations/${randomUUID()}`,
    `/api/regulations/${randomUUID()}/preview`,
    `/api/achievements/${randomUUID()}`,
    `/api/achievements/${randomUUID()}/suggestion`,
    `/api/achievements/${randomUUID()}/confirm`,
    `/api/games/${randomUUID()}/occurrence`,
    `/api/games/${randomUUID()}/occurrence/preview`,
    `/api/registrations/${randomUUID()}/withdrawal`,
    `/api/registrations/${randomUUID()}/withdrawal/preview`,
    `/api/roster/${randomUUID()}/transfer`,
    `/api/roster/${randomUUID()}/transfer/preview`,
    `/api/people/${randomUUID()}/profile`,
  ]) {
    stage = `private decision command ${path}`;
    const denied = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        ...headers,
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    status = denied.status;
    assert.equal(status, 401);
    await denied.arrayBuffer();
  }
  stage = "public projection without application authentication";
  for (const resource of [
    "games",
    "achievements",
    "statistics",
    "players",
    "teams",
  ]) {
    const publicMissing = await fetch(
      `${origin}/api/public/${resource}/${randomUUID()}`,
      { headers: { ...headers, Cookie: "__Host-bdb-session=invalid" } },
    );
    status = publicMissing.status;
    assert.equal(status, 404);
    assert.equal((await publicMissing.json()).error.code, "public_not_found");
    assert.ok(
      !publicMissing.headers
        .getSetCookie()
        .some((c) => c.startsWith("__Host-bdb-session=")),
    );
  }
  stage = "public team detail without application authentication";
  const absentTeam = await fetch(
    `${origin}/api/public/teams/${randomUUID()}/${randomUUID()}`,
    { headers: { ...headers, Cookie: "__Host-bdb-session=invalid" } },
  );
  assert.equal(absentTeam.status, 404);
  assert.equal((await absentTeam.json()).error.code, "public_not_found");
  assert.equal(
    absentTeam.headers
      .getSetCookie()
      .some((c) => c.startsWith("__Host-bdb-session=")),
    false,
  );
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
    stage = `browser ${name} public projection`;
    const resultDocument = await page.goto(
      `${origin}/resultado.html#${randomUUID()}`,
      { waitUntil: "domcontentloaded" },
    );
    assert.equal(resultDocument.status(), 200);
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByLabel("Senha", { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    stage = `browser ${name} public statistics`;
    const statisticsDocument = await page.goto(
      `${origin}/estatisticas.html#${randomUUID()}`,
      { waitUntil: "domcontentloaded" },
    );
    assert.equal(statisticsDocument.status(), 200);
    await page
      .getByText("Ainda não há resultados confirmados nesta disputa.", {
        exact: true,
      })
      .waitFor();
    assert.equal(await page.getByLabel("Senha", { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    stage = `browser ${name} public player`;
    const playerDocument = await page.goto(
      `${origin}/atleta.html#${randomUUID()}`,
      { waitUntil: "domcontentloaded" },
    );
    assert.equal(playerDocument.status(), 200);
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByLabel("Senha", { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    for (const path of [
      `/equipes.html#${randomUUID()}`,
      `/equipe.html#${randomUUID()}?disputeId=${randomUUID()}`,
    ]) {
      stage = `browser ${name} public team ${path.split("#")[0]}`;
      const doc = await page.goto(origin + path, {
        waitUntil: "domcontentloaded",
      });
      assert.equal(doc.status(), 200);
      await page.getByRole("alert").waitFor();
      assert.equal(await page.getByLabel("Senha", { exact: true }).count(), 0);
      assert.deepEqual(errors, []);
    }
    await context.close();
  }
  console.log(
    JSON.stringify({
      success: true,
      sourceCommit: manifest.sourceCommit,
      files: Object.keys(manifest.manifest).length,
      browsers: 2,
      realAuthInvalidLogin: true,
      privateDecisionCommands: 6,
      privateTransferRead: true,
      privateTransferCommands: 2,
      privateAchievementReads: 4,
      privateAchievementCommands: 3,
      publicAchievementProjectionRead: true,
      publicProjectionRead: true,
      publicStatisticsRead: true,
      publicPlayerProjectionRead: true,
      publicTeamReads: 2,
      privatePlayerProfileReads: 2,
      privatePlayerProfileCommands: 1,
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
