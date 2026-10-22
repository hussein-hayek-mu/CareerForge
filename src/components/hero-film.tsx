"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type NetworkNavigator = Navigator & { connection?: EventTarget & { saveData?: boolean } };
function restrictedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches || !!(navigator as NetworkNavigator).connection?.saveData;
}
function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as NetworkNavigator).connection;
  media.addEventListener("change", callback);
  connection?.addEventListener("change", callback);
  return () => { media.removeEventListener("change", callback); connection?.removeEventListener("change", callback); };
}
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function HeroFilm() {
  const restricted = useSyncExternalStore(subscribe, restrictedMotion, () => true);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const tabVisible = useSyncExternalStore(subscribeVisibility, () => !document.hidden, () => true);
  const video = useRef<HTMLVideoElement>(null);
  const wantsPlayback = !failed && tabVisible && (choice ?? !restricted);
  const shouldLoad = !failed && (!restricted || choice === true);
  useEffect(() => {
    if (wantsPlayback) void video.current?.play().catch(() => setPlaying(false));
    else video.current?.pause();
  }, [wantsPlayback]);

  return <>
    <div className="hero-film" aria-hidden="true">
      <div className="hero-film-poster" />
      <video ref={video} src={shouldLoad ? "/media/careerforge-neural-forge.webm" : undefined} poster="/media/careerforge-neural-forge.webp" muted playsInline loop autoPlay={wantsPlayback} preload="none" tabIndex={-1} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }} />
      <div className="hero-film-scrim" />
    </div>
    {!failed && <button type="button" className="film-control" aria-label={playing ? "Pause background video" : "Play background video"} aria-pressed={playing} onClick={() => { setChoice(!playing); if (!playing) void video.current?.play().catch(() => setPlaying(false)); }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{playing ? <path d="M3 2h3v12H3zM10 2h3v12h-3z" /> : <path d="m4 2 10 6-10 6z" />}</svg>
      <span>{playing ? "Pause film" : "Play film"}</span>
    </button>}
  </>;
}
