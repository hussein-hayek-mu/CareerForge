import { createClient } from "@/lib/supabase/server";
import type { RecoveryProvider } from "./recovery-handlers";

export async function recoveryProvider(): Promise<RecoveryProvider> {
  const client = await createClient();
  return {
    async resend(email, callback) {
      const { error } = await client.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback } });
      return { error };
    },
    async forgot(email, callback) {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: callback });
      return { error };
    },
    async changePassword(password) {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user) return null;
      const { error } = await client.auth.updateUser({ password });
      return { error };
    }
  };
}
