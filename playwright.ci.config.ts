import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Explicitly offline guest coverage against a production server, never a reused
// developer server. Keep live-account suites outside this configuration.
export default defineConfig({
  ...base,
  metadata: { ...base.metadata, offlineAuth: true },
  testMatch: ["workspace.spec.ts", "navigation.spec.ts", "not-found.spec.ts"],
  forbidOnly: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { ...base.use, baseURL: "http://127.0.0.1:3200", reducedMotion: "reduce" },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200/api/v1/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1"
    }
  }
});
