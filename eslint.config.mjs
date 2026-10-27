import tseslint from "typescript-eslint";
import prettier from "prettier";
import { readFileSync } from "node:fs";

const targets = [
  "src/competition/compact.css",
  "src/games/sheet-workspace.tsx",
  "src/games/workspace.tsx",
  "src/people/workspace.tsx",
  "src/regulation/workspace.tsx",
  "src/teams/screen.tsx",
  "tests/sheet-desktop.spec.ts",
  "src/competition/admin-toast.tsx",
  "src/competition/admin-toast.css",
  "src/competition/screen.tsx",
  "src/games/sheet-workspace.css",
  "tests/sheet.spec.ts",
];
for (const file of targets) {
  const raw = readFileSync(file, "utf8");
  const fixed = await prettier.format(raw, {
    ...(await prettier.resolveConfig(file)),
    filepath: file,
  });
  if (raw !== fixed) {
    console.log(
      "UI_FORMAT_BLOB " + file + " " + Buffer.from(fixed).toString("base64"),
    );
  }
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
