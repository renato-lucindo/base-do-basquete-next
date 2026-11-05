import { spawnSync } from "node:child_process";

const plan = JSON.parse(process.env.CI_PLAN || "{}");
if (!["ui", "full"].includes(plan.scope))
  throw new Error("Browser scope required");
const shard = Number(process.env.CI_SHARD);
if (!plan.shards?.includes(shard)) throw new Error("Unexpected shard");
const files = plan.scope === "ui" ? plan.tests : [];
if (
  plan.scope === "ui" &&
  (!files.length ||
    files.some((file) => !/^tests\/[a-z0-9-]+\.spec\.ts$/.test(file)))
)
  throw new Error("Invalid browser suite selection");
const result = spawnSync(
  process.execPath,
  [
    "node_modules/@playwright/test/cli.js",
    "test",
    ...files,
    `--shard=${shard}/${plan.shards.length}`,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
