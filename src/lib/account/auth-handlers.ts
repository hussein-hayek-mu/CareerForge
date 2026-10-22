import { credentialsSchema } from "./schemas";
import { failure, isSameOrigin, json, requestOrigin } from "./http";

type Credentials = { email: string; password: string };
type AuthResult = { error: { status?: number; code?: string } | null; hasSession?: boolean };
export type AuthProvider = {
  login: (credentials: Credentials) => Promise<AuthResult>;
  register: (credentials: Credentials, callback: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
};

export function authHandler(kind: "login" | "register" | "logout", provider: () => Promise<AuthProvider>) {
  return async function POST(request: Request) {
    if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
    try {
      if (kind === "logout") {
        const result = await (await provider()).logout();
        return result.error ? failure("AUTH_UNAVAILABLE", "Sign out failed. Please try again.", 503) : json({ signedOut: true });
      }
      const parsed = credentialsSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return failure("INVALID_INPUT", "Enter a valid email and a password between 8 and 128 characters.", 400);
      const auth = await provider();
      const result = kind === "login" ? await auth.login(parsed.data) : await auth.register(parsed.data, new URL("/auth/callback", requestOrigin(request)).href);
      if (result.error?.status === 429) return failure("RATE_LIMITED", "Too many attempts. Please wait before trying again.", 429);
      if (kind === "login" && result.error?.code === "email_not_confirmed") return failure("EMAIL_NOT_CONFIRMED", "Confirm your email using the newest link, or request a new confirmation below.", 403);
      if (result.error) return kind === "login"
        ? failure("INVALID_CREDENTIALS", "The email or password is incorrect. Check your details or reset your password below.", 401)
        : failure("REGISTRATION_FAILED", "Unable to register. Check your details or try signing in if you already have an account.", 400);
      return json({ signedIn: kind === "login" || !!result.hasSession, confirmationRequired: kind === "register" && !result.hasSession });
    } catch { return failure("AUTH_UNAVAILABLE", "Authentication is temporarily unavailable. Please try again.", 503); }
  };
}
