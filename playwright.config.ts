import { defineConfig, devices, type PlaywrightTestConfig, type Project } from "@playwright/test";

const runtimePort = 4371;
const webPort = 4372;

function isolatedWebEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key === "OPENROUTER_API_KEY" || key === "DATABASE_URL" || value === undefined) continue;
    env[key] = value;
  }
  // The visual suite must use the heuristic extractor and the cached catalog.
  env.OPENROUTER_API_KEY = "";
  env.DATABASE_URL = "";
  env.WORKBRIDGE_PERSISTENCE = "memory";
  return env;
}

const runtimeWebServer = {
  name: "runtime",
  command: "npx tsx apps/agent-runtime/src/application/main.ts",
  url: `http://127.0.0.1:${runtimePort}/health`,
  reuseExistingServer: false,
  env: {
    PORT: String(runtimePort),
    BETTER_AUTH_SECRET: "better-auth-test-secret",
    WORKBRIDGE_TEST_LEGACY_APPLICATION: "true",
  },
};

const webWebServer = {
  name: "web",
  command: `npx next dev --port ${webPort}`,
  cwd: "apps/web",
  url: `http://127.0.0.1:${webPort}`,
  reuseExistingServer: false,
  timeout: 180_000,
  env: isolatedWebEnv(),
};

const webCapture = {
  screenshot: "on" as const,
  video: "retain-on-failure" as const,
};

type ProjectWithWebServer = Project & {
  webServer?: PlaywrightTestConfig["webServer"];
};

const projects: ProjectWithWebServer[] = [
  {
    name: "runtime",
    testDir: "./apps/agent-runtime/e2e",
    use: { baseURL: `http://127.0.0.1:${runtimePort}` },
    webServer: [runtimeWebServer],
  },
  {
    name: "Pixel 7",
    testDir: "./apps/web/e2e",
    testMatch: /(?:home\.smoke|intake-explore|ui-to-employer-ownership)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["Pixel 7"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
    webServer: [webWebServer],
  },
  {
    name: "iPhone 14",
    testDir: "./apps/web/e2e",
    testMatch: /(?:home\.smoke|intake-explore|ui-to-employer-ownership)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["iPhone 14"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
    webServer: [webWebServer],
  },
  {
    name: "Desktop Chrome",
    testDir: "./apps/web/e2e",
    testMatch: /(?:home\.smoke|intake-explore|ui-to-employer-ownership)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
    webServer: [webWebServer],
  },
  {
    name: "web",
    testDir: "./apps/web/e2e",
    testMatch: /(?:intake-explore|async-chat)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
    webServer: [webWebServer],
  },
];

export default defineConfig({
  timeout: 30_000,
  // Playwright 1.64.1 launches the top-level array. Projects still declare
  // their own webServer arrays so each suite documents the server it needs.
  webServer: [runtimeWebServer, webWebServer],
  projects,
});
