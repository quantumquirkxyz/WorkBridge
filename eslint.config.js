import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "**/blob-report/**",
      "**/.next/**",
      "**/out/**",
      ".agents/**",
      ".claude/**",
      ".opencode/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.js"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/web/components/**/*.tsx", "apps/web/app/**/*.tsx"],
    ignores: ["apps/web/app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/*-handler", "**/lib/*-handler.ts", "*-handler"],
              message:
                "Client components must call the typed API client and TanStack Query hooks instead of server handlers.",
            },
            {
              group: ["**/lib/*-store", "**/lib/*-store.ts", "*-store"],
              message:
                "Client components must not import in-process stores; use lib/api/client and lib/queries instead.",
            },
            {
              group: ["@workbridge/agent-runtime", "@workbridge/agent-runtime/*"],
              message: "Agent runtime is server-only; use /api routes from the typed client.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs", "docs/old/design/previews/**/*.mjs"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },
  {
    files: ["docs/old/design/previews/preview.js"],
    languageOptions: { globals: { document: "readonly", URLSearchParams: "readonly", location: "readonly", localStorage: "readonly", window: "readonly" } },
  },
);
