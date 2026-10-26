import {defineConfig} from "vitest/config";
export default defineConfig({test:{include:["docs/evidencias/benchmarks/confirmed-query-bench.test.ts"],maxWorkers:1,testTimeout:120000}});
