import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import prettier from "prettier";

const path = "src/games/visibility-database.test.ts";
const original = await readFile(path, "utf8");
const formatted = await prettier.format(original, { filepath: path });
await writeFile("/tmp/pr75-visibility-formatted.ts", formatted);
const diff = spawnSync(
  "diff",
  ["-u", path, "/tmp/pr75-visibility-formatted.ts"],
  { encoding: "utf8" },
);
console.log("===PR75-PRETTIER-DIFF-START===");
console.log(diff.stdout || "no changes");
console.log("===PR75-PRETTIER-DIFF-END===");
