import { createClient } from "@supabase/supabase-js";

/** Always anonymous: this path must never read an owner's unpublished records. */
export async function isPortfolioPublished(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Portfolio service unavailable");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await client.rpc("get_public_portfolio", { p_slug: slug }).abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("Portfolio read unavailable");
  return data !== null;
}
