import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";

const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const applicationCommit = "169c2debcc6625804ef73367b70b9c6d3284b582";
const required = {
  "assets/index-BtKGOTII.js":
    "88575c18e7a63635b594e8c58627d470c3388c2328dba42839c0a11758ac3389",
  "assets/index-DvcHVPSP.css":
    "99cb852d9c5ed2b8e768eca9d58ff47d1ff3e16123595f1b5f4cafb6bee36b6a",
};
for (const [path, hash] of Object.entries(required)) {
  if (
    !existsSync(join("dist", path)) ||
    sha256(readFileSync(join("dist", path))) !== hash
  ) {
    throw new Error(
      `O artefato ${path} mudou. Reconciliar evidências antes do upload.`,
    );
  }
}

const manifest = {};
const files = {};
const evidence = [];
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json",
};
function include(path, bytes) {
  const extension = extname(path);
  if (!mime[extension])
    throw new Error(`Tipo não autorizado no preview: ${path}`);
  const base64 = bytes.toString("base64");
  const hash = sha256(base64 + extension.slice(1)).slice(0, 32);
  manifest[path] = { hash, size: bytes.length };
  files[hash] = { base64, mime: mime[extension] };
  evidence.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
}
function walk(folder, prefix = "") {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) walk(path, `${prefix}/${entry.name}`);
    else if (entry.isFile())
      include(`${prefix}/${entry.name}`, readFileSync(path));
  }
}
walk("dist");
for (const name of readdirSync("docs/evidencias")) {
  if (
    name === "index.html" ||
    /^(desktop|mobile)-(campeonato|elencos|pdfs|sumula)\.png$/.test(name)
  ) {
    include(
      `/docs/evidencias/${name}`,
      readFileSync(join("docs/evidencias", name)),
    );
  }
}
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
include(
  "/preview-version.json",
  Buffer.from(
    JSON.stringify(
      { applicationCommit, sourceCommit, files: evidence },
      null,
      2,
    ),
  ),
);
const payload = {
  workerName: "base-do-basquete-prototipo",
  accountId: "16b4a5e0a99a031d28051ebadb4811cc",
  applicationCommit,
  sourceCommit,
  manifest,
  files,
};
mkdirSync(".preview-artifacts", { recursive: true });
writeFileSync(".preview-artifacts/payload.json", JSON.stringify(payload));
writeFileSync(
  ".preview-artifacts/transport.gz.b64",
  gzipSync(JSON.stringify(payload)).toString("base64"),
);
writeFileSync(
  ".preview-artifacts/manifest.json",
  JSON.stringify({ applicationCommit, sourceCommit, files: evidence }, null, 2),
);
process.stdout.write(
  JSON.stringify({
    files: evidence.length,
    bytes: evidence.reduce((n, f) => n + f.bytes, 0),
    applicationCommit,
    sourceCommit,
  }) + "\n",
);
