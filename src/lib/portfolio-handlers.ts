import { failure, isSameOrigin, json } from "./account/http";
import { readBoundedJson } from "./account/request-body";
import { privateWriteLimit } from "./account/attempt-limit";
import { portfolioDataSchema, portfolioWriteSchema, type PortfolioWrite } from "./portfolio";

export type PortfolioAccess = { userId: string; read: () => Promise<unknown>; write: (input: PortfolioWrite) => Promise<unknown> };
export function portfolioHandlers(authorize: () => Promise<PortfolioAccess | null>, limit = privateWriteLimit) {
  const unavailable = () => failure("PORTFOLIO_UNAVAILABLE", "Your portfolio could not be confirmed. Reload its saved state before retrying; your local choices are still here.", 503);
  return {
    async GET() {
      try {
        const access = await authorize();
        if (!access) return failure("UNAUTHORIZED", "Sign in to manage your portfolio.", 401);
        const data = portfolioDataSchema.safeParse(await access.read());
        return data.success ? json(data.data) : unavailable();
      } catch { return unavailable(); }
    },
    async PUT(request: Request) {
      if (!isSameOrigin(request)) return failure("FORBIDDEN", "This request must come from CareerForge.", 403);
      try {
        const access = await authorize();
        if (!access) return failure("UNAUTHORIZED", "Sign in to manage your portfolio.", 401);
        const input = portfolioWriteSchema.safeParse(await readBoundedJson(request, 2048));
        if (!input.success) return failure("INVALID_INPUT", "Check your portfolio template and section choices.", 400);
        const wait = limit("portfolio", access.userId);
        if (wait) {
          const response = failure("RATE_LIMITED", "Too many portfolio changes. Wait before trying again.", 429);
          response.headers.set("Retry-After", String(wait));
          return response;
        }
        const data: unknown = await access.write(input.data);
        if (data && typeof data === "object") {
          if ("conflict" in data && data.conflict === true) return failure("CONFLICT", "This portfolio changed elsewhere. Reload its saved state before applying your choices.", 409);
          if ("sourceChanged" in data && data.sourceChanged === true) return failure("SOURCE_CHANGED", "Your profile or assessment evidence changed. Reload and review the new preview before publishing.", 409);
          if ("profileRequired" in data && data.profileRequired === true) return failure("PROFILE_REQUIRED", "Save your name in your profile before publishing.", 400);
        }
        const saved = portfolioDataSchema.safeParse(data);
        return saved.success ? json(saved.data) : unavailable();
      } catch { return unavailable(); }
    }
  };
}
