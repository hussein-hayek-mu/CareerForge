import Link from "next/link";
import type { DemoProfile } from "@/lib/demo-workspace";
import { HeroFilm } from "./hero-film";

export function BrandMark() {
  return <span className="brand-mark"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 17.5 12 3l8 14.5-8-4.2-8 4.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 13.3V21M8 10h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span>;
}

export function CareerLaunchpad({ profile, completion, profileHref = "/profile" }: { profile: DemoProfile; completion: number; profileHref?: string }) {
  return <section className="launchpad has-film" aria-label="Your career launchpad">
    <HeroFilm />
    <div className="launchpad-copy"><span className="launchpad-label"><span className="live-dot" /> YOUR CAREER, UNDER CONSTRUCTION</span><h2>Build a career<br />worth <em>committing</em> to.</h2><p>Your skills are the starting point.<br />Where you take them is up to you.</p><div className="launchpad-actions"><Link href={profileHref} className="button primary">Build your profile <span aria-hidden="true">↗</span></Link><span className="launchpad-note">Small steps. Real possibilities.</span></div><div className="launchpad-coordinate" aria-hidden="true">01 — DEFINE YOUR DIRECTION <span>→</span></div></div>
    <div className="launchpad-visual film-visual"><div className="film-summary"><span className="film-summary-index">YOUR STARTING POINT</span><div><strong>{completion}%</strong><span>Profile complete<small>{profile.skills.length} self-reported skills to build on</small></span></div></div></div>
  </section>;
}

export function ProfileIdentity({ name, headline, location, skillCount, privateProfile = false }: {
  name: string; headline: string; location: string; skillCount: number; privateProfile?: boolean;
}) {
  const initials = name.split(" ").filter(Boolean).map(word => word[0]).slice(0, 2).join("") || "CF";
  return <section className="profile-identity" aria-label="Profile preview"><div className="identity-pattern" aria-hidden="true" /><div className="identity-avatar">{initials}<span aria-hidden="true">✦</span></div><div className="identity-copy"><p className="eyebrow">{privateProfile ? "YOUR PRIVATE PROFILE" : "DEVELOPER IN THE MAKING"}</p><h2>{name || "Your name. Your next chapter."}</h2><p>{headline || "A little curiosity goes a long way."}</p><div className="identity-meta">{location && <span>⌖ {location}</span>}<span>{skillCount} self-reported skills</span></div></div><span className="identity-label">{privateProfile ? "OWNER-ONLY" : "DEMO PROFILE"}<span aria-hidden="true"> ↗</span></span></section>;
}
