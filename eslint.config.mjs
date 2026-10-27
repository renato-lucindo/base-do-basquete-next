import tseslint from "typescript-eslint";
import prettier from "prettier";
import { readFileSync } from "node:fs";

const file = "tests/competition.spec.ts";
const source = readFileSync(file, "utf8");
const formatted = await prettier.format(source, {
  ...(await prettier.resolveConfig(file)),
  filepath: file,
});
if (source !== formatted)
  console.log("UI2_FORMAT_BLOB " + Buffer.from(formatted).toString("base64"));

export default tseslint.config(
  {
    ignores: [
      "especificacao/**",
      "dist/**",
      "node_modules/**",
      "**/.preview-artifacts/**",
    ],
  },
  ...tseslint.configs.recommended,
);
