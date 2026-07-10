import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [swc.vite()],
  test: {
    include: ["test/**/*.e2e.test.ts"],
    environment: "node",
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
