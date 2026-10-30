"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AppIcon, type IconName } from "./app-icons";

/**
 * Quick-jump palette. Opens with Ctrl/Cmd+K (or "/"), filters as you type, and is fully keyboard driven:
 * arrows to move, Enter to open, Esc to close. It is a native <dialog>, so focus is trapped and restored for free,
 * and the input/list follow the ARIA combobox + listbox pattern for screen readers.
 */

export type PaletteItem = {
  id: string;
  label: string;
  group: string;
  icon: IconName;
  /** Extra words that should find this item, e.g. "jobs" for "Role explorer". */
  keywords?: string;
  /** Where choosing this item goes. Items without one are handled by the caller (actions). */
  href?: string;
  /** Small status tag such as "Planned". */
  badge?: string;
  /** Keyboard shortcut shown on the right, e.g. "[". */
  shortcut?: string;
  current?: boolean;
};

type Hit = { item: PaletteItem; marks: Set<number>; score: number };

function match(item: PaletteItem, q: string): Hit | null {
  const label = item.label.toLowerCase();
  const at = label.indexOf(q);
  if (at >= 0) {
    const marks = new Set<number>();
    for (let i = 0; i < q.length; i++) marks.add(at + i);
    return { item, marks, score: 100 - at - (label.length - q.length) * 0.1 };
  }
  let qi = 0, gaps = 0, last = -1;
  const marks = new Set<number>();
  for (let i = 0; i < label.length && qi < q.length; i++) {
    if (label[i] === q[qi]) { marks.add(i); if (last >= 0 && i - last > 1) gaps++; last = i; qi++; }
  }
  if (qi === q.length) return { item, marks, score: 60 - gaps * 4 };
  if (`${item.keywords ?? ""} ${item.group}`.toLowerCase().includes(q)) return { item, marks: new Set<number>(), score: 30 };
  return null;
}

function rank(items: readonly PaletteItem[], query: string): Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.map(item => ({ item, marks: new Set<number>(), score: 0 }));
  return items.map(item => match(item, q)).filter((hit): hit is Hit => hit !== null).sort((a, b) => b.score - a.score);
}

function Highlight({ text, marks }: { text: string; marks: ReadonlySet<number> }) {
  if (marks.size === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const on = marks.has(i);
    let j = i + 1;
    while (j < text.length && marks.has(j) === on) j++;
    parts.push(on ? <mark key={i}>{text.slice(i, j)}</mark> : <span key={i}>{text.slice(i, j)}</span>);
    i = j;
  }
  return <>{parts}</>;
}

function PaletteBody({ items, onPick }: { items: readonly PaletteItem[]; onPick: (item: PaletteItem) => void }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const hits = rank(items, query);
  const active = Math.min(cursor, hits.length - 1);
  const activeId = hits[active] ? `cmdk-option-${hits[active].item.id}` : undefined;

  useEffect(() => { if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" }); }, [activeId]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (hits.length === 0) return;
      setCursor((active + (event.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length);
    } else if (event.key === "Home" && hits.length) { event.preventDefault(); setCursor(0); }
    else if (event.key === "End" && hits.length) { event.preventDefault(); setCursor(hits.length - 1); }
    else if (event.key === "Enter" && activeId && !event.nativeEvent.isComposing) {
      event.preventDefault();
      // Activate the real link so the existing unsaved-profile guard can cancel navigation.
      document.getElementById(activeId)?.click();
    }
  }

  return <>
    <div className="cmdk-search">
      <AppIcon name="search" />
      <input
        type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={activeId} aria-autocomplete="list"
        aria-label="Search pages and actions" placeholder="Search pages and actions…" autoComplete="off" autoCorrect="off" spellCheck={false}
        value={query} onChange={event => { setQuery(event.target.value); setCursor(0); }} onKeyDown={onKeyDown}
      />
      <kbd>esc</kbd>
    </div>
    <ul className="cmdk-list" id="cmdk-list" role="listbox" aria-label="Results">
      {hits.map((hit, index) => {
        const { item } = hit;
        const heading = index === 0 || hits[index - 1].item.group !== item.group;
        const Option = item.href ? "a" : "div";
        return <li key={item.id} role="presentation" className="cmdk-row">
          {heading && <p className="cmdk-heading" role="presentation">{item.group}</p>}
          <Option
            href={item.href} tabIndex={-1}
            id={`cmdk-option-${item.id}`} role="option" aria-selected={index === active} data-active={index === active ? "true" : undefined}
            className="cmdk-option" onPointerMove={() => { if (index !== active) setCursor(index); }} onClick={event => {
              if (item.href && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
              event.preventDefault();
              onPick(item);
            }}
          >
            <span className="cmdk-icon" aria-hidden="true"><AppIcon name={item.icon} /></span>
            <span className="cmdk-label"><Highlight text={item.label} marks={hit.marks} /></span>
            {item.current && <span className="cmdk-tag cmdk-tag-current">Here</span>}
            {item.badge && <span className="cmdk-tag">{item.badge}</span>}
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
            <span className="cmdk-enter" aria-hidden="true"><AppIcon name="return" /></span>
          </Option>
        </li>;
      })}
      {hits.length === 0 && <li className="cmdk-empty" role="presentation">Nothing matches “{query.trim()}”. Try a feature name such as “checks” or “CV”.</li>}
    </ul>
    <p className="cmdk-sr" role="status" aria-live="polite">{hits.length === 0 ? "No results" : `${hits.length} result${hits.length === 1 ? "" : "s"}`}</p>
    <div className="cmdk-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
  </>;
}

export function CommandPalette({ open, items, onClose, onPick }: {
  open: boolean; items: readonly PaletteItem[]; onClose: () => void; onPick: (item: PaletteItem) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return <dialog
    className="cmdk" ref={dialog} aria-label="Command palette" onClose={onClose}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}
  >
    {open && <PaletteBody items={items} onPick={onPick} />}
  </dialog>;
}
