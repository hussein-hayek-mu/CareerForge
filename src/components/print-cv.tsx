"use client";

import { useSyncExternalStore } from "react";
const subscribe = () => () => {};

export function PrintCV() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return <button className="button primary" disabled={!ready} onClick={() => window.print()}>Print / save as PDF</button>;
}
