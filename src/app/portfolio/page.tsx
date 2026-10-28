import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PortfolioEditor } from "@/components/portfolio-editor";
import { authorizePortfolio } from "@/lib/portfolio-server";
import { portfolioDataSchema } from "@/lib/portfolio";

export const metadata = { title: "My portfolio - CareerForge", robots: { index: false, follow: false } };
export default async function Page() {
  if (!(await cookies()).getAll().some(cookie => cookie.name.startsWith("sb-"))) redirect("/login");
  let access;
  let data;
  try {
    access = await authorizePortfolio();
    if (access) data = portfolioDataSchema.parse(await access.read());
  } catch {
    return <AppShell pageTitle="My portfolio" privateAccount><div className="empty-state"><h1>Your portfolio is temporarily unavailable.</h1><p>Your saved settings and any public snapshot have not been replaced.</p><Link href="/portfolio" className="button primary">Try again</Link></div></AppShell>;
  }
  if (!access) redirect("/login");
  if (!data) throw new Error("Portfolio unavailable");
  return <AppShell pageTitle="My portfolio" privateAccount displayName={data.source.name}><PortfolioEditor initial={data} /></AppShell>;
}