import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { availableParallelism } from "node:os";

export default defineConfig({
  plugins: [react()],
  // Bound CPU/WASM initialization when PDF fixtures and PostgreSQL suites run together.
  test: {
    include: ["src/**/*.test.ts"],
    maxWorkers: Math.min(4, availableParallelism()),
  },
});
