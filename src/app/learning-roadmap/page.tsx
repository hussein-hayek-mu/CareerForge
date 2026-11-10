import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LearningRoadmap } from "@/components/learning-roadmap";
import { createClient } from "@/lib/supabase/server";
import { profileFromRow } from "@/lib/account/schemas";
import { trackerAccess } from "@/lib/tracker/server";

export const metadata = { title: "Learning roadmap - CareerForge", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: {
  searchParams: Promise<{ target?: string | string[] }>;
}) {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let account;
  let anonymous = false;
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) anonymous = true;
    else {
      const [profile, jobs] = await Promise.all([
        client.from("profiles").select("full_name,headline,location,bio,education_summary,project_summary,self_reported_skills").eq("id", user.id).single(),
        trackerAccess(client, user.id).jobs()
      ]);
      if (profile.error || !profile.data) throw new Error("Profile unavailable");
      account = { profile: profileFromRow(profile.data), jobs };
    }
  } catch { /* Never substitute sample profiles or fictional success on failure. */ }
  if (anonymous) redirect("/login");
  if (!account) return <AppShell pageTitle="Learning roadmap" privateAccount><div className="empty-state"><h1>Your learning plan is temporarily unavailable.</h1><p>We could not load your saved profile or target roles.</p><Link href="/learning-roadmap" className="button primary">Try again</Link></div></AppShell>;
  const { target } = await searchParams;
  const targetId = typeof target === "string" && target.length <= 100 ? target : target === undefined ? undefined : "invalid";
  return <AppShell pageTitle="Learning roadmap" privateAccount displayName={account.profile.name}><LearningRoadmap profile={account.profile} jobs={account.jobs} targetId={targetId} /></AppShell>;
}
