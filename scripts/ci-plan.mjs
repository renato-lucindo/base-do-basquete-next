import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Deliberately small allowlist: new files and domain/infrastructure changes
// stay on the full gate until their consumers have been mapped and reviewed.
const groups = {
  statistics: {
    files: new Set([
      "src/statistics/public-main.tsx",
      "src/statistics/public-page.tsx",
      "src/statistics/simple-page.tsx",
      "src/statistics/screen.css",
      "src/statistics/reference.css",
      "src/statistics/legacy.css",
      ...[
        "column-picker",
        "resource-state",
        "scoresheet-statistics-table",
        "scrollable-table",
        "sort-header",
        "team-filter",
        "tooltip",
      ].map((name) => `src/statistics/reference/${name}.tsx`),
    ]),
    tests:
      /^(player-statistics-.*|statistics.*|team-statistics.*|player-public|public-uiux|public-accessibility|public-prototype-fidelity|flow-returns)\.spec\.ts$/,
    webkit: true,
  },
  teams: {
    files: new Set([
      "src/team-statistics/detail-main.tsx",
      "src/team-statistics/list-main.tsx",
      "src/team-statistics/public-page.tsx",
      "src/team-statistics/public-tables.tsx",
      "src/team-statistics/screen.css",
    ]),
    tests:
      /^(team-statistics.*|public-uiux|public-accessibility|public-prototype-fidelity|flow-returns)\.spec\.ts$/,
    webkit: false,
  },
  public: {
    files: new Set([
      "src/public-ui/catalog.tsx",
      "src/public-ui/games-table.tsx",
      "src/public-ui/main.tsx",
      "src/public-ui/search-form.tsx",
      "src/public-ui/search-results.tsx",
      "src/public-ui/shell.tsx",
      "src/public-ui/legacy.css",
      "src/public-ui/navigation.css",
      "src/public-ui/search.css",
    ]),
    tests:
      /^(public-.*|player-public|player-statistics-.*|team-statistics.*|statistics.*|flow-returns)\.spec\.ts$/,
    webkit: true,
  },
};

const documentation =
  /^(?:(?:docs|historico\/progresso|historico\/documentacao)\/.*\.(?:md|png|jpg|jpeg|svg)|(?:README|CONTRIBUTING|AGENTS)\.md|\.github\/PULL_REQUEST_TEMPLATE\.md)$/;

const full = (reason) => ({
  scope: "full",
  reason,
  tests: [],
  shards: [1, 2],
  webkit: true,
  design: true,
});

export function verificationPlan(files, event = "pull_request") {
  if (!["pull_request", "push"].includes(event))
    return full("manual or unknown event");
  if (!Array.isArray(files) || files.length === 0)
    return full("missing base or empty diff");
  const executable = files.filter((file) => !documentation.test(file));
  if (executable.length === 0)
    return {
      scope: "docs",
      reason: "documentation only",
      tests: [],
      shards: [],
      webkit: false,
      design: false,
    };
  if (event === "push") return full("integrated code regression");
  const selected = new Set();
  const browserTests = executable.filter((file) =>
    /^tests\/[^/]+\.spec\.ts$/.test(file),
  );
  for (const file of executable.filter(
    (file) => !browserTests.includes(file),
  )) {
    const group = Object.values(groups).find((candidate) =>
      candidate.files.has(file),
    );
    if (!group) return full("unmapped executable path");
    selected.add(group);
  }
  if (!selected.size) return full("tests changed without mapped presentation");
  if (
    browserTests.some(
      (file) =>
        !existsSync(file) ||
        ![...selected].some((group) => group.tests.test(file.slice(6))),
    )
  )
    return full("browser tests outside affected presentation");
  const available = readdirSync("tests");
  const tests = [
    ...new Set(
      [...selected].flatMap((group) =>
        available
          .filter((file) => group.tests.test(file))
          .map((file) => `tests/${file}`),
      ),
    ),
  ].sort();
  if (!tests.length) return full("no affected browser suites found");
  return {
    scope: "ui",
    reason: "mapped presentation changes",
    tests,
    shards: [1],
    webkit: [...selected].some((group) => group.webkit),
    design: false,
  };
}

export function verifyResults(plan, results) {
  if (!["docs", "ui", "full"].includes(plan?.scope))
    throw new Error("Missing verification plan");
  const expected = {
    checks: true,
    browsers: plan.scope !== "docs",
    design: plan.design,
    "webkit-boundaries": plan.webkit,
  };
  for (const [job, required] of Object.entries(expected)) {
    const wanted = required ? "success" : "skipped";
    if (results[job] !== wanted)
      throw new Error(`${job}: expected ${wanted}, got ${results[job]}`);
  }
}

function changedFiles(base) {
  if (!base || !/^[a-f0-9]{40}$/i.test(base) || /^0+$/.test(base)) return null;
  try {
    return execFileSync(
      "git",
      ["diff", "--no-renames", "--name-only", "-z", base, "HEAD"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean);
  } catch {
    return null;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv[2] === "verify") {
    const needs = JSON.parse(process.env.CI_NEEDS || "{}");
    if (needs.scope?.result !== "success")
      throw new Error("Scope job did not succeed");
    verifyResults(
      JSON.parse(needs.scope.outputs.plan),
      Object.fromEntries(
        Object.entries(needs).map(([key, value]) => [key, value.result]),
      ),
    );
    console.log("All required checks succeeded for the selected scope.");
  } else {
    const plan = verificationPlan(
      changedFiles(process.env.BASE_SHA),
      process.env.GITHUB_EVENT_NAME,
    );
    console.log(JSON.stringify(plan, null, 2));
    if (process.env.GITHUB_OUTPUT) {
      for (const [key, value] of Object.entries({ ...plan, plan })) {
        appendFileSync(
          process.env.GITHUB_OUTPUT,
          `${key}=${typeof value === "string" ? value : JSON.stringify(value)}\n`,
        );
      }
    }
  }
}
