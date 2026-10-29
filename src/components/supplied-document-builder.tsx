"use client";

import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "./app-shell";
import PortfolioBuilder from "./PortfolioBuilder.jsx";

export function SuppliedDocumentBuilder() {
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  return <section className="supplied-builder-page" aria-label="CV and portfolio builder" data-notes-collapsed={notesCollapsed}>
    <div className="supplied-builder-bar">
      <p><strong>Sample builder</strong> · Replace the example with your details. Edits stay in this tab. AI generation is in demo mode.</p>
      <div className="supplied-builder-tools">
        <button type="button" className="builder-notes-toggle" aria-expanded={!notesCollapsed} aria-controls="raw" onClick={() => setNotesCollapsed(collapsed => !collapsed)}>
          <AppIcon name="panel" /><span>{notesCollapsed ? "Show notes" : "Hide notes"}</span>
        </button>
        <nav aria-label="Saved document tools">
          <Link href="/cv/saved">Saved-profile CV</Link>
          <Link href="/portfolio/publication">Manage publication</Link>
        </nav>
      </div>
    </div>
    <PortfolioBuilder />
  </section>;
}
