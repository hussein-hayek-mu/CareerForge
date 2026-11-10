import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
// Public variables are frozen during next build. Keep the local offline fixture
// identical to clean CI even when the developer has an account-enabled .env.
const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    APP_ORIGIN: "",
    NEXT_TELEMETRY_DISABLED: "1"
  }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
