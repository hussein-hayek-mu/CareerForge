import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isPrivateFeaturePath } from "@/lib/features";
import { publicPortfolioGuard } from "@/lib/portfolio-public-guard";
import { isPortfolioPublished } from "@/lib/portfolio-public";

export async function proxy(request: NextRequest) {
  const publicFailure = await publicPortfolioGuard(request.nextUrl.pathname, isPortfolioPublished);
  if (publicFailure) return publicFailure;
  const response = await updateSession(request);
  // These pages can contain account data, including their RSC responses.
  // Apply after session refresh, which may replace the response object.
  const path = request.nextUrl.pathname;
  if (isPrivateFeaturePath(path) || ["/profile", "/reset-password"].includes(path) || path.startsWith("/api/v1/") || path.startsWith("/p/") || path === "/auth/callback") {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
