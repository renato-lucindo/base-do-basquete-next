import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
}).trim();
if (dirty)
  throw new Error("Commit the verified unit before preparing a deployment");
const manifest = {};
const paths = [
  "foundation.html",
  "resultado.html",
  ...readdirSync("dist-foundation/assets").map((name) => `assets/${name}`),
];
for (const path of paths) {
  if (
    !/^((?:foundation|resultado)\.html|assets\/[A-Za-z0-9_-]+\.(js|css))$/.test(
      path,
    )
  )
    throw new Error("Unexpected client artifact");
  const bytes = readFileSync(`dist-foundation/${path}`);
  manifest[`/${path}`] = {
    base64: bytes.toString("base64"),
    size: bytes.length,
    hash: createHash("sha256").update(bytes).digest("hex"),
    mime: path.endsWith(".html")
      ? "text/html; charset=utf-8"
      : path.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "application/javascript; charset=utf-8",
  };
}
const worker = readFileSync(".worker-artifacts/worker.js", "utf8");
const assetAdapter = readFileSync("scripts/foundation-assets.mjs", "utf8");
const modules = {
  "index.mjs": `import worker,{SessionStore} from './worker.js';import {createFoundationAssets} from './asset-adapter.mjs';import manifest from './assets.mjs';export{SessionStore};const assets=createFoundationAssets(manifest);export default{async fetch(request,env,ctx){const response=await worker.fetch(request,{...env,ASSETS:{fetch:assets}},ctx);response.headers.set('X-Bdb-Source','${sourceCommit}');return response;}};`,
  "worker.js": worker,
  "asset-adapter.mjs": assetAdapter,
  "assets.mjs": `export default ${JSON.stringify(manifest)};`,
};
const payload = {
  accountId: "16b4a5e0a99a031d28051ebadb4811cc",
  workerName: "base-do-basquete-next-preview",
  sourceCommit,
  modules,
};
mkdirSync(".worker-artifacts", { recursive: true });
writeFileSync(
  ".worker-artifacts/foundation-upload.b64",
  gzipSync(JSON.stringify(payload)).toString("base64"),
);
writeFileSync(
  ".worker-artifacts/foundation-manifest.json",
  JSON.stringify(
    {
      sourceCommit,
      manifest: Object.fromEntries(
        Object.entries(manifest).map(([path, file]) => [
          path,
          { hash: file.hash, size: file.size },
        ]),
      ),
    },
    null,
    2,
  ),
);
process.stdout.write(
  JSON.stringify({
    sourceCommit,
    clientFiles: paths.length,
    workerHash: createHash("sha256").update(worker).digest("hex"),
  }) + "\n",
);
