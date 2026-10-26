import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["docs/evidencias/benchmarks/confirmed-capacity-db.test.ts"], fileParallelism: false, testTimeout: 240000 } });
