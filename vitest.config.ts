import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      all: true,
      include: ["scripts/**/*.ts"],
      exclude: [
        "scripts/__tests__/**",
        "**/node_modules/**",
        "**/dist/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
