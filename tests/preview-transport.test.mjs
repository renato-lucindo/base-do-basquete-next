import test from "node:test";
import assert from "node:assert/strict";
import { createPreviewHandler } from "../scripts/preview-worker.mjs";

const host = "https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev";
const bundle = {
  applicationCommit: "app-sha",
  sourceCommit: "transport-sha",
  manifest: {
    "/index.html": { hash: "a", size: 7 },
    "/assets/app.js": { hash: "b", size: 2 },
    "/docs/evidencias/index.html": { hash: "c", size: 7 },
  },
  files: {
    a: { mime: "text/html", base64: Buffer.from("início").toString("base64") },
    b: {
      mime: "text/javascript",
      base64: Buffer.from("42").toString("base64"),
    },
    c: { mime: "text/html", base64: Buffer.from("galeria").toString("base64") },
  },
};
test("preserva conteúdo, MIME e identificação sem expor caminhos fora do manifesto", async () => {
  const serve = createPreviewHandler(bundle);
  const response = await serve(new Request(host + "/assets/app.js"));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "42");
  assert.equal(response.headers.get("content-type"), "text/javascript");
  assert.equal(response.headers.get("x-prototype-source"), "app-sha");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(
    (await serve(new Request(host + "/especificacao/README.md"))).status,
    404,
  );
});
test("HEAD não devolve corpo e host alternativo/método de escrita são rejeitados", async () => {
  const serve = createPreviewHandler(bundle);
  assert.equal(
    await (await serve(new Request(host + "/", { method: "HEAD" }))).text(),
    "",
  );
  assert.equal(
    (await serve(new Request("https://outro.example/"))).status,
    403,
  );
  const post = await serve(new Request(host + "/", { method: "POST" }));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});
test("mantém bytes UTF-8 e URLs relativas da galeria", async () => {
  const serve = createPreviewHandler(bundle);
  assert.equal(await (await serve(new Request(host + "/"))).text(), "início");
  const redirect = await serve(new Request(host + "/docs/evidencias"));
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), host + "/docs/evidencias/");
  assert.equal(
    await (await serve(new Request(host + "/docs/evidencias/"))).text(),
    "galeria",
  );
});
