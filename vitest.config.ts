import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const aliases = {
  "@": r("./apps/web"),
  "@puente/domain": r("./packages/domain/src/index.ts"),
  "@puente/ingestion": r("./packages/ingestion/src/index.ts"),
  "@puente/profile": r("./packages/profile/src/index.ts"),
  "@puente/training": r("./packages/training/src/index.ts"),
  "@puente/agent-runtime": r("./apps/agent-runtime/src/index.ts"),
  "@puente/solver": r("./packages/solver/src/index.ts"),
  "@puente/catalog": r("./packages/catalog/src/index.ts"),
};

export default defineConfig({
  resolve: {
    alias: aliases,
  },
  test: {
    globals: false,
    coverage: {
      provider: "v8",
      include: [
        "packages/*/src/**/*.ts",
        "apps/agent-runtime/src/application/**/*.ts",
        "apps/web/lib/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/index.ts",
        "**/types.ts",
        "packages/*/src/taxonomy/**",
        "apps/web/components/ui/**",
        // Browser-only surfaces are covered by Playwright, not the node/jsdom
        // unit coverage gate.
        "apps/web/components/**",
        "apps/web/lib/api/**",
        "apps/web/lib/auth*.ts",
        "apps/web/lib/candidate-session.ts",
        "apps/web/lib/neon-db.ts",
        "apps/web/lib/queries/**",
        "apps/web/lib/role-guard.ts",
        "apps/web/lib/utils.ts",
        "apps/web/lib/voice-recorder.ts",
      ],
      // gate-ci requires an 80% line coverage minimum.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
    projects: [
      {
        resolve: { alias: aliases },
        test: {
          name: "node",
          environment: "node",
          include: [
            "packages/**/tests/**/*.test.ts",
            "packages/**/src/**/__tests__/**/*.test.ts",
            "apps/**/tests/**/*.test.ts",
            "apps/**/src/**/__tests__/**/*.test.ts",
            "apps/**/test/**/*.test.ts",
            "tests/**/*.test.ts",
          ],
        },
      },
      {
        plugins: [react()],
        resolve: { alias: aliases },
        test: {
          name: "jsdom",
          environment: "jsdom",
          testTimeout: 15_000,
          include: ["apps/web/tests/components/**/*.test.tsx"],
          setupFiles: [r("./apps/web/tests/components/setup.ts")],
        },
      },
    ],
  },
});
