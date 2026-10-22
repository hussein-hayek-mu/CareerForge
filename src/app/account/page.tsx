import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountProfileEditor } from "@/components/account-profile";
import { createClient } from "@/lib/supabase/server";
import { profileFromRow } from "@/lib/account/schemas";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  let result;
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (!error && user) {
      const { data, error: profileError } = await client.from("profiles").select("full_name,headline,location,bio,education_summary,project_summary,self_reported_skills").eq("id", user.id).maybeSingle();
      result = profileError || !data ? { unavailable: true as const } : { profile: profileFromRow(data), email: user.email ?? "your account" };
    }
  } catch { result = { unavailable: true as const }; }
  if (!result) redirect("/login");
  if ("unavailable" in result) return <main className="account-content"><div className="empty-state"><h1>Your account is temporarily unavailable.</h1><p>We could not load your private profile. Your data has not been replaced with a demo.</p><Link className="button primary" href="/account">Try again</Link><Link className="text-button" href="/login">Back to sign in</Link></div></main>;
  return <AccountProfileEditor profile={result.profile} email={result.email} />;
}
