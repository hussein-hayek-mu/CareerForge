"use client";

import Link from "next/link";
import { BrandMark } from "./career-visuals";
import { usePathname } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { features, featureGroups, type FeatureIcon } from "@/lib/features";

const preferenceKey = "careerforge-sidebar-collapsed";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("careerforge-sidebar", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("careerforge-sidebar", callback); };
}
function snapshot() { try { return localStorage.getItem(preferenceKey) === "true"; } catch { return false; } }

export type IconName = FeatureIcon | "account" | "menu" | "close" | "panel" | "arrow";
export function AppIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    compass: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 8l-3 5-5 3 3-5z",
    courses: "M3 5h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 7v15",
    roadmap: "M5 4v12a4 4 0 0 0 8 0V8a4 4 0 0 1 8 0v12 M2 4h6 M18 20h5",
    projects: "M8 3h8l5 9-5 9H8l-5-9z M8 3l4 9 4-9 M3 12h18 M12 12v9",
    analysis: "M5 3h10l4 4v14H5z M14 3v5h5 M8 17v-3 M12 17v-6 M16 17v-2",
    portfolio: "M3 4h18v16H3z M3 9h18 M9 9v11 M6 6h.01 M9 6h.01",
    agent: "M8 5h8l4 4v8l-4 4H8l-4-4V9z M12 5V2 M8 11h.01 M16 11h.01 M8 16h8",
    outcomes: "M4 3v17h17 M8 15l4-5 4 2 5-7",
    assistant: "M4 4h16v12H9l-5 5z M8 10h.01 M12 10h.01 M16 10h.01",
    simulator: "M3 8l9-5 9 5-9 5z M6 10v7l6 4 6-4v-7 M21 8v8",
    cv: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7",
    checks: "M12 3l8 4v5c0 5-8 9-8 9s-8-4-8-9V7z M8 12l3 3 5-6",
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
  const navigationItems = features.map(item => item.id === "profile" && !privateAccount ? { ...item, href: "/profile" } : item);
  const isActive = (href: string) => pathname === href || ((href === "/cv" || href === "/portfolio") && pathname.startsWith(href + "/"));
  function navigation(mobile = false) {
    return <>
      <div className="app-sidebar-brand"><Link href="/" className="brand" aria-label="CareerForge home" onClick={() => drawer.current?.close()}><BrandMark /><span className="app-brand-name">CareerForge<span>.</span></span></Link>{mobile ? <button className="shell-icon-button" aria-label="Close navigation" onClick={() => drawer.current?.close()}><AppIcon name="close" /></button> : <button className="shell-icon-button collapse-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} aria-controls="desktop-navigation" title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleSidebar}><AppIcon name="panel" /></button>}</div>
      <nav aria-label="Main navigation" id={mobile ? "mobile-navigation" : "desktop-navigation"}>
        <Link href="/features" aria-label="All features" title="All features" aria-current={pathname === "/features" ? "page" : undefined} className={`app-nav-item feature-directory-link ${pathname === "/features" ? "selected" : ""}`} onClick={() => drawer.current?.close()}><AppIcon name="overview" /><span className="app-nav-label">All features</span><span className="app-nav-label feature-directory-arrow" aria-hidden="true">&#8599;</span></Link>
        {featureGroups.map(group => <div className="app-nav-group" key={group}><p className="app-nav-heading">{group}</p>{navigationItems.filter(item => item.group === group).map(item => <Link key={item.href} href={item.href} prefetch={item.status === "Planned" || item.status === "Stretch" ? false : undefined} aria-label={item.label} aria-current={isActive(item.href) ? "page" : undefined} title={`${item.label}${item.status === "Planned" || item.status === "Stretch" ? ` (${item.status.toLowerCase()})` : ""}`} className={`app-nav-item ${isActive(item.href) ? "selected" : ""}`} onClick={() => drawer.current?.close()}><AppIcon name={item.icon} /><span className="app-nav-label">{item.label}</span>{(item.status === "Planned" || item.status === "Stretch") && <span className="app-nav-planned" role="img" aria-label={item.status} />}{item.href === "/applications" && applicationCount > 0 && <span className="app-nav-count">{applicationCount}</span>}</Link>)}</div>)}
        {!privateAccount && <><p className="app-nav-heading account-group-label">ACCOUNT</p>
        <Link href="/account" aria-label="My account" aria-current={pathname === "/account" ? "page" : undefined} title="My account" className={`app-nav-item ${pathname === "/account" ? "selected" : ""}`} onClick={() => drawer.current?.close()}><AppIcon name="account" /><span className="app-nav-label">My account</span><span className="private-indicator" aria-hidden="true" /></Link></>}
      </nav>
      <Link className="app-sidebar-account" href="/account" title="Open your private account" onClick={() => drawer.current?.close()}><span className="avatar">{privateAccount ? initials : "CF"}</span><span className="app-account-label"><strong>{privateAccount ? displayName : "Your private account"}</strong><small>{privateAccount ? "Signed in · Owner-only profile" : "Open your private profile"}</small></span><AppIcon name="arrow" /></Link>
    </>;
  }
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="app-sidebar" aria-label="Workspace sidebar">{navigation()}</aside>
    <dialog className="navigation-drawer" ref={drawer} aria-label="Navigation" onClose={() => menuButton.current?.focus()} onClick={event => {
      if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX > bounds.right || event.clientY > bounds.bottom) drawer.current?.close(); }
    }}>{navigation(true)}</dialog>
    <div className="app-main"><header className="app-topbar"><button ref={menuButton} className="shell-icon-button mobile-menu-button" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => { drawer.current?.showModal(); drawer.current?.querySelector<HTMLButtonElement>("button")?.focus(); }}><AppIcon name="menu" /></button><div className="app-breadcrumb"><span>CareerForge</span><span aria-hidden="true">/</span><strong>{pageTitle}</strong></div><div className="app-topbar-actions"><span className={`workspace-mode ${privateAccount ? "private-mode" : ""}`}><span />{privateAccount ? "Private account" : "Demo workspace"}</span>{accountActions ?? <Link className="shell-account-link" href="/account" aria-label="Open my account"><AppIcon name="account" /><span>My account</span></Link>}</div></header><main id="main-content" tabIndex={-1} className="app-content">{children}</main></div>
  </div>;
}
