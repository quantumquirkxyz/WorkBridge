import { defineConfig } from "@playwright/test";

const applicationPort = 4317;
const webPort = 3101;

export default defineConfig({
  timeout: 30_000,
  projects: [
    {
      name: "application",
      testDir: "./apps/agent-runtime/e2e",
      use: { baseURL: `http://127.0.0.1:${applicationPort}` },
    },
    {
      name: "web",
      testDir: "./apps/web/e2e",
      timeout: 60_000,
      use: {
        baseURL: `http://127.0.0.1:${webPort}`,
        screenshot: "on",
        video: "retain-on-failure",
      },
    },
  ],
  webServer: [
    {
      command: "npx tsx apps/agent-runtime/src/application/main.ts",
      url: `http://127.0.0.1:${applicationPort}/health`,
      reuseExistingServer: false,
      env: { PORT: String(applicationPort), BETTER_AUTH_SECRET: "better-auth-test-secret" },
    },
    {
      command: "npm exec --workspace @puente/web -- next dev --port 3101",
      url: `http://127.0.0.1:${webPort}`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        PUENTE_PERSISTENCE: "memory",
        // Override a developer shell. Empty is absent for the heuristic extractor
        // and for the Neon client; the suite must not call either service.
        OPENROUTER_API_KEY: "",
        DATABASE_URL: "",
      },
    },
  ],
});
