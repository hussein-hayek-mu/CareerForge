import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeProfile } from "@/lib/account/server";
import { SuppliedDocumentBuilder } from "./supplied-document-builder";

export async function SuppliedDocumentPage() {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let access;
  try { access = await authorizeProfile(); }
  catch { return <main className="empty-state"><h1>The builder is temporarily unavailable.</h1><p>Try signing in again.</p><Link href="/login" className="button">Sign in</Link></main>; }
  if (!access) redirect("/login");
  return <SuppliedDocumentBuilder />;
}
