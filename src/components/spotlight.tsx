"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

type PointerPosition = { card: HTMLElement; x: number; y: number };

/** Shares pointer coordinates with the supplied cards without rerendering their content. */
export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const enabled = useRef(false);
  const frame = useRef(0);
  const pending = useRef<PointerPosition | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const sync = () => {
      enabled.current = query.matches;
      if (!query.matches) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
        pending.current = null;
      }
    };
    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      cancelAnimationFrame(frame.current);
      pending.current = null;
    };
  }, []);

  function cancelPending() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = null;
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!enabled.current || event.pointerType !== "mouse") return;
    const card = event.target instanceof Element ? event.target.closest<HTMLElement>(".spot-card") : null;
    if (!card || !event.currentTarget.contains(card)) { cancelPending(); return; }
    pending.current = { card, x: event.clientX, y: event.clientY };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const position = pending.current;
      pending.current = null;
      if (!enabled.current || !position?.card.isConnected) return;
      // Only the hovered card displays the effect. Read its bounds before writing styles.
      const bounds = position.card.getBoundingClientRect();
      const x = position.x - bounds.left, y = position.y - bounds.top;
      position.card.style.setProperty("--mx", `${x}px`);
      position.card.style.setProperty("--my", `${y}px`);
    });
  }

  return <div className={className} onPointerMove={move} onPointerLeave={cancelPending} onPointerCancel={cancelPending}>{children}</div>;
}
