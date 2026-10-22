import { createClient } from "@/lib/supabase/server";
import { profileFromRow, profileToRow } from "./schemas";
import type { ProfileAccess } from "./profile-handlers";

export async function authorizeProfile(): Promise<ProfileAccess | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  // Use the authenticated Supabase client so Postgres RLS remains active.
  // Prisma's direct database connection is intentionally not used here.
  return {
    userId: user.id,
    async read() {
      const { data, error } = await supabase.from("profiles").select("full_name,headline,location,bio,education_summary,project_summary,self_reported_skills").eq("id", user.id).maybeSingle();
      if (error) throw new Error("Profile read failed");
      return data ? profileFromRow(data) : null;
    },
    async write(profile) {
      const { data, error } = await supabase.from("profiles").update(profileToRow(profile)).eq("id", user.id).select("full_name,headline,location,bio,education_summary,project_summary,self_reported_skills").single();
      if (error || !data) throw new Error("Profile write failed");
      return profileFromRow(data);
    }
  };
}
