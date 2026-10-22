import Link from "next/link";
import type { DemoProfile } from "@/lib/demo-workspace";

export function BrandMark() {
  return <span className="brand-mark"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 17.5 12 3l8 14.5-8-4.2-8 4.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 13.3V21M8 10h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span>;
}

export function CareerLaunchpad({ profile, completion }: { profile: DemoProfile; completion: number }) {
  return <section className="launchpad" aria-label="Your career launchpad">
    <div className="launchpad-grid" aria-hidden="true" />
    <div className="launchpad-copy"><span className="launchpad-label"><span className="live-dot" /> YOUR CAREER, UNDER CONSTRUCTION</span><h2>Build a career<br />worth <em>committing</em> to.</h2><p>Your skills are the starting point.<br />Where you take them is up to you.</p><div className="launchpad-actions"><Link href="/profile" className="button primary">Build your profile <span aria-hidden="true">↗</span></Link><span className="launchpad-note">Small steps. Real possibilities.</span></div><div className="launchpad-coordinate" aria-hidden="true">01 — DEFINE YOUR DIRECTION <span>→</span></div></div>
    <div className="launchpad-visual"><svg className="launchpad-orbits" viewBox="0 0 500 350" fill="none" aria-hidden="true"><ellipse cx="250" cy="180" rx="230" ry="115" transform="rotate(-30 250 180)" /><ellipse cx="250" cy="180" rx="230" ry="115" transform="rotate(30 250 180)" /><circle cx="390" cy="88" r="5" /><path d="M55 268h16m-8-8v16M424 250h12m-6-6v12" /></svg>
      <div className="profile-terminal"><div className="terminal-toolbar"><span className="terminal-lights" aria-hidden="true"><i /><i /><i /></span><span>career.config.ts</span><span className="terminal-language">TS</span></div><div className="terminal-code"><div><span className="line-number">01</span><code><b>const</b> developer = {'{'}</code></div><div><span className="line-number">02</span><code>  name: <span>{JSON.stringify(profile.name || "Your name")}</span>,</code></div><div><span className="line-number">03</span><code>  skills: <span>[{profile.skills.map(skill => JSON.stringify(skill)).join(", ")}]</span>,</code></div><div><span className="line-number">04</span><code>  mindset: <span>&quot;keep building&quot;</span>,</code></div><div><span className="line-number">05</span><code>  nextChapter: <b>undefined</b></code></div><div><span className="line-number">06</span><code>{'}'};</code></div><div className="terminal-comment"><span className="line-number">07</span><code>{"// the best part is still unwritten."}</code></div></div><div className="terminal-footer"><span className="live-dot" />Profile preview <span>Self-reported data</span></div></div>
      <div className="readiness-badge"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" /><circle cx="22" cy="22" r="18" pathLength="100" strokeDasharray={`${completion} 100`} /></svg><span><strong>{completion}%</strong><small>Profile complete</small></span><span className="readiness-arrow" aria-hidden="true">↗</span></div>
    </div>
  </section>;
}

export function ProfileIdentity({ name, headline, location, skillCount, privateProfile = false }: {
  name: string; headline: string; location: string; skillCount: number; privateProfile?: boolean;
}) {
  const initials = name.split(" ").filter(Boolean).map(word => word[0]).slice(0, 2).join("") || "CF";
  return <section className="profile-identity" aria-label="Profile preview"><div className="identity-pattern" aria-hidden="true" /><div className="identity-avatar">{initials}<span aria-hidden="true">✦</span></div><div className="identity-copy"><p className="eyebrow">{privateProfile ? "YOUR PRIVATE PROFILE" : "DEVELOPER IN THE MAKING"}</p><h2>{name || "Your name. Your next chapter."}</h2><p>{headline || "A little curiosity goes a long way."}</p><div className="identity-meta">{location && <span>⌖ {location}</span>}<span>{skillCount} self-reported skills</span></div></div><span className="identity-label">{privateProfile ? "OWNER-ONLY" : "DEMO PROFILE"}<span aria-hidden="true"> ↗</span></span></section>;
}
