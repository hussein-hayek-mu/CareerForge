"use client";

import Link from "next/link";
import { BrandMark } from "./career-visuals";
import { usePathname } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const preferenceKey = "careerforge-sidebar-collapsed";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("careerforge-sidebar", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("careerforge-sidebar", callback); };
}
function snapshot() { try { return localStorage.getItem(preferenceKey) === "true"; } catch { return false; } }

export type IconName = "overview" | "profile" | "jobs" | "applications" | "account" | "menu" | "close" | "panel" | "arrow";
export function AppIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    profile: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 6 0 0 1 16 0v3",
    jobs: "M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3",
    applications: "M6 3h15v15 M3 6h15v15H3z M7 11h7 M7 15h5",
    account: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
    menu: "M4 6h16 M4 12h16 M4 18h16", close: "M6 6l12 12 M18 6L6 18",
    panel: "M4 4h16v16H4z M9 4v16 M16 8l-4 4 4 4", arrow: "M5 12h14 M13 6l6 6-6 6"
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

const items: { label: string; href: string; icon: IconName }[] = [
  { label: "Overview", href: "/", icon: "overview" },
  { label: "My profile", href: "/profile", icon: "profile" },
  { label: "Find opportunities", href: "/jobs", icon: "jobs" },
  { label: "Applications", href: "/applications", icon: "applications" }
];

export function AppShell({ children, pageTitle, displayName = "Your workspace", applicationCount = 0, privateAccount = false, accountActions }: {
  children: ReactNode; pageTitle: string; displayName?: string; applicationCount?: number; privateAccount?: boolean; accountActions?: ReactNode;
}) {
  const pathname = usePathname();
  const storedPreference = useSyncExternalStore(subscribe, snapshot, () => false);
  const [temporaryPreference, setTemporaryPreference] = useState<boolean | null>(null);
  const collapsed = temporaryPreference ?? storedPreference;
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const initials = displayName.split(" ").filter(Boolean).map(word => word[0]).slice(0, 2).join("") || "CF";
  function toggleSidebar() {
    try { localStorage.setItem(preferenceKey, String(!collapsed)); setTemporaryPreference(null); window.dispatchEvent(new Event("careerforge-sidebar")); } catch { setTemporaryPreference(!collapsed); }
  }
  function navigation(mobile = false) {
    return <>
      <div className="app-sidebar-brand"><Link href="/" className="brand" aria-label="CareerForge home" onClick={() => drawer.current?.close()}><BrandMark /><span className="app-brand-name">CareerForge<span>.</span></span></Link>{mobile ? <button className="shell-icon-button" aria-label="Close navigation" onClick={() => drawer.current?.close()}><AppIcon name="close" /></button> : <button className="shell-icon-button collapse-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="desktop-navigation" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar}><AppIcon name="panel" /></button>}</div>
      <nav aria-label="Main navigation" id={mobile ? "mobile-navigation" : "desktop-navigation"}>
        <p className="app-nav-heading">WORKSPACE <span>{privateAccount ? "PERSONAL" : "DEMO"}</span></p>
        {items.map(item => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={pathname === item.href ? "page" : undefined} title={item.label} className={`app-nav-item ${pathname === item.href ? "selected" : ""}`} onClick={() => drawer.current?.close()}><AppIcon name={item.icon} /><span className="app-nav-label">{item.label}</span>{item.href === "/applications" && applicationCount > 0 && <span className="app-nav-count">{applicationCount}</span>}</Link>)}
        <p className="app-nav-heading account-group-label">ACCOUNT</p>
        <Link href="/account" aria-label="My account" aria-current={pathname === "/account" ? "page" : undefined} title="My account" className={`app-nav-item ${pathname === "/account" ? "selected" : ""}`} onClick={() => drawer.current?.close()}><AppIcon name="account" /><span className="app-nav-label">My account</span><span className="private-indicator" aria-hidden="true" /></Link>
      </nav>
      <div className="app-sidebar-help"><span>YOUR NEXT CHAPTER</span><p>One thoughtful step<br />at a time.</p><Link href={privateAccount ? "/account" : "/profile"} onClick={() => drawer.current?.close()}>Shape your profile <AppIcon name="arrow" /></Link></div>
      <Link className="app-sidebar-account" href="/account" title="Open your private account" onClick={() => drawer.current?.close()}><span className="avatar">{privateAccount ? initials : "CF"}</span><span className="app-account-label"><strong>{privateAccount ? displayName : "Your private account"}</strong><small>{privateAccount ? "Signed in · Owner-only profile" : "Open your private profile"}</small></span><AppIcon name="arrow" /></Link>
    </>;
  }
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="app-sidebar" aria-label="Workspace sidebar">{navigation()}</aside>
    <dialog className="navigation-drawer" ref={drawer} aria-label="Navigation" onClose={() => menuButton.current?.focus()} onClick={event => {
      if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX > bounds.right || event.clientY > bounds.bottom) drawer.current?.close(); }
    }}>{navigation(true)}</dialog>
    <div className="app-main"><header className="app-topbar"><button ref={menuButton} className="shell-icon-button mobile-menu-button" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => { drawer.current?.showModal(); drawer.current?.querySelector<HTMLButtonElement>("button")?.focus(); }}><AppIcon name="menu" /></button><div className="app-breadcrumb"><span>CareerForge</span><span aria-hidden="true">/</span><strong>{pageTitle}</strong></div><div className="app-topbar-actions"><span className={`workspace-mode ${privateAccount ? "private-mode" : ""}`}><span />{privateAccount ? "Private account" : "Demo workspace"}</span>{accountActions ?? <Link className="shell-account-link" href="/account" aria-label="Open my account"><AppIcon name="account" /><span>My account</span></Link>}</div></header><main id="main-content" className="app-content">{children}</main></div>
  </div>;
}
