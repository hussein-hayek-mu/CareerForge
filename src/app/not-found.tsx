import Link from "next/link";
import { BrandMark } from "@/components/career-visuals";

export default function NotFound() {
  return (
    <main className="recovery-page" id="main-content">
      <div className="recovery-card">
        <Link className="brand" href="/" aria-label="CareerForge home"><BrandMark />CareerForge.</Link>
        <p className="eyebrow">404 / PAGE NOT FOUND</p>
        <h1>A detour, not a dead end.</h1>
        <p className="recovery-description">This page may have moved, or the address may be incorrect. Head back to CareerForge and choose your next step.</p>
        <nav className="recovery-actions" aria-label="Page recovery">
          <Link className="button primary" href="/">Back to homepage</Link>
          <Link className="button" href="/jobs">Explore opportunities</Link>
        </nav>
      </div>
    </main>
  );
}
