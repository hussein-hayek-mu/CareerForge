import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizeProfile } from "@/lib/account/server";
import { ProfileCV } from "@/components/profile-cv";
import { PrintCV } from "@/components/print-cv";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private CV preview — CareerForge", robots: { index: false, follow: false } };

export default async function CVPage() {
  let access;
  let profile;
  try {
    access = await authorizeProfile();
    if (access) profile = await access.read();
  } catch {
    return <main className="account-content"><div className="empty-state"><h1>Your CV is temporarily unavailable.</h1><p>We could not load your saved private profile. Please try again.</p><Link className="button primary" href="/cv">Try again</Link><Link className="text-button" href="/account">Back to profile</Link></div></main>;
  }
  if (!access) redirect("/login");
  if (!profile?.name.trim()) return <main className="account-content"><div className="empty-state"><h1>Start with your profile.</h1><p>Save your name and the details you want included before creating a CV preview.</p><Link className="button primary" href="/account">Edit your profile</Link></div></main>;
  return <main className="cv-page"><div className="cv-tools"><Link className="text-button" href="/account">← Back to profile</Link><div className="page-heading"><div><p className="eyebrow">PRIVATE · SAVED PROFILE ONLY</p><h1>Your profile CV.</h1><p>Review your details, then use your browser’s print dialog to save a PDF.</p></div><PrintCV /></div><p className="cv-note">This preview uses your saved profile. Save profile edits before refreshing it. Empty sections are omitted; review your details and print settings before sharing.</p></div><ProfileCV profile={profile} /></main>;
}
