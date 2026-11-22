import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { verificationPlan, verifyResults } from "../scripts/ci-plan.mjs";

test("documentação e capturas não instalam browsers, inclusive checkpoints", () => {
  const plan = verificationPlan([
    "docs/design/PUBLICO.md",
    "historico/progresso/2026-11-05-checkpoint.md",
    "docs/design/evidencias/mobile.png",
    "CONTRIBUTING.md",
  ]);
  assert.equal(plan.scope, "docs");
  assert.equal(plan.webkit, false);
  assert.equal(plan.design, false);
  assert.deepEqual(plan.shards, []);
});

test("apresentação de Jogadores inclui seus consumidores de Equipes e perfil", () => {
  const plan = verificationPlan([
    "src/statistics/reference/scoresheet-statistics-table.tsx",
    "src/statistics/reference.css",
    "docs/design/PUBLICO.md",
  ]);
  assert.equal(plan.scope, "ui");
  assert.equal(plan.webkit, true);
  for (const file of [
    "tests/player-statistics-refinement.spec.ts",
    "tests/player-statistics-boundaries.spec.ts",
    "tests/player-statistics-touch.spec.ts",
    "tests/team-statistics.spec.ts",
    "tests/team-statistics-columns.spec.ts",
    "tests/player-public.spec.ts",
    "tests/statistics.spec.ts",
  ])
    assert.ok(plan.tests.includes(file), file);
  assert.equal(new Set(plan.tests).size, plan.tests.length);
  assert.ok(plan.tests.every((file) => existsSync(file)));
});

test("soma áreas conhecidas sem descartar testes compartilhados", () => {
  const plan = verificationPlan([
    "src/public-ui/shell.tsx",
    "src/team-statistics/public-page.tsx",
  ]);
  assert.equal(plan.scope, "ui");
  assert.ok(plan.tests.includes("tests/public-search.spec.ts"));
  assert.ok(plan.tests.includes("tests/team-statistics.spec.ts"));
  assert.ok(plan.tests.includes("tests/public-accessibility.spec.ts"));
});

test("asserções das telas alteradas acompanham o recorte, mas testes isolados não", () => {
  assert.equal(
    verificationPlan([
      "src/statistics/reference/scoresheet-statistics-table.tsx",
      "tests/player-statistics-refinement.spec.ts",
    ]).scope,
    "ui",
  );
  assert.equal(
    verificationPlan(["tests/player-statistics-refinement.spec.ts"]).scope,
    "full",
  );
  assert.equal(
    verificationPlan(["src/statistics/reference.css", "tests/access.spec.ts"])
      .scope,
    "full",
  );
  assert.equal(
    verificationPlan([
      "src/statistics/reference.css",
      "tests/fixtures/statistics-browser.ts",
    ]).scope,
    "full",
  );
});

test("main consolida toda mudança executável e preserva docs leves", () => {
  assert.equal(
    verificationPlan(["src/statistics/reference.css"], "push").scope,
    "full",
  );
  assert.equal(verificationPlan(["README.md"], "push").scope, "docs");
});

test("contratos, cálculos, banco, segurança e caminhos desconhecidos exigem tudo", () => {
  for (const file of [
    "src/statistics/metrics.ts",
    "src/statistics/aggregate.ts",
    "src/statistics/routes.ts",
    "src/statistics/page-contract.ts",
    "src/access/screen.tsx",
    "src/new-module/view.tsx",
    "supabase/migrations/change.sql",
    "package-lock.json",
    "scripts/ci-plan.mjs",
    ".github/workflows/ci.yml",
    "docs/design/build.cjs",
    "historico/progresso/tool.mjs",
    "tests/fixtures/statistics-browser.ts",
  ]) {
    const plan = verificationPlan(["src/statistics/reference.css", file]);
    assert.equal(plan.scope, "full", file);
    assert.equal(plan.webkit, true);
    assert.equal(plan.design, true);
    assert.deepEqual(plan.shards, [1, 2]);
  }
});

test("diff vazio, base ausente ou evento desconhecido nunca reduzem verificação", () => {
  assert.equal(verificationPlan([]).scope, "full");
  assert.equal(verificationPlan(null).scope, "full");
  assert.equal(
    verificationPlan(["README.md"], "workflow_dispatch").scope,
    "full",
  );
});

test("remoção/renomeação desconhecida não herda classificação do destino", () => {
  assert.equal(
    verificationPlan(["src/statistics/aggregate.ts", "docs/old.md"]).scope,
    "full",
  );
  assert.equal(verificationPlan(["docs/x.md.exe"]).scope, "full");
});

test("validate exige todos os jobs previstos e rejeita falha, cancelamento ou skip", () => {
  const plan = verificationPlan(["src/statistics/reference.css"]);
  const results = {
    checks: "success",
    browsers: "success",
    design: "skipped",
    "webkit-boundaries": "success",
  };
  assert.doesNotThrow(() => verifyResults(plan, results));
  for (const status of ["failure", "cancelled", "skipped", undefined]) {
    assert.throws(() => verifyResults(plan, { ...results, browsers: status }));
    assert.throws(() => verifyResults(plan, { ...results, checks: status }));
    assert.throws(() =>
      verifyResults(plan, { ...results, "webkit-boundaries": status }),
    );
  }
});

test("validate aceita skips somente quando explicitamente previstos", () => {
  assert.doesNotThrow(() =>
    verifyResults(verificationPlan(["README.md"]), {
      checks: "success",
      browsers: "skipped",
      design: "skipped",
      "webkit-boundaries": "skipped",
    }),
  );
  assert.throws(() =>
    verifyResults(verificationPlan(["package.json"]), {
      checks: "success",
      browsers: "success",
      design: "skipped",
      "webkit-boundaries": "success",
    }),
  );
});

test("CLI considera diff real, fallback de base e outputs estruturados", () => {
  const root = mkdtempSync(join(tmpdir(), "bdb-ci-plan-"));
  const script = fileURLToPath(
    new URL("../scripts/ci-plan.mjs", import.meta.url),
  );
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "user.name=CI Test",
      "-c",
      "user.email=ci@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
  };
  const run = (base) => {
    const output = join(root, "output");
    writeFileSync(output, "");
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: "pull_request",
        BASE_SHA: base,
        GITHUB_OUTPUT: output,
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const outputs = Object.fromEntries(
      readFileSync(output, "utf8")
        .trim()
        .split("\n")
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i), line.slice(i + 1)];
        }),
    );
    assert.deepEqual(
      Object.keys(outputs).sort(),
      ["scope", "reason", "tests", "shards", "webkit", "design", "plan"].sort(),
    );
    return JSON.parse(outputs.plan);
  };
  try {
    git("init", "--quiet");
    git("config", "core.autocrlf", "false");
    writeFileSync(join(root, ".gitignore"), "output\n");
    writeFileSync(join(root, "README.md"), "before");
    commit();
    const base = git("rev-parse", "HEAD");
    writeFileSync(join(root, "README.md"), "after");
    commit();
    assert.equal(run(base).scope, "docs");
    assert.equal(run("0".repeat(40)).scope, "full");
    assert.equal(run("f".repeat(40)).scope, "full");
    mkdirSync(join(root, "docs"));
    writeFileSync(join(root, "docs", "not-a-text.md.exe"), "data");
    commit();
    assert.equal(run(base).scope, "full");
    const verify = spawnSync(process.execPath, [script, "verify"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CI_NEEDS: JSON.stringify({ scope: { result: "cancelled" } }),
      },
    });
    assert.notEqual(verify.status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
