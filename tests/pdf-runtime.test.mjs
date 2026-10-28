import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
test("supplied four PDFs extract in actual workerd/SQLite DO without network or browser globals", async () => {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      name: "pdf-proof",
      modules: true,
      scriptPath: ".preview-artifacts/pdf-worker/pdf-worker.js",
      compatibilityDate: "2026-10-23",
      compatibilityFlags: ["nodejs_compat"],
      durableObjects: { PARSER: { className: "PdfProbe", useSQLite: true } },
      outboundService: () => {
        throw Error("PDF attempted external request");
      },
    }),
  );
  try {
    for (const [filename, expected] of [
      ["Box Score FIBA ALC vs AVA 09 maio.pdf", [58, 67]],
      ["Box Score FIBA IVV vs CAC 06 maio.pdf", [93, 39]],
      ["Box Score FIBA SAL vs SAN 09 maio.pdf", [59, 40]],
      ["Boxscore-site.pdf", [98, 57]],
    ]) {
      const bytes = await readFile(
        `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/${filename}`,
      );
      const r = await mf.dispatchFetch("https://pdf.example.test/", {
        method: "POST",
        headers: { "x-filename": encodeURIComponent(filename) },
        body: bytes,
      });
      const body = await r.json();
      assert.equal(r.status, 200, JSON.stringify(body));
      assert.deepEqual(
        body.parsed.teams.map((t) => t.score),
        expected,
      );
    }
  } finally {
    await mf.dispose();
  }
});
