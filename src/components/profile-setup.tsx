import Link from "next/link";
import type { AccountProfile } from "@/lib/account/schemas";

export function ProfileSetup({ profile }: { profile: AccountProfile }) {
  const steps = [
    { label: "Introduce yourself", detail: "Add your name and a clear headline.", href: "#account-name", complete: !!profile.name.trim() && !!profile.headline.trim() },
    { label: "Add your skills", detail: "List tools you have used to personalize matches.", href: "#account-skills", complete: profile.skills.length > 0 },
    { label: "Show your work", detail: "Describe a project, your contribution and tools.", href: "#account-project", complete: !!profile.project.trim() }
  ];
  const complete = steps.filter(step => step.complete).length;
  return <section className="profile-setup" aria-label="Profile getting started"><div className="setup-heading"><div><p className="eyebrow">A STRONG START</p><h2>{complete === 3 ? "Your foundations are in place." : "Build your starting point."}</h2><p>Based on your saved profile. You can explore roles at any stage.</p></div><span className="outline-label">{complete} of 3 foundations</span></div><ol>{steps.map((step, index) => <li key={step.label} className={step.complete ? "complete" : ""}><Link href={step.href}><span className="setup-index" aria-hidden="true">{step.complete ? "✓" : `0${index + 1}`}</span><span><strong>{step.label}<span className="sr-only">{step.complete ? ", complete" : ", not yet complete"}</span></strong><small>{step.detail}</small></span><span aria-hidden="true">↗</span></Link></li>)}</ol></section>;
}
