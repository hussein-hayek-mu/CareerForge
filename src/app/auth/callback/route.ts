import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/account/http";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    try {
      const client = await createClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/account", requestOrigin(request)), { headers: { "Cache-Control": "no-store" } });
    } catch { /* Show a clean recovery page without exposing provider errors. */ }
  }
  return NextResponse.redirect(new URL("/login?confirmation=failed", requestOrigin(request)), { headers: { "Cache-Control": "no-store" } });
}
