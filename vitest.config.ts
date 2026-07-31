import { fileURLToPath } from "node:url";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  publicDir: "test/resources",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    attachmentsDir: ".vitest/attachments",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      screenshotDirectory: ".vitest/screenshots",
      instances: [
        { browser: "chromium" },
        // Enable these after the remaining cross-engine differences are resolved.
        // { browser: 'firefox' },
        // { browser: "webkit" },
      ],
    },
    coverage: {
      provider: "istanbul",
      reportsDirectory: ".vitest/coverage",
      reporter: ["html", "lcovonly", "cobertura", "text-summary"],
      include: ["src/**/*.ts"],
    },
    fileParallelism: false,
    globals: true,
    hookTimeout: 20_000,
    include: ["test/spec/**/*.spec.ts", "test/spec/**/*.sepc.ts"],
    restoreMocks: true,
    setupFiles: ["./test/setup.ts"],
    testTimeout: 20_000,
  },
});
