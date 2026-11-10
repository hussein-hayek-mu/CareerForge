"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "./career-visuals";

// The shared layout keeps the mode indicator mounted across auth navigation.
export function AuthFrame({ children }: { children: ReactNode }) {
  const registering = usePathname() === "/register";
  return <div className="account-page">
    <header className="account-header">
      <Link className="brand" href="/"><BrandMark />CareerForge.</Link>
      <Link className="text-button" href="/">Back to home <span aria-hidden="true">&#8599;</span></Link>
    </header>
    <main className="auth-layout">
      <section className="auth-story" key={registering ? "register" : "login"}>
        <p className="eyebrow">{registering ? "YOUR FIRST STEP" : "YOUR WORKSPACE AWAITS"}</p>
        <h1>{registering ? <>Your next chapter<br />starts here.</> : <>Welcome back.<br />Keep moving forward.</>}</h1>
        <p>{registering ? "Build your private profile, create your CV and portfolio, and explore your next career step." : "Return to your profile, continue working on your CV, and pick up your saved opportunities."}</p>
        <div className="auth-story-note"><span aria-hidden="true">&#10035;</span><p>Your account profile is private.<br />Only you can view and edit it.</p></div>
      </section>
      <section className="panel auth-panel" aria-labelledby="auth-title">
        <nav className="auth-mode-switch" data-mode={registering ? "register" : "login"} aria-label="Account access">
          <span className="auth-mode-indicator" aria-hidden="true" />
          <Link href="/login" scroll={false} aria-current={!registering ? "page" : undefined}>Sign in</Link>
          <Link href="/register" scroll={false} aria-current={registering ? "page" : undefined}>Create account</Link>
        </nav>
        {children}
      </section>
    </main>
  </div>;
}
