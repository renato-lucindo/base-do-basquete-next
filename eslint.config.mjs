import tseslint from "typescript-eslint";
import prettier from "prettier";
import { readFileSync } from "node:fs";

for (const file of [
  "src/games/sheet-workspace.tsx",
  "tests/competition.spec.ts",
  "tests/sheet-desktop.spec.ts",
]) {
  const formatted = await prettier.format(readFileSync(file, "utf8"), {
    ...(await prettier.resolveConfig(file)),
    filepath: file,
  });
  console.log(
    "UIUX_FORMATTED_FILE " +
      file +
      " " +
      Buffer.from(formatted, "utf8").toString("base64"),
  );
}

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
