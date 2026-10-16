import { defineConfig } from "@playwright/test";

const port = 4317;

export default defineConfig({
  testDir: "./apps/agent-runtime/e2e",
  timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: "npx tsx apps/agent-runtime/src/application/main.ts",
    url: `http://127.0.0.1:${port}/health`,
    reuseExistingServer: false,
    env: { PORT: String(port) },
  },
});
