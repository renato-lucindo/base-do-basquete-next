import * as prettier from "prettier";
import { readFile } from "node:fs/promises";

const files = [
  "src/games/provider.ts",
  "src/games/routes.ts",
  "src/games/visibility-contract.test.ts",
  "src/games/visibility-database.test.ts",
  "src/games/visibility-panel.tsx",
  "src/games/workspace.tsx",
];
for (const path of files) {
  const original = await readFile(path, "utf8");
  const formatted = await prettier.format(original, {
    ...(await prettier.resolveConfig(path)),
    filepath: path,
  });
  console.log("FORMATTED_BEGIN " + path);
  console.log(Buffer.from(formatted, "utf8").toString("base64"));
  console.log("FORMATTED_END");
}
