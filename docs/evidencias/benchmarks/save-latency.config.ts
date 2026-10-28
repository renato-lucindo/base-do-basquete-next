import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["docs/evidencias/benchmarks/save-latency.test.ts"], maxWorkers: 1, testTimeout: 30000 } });
