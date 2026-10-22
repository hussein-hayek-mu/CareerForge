import { createAttemptLimit } from "./attempt-limit";
import { readBoundedJson } from "./request-body";
import { z } from "zod";
import { failure, isSameOrigin, json, requestOrigin } from "./http";

export const recoveryEmailSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email().max(254)) }).strict();
export const newPasswordSchema = z.object({ password: z.string().min(8).max(128) }).strict();
type Result = { error: { status?: number; code?: string } | null };
export type RecoveryProvider = {
  resend: (email: string, callback: string) => Promise<Result>;
  forgot: (email: string, callback: string) => Promise<Result>;
  changePassword: (password: string) => Promise<Result | null>;
};

// Bounded process-local cooldown supplements Supabase's provider limits.
// Distributed abuse controls remain a deployment-hardening task.
const cooldown = createAttemptLimit(1000);
export function emailCooldown(email: string, now = Date.now()) {
  return cooldown("recovery", email, 1, 60000, now);
}
export function recoveryHandler(kind: "resend" | "forgot" | "password", provider: () => Promise<RecoveryProvider>, limit = emailCooldown) {
  return async (request: Request) => {
    if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
    try {
      const input = await readBoundedJson(request, 2048);
      if (kind === "password") {
        const parsed = newPasswordSchema.safeParse(input);
        if (!parsed.success) return failure("INVALID_INPUT", "Use a password between 8 and 128 characters.", 400);
        const result = await (await provider()).changePassword(parsed.data.password);
        if (!result) return failure("UNAUTHORIZED", "Your recovery session expired. Request a new reset link.", 401);
        if (result.error?.status === 429) return limited(60);
        if (result.error) return failure("PASSWORD_UPDATE_FAILED", "Password could not be updated. Use a different password or request a new reset link.", 400);
        return json({ passwordUpdated: true });
      }
      const parsed = recoveryEmailSchema.safeParse(input);
      if (!parsed.success) return failure("INVALID_INPUT", "Enter a valid email address.", 400);
      const wait = limit(parsed.data.email);
      if (wait) return limited(wait);
      const auth = await provider();
      const result = await auth[kind](parsed.data.email, new URL("/auth/callback", requestOrigin(request)).href);
      if (result.error?.status === 429 || result.error?.code === "over_email_send_rate_limit") return limited(60);
      if (result.error && (result.error.status ?? 500) >= 500) return failure("EMAIL_UNAVAILABLE", "Email delivery is temporarily unavailable. Please wait and try again.", 503);
      // Identical response for unknown, confirmed or otherwise ineligible emails.
      return json({ requested: true, retryAfter: 60 });
    } catch { return failure("AUTH_UNAVAILABLE", "Account recovery is temporarily unavailable. Please try again.", 503); }
  };
}
function limited(seconds: number) {
  const response = failure("RATE_LIMITED", "Please wait before requesting another email.", 429);
  response.headers.set("Retry-After", String(seconds));
  return response;
}
