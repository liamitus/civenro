import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Keep Playwright specs and integration tests (separate config) out of
    // the unit-test runner.
    exclude: [
      "node_modules",
      "dist",
      ".next",
      "e2e/**",
      "tests/integration/**",
    ],
    // Per-file DOM tests can opt in with: // @vitest-environment jsdom
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/app/api/**", "src/scripts/**"],
      exclude: [
        "src/generated/**",
        "**/*.test.*",
        "**/*.d.ts",
        "src/scripts/backup-data.ts",
        "src/scripts/restore-data.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
