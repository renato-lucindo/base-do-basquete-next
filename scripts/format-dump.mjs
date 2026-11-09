import * as prettier from "prettier";
import { readFile } from "node:fs/promises";

const path = "tests/game-visibility.spec.ts";
const source = await readFile(path, "utf8");
const formatted = await prettier.format(source, {
  ...(await prettier.resolveConfig(path)),
  filepath: path,
});
console.log("FORMATTED_BEGIN " + path);
console.log(Buffer.from(formatted, "utf8").toString("base64"));
console.log("FORMATTED_END");
