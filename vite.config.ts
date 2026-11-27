import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { availableParallelism } from "node:os";

export default defineConfig({
  plugins: [react()],
  // Four simultaneous WASM/PostgreSQL initializations made the cold achievements
  // proof exceed 30s locally and in CI. Bound contention, preserving its timeout.
  test: {
    include: ["src/**/*.test.ts"],
    maxWorkers: Math.min(2, availableParallelism()),
  },
});
