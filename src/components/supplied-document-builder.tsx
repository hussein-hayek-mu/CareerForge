import Link from "next/link";
import PortfolioBuilder from "./PortfolioBuilder.jsx";

export function SuppliedDocumentBuilder() {
  return <main className="supplied-builder-page">
    <div className="supplied-builder-bar"><Link href="/">← Workspace</Link><p><strong>Sample builder</strong> · Edits stay in this tab. AI generation is in demo mode.</p><nav aria-label="Saved document tools"><Link href="/cv/saved">Saved-profile CV</Link><Link href="/portfolio/publication">Manage publication</Link></nav></div>
    <PortfolioBuilder />
  </main>;
}
