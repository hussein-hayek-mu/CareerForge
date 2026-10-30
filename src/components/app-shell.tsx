"use client";

import Link from "next/link";
import { BrandMark } from "./career-visuals";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type PointerEvent, type ReactNode } from "react";
import { features, featureGroups, type FeatureIcon } from "@/lib/features";
import { AppIcon, type IconName } from "./app-icons";
import { CommandPalette, type PaletteItem } from "./command-palette";

// The icon set lives in app-icons.tsx; re-exported so existing imports from "./app-shell" keep working.
export { AppIcon, type IconName } from "./app-icons";

const preferenceKey = "careerforge-sidebar-collapsed";
const motionKey = "careerforge-motion";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("careerforge-sidebar", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("careerforge-sidebar", callback); };
}
function snapshot() { try { return localStorage.getItem(preferenceKey) === "true"; } catch { return false; } }
const subscribeNever = () => () => {};
const readMac = () => /Mac|iPhone|iPad/i.test(navigator.platform);

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}
function toggleMotion() {
  try { localStorage.setItem(motionKey, localStorage.getItem(motionKey) === "off" ? "on" : "off"); window.dispatchEvent(new Event(motionKey)); } catch { /* storage unavailable: nothing to toggle */ }
}

function NavIcon({ name }: { name: IconName }) {
  return <span className="app-nav-icon" aria-hidden="true"><AppIcon name={name} /></span>;
}

type NavItem = { id: string; href: string; label: string; icon: FeatureIcon; group: string; status?: string };
type Tip = { label: string; y: number };

function isActivePath(pathname: string, href: string) {
  return pathname === href
    || (href === "/documents" && (pathname.startsWith("/cv/") || pathname.startsWith("/portfolio/")));
}

/**
 * The sidebar contents. One instance renders in the desktop sidebar and one in the mobile drawer.
 * A glowing indicator (.nav-lens) glides to whichever tab is current when the route changes.
 */
function SidebarNav({ mobile, pathname, items, privateAccount, applicationCount, displayName, initials, collapsed, onNavigate, onTip }: {
  mobile: boolean; pathname: string; items: NavItem[]; privateAccount: boolean; applicationCount: number; displayName: string; initials: string;
  collapsed: boolean; onNavigate: () => void; onTip?: (tip: Tip | null) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  const showTips = !mobile && collapsed && !!onTip;

  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const place = () => {
      const node = el.querySelector<HTMLElement>(".app-nav-item.selected");
      if (!node || node.offsetParent === null) { el.style.setProperty("--lens-o", "0"); return; }
      el.style.setProperty("--lens-y", `${node.offsetTop}px`);
      el.style.setProperty("--lens-h", `${node.offsetHeight}px`);
      el.style.setProperty("--lens-o", "1");
    };
    place();
    // Enable the glide only after the first placement, so the indicator doesn't fly in on page load.
    const frame = requestAnimationFrame(() => { el.dataset.ready = "true"; });
    const observer = new ResizeObserver(place);
    observer.observe(el);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [pathname, collapsed]);

  const tipProps = (label: string) => showTips ? {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      const box = event.currentTarget.getBoundingClientRect();
      onTip?.({ label, y: box.top + box.height / 2 });
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.matches(":focus-visible")) return;
      const box = event.currentTarget.getBoundingClientRect();
      onTip?.({ label, y: box.top + box.height / 2 });
    },
    onPointerLeave: () => onTip?.(null),
    onBlur: () => onTip?.(null)
  } : {};
  const nativeTitle = (text: string) => (showTips ? undefined : text);

  return <>
    <div className="app-sidebar-brand"><Link href="/" className="brand" aria-label="CareerForge home" onClick={onNavigate}><BrandMark /><span className="app-brand-name">CareerForge<span>.</span></span></Link>{mobile && <button className="shell-icon-button" aria-label="Close navigation" onClick={onNavigate}><AppIcon name="close" /></button>}</div>
    <nav aria-label="Main navigation" id={mobile ? "mobile-navigation" : "desktop-navigation"} ref={nav}>
      <span className="nav-lens" aria-hidden="true" />
      <Link href="/features" aria-label="All features" title={nativeTitle("All features")} aria-current={pathname === "/features" ? "page" : undefined} className={`app-nav-item feature-directory-link ${pathname === "/features" ? "selected" : ""}`} onClick={onNavigate} {...tipProps("All features")}><NavIcon name="overview" /><span className="app-nav-label">All features</span><span className="app-nav-label feature-directory-arrow" aria-hidden="true">&#8599;</span></Link>
      {featureGroups.map(group => <div className="app-nav-group" key={group}><p className="app-nav-heading">{group}</p>{items.filter(item => item.group === group).map(item => {
        const planned = item.status === "Planned" || item.status === "Stretch";
        return <Link key={item.href} href={item.href} prefetch={planned ? false : undefined} aria-label={item.label} aria-current={isActivePath(pathname, item.href) ? "page" : undefined} title={nativeTitle(`${item.label}${planned ? ` (${item.status?.toLowerCase()})` : ""}`)} className={`app-nav-item ${isActivePath(pathname, item.href) ? "selected" : ""}`} onClick={onNavigate} {...tipProps(`${item.label}${planned ? ` · ${item.status?.toLowerCase()}` : ""}`)}><NavIcon name={item.icon} /><span className="app-nav-label">{item.label}</span>{planned && <span className="app-nav-planned" role="img" aria-label={item.status} />}{item.href === "/applications" && applicationCount > 0 && <span className="app-nav-count">{applicationCount}</span>}</Link>;
      })}</div>)}
      {!privateAccount && <><p className="app-nav-heading account-group-label">ACCOUNT</p>
      <Link href="/account" aria-label="My account" aria-current={isActivePath(pathname, "/account") ? "page" : undefined} title={nativeTitle("My account")} className={`app-nav-item ${isActivePath(pathname, "/account") ? "selected" : ""}`} onClick={onNavigate} {...tipProps("My account")}><NavIcon name="account" /><span className="app-nav-label">My account</span><span className="private-indicator" aria-hidden="true" /></Link></>}
    </nav>
    <Link className="app-sidebar-account" href="/account" title={nativeTitle("Open your private account")} onClick={onNavigate} {...tipProps(privateAccount ? displayName : "Your private account")}><span className="avatar">{privateAccount ? initials : "CF"}</span><span className="app-account-label"><strong>{privateAccount ? displayName : "Your private account"}</strong><small>{privateAccount ? "Signed in · Owner-only profile" : "Open your private profile"}</small></span><AppIcon name="arrow" /></Link>
  </>;
}

export function AppShell({ children, pageTitle, displayName = "Your workspace", applicationCount = 0, privateAccount = false, accountActions, contentClassName = "" }: {
  children: ReactNode; pageTitle: string; displayName?: string; applicationCount?: number; privateAccount?: boolean; accountActions?: ReactNode; contentClassName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const storedPreference = useSyncExternalStore(subscribe, snapshot, () => false);
  const mac = useSyncExternalStore(subscribeNever, readMac, () => false);
  const [temporaryPreference, setTemporaryPreference] = useState<boolean | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const collapsed = temporaryPreference ?? storedPreference;
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const initials = displayName.split(" ").filter(Boolean).map(word => word[0]).slice(0, 2).join("") || "CF";
  const toggleSidebar = useCallback(() => {
    setTip(null);
    try { localStorage.setItem(preferenceKey, String(!collapsed)); setTemporaryPreference(null); window.dispatchEvent(new Event("careerforge-sidebar")); } catch { setTemporaryPreference(!collapsed); }
  }, [collapsed]);

  // Keyboard: "[" collapses or expands the sidebar; Ctrl/Cmd+K (or "/") opens the command palette.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(open => !open); return; }
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || isTyping(event.target)) return;
      if (event.key === "[") toggleSidebar();
      else if (event.key === "/") { event.preventDefault(); setPaletteOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  const navigationItems: NavItem[] = features.map(item => item.id === "profile" && !privateAccount ? { ...item, href: "/profile" } : item);
  const handleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const closeDrawer = () => drawer.current?.close();

  const paletteItems: PaletteItem[] = [
    { id: "page-features", label: "All features", group: "Workspace", icon: "overview", href: "/features", keywords: "directory everything index", current: pathname === "/features" },
    ...navigationItems.map(item => {
      const planned = item.status === "Planned" || item.status === "Stretch";
      return { id: `page-${item.id}`, label: item.label, group: item.group, icon: item.icon, href: item.href, keywords: `${item.id} ${item.href.replace("/", "")}`, badge: planned ? item.status : undefined, current: isActivePath(pathname, item.href) };
    }),
    ...(privateAccount ? [] : [{ id: "page-account", label: "My account", group: "Account", icon: "account" as IconName, href: "/account", keywords: "private profile settings", current: isActivePath(pathname, "/account") }]),
    { id: "act-sidebar", label: handleLabel, group: "Actions", icon: "panel", shortcut: "[", keywords: "navigation menu toggle collapse expand" },
    { id: "act-motion", label: "Pause or resume background motion", group: "Actions", icon: "spark", keywords: "animation background reduce calm" }
  ];
  function pick(item: PaletteItem) {
    setPaletteOpen(false);
    if (item.href) router.push(item.href);
    else if (item.id === "act-sidebar") toggleSidebar();
    else if (item.id === "act-motion") toggleMotion();
  }

  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <button type="button" className="sidebar-handle" aria-label={handleLabel} aria-expanded={!collapsed} aria-controls="desktop-navigation" aria-keyshortcuts="[" data-tip={`${handleLabel} · press [`} onClick={toggleSidebar}><AppIcon name="chevron" /></button>
    <div className="sidebar-rail" aria-hidden="true" onClick={toggleSidebar} />
    <aside
      className="app-sidebar" aria-label="Workspace sidebar" ref={sidebar}
      onPointerMove={event => {
        if (event.pointerType === "touch") return;
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--sx", `${event.clientX - box.left}px`);
        event.currentTarget.style.setProperty("--sy", `${event.clientY - box.top}px`);
      }}
    ><span className="sidebar-glow" aria-hidden="true" /><SidebarNav mobile={false} pathname={pathname} items={navigationItems} privateAccount={privateAccount} applicationCount={applicationCount} displayName={displayName} initials={initials} collapsed={collapsed} onNavigate={closeDrawer} onTip={setTip} /></aside>
    {collapsed && tip && <div className="nav-tip" role="presentation" style={{ top: tip.y }}>{tip.label}</div>}
    <dialog className="navigation-drawer" ref={drawer} aria-label="Navigation" onClose={() => menuButton.current?.focus()} onClick={event => {
      if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX > bounds.right || event.clientY > bounds.bottom) drawer.current?.close(); }
    }}><SidebarNav mobile pathname={pathname} items={navigationItems} privateAccount={privateAccount} applicationCount={applicationCount} displayName={displayName} initials={initials} collapsed={false} onNavigate={closeDrawer} /></dialog>
    <div className="app-main"><header className="app-topbar"><button ref={menuButton} className="shell-icon-button mobile-menu-button" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => { drawer.current?.showModal(); drawer.current?.querySelector<HTMLButtonElement>("button")?.focus(); }}><AppIcon name="menu" /></button><div className="app-breadcrumb"><span>CareerForge</span><span aria-hidden="true">/</span><strong>{pageTitle}</strong></div><div className="app-topbar-actions"><button type="button" className="cmdk-trigger" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" aria-label="Search pages and actions" onClick={() => setPaletteOpen(true)}><AppIcon name="search" /><span className="cmdk-trigger-text">Search or jump to…</span><kbd>{mac ? "⌘" : "Ctrl"} K</kbd></button><span className={`workspace-mode ${privateAccount ? "private-mode" : ""}`}><span />{privateAccount ? "Private account" : "Demo workspace"}</span>{accountActions ?? <Link className="shell-account-link" href="/account" aria-label="Open my account"><AppIcon name="account" /><span>My account</span></Link>}</div></header><main id="main-content" tabIndex={-1} className={`app-content ${contentClassName}`}>{children}</main></div>
    <CommandPalette open={paletteOpen} items={paletteItems} onClose={() => setPaletteOpen(false)} onPick={pick} />
  </div>;
}
