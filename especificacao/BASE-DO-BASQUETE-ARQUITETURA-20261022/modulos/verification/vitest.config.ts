import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  root: fileURLToPath(new URL("../source", import.meta.url)),
  test: { include: ["app/**/*.test.{ts,tsx}"] },
});
