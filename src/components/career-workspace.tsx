"use client";

import Link from "next/link";
import { useAccountTracker } from "./use-account-tracker";
import type { TrackerData } from "@/lib/tracker/schemas";
import type { AccountProfile } from "@/lib/account/schemas";
import { AppShell } from "./app-shell";
import { CareerLaunchpad, ProfileIdentity } from "./career-visuals";
import { useState, useSyncExternalStore, useRef, type FormEvent } from "react";
import { initialWorkspace, jobs, matchSkills, readWorkspace, statuses, type Job, type Workspace } from "@/lib/demo-workspace";

type View = "overview" | "profile" | "jobs" | "applications";
const storageKey = "careerforge-demo-v1";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("careerforge-update", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("careerforge-update", callback); };
}
function snapshot(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function serverSnapshot() { return null; }

export function CareerWorkspace({ view, account }: { view: View; account?: { id: string; profile: AccountProfile; tracker: TrackerData } }) {
  const remote = useAccountTracker(account?.tracker);
  const catalog = remote.data?.jobs ?? jobs;
  const allJobs = [...new Map([...catalog, ...(remote.data?.applications.map(entry => entry.job) ?? [])].map(job => [job.id, job])).values()];
  const raw = useSyncExternalStore(subscribe, () => account ? null : snapshot(storageKey), serverSnapshot);
  const [notice, setNotice] = useState("");
  const [temporary, setTemporary] = useState<Workspace | null>(null);
  const workspace = account
    ? { profile: account.profile, applications: Object.fromEntries((remote.data?.applications ?? []).map(entry => [entry.jobId, entry.status])) }
    : temporary ?? readWorkspace(raw);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("All work modes");
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<Job | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const profile = workspace.profile;
  const entries = Object.entries(workspace.applications);
  const ranked = [...catalog].sort((a, b) => matchSkills(profile.skills, b.skills).score - matchSkills(profile.skills, a.skills).score);
  const filtered = ranked.filter(job => `${job.title} ${job.company} ${job.location} ${job.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase()) && (mode === "All work modes" || mode === job.mode) && (!savedOnly || !!workspace.applications[job.id]));
  const completion = Math.round([profile.name, profile.headline, profile.location, profile.bio, profile.education, profile.project, profile.skills.length].filter(Boolean).length / 7 * 100);
  const initials = profile.name.split(" ").filter(Boolean).map(n => n[0]).slice(0, 2).join("") || "You";

  function save(next: Workspace, message: string) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setTemporary(null);
      window.dispatchEvent(new Event("careerforge-update"));
      setNotice(message);
    } catch {
      setTemporary(next);
      setNotice("Browser storage is unavailable. Changes will last until you leave this page.");
    }
  }
  function toggleSaved(job: Job) {
    if (account) { void remote.mutate(job.id); return; }
    const applications = { ...workspace.applications };
    if (applications[job.id]) delete applications[job.id];
    else applications[job.id] = "Saved";
    save({ ...workspace, applications }, applications[job.id] ? "Opportunity saved to your tracker." : "Opportunity removed from your tracker.");
  }
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const text = (name: string) => String(fields.get(name) ?? "").trim();
    save({ ...workspace, profile: { name: text("name"), headline: text("headline"), location: text("location"), bio: text("bio"), education: text("education"), project: text("project"), skills: [...new Set(text("skills").split(",").map(s => s.trim()).filter(Boolean))] } }, "Profile saved in this browser. Your skill matches are up to date.");
  }
  function changeStatus(job: Job, status: (typeof statuses)[number]) {
    if (account) { void remote.mutate(job.id, status); return; }
    save({ ...workspace, applications: { ...workspace.applications, [job.id]: status } }, "Application status updated in this browser.");
  }
  function busy(id: string) { return !!account && (!!remote.error || remote.pending.includes(id)); }
  function openRole(job: Job, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelected(job);
    dialogRef.current?.showModal();
  }
  function closeRole() { dialogRef.current?.close(); triggerRef.current?.focus(); }
  function jobCard(job: Job) {
    const match = matchSkills(profile.skills, job.skills);
    const status = workspace.applications[job.id];
    return <article className="job-card" key={job.id}>
      <div className="job-top"><span className={`company-mark ${job.color}`}>{job.initials}</span><span className="job-company">{job.company}<small>Fictional company</small></span><button className={`icon-button ${status ? "is-saved" : ""}`} aria-label={`${status ? "Remove" : "Save"} ${job.title}`} aria-pressed={!!status} disabled={busy(job.id)} aria-busy={remote.pending.includes(job.id)} onClick={() => toggleSaved(job)}><Bookmark /></button></div>
      <button className="job-title" onClick={e => openRole(job, e.currentTarget)}>{job.title}</button>
      <p className="job-description">{job.description}</p>
      <p className="job-location">⌖ {job.location}</p>
      <div className="tag-row"><span className="tag">{job.mode}</span><span className="tag">{job.type}</span><span className="tag">Entry level</span></div>
      <div className="job-skill-list">{job.skills.slice(0, 3).map(skill => <span key={skill}>{skill}</span>)}{job.skills.length > 3 && <span>+{job.skills.length - 3}</span>}</div>
      <div className="skill-match-track" aria-hidden="true"><span style={{ width: `${match.score}%` }} /></div>
      <div className="job-bottom"><span className={`match ${match.score >= 70 ? "strong" : ""}`}><span className="match-dot" />{match.score}% skill match</span><button className="text-button" onClick={e => openRole(job, e.currentTarget)}>View role <span aria-hidden="true">↗</span></button></div>
    </article>;
  }

  return <AppShell pageTitle={{ overview: "Overview", profile: "My profile", jobs: "Find opportunities", applications: "Applications" }[view]} displayName={profile.name} applicationCount={entries.length} privateAccount={!!account}>
        <div className={`demo-info ${account ? "account-workspace-info" : ""}`}>{account ? "Matches use your saved account profile. Jobs are fictional. Your tracker syncs to your account; no applications are submitted." : "Fictional jobs. Sample profile. Edits stay in this browser; no applications are submitted."}</div>
        {account && <div className="tracker-sync-info"><p>Your online tracker syncs across devices. Earlier browser-only saves remain on this device and were not imported.</p><button className="text-button" onClick={() => void remote.refresh()}>Refresh opportunities</button></div>}
        {remote.error && <div className="account-error" role="alert">{remote.error} <Link href="/login">Sign in</Link></div>}
        {remote.message && <div className="notice" role="status">{remote.message}</div>}
        {notice && <div className="notice" role="status">✓ {notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
        {view === "overview" && <>
          <div className="page-heading"><div><p className="eyebrow">YOUR NEXT CHAPTER</p><h1>Make your next <em>move.</em></h1><p>Build the skills. Find your direction. Ship your next chapter.</p></div><Link className="button primary" href="/jobs">Explore opportunities <span>↗</span></Link></div>
          <CareerLaunchpad profile={profile} completion={completion} profileHref={account ? "/account" : "/profile"} />
          <section className="stats-grid" aria-label="Workspace summary">{[{ label: "Profile completeness", value: `${completion}%`, hint: "Give your story a strong foundation", icon: "◎" }, { label: "Your skill toolkit", value: profile.skills.length, hint: "Self-reported skills to build on", icon: "✧" }, { label: "Tracked opportunities", value: entries.length, hint: "Possibilities worth coming back to", icon: "▣" }, { label: "Applications in motion", value: entries.filter(([, s]) => s !== "Saved" && s !== "Rejected").length, hint: "Every step forward counts", icon: "↗" }].map(stat => <article className="stat-card" key={stat.label}><div className="stat-label">{stat.label}<span aria-hidden="true">{stat.icon}</span></div><strong>{stat.value}</strong><p>{stat.hint}</p></article>)}</section>
          <div className="dashboard-columns"><section><div className="section-heading"><div><h2>Possibilities to explore</h2><p>A few example roles connected to your skills.</p></div><Link className="text-button" href="/jobs">View all ↗</Link></div><div className="job-grid compact">{ranked.slice(0, 2).map(jobCard)}</div><div className="matching-note"><span>✧</span><p>Clarity, not guesswork. Matches compare your self-reported skills with each role’s listed skills.</p></div></section><section className="next-step"><span className="eyebrow">YOUR NEXT SMALL STEP</span><h2>Let your work<br />tell your story.</h2><p>A project is more than a line on your profile. It shows how you think, build, and solve problems.</p><div className="step-check"><span>01</span><div><strong>Add a project you’re proud of</strong><small>What did you build? What did you learn?</small></div></div><Link className="text-button" href={account ? "/account" : "/profile"}>Update your profile ↗</Link></section></div>
        </>}
        {view === "jobs" && <>
          <div className="page-heading"><div><p className="eyebrow">FIND YOUR DIRECTION</p><h1>Good things ahead<span>.</span></h1><p>Explore example roles and see where your skills connect.</p></div><span className="outline-label">{catalog.length} demo opportunities</span></div>
          <div className="filter-bar"><label className="search-input"><span aria-hidden="true">⌕</span><input aria-label="Search opportunities" placeholder="Search a role, skill, or location" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Work mode" value={mode} onChange={e => setMode(e.target.value)}>{["All work modes", "Remote", "Hybrid", "On-site"].map(m => <option key={m}>{m}</option>)}</select><label className="checkbox-label"><input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)} />Saved only</label></div>
          <div className="results-heading"><span>{filtered.length} opportunities</span><span>Sorted by skill match</span></div><div className="job-grid">{filtered.map(jobCard)}</div>{!filtered.length && <div className="empty-state"><h2>No opportunities found</h2><p>Try a different search or save a role to see it here.</p><button className="button primary" onClick={() => { setQuery(""); setMode("All work modes"); setSavedOnly(false); }}>Clear filters</button></div>}
          <p className="muted-note">Skill match = matched required skills ÷ listed required skills. This is a demo comparison, not a hiring prediction.</p>
        </>}
        {view === "profile" && <>
          <div className="page-heading"><div><p className="eyebrow">YOUR STORY, TAKING SHAPE</p><h1>Start with you<span>.</span></h1><p>Bring your experience, curiosity, and skills into one place.</p></div><span className="outline-label">{completion}% complete</span></div>
          <ProfileIdentity name={profile.name} headline={profile.headline} location={profile.location} skillCount={profile.skills.length} /><div className="profile-layout"><form className="panel profile-form" onSubmit={submitProfile} key={JSON.stringify(profile)}><div className="section-heading"><div><h2>The essentials</h2><p>Edit this sample profile to make the demo your own.</p></div><span className="avatar profile-avatar">{initials}</span></div><div className="form-grid"><label>Full name<input name="name" required maxLength={100} defaultValue={profile.name} autoComplete="name" /></label><label>Location<input name="location" maxLength={120} defaultValue={profile.location} autoComplete="address-level2" /></label><label className="full-field">Your headline<input name="headline" maxLength={160} defaultValue={profile.headline} placeholder="What are you working toward?" /></label><label className="full-field">A little about you<textarea name="bio" rows={3} maxLength={1000} defaultValue={profile.bio} /></label><label className="full-field">Education<input name="education" maxLength={240} defaultValue={profile.education} placeholder="Degree, university, expected graduation" /></label><label className="full-field">Featured project<textarea name="project" rows={3} maxLength={1000} defaultValue={profile.project} placeholder="What did you build, and what tools did you use?" /></label><label className="full-field">Your skills<input name="skills" aria-label="Your skills" aria-describedby="skills-help" maxLength={500} defaultValue={profile.skills.join(", ")} /><small id="skills-help">Separate skills with commas. Skills are self-reported.</small></label></div><div className="form-footer"><span>Saved on this browser only</span><button className="button primary" type="submit">Save profile ✓</button></div></form><aside className="profile-aside"><section className="panel"><span className="eyebrow">YOUR SKILL TOOLKIT</span><h2>Every skill is a starting point.</h2><div className="tag-row skill-tags">{profile.skills.length ? profile.skills.map(skill => <span className="tag" key={skill}>{skill}</span>) : <p>Add your first skill to see relevant matches.</p>}</div><p className="muted-note">Self-reported · No assessments or verification performed.</p><Link href="/jobs" className="text-button">See your matches ↗</Link></section><section className="profile-tip"><span>✧</span><h3>Keep it real. Keep it you.</h3><p>Include tools you’ve actually used and projects you can talk about. You don’t need to know everything to take your first step.</p></section></aside></div>
        </>}
        {view === "applications" && <>
          <div className="page-heading"><div><p className="eyebrow">ONE STEP AT A TIME</p><h1>Keep things moving<span>.</span></h1><p>A little organization for your next big opportunity.</p></div><Link href="/jobs" className="button primary">Find a role ↗</Link></div>
          <div className="pipeline">{statuses.map(status => <div key={status}><span className={`status-dot status-${status.toLowerCase()}`} /><span>{status}</span><strong>{entries.filter(([, s]) => s === status).length}</strong></div>)}</div>
          {entries.length ? <section className="panel tracker"><div className="section-heading"><div><h2>Your opportunities</h2><p>Update statuses manually as your search progresses.</p></div></div>{allJobs.filter(j => workspace.applications[j.id]).map(job => <article className="tracker-row" key={job.id}><span className={`company-mark ${job.color}`}>{job.initials}</span><div className="tracker-role"><button className="job-title" onClick={e => openRole(job, e.currentTarget)}>{job.title}</button><p>{job.company} · {job.location}{"isActive" in job && !job.isActive ? " · No longer active" : ""}</p></div><label className="status-select"><span className="sr-only">Status for {job.title}</span><select value={workspace.applications[job.id]} disabled={busy(job.id)} onChange={e => changeStatus(job, e.target.value as (typeof statuses)[number])}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label><button className="remove-button" disabled={busy(job.id)} onClick={() => toggleSaved(job)} aria-label={`Remove ${job.title} from tracker`}>×</button></article>)}</section> : <div className="empty-state"><span className="empty-icon">↗</span><h2>Your next chapter is still unwritten.</h2><p>Save an opportunity that catches your eye.<br />Keep track of every next step right here.</p><Link href="/jobs" className="button primary">Explore opportunities ↗</Link></div>}
          <p className="muted-note">This is a personal demo tracker. Changing a status does not submit an application or contact an employer.</p>
        </>}
        <footer className="page-footer"><span>CareerForge <span className="footer-dot">✳</span> A little closer to what’s next.</span>{!account && <button onClick={() => { if (window.confirm("Reset your demo profile and tracker? This only clears CareerForge demo data in this browser.")) save(initialWorkspace, "Demo workspace reset."); }}>Reset demo</button>}</footer>
    <dialog ref={dialogRef} className="role-dialog" aria-labelledby="role-title" onCancel={() => triggerRef.current?.focus()} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeRole(); } }}>{selected && <><button className="modal-close" onClick={closeRole} aria-label="Close role details">×</button><span className={`company-mark ${selected.color}`}>{selected.initials}</span><p className="eyebrow">FICTIONAL DEMO OPPORTUNITY</p><h2 id="role-title">{selected.title}</h2><p>{selected.company} · {selected.location}</p><div className="tag-row"><span className="tag">{selected.mode}</span><span className="tag">{selected.type}</span></div><h3>About the role</h3><p>{selected.description}</p><h3>Your skill connection</h3><p>{matchSkills(profile.skills, selected.skills).score}% of listed skills match your self-reported profile.</p><div className="tag-row">{selected.skills.map(skill => <span key={skill} className={`tag ${matchSkills(profile.skills, [skill]).score ? "skill-have" : "skill-missing"}`}>{matchSkills(profile.skills, [skill]).score ? "✓ " : "+ "}{skill}</span>)}</div><p className="muted-note">Green skills are in your profile. Other skills are gaps to explore. No live vacancy or application submission is available.</p><button className="button primary" disabled={busy(selected.id)} onClick={() => toggleSaved(selected)}>{workspace.applications[selected.id] ? "Remove from tracker" : "Save opportunity"}</button></>}</dialog>
  </AppShell>;
}

function Bookmark() {
  return <svg width="18" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>;
}
