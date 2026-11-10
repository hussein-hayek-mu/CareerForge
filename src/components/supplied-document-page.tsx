import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeProfile } from "@/lib/account/server";
import { AppShell } from "./app-shell";
import { SuppliedDocumentBuilder } from "./supplied-document-builder";

export async function SuppliedDocumentPage() {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let access;
  try { access = await authorizeProfile(); }
  catch {
    return <AppShell pageTitle="CV & Portfolio" privateAccount>
      <div className="empty-state"><h1>The builder is temporarily unavailable.</h1><p>We could not confirm your session. Try again.</p><Link href="/documents" className="button primary">Try again</Link></div>
    </AppShell>;
  }
  if (!access) redirect("/login");
  return <AppShell pageTitle="CV & Portfolio" privateAccount contentClassName="document-workspace">
    <SuppliedDocumentBuilder />
  </AppShell>;
}
