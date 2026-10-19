import { defineConfig, devices, type Project } from "@playwright/test";

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
  command: "npx tsx apps/agent-runtime/e2e/legacy-server.ts",
  url: `http://127.0.0.1:${runtimePort}/health`,
  reuseExistingServer: false,
  env: { PORT: String(runtimePort), BETTER_AUTH_SECRET: "better-auth-test-secret" },
};

const trustedRuntimeWebServer = {
  name: "trusted-runtime",
  command: "npx tsx apps/agent-runtime/src/application/main.ts",
  url: "http://127.0.0.1:4373/health",
  reuseExistingServer: false,
  env: { PORT: "4373", BETTER_AUTH_SECRET: "better-auth-test-secret" },
};

const webWebServer = {
  name: "web",
  command: `npx next dev --port ${webPort}`,
  cwd: "apps/web",
  url: `http://127.0.0.1:${webPort}`,
  reuseExistingServer: false,
  timeout: 180_000,
   env: { ...isolatedWebEnv(), AGENT_RUNTIME_URL: "http://127.0.0.1:4373" },
};

const webCapture = {
  screenshot: "on" as const,
  video: "retain-on-failure" as const,
};

const projects: Project[] = [
  {
    name: "runtime",
    testDir: "./apps/agent-runtime/e2e",
    use: { baseURL: `http://127.0.0.1:${runtimePort}` },
  },
  {
    name: "Pixel 7",
    testDir: "./apps/web/e2e",
    testMatch: /(?:home\.smoke|intake-explore)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["Pixel 7"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
  },
  {
    name: "iPhone 14",
    testDir: "./apps/web/e2e",
    testMatch: /(?:home\.smoke|intake-explore)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["iPhone 14"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
  },
  {
    name: "Desktop Chrome",
    testDir: "./apps/web/e2e",
    testMatch: /(?:home\.smoke|intake-explore)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
  },
  {
    name: "ownership",
    testDir: "./apps/web/e2e",
    testMatch: /ui-to-employer-ownership\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
  },
  {
    name: "web",
    testDir: "./apps/web/e2e",
    testMatch: /(?:intake-explore|async-chat)\.spec\.ts/,
    timeout: 60_000,
    use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${webPort}`, ...webCapture },
  },
];

export default defineConfig({
  timeout: 30_000,
  webServer: [runtimeWebServer, trustedRuntimeWebServer, webWebServer],
  projects,
});
