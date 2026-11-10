import type { PortfolioSnapshot } from "@/lib/portfolio";

export function PortfolioPreview({ snapshot, publishedAt, headingLevel = 2 }: { snapshot: PortfolioSnapshot; publishedAt?: string; headingLevel?: 1 | 2 }) {
  const { profile, template } = snapshot;
  const NameHeading = headingLevel === 1 ? "h1" : "h2";
  const sections = [["About", profile.bio], ["Featured project", profile.project], ["Education", profile.education]];
  return <article className={`portfolio-sheet portfolio-${template}`} aria-label={publishedAt ? "Published portfolio" : "Portfolio preview"}>
    <header className="portfolio-identity">
      <p className="eyebrow">PORTFOLIO</p>
      <NameHeading>{profile.name || "Save your name in your profile to begin."}</NameHeading>
      {profile.headline.trim() && <p className="portfolio-headline">{profile.headline}</p>}
      {profile.location.trim() && <p className="portfolio-location">{profile.location}</p>}
    </header>
    <div className="portfolio-story">
      {sections.filter(([, value]) => value.trim()).map(([title, value]) => <section key={title}><h3>{title}</h3><p>{value}</p></section>)}
      {profile.skills.length > 0 && <section><h3>Assessed fundamentals</h3><ul className="portfolio-skills">{profile.skills.map(skill => <li key={skill}>{skill}<span>Basics check passed</span></li>)}</ul><p className="portfolio-evidence">Limited React/SQL fundamentals evidence from recorded checks. This does not establish identity, mastery or independent performance.</p></section>}
      {!sections.some(([, value]) => value.trim()) && !profile.skills.length && <p className="portfolio-empty-note">No additional sections selected with saved content.</p>}
    </div>
    <footer className="portfolio-source-note">Built from saved profile details. Profile statements remain self-reported; degrees and project ownership have not been independently verified.{publishedAt && <> Snapshot published {publishedAt.slice(0, 10)} (UTC). Later profile edits are not reflected until republished.</>}</footer>
  </article>;
}
