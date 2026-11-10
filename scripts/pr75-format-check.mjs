import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import prettier from "prettier";

const file = "src/regulation/setup-database.test.ts";
const original = await readFile(file, "utf8");
const formatted = await prettier.format(original, { filepath: file });
const linesA = original.split("\n");
const linesB = formatted.split("\n");
console.log("===PR75-FORMAT-A===");
console.log(original.slice(original.indexOf('it("keeps public flexible standings')));
console.log("===PR75-FORMAT-B===");
console.log(formatted.slice(formatted.indexOf('it("keeps public flexible standings')));
console.log("===PR75-END===");
