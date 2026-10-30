"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { BrandMark } from "./career-visuals";

/**
 * The landing-page navigation: a floating "island" instead of a full-width bar.
 *
 *  - A glowing lens glides to the link you hover or focus, and rests on the section you are reading.
 *  - A light ring around the island fills as you scroll the page, with a bright head at the leading edge.
 *  - The island tightens up and gains depth once you leave the top of the page.
 *  - The call to action is magnetic: it leans toward the cursor as it approaches.
 *  - On small screens the island keeps the brand and the call to action, and a menu button opens a full-screen sheet.
 *
 * Everything is plain links and a native <dialog>, so keyboard, screen reader and no-JS-animation use all work.
 */

const sections = [
  { id: "platform", label: "Platform" },
  { id: "features", label: "Features" },
  { id: "principles", label: "Principles" }
] as const;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function LandingNav() {
  const island = useRef<HTMLDivElement>(null);
  const links = useRef<HTMLElement>(null);
  const ctaWrap = useRef<HTMLSpanElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const lensShown = useRef(false);
  const activeSection = useRef<string | null>(null);
  const pointerFrame = useRef(0);
  const pointerPosition = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll progress ring, compact state and scroll-spy, all from one rAF-throttled listener.
  useEffect(() => {
    const el = island.current;
    if (!el) return;
    let frame = 0;
    let maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const progress = Math.min(1, y / maxScroll);
      const line = window.innerHeight * 0.4;
      let current: string | null = null;
      for (const section of sections) {
        const rect = document.getElementById(section.id)?.getBoundingClientRect();
        if (rect && rect.top <= line && rect.bottom > line) current = section.id;
      }
      // Finish layout reads before changing the island's styles.
      el.style.setProperty("--p", progress.toFixed(4));
      el.style.setProperty("--tip", y > 24 && progress < 0.995 ? "1" : "0");
      el.dataset.scrolled = y > 24 ? "true" : "false";
      if (activeSection.current !== current) {
        activeSection.current = current;
        setActive(current);
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measureScroll = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      onScroll();
    };
    const onResize = () => {
      measureScroll();
      if (window.innerWidth > 860 && sheet.current?.open) sheet.current.close();
    };
    const observer = new ResizeObserver(measureScroll);
    observer.observe(document.body);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);

  // Position the lens over the hovered link, or the active section, or hide it.
  const target = hovered ?? active;
  useEffect(() => {
    const bar = links.current;
    if (!bar) return;
    const place = () => {
      const node = target ? bar.querySelector<HTMLElement>(`[data-key="${target}"]`) : null;
      if (!node) { lensShown.current = false; bar.style.setProperty("--lens-o", "0"); return; }
      if (!lensShown.current) {
        // First appearance: jump into place without sliding in from the far left.
        bar.dataset.snap = "true";
        bar.style.setProperty("--lens-x", `${node.offsetLeft}px`); bar.style.setProperty("--lens-w", `${node.offsetWidth}px`);
        void bar.offsetWidth;
        delete bar.dataset.snap;
        lensShown.current = true;
      }
      bar.style.setProperty("--lens-x", `${node.offsetLeft}px`); bar.style.setProperty("--lens-w", `${node.offsetWidth}px`);
      bar.style.setProperty("--lens-o", "1");
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [target]);

  function onIslandMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    pointerPosition.current = { x: event.clientX, y: event.clientY };
    if (pointerFrame.current) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      const el = island.current;
      if (!el) return;
      const { x, y } = pointerPosition.current;
      const bounds = el.getBoundingClientRect();
      const wrap = ctaWrap.current;
      const rect = wrap && !reducedMotion() ? wrap.getBoundingClientRect() : null;
      const transform = rect && wrap ? getComputedStyle(wrap).transform : "none";
      const offset = transform === "none" ? null : new DOMMatrixReadOnly(transform);
      // Measure from the resting CTA position, so its previous translation cannot feed back into the next one.
      const dx = rect ? x - (rect.left + rect.width / 2 - (offset?.m41 ?? 0)) : 0;
      const dy = rect ? y - (rect.top + rect.height / 2 - (offset?.m42 ?? 0)) : 0;
      const pull = rect ? Math.max(0, 1 - Math.hypot(dx, dy) / 130) : 0;
      // Pointer events can arrive faster than display frames; batch the writes after all geometry reads.
      el.style.setProperty("--mx", `${x - bounds.left}px`);
      el.style.setProperty("--my", `${y - bounds.top}px`);
      wrap?.style.setProperty("--tx", `${(dx * 0.2 * pull).toFixed(1)}px`);
      wrap?.style.setProperty("--ty", `${(dy * 0.3 * pull).toFixed(1)}px`);
    });
  }
  function onIslandLeave() {
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    ctaWrap.current?.style.setProperty("--tx", "0px");
    ctaWrap.current?.style.setProperty("--ty", "0px");
    setHovered(null);
  }

  const closeSheet = () => sheet.current?.close();
  const hoverProps = (key: string) => ({
    "data-key": key,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== "touch") setHovered(key); },
    onFocus: (event: { currentTarget: HTMLElement }) => { if (event.currentTarget.matches(":focus-visible")) setHovered(key); },
    onBlur: () => setHovered(null)
  });

  return <>
    <header className="lp-island-wrap">
      <div className="lp-island" ref={island} data-scrolled="false" onPointerMove={onIslandMove} onPointerLeave={onIslandLeave}>
        <span className="lp-island-sheen" aria-hidden="true" />
        <Link href="/" className="brand lp-brand" aria-label="CareerForge home"><BrandMark /><span>CareerForge<i>.</i></span></Link>
        <span className="lp-sep" aria-hidden="true" />
        <nav className="lp-links" aria-label="Public navigation" ref={links}>
          <span className="lp-lens" aria-hidden="true" />
          {sections.map(section => <Link key={section.id} href={`#${section.id}`} className="lp-nl" aria-current={active === section.id ? "location" : undefined} {...hoverProps(section.id)}>{section.label}</Link>)}
          <Link href="/dashboard" className="lp-nl" {...hoverProps("login")}>Sign in</Link>
        </nav>
        <span className="lp-cta-wrap" ref={ctaWrap}><Link href="/register" className="button primary lp-island-cta">Create account <span aria-hidden="true">&#8599;</span></Link></span>
        <button type="button" ref={menuButton} className="lp-menu-btn" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => { sheet.current?.showModal(); closeButton.current?.focus(); setMenuOpen(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 8h16 M4 16h10" /></svg>
        </button>
      </div>
    </header>

    <dialog className="lp-sheet" ref={sheet} aria-label="Menu" onClose={() => { setMenuOpen(false); menuButton.current?.focus(); }}>
      <div className="lp-sheet-top">
        <Link href="/" className="brand lp-brand" aria-label="CareerForge home" onClick={closeSheet}><BrandMark /><span>CareerForge<i>.</i></span></Link>
        <button type="button" ref={closeButton} className="lp-menu-btn lp-sheet-close" aria-label="Close menu" onClick={closeSheet}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12 M18 6L6 18" /></svg>
        </button>
      </div>
      <nav className="lp-sheet-links" aria-label="Menu">
        {sections.map((section, index) => <Link key={section.id} href={`#${section.id}`} onClick={closeSheet} style={{ "--i": index } as unknown as CSSProperties}><small>0{index + 1}</small>{section.label}</Link>)}
        <Link href="/dashboard" onClick={closeSheet} style={{ "--i": sections.length } as unknown as CSSProperties}><small>04</small>Sign in</Link>
      </nav>
      <div className="lp-sheet-foot">
        <Link href="/register" className="button primary" onClick={closeSheet}>Create your account <span aria-hidden="true">&#8599;</span></Link>
        <p>Private by default. Demo roles, clearly labelled.</p>
      </div>
    </dialog>
  </>;
}
