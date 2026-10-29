import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizeProfile } from "@/lib/account/server";
import { ProfileCV } from "@/components/profile-cv";
import { PrintCV } from "@/components/print-cv";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { eligibleCVSkills, readSkillResults } from "@/lib/skill-checks";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private CV preview — CareerForge", robots: { index: false, follow: false } };

export default async function CVPage() {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let access;
  let profile;
  let passedSkills: string[] = [];
  try {
    access = await authorizeProfile();
    if (access) {
      profile = await access.read();
      if (profile) passedSkills = eligibleCVSkills(profile.skills, await readSkillResults(await createClient(), access.userId));
    }
  } catch {
    return <AppShell pageTitle="My CV" privateAccount><div className="empty-state"><h1>Your CV is temporarily unavailable.</h1><p>We could not load your saved private profile. Please try again.</p><Link className="button primary" href="/cv/saved">Try again</Link><Link className="text-button" href="/account">Back to profile</Link></div></AppShell>;
  }
  if (!access) redirect("/login");
  if (!profile?.name.trim()) return <AppShell pageTitle="My CV" privateAccount><div className="empty-state"><h1>Start with your profile.</h1><p>Save your name and the details you want included before creating a CV preview.</p><Link className="button primary" href="/account">Edit your profile</Link></div></AppShell>;
  return <AppShell pageTitle="My CV" privateAccount displayName={profile.name}><div className="cv-page"><div className="cv-tools"><Link className="text-button" href="/cv">Open CV &amp; portfolio builder</Link><Link className="text-button" href="/account">← Back to profile</Link><div className="page-heading"><div><p className="eyebrow">PRIVATE · SAVED PROFILE ONLY</p><h1>Your profile CV.</h1><p>Review your details, then use your browser’s print dialog to save a PDF.</p></div><PrintCV /></div><p className="cv-note">This preview uses your saved profile. Save profile edits before refreshing it. Only selected skills with a stored passing basics check appear on this CV. Other profile details remain self-reported. Review before sharing.</p><Link className="text-button" href="/skill-checks">Check your skills ({passedSkills.length}/{profile.skills.length} eligible)</Link></div><ProfileCV profile={profile} passedSkills={passedSkills} /></div></AppShell>;
}
