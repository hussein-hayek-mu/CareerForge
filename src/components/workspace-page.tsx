import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileFromRow } from "@/lib/account/schemas";
import { CareerWorkspace } from "./career-workspace";
import { trackerAccess } from "@/lib/tracker/server";
import { PublicHome } from "./public-home";

export async function WorkspacePage({ view }: { view: "overview" | "profile" | "jobs" | "applications" }) {
  const cookieStore = await cookies();
  // Guests need neither a database connection nor sample data in an account.
  if (!cookieStore.getAll().some(cookie => cookie.name.startsWith("sb-"))) {
    if (view === "overview") return <PublicHome />;
    redirect("/login");
  }
  let account;
  let anonymous = false;
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) { anonymous = true; throw new Error("Session unavailable"); }
    const { data, error: profileError } = await client.from("profiles")
      .select("full_name,headline,location,bio,education_summary,project_summary,self_reported_skills")
      .eq("id", user.id).single();
    if (profileError || !data) throw new Error("Profile unavailable");
    const tracker = trackerAccess(client, user.id);
    const [jobs, applications] = await Promise.all([tracker.jobs(), tracker.list()]);
    account = { id: user.id, profile: profileFromRow(data), tracker: { jobs, applications } };
  } catch {
    if (anonymous) {
      if (view === "overview") return <PublicHome />;
      redirect("/login");
    }
    return <main className="account-content"><div className="empty-state"><h1>Your workspace is temporarily unavailable.</h1><p>We could not load your account, profile or opportunities. Please try again or sign in again.</p><Link href={view === "overview" ? "/" : `/${view}`} className="button primary">Try again</Link><Link href="/login" className="text-button">Sign in</Link></div></main>;
  }
  if (view === "profile") redirect("/account");
  return <CareerWorkspace key={`${account.id}:${view}`} view={view} account={account} />;
}
