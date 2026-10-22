import { createClient } from "@/lib/supabase/server";
import { callbackHandler } from "@/lib/account/callback-handler";

export const GET = callbackHandler(async (code, flowId) => {
  const client = await createClient();
  const result = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  // The installed SDK returns redirectType at runtime, but its public response
  // declaration omits it. Narrow the field without trusting callback queries.
  const redirectType = "redirectType" in result.data && typeof result.data.redirectType === "string" ? result.data.redirectType : null;
  return { data: { redirectType }, error: result.error };
});
