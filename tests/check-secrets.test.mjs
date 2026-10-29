import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const checker = fileURLToPath(
  new URL("../scripts/check-secrets.mjs", import.meta.url),
);
function fixture(run) {
  const prefix = join(tmpdir(), "bdb-secrets-");
  const directory = mkdtempSync(prefix);
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: directory });
    writeFileSync(
      join(directory, ".gitignore"),
      "dist/\ndist-foundation/\n.worker-artifacts/\n",
    );
    writeFileSync(join(directory, "source.js"), "export const value = 1;\n");
    return run(directory, (args = []) =>
      spawnSync(process.execPath, [checker, ...args], {
        cwd: directory,
        encoding: "utf8",
      }),
    );
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(prefix)));
    rmSync(directory, { recursive: true, force: true });
  }
}
const fakeSecret = () => "gh" + "p_" + "x".repeat(36);

test("documentation scan succeeds without builds while full scan still requires them", () =>
  fixture((directory, scan) => {
    assert.equal(scan(["--source-only"]).status, 0);
    const strict = scan();
    assert.notEqual(strict.status, 0);
    assert.match(strict.stderr, /ENOENT/);
  }));

test("documentation scan rejects a secret pattern in source without printing its value", () =>
  fixture((directory, scan) => {
    writeFileSync(
      join(directory, "source.js"),
      `export const value = ${JSON.stringify(fakeSecret())};\n`,
    );
    const result = scan(["--source-only"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /source.js: padrão github-token/);
    assert.equal(result.stderr.includes(fakeSecret()), false);
  }));

test("full scan includes ignored build artifacts", () =>
  fixture((directory, scan) => {
    for (const folder of ["dist", "dist-foundation", ".worker-artifacts"])
      mkdirSync(join(directory, folder));
    writeFileSync(
      join(directory, "dist", "bundle.js"),
      `const value = ${JSON.stringify(fakeSecret())};\n`,
    );
    assert.equal(scan(["--source-only"]).status, 0);
    const result = scan();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /bundle.js: padrão github-token/);
  }));
