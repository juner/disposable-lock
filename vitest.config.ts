import { defineConfig, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: ["cobertura", "text", "json-summary", "json"],
      reportsDirectory: "./TestResults/coverage",
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/requiredAsyncDispose.ts",
      ]
    }
  }
});