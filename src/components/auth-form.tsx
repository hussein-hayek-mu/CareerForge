"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/v1/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: String(fields.get("email") ?? "").trim(), password: String(fields.get("password") ?? "") }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error?.message ?? "Unable to continue. Please try again."); return; }
      if (result.confirmationRequired) { setConfirmation(true); return; }
      router.replace("/account");
      router.refresh();
    } catch { setMessage("Unable to connect. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <div className="account-page"><header className="account-header"><Link className="brand" href="/"><span className="brand-mark">↗</span>CareerForge.</Link><Link className="text-button" href="/">Explore the demo ↗</Link></header><main className="auth-layout"><section className="auth-story"><p className="eyebrow">YOUR NEXT CHAPTER</p><h1>A place for<br />your real potential.</h1><p>Create your profile, tell your story, and build a foundation for what comes next.</p><div className="auth-story-note"><span>✳</span><p>Your account profile is private.<br />Only you can view and edit it.</p></div></section><section className="panel auth-panel"><p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "START SOMETHING GOOD"}</p><h2>{mode === "login" ? "Pick up where you left off." : "Make room for what’s next."}</h2><p className="auth-intro">{mode === "login" ? "Sign in to your private account profile." : "Create an account with your own email address."}</p>{confirmation ? <div role="status" className="confirmation"><h3>Check your email</h3><p>If registration can proceed, Supabase will send a confirmation link. Open it in this browser, then sign in. Already registered? Sign in with your existing password.</p><Link className="button primary" href="/login">Go to sign in ↗</Link></div> : <form className="form-grid" onSubmit={submit}><label className="full-field">Email address<input type="email" name="email" autoComplete="email" required maxLength={254} /></label><label className="full-field">Password<input name="password" aria-label="Password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} maxLength={128} aria-describedby="password-help" /><small id="password-help">Use 8–128 characters.</small></label>{message && <p className="form-error full-field" role="alert">{message}</p>}<button className="button primary full-field" disabled={pending} type="submit">{pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form>}<p className="auth-switch">{mode === "login" ? "New here? " : "Already have an account? "}<Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p><p className="muted-note">The demo workspace stays separate. Sample profiles and fictional applications are never copied into your account.</p></section></main></div>;
}
