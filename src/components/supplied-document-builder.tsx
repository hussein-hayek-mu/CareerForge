import Link from "next/link";
import PortfolioBuilder from "./PortfolioBuilder.jsx";

export function SuppliedDocumentBuilder() {
  return <section className="supplied-builder-page" aria-label="CV and portfolio builder">
    <div className="supplied-builder-bar">
      <p><strong>Sample builder</strong> · Replace the example with your details. Edits stay in this tab. AI generation is in demo mode.</p>
      <nav aria-label="Saved document tools">
        <Link href="/cv/saved">Saved-profile CV</Link>
        <Link href="/portfolio/publication">Manage publication</Link>
      </nav>
    </div>
    <PortfolioBuilder />
  </section>;
}
