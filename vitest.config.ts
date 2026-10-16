import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@puente/domain': r('./packages/domain/src/index.ts'),
      '@puente/ingestion': r('./packages/ingestion/src/index.ts'),
      '@puente/profile': r('./packages/profile/src/index.ts'),
      '@puente/agent-runtime': r('./apps/agent-runtime/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: [
      'packages/**/tests/**/*.test.ts',
      'apps/**/tests/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/index.ts',
        'packages/*/src/**/*.d.ts',
        'packages/*/src/taxonomy/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
