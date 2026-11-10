"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { composePortfolio, portfolioDataSchema, portfolioSections, type PortfolioData, type PortfolioSection, type PortfolioWrite } from "@/lib/portfolio";
import { PortfolioPreview } from "./portfolio-preview";
import { useUnsavedProfileGuard } from "./unsaved-profile-guard";

const sectionNames: Record<PortfolioSection, string> = { about: "About", project: "Featured project", skills: "Assessed skills", education: "Education", location: "Location" };
export function PortfolioEditor({ initial }: { initial: PortfolioData }) {
  const [saved, setSaved] = useState(initial);
  const [template, setTemplate] = useState(initial.settings.template);
  const [sections, setSections] = useState(initial.settings.sections);
  const [approved, setApproved] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const dirty = template !== saved.settings.template || JSON.stringify(sections) !== JSON.stringify(saved.settings.sections);
  useUnsavedProfileGuard(dirty, "Leave without saving your portfolio choices?");

  function apply(data: PortfolioData) {
    setSaved(data); setTemplate(data.settings.template); setSections(data.settings.sections); setApproved(false);
  }
  async function operation(action: PortfolioWrite["action"] | "reload") {
    if (inFlight.current || (action === "publish" && !approved)) return;
    if (action === "reload" && dirty && !window.confirm("Reload saved state and discard your unsaved portfolio choices?")) return;
    inFlight.current = true; setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/portfolio", action === "reload" ? { cache: "no-store", signal: AbortSignal.timeout(15000) } : {
        method: "PUT", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ action, template, sections, revision: saved.settings.revision, sourceToken: saved.sourceToken })
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const failure = body && typeof body === "object" && "error" in body ? body.error : null;
        setError(failure && typeof failure === "object" && "message" in failure && typeof failure.message === "string" ? failure.message : "The portfolio operation could not be confirmed. Reload its saved state before retrying.");
        setApproved(false); return;
      }
      const result = portfolioDataSchema.safeParse(body);
      if (!result.success) { setError("The saved response could not be verified. Reload its saved state before retrying."); setApproved(false); return; }
      apply(result.data);
      setMessage(action === "publish" ? "Your reviewed snapshot is public. Only its selected details are shared." : action === "unpublish" ? "Your portfolio is private. Its public link now returns not found." : action === "reload" ? "Saved settings and profile data reloaded." : "Portfolio choices saved. An existing public snapshot has not changed.");
    } catch { setApproved(false); setError("The operation could not be confirmed. Your local choices are still here. Reload the saved state to check whether it completed before trying again."); }
    finally { inFlight.current = false; setPending(false); }
  }
  function toggleSection(section: PortfolioSection) {
    setSections(current => current.includes(section) ? current.filter(item => item !== section) : portfolioSections.filter(item => item === section || current.includes(item)));
    setApproved(false);
  }

  return <div className="feature-page portfolio-page">
    <header className="feature-heading"><p className="eyebrow">YOUR STORY, FROM THE SOURCE</p><h1>Make your work visible.</h1><p>Build from your saved profile, review a template and choose exactly when to share.</p></header>
    <div className="portfolio-visibility"><strong>{saved.settings.isPublic ? "Public snapshot active" : "Private · Only you can view"}</strong><p>Draft changes stay private. Publishing creates an unlisted link anyone can open; profile edits do not silently update the shared snapshot.</p>{saved.settings.isPublic && saved.settings.slug && <Link className="text-button" href={`/p/${saved.settings.slug}`} target="_blank" rel="noopener noreferrer">Open public portfolio <span className="sr-only">(new tab)</span> ↗</Link>}</div>
    {message && <p className="notice" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <div className="portfolio-editor-layout">
      <aside className="panel portfolio-controls" aria-label="Portfolio controls">
        <fieldset disabled={pending}><legend>1. Choose a template</legend><div className="portfolio-template-options">{(["studio", "editorial"] as const).map(option => <label key={option}><input type="radio" name="portfolio-template" value={option} checked={template === option} onChange={() => { setTemplate(option); setApproved(false); }} /><span><strong>{option === "studio" ? "Studio" : "Editorial"}</strong><small>{option === "studio" ? "A clear introduction and focused sections" : "A side-by-side identity and story"}</small></span></label>)}</div></fieldset>
        <fieldset disabled={pending}><legend>2. Select saved details</legend><p>Name and headline are always included. Location and education are optional.</p>{portfolioSections.map(section => <label className="portfolio-section-choice" key={section}><input type="checkbox" checked={sections.includes(section)} onChange={() => toggleSection(section)} />{sectionNames[section]}</label>)}</fieldset>
        <p className="muted-note">Unsupported or unpassed skills are excluded. Empty sections are omitted. Experience, certification and contact records are not yet supported here.</p>
        <Link href="/account" className="text-button">Edit source profile ↗</Link><Link href="/skill-checks" className="text-button">Review skill evidence ↗</Link>
        <p className="portfolio-save-state" aria-live="polite">{dirty ? "Unsaved portfolio choices" : saved.settings.revision ? "Choices saved" : "Not saved yet"}</p>
        <div className="portfolio-actions"><button className="button primary" disabled={pending || (!dirty && !!saved.settings.revision)} onClick={() => operation("save")}>Save private choices</button><button className="text-button" disabled={pending} onClick={() => operation("reload")}>Reload saved state</button></div>
      </aside>
      <section className="portfolio-preview-region" aria-label="Private portfolio preview"><p className="eyebrow">PRIVATE PREVIEW · CURRENT SAVED PROFILE</p><PortfolioPreview snapshot={composePortfolio(saved.source, template, sections)} /></section>
    </div>
    <section className="panel portfolio-publication" aria-labelledby="publish-heading"><h2 id="publish-heading">Share only after reviewing.</h2><p>Publishing shares this preview’s selected profile text and limited skill evidence. It does not share your sign-in email, account ID, hidden sections or application records. Anyone with the link can read or copy the published details.</p>
      <label className="portfolio-consent"><input type="checkbox" checked={approved} disabled={pending || !saved.source.name.trim()} onChange={event => setApproved(event.target.checked)} />I reviewed this preview and approve making these selected details public.</label>
      {!saved.source.name.trim() && <p className="muted-note">Save your name in My profile before publishing.</p>}
      <div className="portfolio-actions"><button className="button primary" disabled={pending || !approved || !saved.source.name.trim()} onClick={() => operation("publish")}>{saved.settings.isPublic ? "Update public snapshot" : "Publish reviewed portfolio"}</button>{saved.settings.isPublic && <button className="button" disabled={pending} onClick={() => operation("unpublish")}>Make private &amp; save choices</button>}</div>
    </section>
  </div>;
}
