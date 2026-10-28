import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publishedPortfolioSchema } from "@/lib/portfolio";
import { PortfolioPreview } from "@/components/portfolio-preview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared portfolio - CareerForge", robots: { index: false, follow: false } };
export default async function PublicPortfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!z.uuid().safeParse(slug).success) notFound();
  const client = await createClient();
  const { data, error } = await client.rpc("get_public_portfolio", { p_slug: slug }).abortSignal(AbortSignal.timeout(10000));
  if (error) throw new Error("Public portfolio temporarily unavailable");
  const result = publishedPortfolioSchema.safeParse(data);
  if (!result.success) notFound();
  return <main className="public-portfolio"><div className="public-portfolio-brand"><Link href="/">CareerForge</Link><span>Shared portfolio</span></div><PortfolioPreview snapshot={result.data.snapshot} publishedAt={result.data.publishedAt} headingLevel={1} /></main>;
}
