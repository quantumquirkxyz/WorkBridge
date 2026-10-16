import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const domainEntry = fileURLToPath(
  new URL("./packages/domain/src/index.ts", import.meta.url),
);

const solverEntry = fileURLToPath(
  new URL("./packages/solver/src/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@puente/domain": domainEntry,
      "@puente/solver": solverEntry,
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", "**/types.ts"],
      // gate-ci requires an 80% line coverage minimum.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
