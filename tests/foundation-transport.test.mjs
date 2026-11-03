import { test } from "node:test";
import assert from "node:assert/strict";
import { createFoundationAssets } from "../scripts/foundation-assets.mjs";
import { uploadFoundation } from "../scripts/cloudflare-foundation-upload.mjs";

test("deployment provenance preserves untracked user skills but blocks uncommitted product changes", async () => {
  const { blockingWorktreeChanges } =
    await import("../scripts/deployment-worktree.mjs");
  assert.deepEqual(
    blockingWorktreeChanges("?? .agents/\n?? skills-lock.json\n"),
    [],
  );
  assert.deepEqual(
    blockingWorktreeChanges(
      " M src/access/screen.tsx\n?? src/new-feature.ts\n?? .agents/\n M skills-lock.json\n",
    ),
    [
      " M src/access/screen.tsx",
      "?? src/new-feature.ts",
      " M skills-lock.json",
    ],
  );
});

test("foundation compatibility assets expose only the manifest and preserve bytes/HEAD", async () => {
  const content = Buffer.from("Olá, basquete");
  const serve = createFoundationAssets({
    "/foundation.html": {
      base64: content.toString("base64"),
      size: content.length,
      hash: "fixture",
      mime: "text/html; charset=utf-8",
    },
  });
  const response = await serve(
    new Request("https://preview.test/foundation.html"),
  );
  assert.equal(await response.text(), "Olá, basquete");
  assert.equal(response.headers.get("content-length"), String(content.length));
  assert.equal(
    await (
      await serve(
        new Request("https://preview.test/foundation.html", { method: "HEAD" }),
      )
    ).text(),
    "",
  );
  for (const path of [
    "/worker.js",
    "/assets.mjs",
    "/__proto__",
    "/especificacao/",
  ])
    assert.equal(
      (await serve(new Request(`https://preview.test${path}`))).status,
      404,
    );
});

test("foundation upload refuses an unexpected target or expanded/missing Access protection", async () => {
  const payload = {
    accountId: "16b4a5e0a99a031d28051ebadb4811cc",
    workerName: "base-do-basquete-next-preview",
  };
  const calls = [];
  const client = {
    request: async (request) => {
      calls.push(request);
      return {
        success: true,
        result: {
          domain: "base-do-basquete-next-preview.renato-lucindo-jr.workers.dev",
          destinations: [{ type: "public", uri: "basedobasquete.com.br" }],
          policies: [{ decision: "allow", include: [{ everyone: {} }] }],
        },
      };
    },
  };
  await assert.rejects(
    uploadFoundation(
      { ...payload, workerName: "base-do-basquete-prod" },
      client,
    ),
    /Unexpected target/,
  );
  assert.equal(calls.length, 0);
  await assert.rejects(uploadFoundation(payload, client), /Access protection/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
});

test("foundation upload keeps the public canonical origin and protects the separate preview", async () => {
  const payload = {
    accountId: "16b4a5e0a99a031d28051ebadb4811cc",
    workerName: "base-do-basquete-next-preview",
    sourceCommit: "1234567890123456789012345678901234567890",
    modules: { "index.mjs": "export default {};" },
  };
  let uploadedMetadata;
  const calls = [];
  const client = {
    request: async (request) => {
      calls.push(request);
      if (request.path.includes("/access/apps/"))
        return {
          success: true,
          result: {
            domain:
              "base-do-basquete-next-preview.renato-lucindo-jr.workers.dev",
            destinations: [
              {
                type: "public",
                uri: "base-do-basquete-next-preview.renato-lucindo-jr.workers.dev",
              },
            ],
            policies: [
              {
                decision: "allow",
                include: [{ email: { email: "renato.lucindo.jr@gmail.com" } }],
              },
            ],
          },
        };
      if (request.path.endsWith("/settings"))
        return { success: true, result: { tags: ["foundation"] } };
      assert.equal(request.method, "PUT");
      const multipart = await new Request("https://upload.test", {
        method: "POST",
        headers: { "content-type": request.contentType },
        body: request.body,
      }).formData();
      uploadedMetadata = JSON.parse(await multipart.get("metadata").text());
      return { success: true, result: { id: payload.workerName } };
    },
  };
  assert.equal((await uploadFoundation(payload, client)).success, true);
  assert.equal(
    uploadedMetadata.bindings.find((binding) => binding.name === "APP_ORIGIN")
      .text,
    "https://basedobasquete.com.br",
  );
  assert.deepEqual(uploadedMetadata.keep_bindings, ["secret_text"]);
  assert.equal(uploadedMetadata.migrations, undefined);
});
