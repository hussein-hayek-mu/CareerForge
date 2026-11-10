"use client";

import Link from "next/link";
import { BrandMark } from "./career-visuals";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

const subscribeReady = () => () => {};

export function AuthForm({ mode, callbackMessage }: { mode: "login" | "register"; callbackMessage?: string }) {
  const registering = mode === "register";
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    if (registering && fields.get("password") !== fields.get("confirmPassword")) {
      setMessage("Passwords do not match. Enter the same password in both fields.");
      (event.currentTarget.elements.namedItem("confirmPassword") as HTMLInputElement)?.focus();
      return;
    }
    setPending(true);
    setMessage("");
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
  return <div className="account-page">
    <header className="account-header">
      <Link className="brand" href="/"><BrandMark />CareerForge.</Link>
      <Link className="text-button" href="/">Back to home <span aria-hidden="true">&#8599;</span></Link>
    </header>
    <main className="auth-layout">
      <section className="auth-story">
        <p className="eyebrow">{registering ? "YOUR FIRST STEP" : "YOUR WORKSPACE AWAITS"}</p>
        <h1>{registering ? <>Your next chapter<br />starts here.</> : <>Welcome back.<br />Keep moving forward.</>}</h1>
        <p>{registering ? "Build your private profile, create your CV and portfolio, and explore your next career step." : "Return to your profile, continue working on your CV, and pick up your saved opportunities."}</p>
        <div className="auth-story-note"><span aria-hidden="true">&#10035;</span><p>Your account profile is private.<br />Only you can view and edit it.</p></div>
      </section>
      <section className="panel auth-panel" aria-labelledby="auth-title">
        <nav className="auth-mode-switch" aria-label="Account access">
          <Link href="/login" aria-current={!registering ? "page" : undefined}>Sign in</Link>
          <Link href="/register" aria-current={registering ? "page" : undefined}>Create account</Link>
        </nav>
        <p className="eyebrow">{registering ? "NEW TO CAREERFORGE" : "ALREADY HAVE AN ACCOUNT"}</p>
        <h2 id="auth-title">{registering ? "Create your account" : "Sign in to CareerForge"}</h2>
        <p className="auth-intro">{registering ? "Use your email and choose a password to get started. You may need to confirm your email before signing in." : "Enter the email and password you used to create your account."}</p>
        {callbackMessage && <p className="form-error" role="alert">{callbackMessage}</p>}
        {confirmation ? <div role="status" className="confirmation">
          <h3>Check your email</h3>
          <p>If registration can proceed, a confirmation link will be sent to your email. Open the newest link in this browser, then sign in. Already registered? Use your existing password to sign in.</p>
          <Link className="text-button" href="/confirm-email">Request a new confirmation</Link>
          <Link className="button primary" href="/login">Go to sign in <span aria-hidden="true">&#8599;</span></Link>
        </div> : <form className="form-grid" method="post" onSubmit={submit} aria-busy={pending}>
          <label className="full-field">Email address<input disabled={!ready || pending} type="email" name="email" autoComplete="email" required maxLength={254} /></label>
          <label className="full-field">Password<input disabled={!ready || pending} name="password" aria-label="Password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={8} maxLength={128} aria-describedby={registering ? "password-help" : undefined} />{registering && <small id="password-help">Choose a password with 8&ndash;128 characters.</small>}</label>
          {registering && <label className="full-field">Confirm password<input disabled={!ready || pending} name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /></label>}
          {message && <p className="form-error full-field" role="alert">{message}</p>}
          <button className="button primary full-field" disabled={!ready || pending} type="submit">{pending ? registering ? "Creating account..." : "Signing in..." : registering ? "Create account" : "Sign in"}</button>
        </form>}
        <p className="auth-switch">{registering ? "Already have an account? " : "New to CareerForge? "}<Link href={registering ? "/login" : "/register"}>{registering ? "Sign in" : "Create an account"}</Link></p>
        {!registering && <div className="auth-recovery-links"><Link href="/forgot-password">Forgot your password?</Link><Link href="/confirm-email">Need a new confirmation?</Link></div>}
        <p className="muted-note">Your profile stays private. You choose what to publish or share.</p>
      </section>
    </main>
  </div>;
}
