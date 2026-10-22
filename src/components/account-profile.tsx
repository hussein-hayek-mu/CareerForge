"use client";

import Link from "next/link";
import { AppShell } from "./app-shell";
import { ProfileIdentity } from "./career-visuals";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { profileSchema, type AccountProfile } from "@/lib/account/schemas";

export function AccountProfileEditor({ profile: initialProfile, email }: { profile: AccountProfile; email: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const text = (name: string) => String(fields.get(name) ?? "").trim();
    const parsed = profileSchema.safeParse({ name: text("name"), headline: text("headline"), location: text("location"), bio: text("bio"), education: text("education"), project: text("project"), skills: text("skills").split(",").map(s => s.trim()).filter(Boolean) });
    setError(""); setMessage("");
    if (!parsed.success) { setError("Enter your name and check field lengths. Use at most 40 skills of 60 characters each."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/v1/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "Your profile could not be saved."); return; }
      const validated = profileSchema.safeParse(result.profile);
      if (!validated.success) { setError("The saved profile response could not be verified. Please refresh."); return; }
      setProfile(validated.data);
      setMessage("Your private profile is saved to your account.");
    } catch { setError("Unable to save. Check your connection and try again. Your form has not been cleared."); }
    finally { setPending(false); }
  }
  async function logout() {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" });
      if (!response.ok) { setError("Sign out failed. Please try again."); return; }
      router.replace("/login");
      router.refresh();
    } catch { setError("Unable to sign out. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <AppShell pageTitle="My account" displayName={profile.name || "Your account"} privateAccount accountActions={<button className="button primary" onClick={logout} disabled={pending}>Sign out</button>}><div className="account-content"><div className="page-heading"><div><p className="eyebrow">YOUR PRIVATE ACCOUNT</p><h1>Your story starts here<span>.</span></h1><p>Signed in as {email}. This profile is stored securely in your account.</p></div><span className="outline-label">Owner-only access</span></div>{message && <p className="notice" role="status">✓ {message}</p>}{error && <p className="form-error account-error" role="alert">{error}</p>}<ProfileIdentity name={profile.name} headline={profile.headline} location={profile.location} skillCount={profile.skills.length} privateProfile /><div className="profile-layout"><form className="panel profile-form" onSubmit={save} key={JSON.stringify(profile)}><div className="section-heading"><div><h2>The essentials</h2><p>Only include experience and skills you can speak to.</p></div></div><div className="form-grid"><label>Full name<input name="name" required maxLength={100} autoComplete="name" defaultValue={profile.name} /></label><label>Location<input name="location" maxLength={120} defaultValue={profile.location} /></label><label className="full-field">Your headline<input name="headline" maxLength={160} defaultValue={profile.headline} /></label><label className="full-field">A little about you<textarea name="bio" rows={3} maxLength={1000} defaultValue={profile.bio} /></label><label className="full-field">Education summary<input name="education" maxLength={240} defaultValue={profile.education} /></label><label className="full-field">Featured project<textarea name="project" rows={3} maxLength={1000} defaultValue={profile.project} /></label><label className="full-field">Your skills<input name="skills" aria-label="Your skills" aria-describedby="account-skills-help" maxLength={2500} defaultValue={profile.skills.join(", ")} /><small id="account-skills-help">Separate with commas. Up to 40 self-reported skills.</small></label></div><div className="form-footer"><span>Private · Stored in Supabase</span><button className="button primary" type="submit" disabled={pending}>{pending ? "Please wait…" : "Save profile"}</button></div></form><aside className="profile-aside"><section className="panel"><p className="eyebrow">YOUR SKILL TOOLKIT</p><h2>A foundation you can build on.</h2><div className="tag-row skill-tags">{profile.skills.map(skill => <span className="tag" key={skill}>{skill}</span>)}</div><p className="muted-note">These are self-reported skills, not verified qualifications. Education and project fields are summaries.</p><p className="muted-note">Jobs and application tracking remain a separate fictional demo for now.</p><Link href="/jobs" className="text-button">Explore demo opportunities ↗</Link></section></aside></div></div></AppShell>;
}
