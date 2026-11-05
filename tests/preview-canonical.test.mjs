import { test } from "node:test";
import assert from "node:assert/strict";
import { previewCanonicalRedirect } from "../scripts/preview-canonical.mjs";
import { patchPublishedPreview } from "../scripts/patch-preview-content.mjs";

const preview =
  "https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev";
const canonical = "https://basedobasquete.com.br";
const publishedCommit = "eff36fe0eda76962e6babbc4a9464a98c3dad478";

test("published repair redirects preview navigation but delegates canonical traffic unchanged", async () => {
  const source = `const assets=()=>{}; const worker_default={fetch:async (request)=>new Response(new URL(request.url).origin)};
var index_default = { async fetch(request, env, ctx) {
  const response = await worker_default.fetch(request, { ...env, ASSETS: { fetch: assets } }, ctx);
  response.headers.set("X-Bdb-Source", "${publishedCommit}");
  return response;
} }; export { index_default as default };`;
  const patched = patchPublishedPreview(source, publishedCommit);
  const { default: worker } = await import(
    "data:text/javascript;base64," + Buffer.from(patched).toString("base64")
  );
  const r = await worker.fetch(
    new Request(preview + "/admin"),
    { APP_ORIGIN: canonical },
    {},
  );
  assert.equal(r.status, 302);
  const c = await worker.fetch(
    new Request(canonical + "/admin"),
    { APP_ORIGIN: canonical },
    {},
  );
  assert.equal(c.status, 200);
  assert.equal(await c.text(), canonical);
  assert.equal(c.headers.get("X-Bdb-Source"), publishedCommit);
  assert.throws(
    () => patchPublishedPreview(patched, publishedCommit),
    /Unexpected/,
  );
  assert.throws(
    () => patchPublishedPreview(source, "0".repeat(40)),
    /Unexpected/,
  );
  assert.throws(
    () => patchPublishedPreview(source + source, publishedCommit),
    /Unexpected/,
  );
});

test("preview navigation redirects to the fixed canonical origin preserving path and query", () => {
  for (const method of ["GET", "HEAD"]) {
    const r = previewCanonicalRedirect(
      new Request(preview + "/admin?retorno=jogos", { method }),
      canonical,
    );
    assert.equal(r?.status, 302);
    assert.equal(r.headers.get("location"), canonical + "/admin?retorno=jogos");
    assert.equal(r.headers.get("cache-control"), "no-store");
  }
});

test("preview redirect never opens APIs, mutations, arbitrary hosts or alternate canonical origins", () => {
  for (const [url, method, origin] of [
    [preview + "/api/session", "GET", canonical],
    [preview + "/api", "HEAD", canonical],
    [preview + "/", "POST", canonical],
    [preview + "/admin", "DELETE", canonical],
    [canonical + "/", "GET", canonical],
    [preview.replace("https:", "http:") + "/", "GET", canonical],
    [preview + ":8443/", "GET", canonical],
    ["https://evil.test/", "GET", canonical],
    [preview + "/", "GET", "https://evil.test"],
  ])
    assert.equal(
      previewCanonicalRedirect(new Request(url, { method }), origin),
      null,
    );
});

test("path cannot replace the fixed redirect destination", () => {
  const r = previewCanonicalRedirect(
    new Request(preview + "//evil.test/?next=https://evil.test"),
    canonical,
  );
  assert.equal(new URL(r.headers.get("location")).origin, canonical);
});
