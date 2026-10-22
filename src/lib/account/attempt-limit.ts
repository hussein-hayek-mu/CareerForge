import { createHash } from "node:crypto";

// Supplement provider/edge limits. Each server process has its own state.
export function createAttemptLimit(maxKeys = 5000) {
  const windows = new Map<string, { count: number; until: number }>();
  return (scope: string, email: string, attempts: number, durationMs: number, now = Date.now()): number => {
    for (const [key, value] of windows) if (value.until <= now) windows.delete(key);
    const key = createHash("sha256").update(`${scope}:${email.trim().toLowerCase()}`).digest("hex");
    const current = windows.get(key);
    if (current) {
      if (current.count >= attempts) return Math.ceil((current.until - now) / 1000);
      current.count++;
      return 0;
    }
    // Do not evict active keys: rotating emails must not erase another limit.
    if (windows.size >= maxKeys) return Math.max(1, Math.ceil((Math.min(...[...windows.values()].map(value => value.until)) - now) / 1000));
    windows.set(key, { count: 1, until: now + durationMs });
    return 0;
  };
}

const authAttempts = createAttemptLimit();
const writeAttempts = createAttemptLimit();
export function privateWriteLimit(scope: "profile" | "tracker", userId: string) {
  return writeAttempts(scope, userId, scope === "profile" ? 30 : 60, 60000);
}
export function credentialLimit(kind: "login" | "register", email: string) {
  return authAttempts(kind, email, kind === "login" ? 10 : 3, kind === "login" ? 600000 : 3600000);
}
