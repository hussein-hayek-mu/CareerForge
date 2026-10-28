import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { bankSchema, readSkillResults, sessionReplySchema } from "@/lib/skill-checks";
import { SkillChecks } from "@/components/skill-checks";
import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Skill checks — CareerForge", robots: { index: false, follow: false } };
export default async function SkillChecksPage() {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let account;
  let anonymous = false;
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) anonymous = true;
    else {
      const [catalog, results, profile, current] = await Promise.all([client.rpc("skill_check_catalog"), readSkillResults(client, user.id), client.from("profiles").select("full_name,self_reported_skills").eq("id", user.id).single(), client.rpc("current_skill_check_session")]);
      if (catalog.error || profile.error || current.error) throw new Error("Checks unavailable");
      account = { name: profile.data.full_name, selected: profile.data.self_reported_skills as string[], banks: bankSchema.parse(catalog.data), results, session: sessionReplySchema.parse(current.data).session };
    }
  } catch { /* Show a retry state, never a fabricated pass. */ }
  if (anonymous) redirect("/login");
  if (!account) return <main className="account-content"><div className="empty-state"><h1>Skill checks are temporarily unavailable.</h1><p>Your existing results have not changed.</p><Link href="/skill-checks" className="button primary">Try again</Link></div></main>;
  return <AppShell pageTitle="Skill checks" privateAccount displayName={account.name}><SkillChecks banks={account.banks} selected={account.selected} results={account.results} initialSession={account.session} /></AppShell>;
}
