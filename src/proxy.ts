import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isPrivateFeaturePath } from "@/lib/features";
import { publicPortfolioGuard } from "@/lib/portfolio-public-guard";
import { isPortfolioPublished } from "@/lib/portfolio-public";

export async function proxy(request: NextRequest) {
  // The reference landing page is public for every visitor, including signed-in users.
  // Its navigation must not depend on an Auth round trip or a private profile read.
  const path = request.nextUrl.pathname;
  if (path === "/") return NextResponse.next({ request });
  const publicFailure = await publicPortfolioGuard(request.nextUrl.pathname, isPortfolioPublished);
  if (publicFailure) return publicFailure;
  const response = await updateSession(request);
  // These pages can contain account data, including their RSC responses.
  // Apply after session refresh, which may replace the response object.
  if (isPrivateFeaturePath(path) || ["/profile", "/reset-password", "/api/generate"].includes(path) || path.startsWith("/api/v1/") || path.startsWith("/p/") || path === "/auth/callback") {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
