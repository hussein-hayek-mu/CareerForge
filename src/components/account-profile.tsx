"use client";

import Link from "next/link";
import { AppShell } from "./app-shell";
import { ProfileIdentity } from "./career-visuals";
import { ProfileSetup } from "./profile-setup";
import { useUnsavedProfileGuard } from "./unsaved-profile-guard";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { profileSchema, type AccountProfile } from "@/lib/account/schemas";

const subscribeReady = () => () => {};
function readDraft(form: HTMLFormElement) {
  const fields = new FormData(form);
  const text = (name: string) => String(fields.get(name) ?? "").trim();
  return { name: text("name"), headline: text("headline"), location: text("location"), bio: text("bio"), education: text("education"), project: text("project"), skills: text("skills").split(",").map(s => s.trim()).filter(Boolean) };
}

export function AccountProfileEditor({ profile: initialProfile, email }: { profile: AccountProfile; email: string }) {
  const router = useRouter();
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const [dirty, setDirty] = useState(false);
  useUnsavedProfileGuard(dirty);
  const [profile, setProfile] = useState(initialProfile);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = profileSchema.safeParse(readDraft(event.currentTarget));
    setError(""); setMessage("");
    if (!parsed.success) { setError("Enter your name and check field lengths. Use at most 40 skills of 60 characters each."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/v1/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Your profile could not be saved."); return; }
      const validated = profileSchema.safeParse(result.profile);
      if (!validated.success) { setError("The saved profile response could not be verified. Please refresh."); return; }
      setProfile(validated.data);
      setDirty(false);
      setMessage("Your private profile is saved to your account.");
    } catch { setError("Unable to save. Check your connection and try again. Your form has not been cleared."); }
    finally { setPending(false); }
  }
  async function logout() {
    if (pending) return;
    if (dirty && !window.confirm("Discard your unsaved profile changes and sign out?")) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" });
      if (!response.ok) { setError("Sign out failed. Please try again."); return; }
      setDirty(false);
      router.replace("/login");
      router.refresh();
    } catch { setError("Unable to sign out. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <AppShell pageTitle="My profile" displayName={profile.name || "Your account"} privateAccount accountActions={<button className="button primary" onClick={logout} disabled={!ready || pending}>Sign out</button>}><div className="account-content"><div className="page-heading"><div><p className="eyebrow">YOUR PRIVATE ACCOUNT</p><h1>Your story starts here<span>.</span></h1><p>Signed in as {email}. This profile is stored securely in your account.</p></div><span className="outline-label">Owner-only access</span></div>{message && <div className="notice" role="status"><span>{message}</span><Link className="text-button" href="/jobs">See updated matches</Link></div>}{error && <p className="form-error account-error" role="alert">{error}</p>}<ProfileSetup profile={profile} /><ProfileIdentity name={profile.name} headline={profile.headline} location={profile.location} skillCount={profile.skills.length} privateProfile /><div className="profile-layout"><form className="panel profile-form" method="post" onInput={event => setDirty(JSON.stringify(readDraft(event.currentTarget)) !== JSON.stringify(profile))} onSubmit={save} key={JSON.stringify(profile)}><div className="section-heading"><div><h2>The essentials</h2><p>Only include experience and skills you can speak to.</p></div></div><fieldset className="form-grid profile-fields" disabled={!ready || pending}><label>Full name<input id="account-name" name="name" required maxLength={100} autoComplete="name" defaultValue={profile.name} /></label><label>Location<input name="location" maxLength={120} defaultValue={profile.location} /></label><label className="full-field">Your headline<input id="account-headline" placeholder="Your interests and the role you are working toward" name="headline" maxLength={160} defaultValue={profile.headline} /></label><label className="full-field">A little about you<textarea name="bio" rows={3} maxLength={1000} defaultValue={profile.bio} /></label><label className="full-field">Education summary<input name="education" maxLength={240} defaultValue={profile.education} /></label><label className="full-field">Featured project<textarea id="account-project" placeholder="What did you build, what was your contribution, and which tools did you use?" name="project" rows={3} maxLength={1000} defaultValue={profile.project} /></label><label className="full-field">Your skills<input id="account-skills" placeholder="Tools you have used, separated by commas" name="skills" aria-label="Your skills" aria-describedby="account-skills-help" maxLength={2500} defaultValue={profile.skills.join(", ")} /><small id="account-skills-help">Separate with commas. Up to 40 self-reported skills.</small></label></fieldset><p className="muted-note">Save before leaving. Unsaved drafts stay only on this page; browser Back may discard them.</p><div className="form-footer"><span className="profile-save-state">{dirty ? "Unsaved changes" : "No unsaved changes"}</span><button className="button primary" type="submit" disabled={!ready || pending || !dirty}>{pending ? "Please wait…" : "Save profile"}</button></div></form><aside className="profile-aside"><section className="panel"><p className="eyebrow">YOUR SKILL TOOLKIT</p><h2>A foundation you can build on.</h2><div className="tag-row skill-tags">{profile.skills.length ? profile.skills.map(skill => <span className="tag" key={skill}>{skill}</span>) : <p className="muted-note">Add skills you have used. Your job matches will update after saving.</p>}</div><p className="muted-note">These are self-reported skills, not verified qualifications. Education and project fields are summaries.</p><p className="muted-note">Matches use your saved skills. Jobs are fictional; saved roles and statuses sync with your account.</p><Link href="/jobs" className="text-button">Explore your matches ↗</Link></section></aside></div></div></AppShell>;
}
