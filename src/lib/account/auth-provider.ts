import { createClient } from "@/lib/supabase/server";
import type { AuthProvider } from "./auth-handlers";

export async function authProvider(): Promise<AuthProvider> {
  const supabase = await createClient();
  return {
    async login(credentials) {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      return { error };
    },
    async register(credentials, callback) {
      const { data, error } = await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: callback } });
      return { error, hasSession: !!data.session };
    },
    async logout() {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      return { error };
    }
  };
}
