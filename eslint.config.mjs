import tseslint from "typescript-eslint";
import prettier from "prettier";
import { readFileSync } from "node:fs";

const file = "src/games/sheet-workspace.tsx";
const original = readFileSync(file, "utf8");
const formatted = await prettier.format(original, {
  ...(await prettier.resolveConfig(file)),
  filepath: file,
});
if (original !== formatted) {
  let first = 0;
  while (first < original.length && original[first] === formatted[first]) first++;
  let oldEnd = original.length;
  let newEnd = formatted.length;
  while (oldEnd > first && newEnd > first &&
    original[oldEnd - 1] === formatted[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  console.log("FORMAT_DIAGNOSTIC " + JSON.stringify({
    first,
    old: original.slice(Math.max(0, first - 120), Math.min(original.length, oldEnd + 120)),
    expected: formatted.slice(Math.max(0, first - 120), Math.min(formatted.length, newEnd + 120)),
  }));
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
