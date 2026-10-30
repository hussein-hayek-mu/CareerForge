import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProfileHistoryEditor } from "@/components/profile-history-editor";
import { authorizeHistory } from "@/lib/profile-history-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Education & experience - CareerForge", robots: { index: false, follow: false } };

export default async function Page() {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let access;
  let history;
  try {
    access = await authorizeHistory();
    if (access) history = await access.readAll();
  } catch {
    return <AppShell pageTitle="Profile details" privateAccount><div className="empty-state"><h1>Your profile details are temporarily unavailable.</h1><p>We could not confirm your saved records. Please try again.</p><Link href="/account/history" className="button primary">Try again</Link><Link href="/account" className="text-button">Back to profile</Link></div></AppShell>;
  }
  if (!access) redirect("/login");
  if (!history) throw new Error("Profile history unavailable");
  return <AppShell pageTitle="Profile details" privateAccount><ProfileHistoryEditor initial={history} /></AppShell>;
}
