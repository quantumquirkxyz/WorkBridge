import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@puente/domain": r("./packages/domain/src/index.ts"),
      "@puente/ingestion": r("./packages/ingestion/src/index.ts"),
      "@puente/profile": r("./packages/profile/src/index.ts"),
      "@puente/agent-runtime": r("./apps/agent-runtime/src/index.ts"),
      "@puente/solver": r("./packages/solver/src/index.ts"),
    },
  },
  test: {
    include: [
      "packages/**/tests/**/*.test.ts",
      "packages/**/src/**/__tests__/**/*.test.ts",
      "apps/**/tests/**/*.test.ts",
      "apps/**/src/**/__tests__/**/*.test.ts",
      "apps/**/test/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "apps/agent-runtime/src/application/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", "**/types.ts", "packages/*/src/taxonomy/**"],
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
