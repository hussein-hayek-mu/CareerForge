import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeProfile } from "@/lib/account/server";
import { AppShell } from "./app-shell";

/** Server gate shared by the feature directory and planned module pages. */
export async function FeatureWorkspace({ title, children }: { title: string; children: ReactNode }) {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let access;
  let profile;
  try {
    access = await authorizeProfile();
    if (access) profile = await access.read();
  } catch {
    return <AppShell pageTitle={title} privateAccount><div className="empty-state"><h1>Your workspace is temporarily unavailable.</h1><p>We could not verify and load your account. Try again from your profile.</p><Link href="/account" className="button primary">Back to profile</Link></div></AppShell>;
  }
  if (!access) redirect("/login");
  return <AppShell pageTitle={title} privateAccount displayName={profile?.name || "Your workspace"}>{children}</AppShell>;
}
