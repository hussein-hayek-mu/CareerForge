"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * CareerForge ambient background.
 *
 * Everything is drawn on one fixed canvas behind the whole app, in layers from far to near:
 *  1. Bokeh orbs     – big soft lights that drift at different depths (parallax on pointer and scroll).
 *  2. Career ribbons – slow sine waves with a marker riding each one; they ripple as you scroll.
 *  3. Flow streams   – ~150 glowing comet-tails that follow a shifting flow field. The cursor stirs them
 *                      into a vortex, scrolling pushes them at different speeds, clicks send a shockwave.
 *  4. Constellation  – drifting nodes that link up, with pulses travelling along the links and a ring
 *                      that blooms where each pulse lands.
 *  5. Events         – click ripples, an occasional shooting comet, and a short light trail behind the cursor.
 *
 * The accent colour slowly travels green → mint → lilac as you scroll down the page.
 *
 * Behaviour that matters for real use:
 *  - Calmer on in-app pages, fuller on the landing and sign-in pages (density and brightness ease between them).
 *  - Pauses when the tab is hidden, honours prefers-reduced-motion (renders one still frame),
 *    and offers a visible pause/resume control that is remembered.
 *  - Uses a bounded canvas at 30fps, leaving time for the interface, and lowers quality when frames get expensive.
 */

type RGB = readonly [number, number, number];
type Dot = { x: number; y: number; bx: number; by: number; vx: number; vy: number; r: number; css: string; glow: string; phase: number };
type Pulse = { a: number; b: number; t: number; speed: number };
type Ribbon = {
  base: number; a1: number; a2: number; f1: number; f2: number; s1: number; s2: number; p1: number; p2: number;
  alpha: number; width: number; rider: number; riderSpeed: number; depth: number;
};
/** A flow-stream particle. Positions are stored in "world" space; screen y = world y - parallax offset. */
type Streamer = {
  wx: number; wy: number; vx: number; vy: number; z: number; bucket: 0 | 1 | 2; life: number;
  hx: Float32Array; hy: Float32Array; head: number; n: number;
};
type Orb = { x: number; y: number; r: number; vx: number; vy: number; depth: number; sprite: number; alpha: number; phase: number };
type Ripple = { x: number; y: number; t: number; max: number };
type Ping = { x: number; y: number; t: number };
type Comet = { x: number; y: number; ux: number; uy: number; speed: number; len: number };
type TrailPoint = { x: number; y: number; at: number };

const STORAGE_KEY = "careerforge-motion";
const MOTION_EVENT = "careerforge-motion";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

const GREEN: RGB = [197, 237, 133];
const MINT: RGB = [155, 227, 192];
const LILAC: RGB = [199, 176, 237];
const SPARK: RGB = [236, 252, 214];
const TINT_STOPS: readonly RGB[] = [GREEN, MINT, LILAC, MINT, GREEN];
const PALETTE: ReadonlyArray<readonly [RGB, number]> = [[GREEN, 0.7], [MINT, 0.22], [LILAC, 0.08]];

const TAIL = 34;          // points kept per stream tail
const TAIL_STEP2 = 25;    // a new tail point is stored every ~5px of travel (squared)
const TIER_ALPHA = [1, 0.66, 0.38, 0.16] as const;
const TIER_WIDTH = [1, 0.88, 0.76, 0.62] as const;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function pickColor(): RGB {
  let roll = Math.random();
  for (const [color, weight] of PALETTE) { roll -= weight; if (roll <= 0) return color; }
  return GREEN;
}
function tintAt(position: number): RGB {
  const scaled = clamp(position, 0, 1) * (TINT_STOPS.length - 1);
  const i = Math.min(TINT_STOPS.length - 2, Math.floor(scaled)), u = scaled - i;
  const a = TINT_STOPS[i], b = TINT_STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}
function makeSprite(color: RGB) {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 128;
  const s = sprite.getContext("2d");
  if (s) {
    const gradient = s.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, rgba(color, 1)); gradient.addColorStop(0.45, rgba(color, 0.32)); gradient.addColorStop(1, rgba(color, 0));
    s.fillStyle = gradient; s.fillRect(0, 0, 128, 128);
  }
  return sprite;
}

type Engine = { setMotion: (paused: boolean, reduced: boolean) => void; setLevel: (level: number) => void };

function subscribePreference(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(MOTION_EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(MOTION_EVENT, callback); };
}
function readPaused() { try { return localStorage.getItem(STORAGE_KEY) === "off"; } catch { return false; } }

function subscribeReduced(callback: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function readReduced() { return window.matchMedia(REDUCED_QUERY).matches; }

function levelFor(pathname: string) {
  return pathname === "/" || /^\/(login|register|forgot|reset)/.test(pathname) ? 1 : 0.55;
}

export function AmbientBackground() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const storedPaused = useSyncExternalStore(subscribePreference, readPaused, () => false);
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, () => false);
  const [temporaryPaused, setTemporaryPaused] = useState<boolean | null>(null);
  const paused = temporaryPaused ?? storedPaused;

  useEffect(() => {
    const hostElement = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!hostElement || !canvas || !ctx) return;
    const host: HTMLDivElement = hostElement;
    const surface: HTMLCanvasElement = canvas;
    const g: CanvasRenderingContext2D = ctx;

    let w = 0, h = 0, dpr = 1, scale = 1;
    let raf = 0, lastFrame = 0, clock = 0;
    let level = 0.55, target = 0.55;
    let compact = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
    let quality = compact ? 0.7 : 1, workAverage = 0, frameCount = 0, pulseTimer = 0.6, cometTimer = 3.2, maxScroll = 1;
    let isPaused = readPaused(), isReduced = readReduced(), modalOpen = false;
    let tint: RGB = GREEN, tint2: RGB = MINT;
    let sentPx = 9, sentPy = 9, sentSp = -1;
    let ribbons: Ribbon[] = [];
    const dots: Dot[] = [];
    const pulses: Pulse[] = [];
    const links: number[] = [];
    const streamers: Streamer[] = [];
    const orbs: Orb[] = [];
    const ripples: Ripple[] = [];
    const pings: Ping[] = [];
    const comets: Comet[] = [];
    const trailPoints: TrailPoint[] = [];
    const sprites = [makeSprite(GREEN), makeSprite(MINT), makeSprite(LILAC)];
    const pointer = { x: -1000, y: -1000, tx: 0.5, ty: 0.5, sx: 0.5, sy: 0.5, fade: 0, active: false, speed: 0, impulse: 0 };
    const scroll = { y: 0, s: 0, prevS: 0 };

    const running = () => !isPaused && !isReduced && !document.hidden && !modalOpen;
    const dotTarget = () => Math.round(clamp((w * h) / 17000, 24, 92) * quality);
    const streamTarget = () => Math.round(clamp((w * h) / 8800, 70, 240) * quality * (0.55 + 0.45 * Math.min(level, 1)));

    /* ---------- construction ---------- */

    function makeDot(): Dot {
      const color = pickColor();
      const heading = rand(0, Math.PI * 2);
      const speed = rand(5, 15);
      const bx = Math.cos(heading) * speed, by = Math.sin(heading) * speed;
      return { x: rand(0, w), y: rand(0, h), bx, by, vx: bx, vy: by, r: rand(0.9, 2.2), css: rgba(color, 1), glow: rgba(color, 0.16), phase: rand(0, Math.PI * 2) };
    }
    function syncDots() {
      const wanted = dotTarget();
      while (dots.length < wanted) dots.push(makeDot());
      while (dots.length > wanted) dots.pop();
      for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i].a >= dots.length || pulses[i].b >= dots.length) pulses.splice(i, 1);
    }

    function makeStreamer(): Streamer {
      const z = rand(0.4, 1.2);
      const roll = Math.random();
      return {
        wx: rand(0, w), wy: rand(0, h) + scroll.s * 0.42 * z, vx: 0, vy: 0, z, bucket: roll < 0.58 ? 0 : roll < 0.92 ? 1 : 2,
        life: rand(5, 12), hx: new Float32Array(TAIL), hy: new Float32Array(TAIL), head: 0, n: 0
      };
    }
    function respawn(p: Streamer) {
      p.wx = rand(0, w); p.wy = rand(0, h) + scroll.s * 0.42 * p.z; p.vx = 0; p.vy = 0;
      p.life = rand(5, 12); p.n = 0; p.head = 0;
    }
    function syncStreamers(fast: boolean) {
      const wanted = streamTarget();
      if (fast) {
        while (streamers.length < wanted) streamers.push(makeStreamer());
        if (streamers.length > wanted) streamers.length = wanted;
      } else if (streamers.length < wanted) streamers.push(makeStreamer());
      else if (streamers.length > wanted) streamers.pop();
    }

    function buildRibbons() {
      const count = w < 700 ? 4 : w < 1200 ? 6 : 8;
      if (ribbons.length === count) return;
      ribbons = Array.from({ length: count }, (_, i) => ({
        base: 0.1 + (0.8 * i) / (count - 1) + rand(-0.03, 0.03),
        a1: rand(18, 48), a2: rand(5, 16),
        f1: rand(0.0035, 0.0075), f2: rand(0.009, 0.015),
        s1: rand(0.18, 0.42) * (i % 2 ? 1 : -1), s2: rand(0.25, 0.6),
        p1: rand(0, Math.PI * 2), p2: rand(0, Math.PI * 2),
        alpha: rand(0.08, 0.2), width: i % 3 === 0 ? 1.4 : 1,
        rider: Math.random(), riderSpeed: rand(0.018, 0.04),
        depth: (i - (count - 1) / 2) / count
      }));
    }
    function buildOrbs() {
      const count = w < 700 ? 4 : 6;
      if (orbs.length === count) return;
      const sequence = [0, 0, 1, 2, 0, 1];
      orbs.length = 0;
      for (let i = 0; i < count; i++) {
        orbs.push({ x: rand(0, w), y: rand(0, h), r: rand(90, 210), vx: rand(-7, 7), vy: rand(-5, 5), depth: rand(0.25, 1), sprite: sequence[i % sequence.length], alpha: rand(0.05, 0.1), phase: rand(0, Math.PI * 2) });
      }
    }

    /* ---------- fields and helpers ---------- */

    function flowAngle(x: number, y: number) {
      return Math.sin(x * 0.0062 + clock * 0.12 + Math.sin(y * 0.0048 - clock * 0.09) * 1.9) * 1.35
        + Math.cos(y * 0.0071 - clock * 0.08 + Math.sin(x * 0.0039 + clock * 0.05) * 1.6) * 1.1 + 0.1;
    }
    function ribbonY(r: Ribbon, x: number) {
      const phase = clock * r.s1 + scroll.s * 0.0034 * Math.sign(r.s1);
      const wave = Math.sin(x * r.f1 + phase + r.p1) * r.a1 + Math.sin(x * r.f2 - clock * r.s2 + r.p2) * r.a2;
      const lift = Math.sin(scroll.s * 0.0016 + r.p2) * 42 * r.depth;
      return r.base * h + (pointer.sy - 0.5) * r.depth * -60 + (wave + lift) * scale;
    }
    function ribbonGradient() {
      const stroke = g.createLinearGradient(0, 0, w, 0);
      stroke.addColorStop(0, rgba(tint, 0)); stroke.addColorStop(0.18, rgba(tint, 0.7)); stroke.addColorStop(0.5, rgba(tint, 1));
      stroke.addColorStop(0.82, rgba(tint2, 0.7)); stroke.addColorStop(1, rgba(tint2, 0));
      return stroke;
    }
    function disc(x: number, y: number, radius: number) { g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2); g.fill(); }

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      maxScroll = Math.max(1, document.documentElement.scrollHeight - h);
      compact = window.matchMedia("(pointer: coarse)").matches || w < 700;
      // The artwork is decorative; avoid multiplying full-screen paint cost on high-DPI screens.
      const pixelBudget = (compact ? 650_000 : 1_300_000) * quality;
      dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5, Math.sqrt(pixelBudget / Math.max(1, w * h)));
      scale = clamp(h / 900, 0.6, 1.25);
      surface.width = Math.round(w * dpr); surface.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      syncDots(); syncStreamers(true); buildRibbons(); buildOrbs();
      if (!running()) { warmup(); render(); }
    }

    /* ---------- simulation ---------- */

    function readScroll(dt: number) {
      scroll.prevS = scroll.s;
      scroll.s += (scroll.y - scroll.s) * Math.min(1, dt * 7);
      if (Math.abs(scroll.y - scroll.s) < 0.05) scroll.s = scroll.y;
    }

    function stepStreamers(dt: number) {
      const reach = 230, reach2 = reach * reach;
      const swirl = 70 + clamp(pointer.speed * 0.12, 0, 200);
      for (const p of streamers) {
        const off = scroll.s * 0.42 * p.z;
        let sx = p.wx, sy = p.wy - off;
        if (p.life > 0) {
          const a = flowAngle(sx, sy), sp = (42 + 34 * p.z) * (0.8 + 0.2 * Math.min(level, 1));
          let tx = Math.cos(a) * sp, ty = Math.sin(a) * sp;
          if (pointer.fade > 0.02) {
            const dx = sx - pointer.x, dy = sy - pointer.y, d2 = dx * dx + dy * dy;
            if (d2 < reach2 && d2 > 1) {
              const d = Math.sqrt(d2), k = (1 - d / reach) * (1 - d / reach) * pointer.fade;
              tx += (-dy / d) * swirl * k - (dx / d) * 26 * k; ty += (dx / d) * swirl * k - (dy / d) * 26 * k;
            }
          }
          for (const r of ripples) {
            const dx = sx - r.x, dy = sy - r.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
            const band = Math.abs(d - r.max * (1 - Math.pow(1 - r.t, 3)));
            if (band < 70) { const k = (1 - band / 70) * (1 - r.t) * 340; p.vx += (dx / d) * k * dt * 6; p.vy += (dy / d) * k * dt * 6; }
          }
          const follow = Math.min(1, dt * 2.2);
          p.vx += (tx - p.vx) * follow; p.vy += (ty - p.vy) * follow;
          p.wx += p.vx * dt; p.wy += p.vy * dt;
          sx = p.wx; sy = p.wy - off;
          p.life -= dt;
          if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) p.life = Math.min(p.life, 0);
          const newest = p.n > 0 ? p.head : -1;
          const ddx = newest < 0 ? 99 : p.wx - p.hx[newest], ddy = newest < 0 ? 99 : p.wy - p.hy[newest];
          if (newest < 0 || ddx * ddx + ddy * ddy >= TAIL_STEP2) {
            p.head = (p.head + 1) % TAIL; p.hx[p.head] = p.wx; p.hy[p.head] = p.wy; if (p.n < TAIL) p.n++;
          }
        } else if (p.n > 0) {
          p.n--; // the tail retracts, then the stream is reborn somewhere else
        } else respawn(p);
      }
    }

    function update(dt: number) {
      level += (target - level) * Math.min(1, dt * 2.5);
      readScroll(dt);
      const progress = clamp(scroll.s / maxScroll, 0, 1);
      const hue = progress * 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(clock * 0.07));
      tint = tintAt(hue); tint2 = tintAt((hue + 0.3) % 1);

      pointer.sx += (pointer.tx - pointer.sx) * Math.min(1, dt * 3);
      pointer.sy += (pointer.ty - pointer.sy) * Math.min(1, dt * 3);
      pointer.fade += ((pointer.active ? 1 : 0) - pointer.fade) * Math.min(1, dt * 5);
      pointer.speed += (pointer.impulse / Math.max(dt, 0.001) - pointer.speed) * Math.min(1, dt * 8);
      pointer.impulse = 0;

      const ds = clamp(scroll.s - scroll.prevS, -90, 90);
      const reach = 170;
      for (const d of dots) {
        if (pointer.active) {
          const dx = pointer.x - d.x, dy = pointer.y - d.y, d2 = dx * dx + dy * dy;
          if (d2 < reach * reach && d2 > 1) {
            const dist = Math.sqrt(d2), pull = (1 - dist / reach) * 26;
            d.vx += (dx / dist) * pull * dt; d.vy += (dy / dist) * pull * dt;
          }
        }
        for (const r of ripples) {
          const dx = d.x - r.x, dy = d.y - r.y, dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const band = Math.abs(dist - r.max * (1 - Math.pow(1 - r.t, 3)));
          if (band < 60) { const k = (1 - band / 60) * (1 - r.t) * 260; d.vx += (dx / dist) * k * dt * 5; d.vy += (dy / dist) * k * dt * 5; }
        }
        d.vx += (d.bx - d.vx) * Math.min(1, dt * 0.8);
        d.vy += (d.by - d.vy) * Math.min(1, dt * 0.8);
        d.x += d.vx * dt; d.y += d.vy * dt - ds * (0.08 + d.r * 0.07);
        if (d.x < -30) d.x = w + 30; else if (d.x > w + 30) d.x = -30;
        if (d.y < -30) d.y = h + 30; else if (d.y > h + 30) d.y = -30;
      }

      for (const o of orbs) {
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < -o.r) o.x = w + o.r; else if (o.x > w + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = h + o.r; else if (o.y > h + o.r) o.y = -o.r;
      }

      syncStreamers(false);
      stepStreamers(dt);

      pulseTimer -= dt;
      if (pulseTimer <= 0 && links.length > 1 && pulses.length < 7) {
        const pair = Math.floor(Math.random() * (links.length / 2)) * 2;
        pulses.push({ a: links[pair], b: links[pair + 1], t: 0, speed: rand(0.5, 0.9) });
        pulseTimer = rand(0.35, 0.9);
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed * dt;
        if (p.t >= 1) {
          const landed = dots[p.b];
          if (landed && pings.length < 14) pings.push({ x: landed.x, y: landed.y, t: 0 });
          pulses.splice(i, 1);
        }
      }
      for (let i = pings.length - 1; i >= 0; i--) { pings[i].t += dt / 0.9; if (pings[i].t >= 1) pings.splice(i, 1); }
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t += dt / 1.5; if (ripples[i].t >= 1) ripples.splice(i, 1); }

      cometTimer -= dt;
      if (cometTimer <= 0) {
        if (comets.length < 2) spawnComet();
        cometTimer = rand(5, 10) / Math.max(0.5, Math.min(level, 1));
      }
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.ux * c.speed * dt; c.y += c.uy * c.speed * dt;
        if (c.x < -400 || c.x > w + 400 || c.y > h + 400 || c.y < -400) comets.splice(i, 1);
      }

      const px = pointer.sx - 0.5, py = pointer.sy - 0.5;
      if (Math.abs(px - sentPx) > 0.004 || Math.abs(py - sentPy) > 0.004 || Math.abs(scroll.s - sentSp) > 0.5) {
        sentPx = px; sentPy = py; sentSp = scroll.s;
        host.style.setProperty("--px", px.toFixed(3)); host.style.setProperty("--py", py.toFixed(3)); host.style.setProperty("--sp", scroll.s.toFixed(1));
      }
    }

    function spawnComet() {
      const heading = Math.PI / 2 + rand(-0.85, 0.85), speed = rand(520, 820);
      comets.push({ x: rand(0.05, 0.95) * w, y: -40, ux: Math.cos(heading), uy: Math.sin(heading), speed, len: rand(150, 240) });
    }

    /** Seed full trails directly instead of blocking hydration with 240 simulation steps. */
    function warmup() {
      readScroll(1);
      scroll.s = scroll.y; scroll.prevS = scroll.y;
      for (const p of streamers) {
        if (p.n > 0) continue;
        const off = scroll.s * 0.42 * p.z;
        let x = p.wx, y = p.wy;
        p.head = 0; p.n = TAIL;
        const angle = flowAngle(x, y - off), speed = 42 + 34 * p.z;
        p.vx = Math.cos(angle) * speed; p.vy = Math.sin(angle) * speed;
        for (let i = 0; i < TAIL; i++) {
          const index = (TAIL - i) % TAIL;
          p.hx[index] = x; p.hy[index] = y;
          const direction = flowAngle(x, y - off);
          x -= Math.cos(direction) * 5; y -= Math.sin(direction) * 5;
        }
      }
      const progress = clamp(scroll.s / maxScroll, 0, 1);
      tint = tintAt(progress * 0.8 + 0.1); tint2 = tintAt((progress * 0.8 + 0.4) % 1);
    }

    /* ---------- drawing ---------- */

    function drawStreams() {
      const paths = Array.from({ length: 12 }, () => new Path2D());
      const heads = new Path2D(), sparks = new Path2D();
      for (const p of streamers) {
        const off = scroll.s * 0.42 * p.z;
        const cx = p.wx, cy = p.wy - off;
        if (p.life > 0 || p.n > 0) {
          let px = cx, py = cy, tier = -1;
          const base = p.bucket * 4;
          for (let i = 0; i < p.n; i++) {
            const idx = (p.head - i + TAIL) % TAIL;
            const qx = p.hx[idx], qy = p.hy[idx] - off;
            const t = Math.min(3, ((i * 4) / TAIL) | 0);
            if (t !== tier) { paths[base + t].moveTo(px, py); tier = t; }
            paths[base + t].lineTo(qx, qy);
            px = qx; py = qy;
          }
          if (p.life > 0) {
            const target = p.bucket === 2 ? sparks : heads, r = p.bucket === 2 ? 1.9 : 1.25;
            target.moveTo(cx + r, cy); target.arc(cx, cy, r, 0, Math.PI * 2);
          }
        }
      }
      const colors = [tint, tint2, SPARK], widths = [1.5, 1.25, 1.1], strength = [0.58, 0.48, 0.78], lv = Math.min(level, 1);
      g.lineCap = "round"; g.lineJoin = "round";
      for (let b = 0; b < 3; b++) {
        g.strokeStyle = rgba(colors[b], 1);
        for (let t = 0; t < 4; t++) {
          g.globalAlpha = strength[b] * TIER_ALPHA[t] * lv; g.lineWidth = widths[b] * TIER_WIDTH[t];
          g.stroke(paths[b * 4 + t]);
        }
      }
      g.fillStyle = rgba(tint, 1); g.globalAlpha = 0.85 * lv; g.fill(heads);
      g.fillStyle = rgba(SPARK, 1); g.globalAlpha = 0.95 * lv; g.fill(sparks);
      g.globalAlpha = 1;
    }

    function render() {
      g.clearRect(0, 0, w, h);
      g.lineCap = "round"; g.lineJoin = "round";
      const lv = Math.min(level, 1);

      // 1. Bokeh orbs.
      for (const o of orbs) {
        const span = h + o.r * 2;
        const ox = o.x + (pointer.sx - 0.5) * -70 * o.depth;
        const oy = ((((o.y - scroll.s * 0.18 * o.depth + o.r) % span) + span) % span) - o.r;
        g.globalAlpha = o.alpha * (0.8 + 0.2 * Math.sin(clock * 0.5 + o.phase)) * lv;
        g.drawImage(sprites[o.sprite], ox - o.r, oy - o.r, o.r * 2, o.r * 2);
      }

      // 2. Ribbons and the markers riding them.
      g.strokeStyle = ribbonGradient();
      for (const r of ribbons) {
        g.globalAlpha = r.alpha * level;
        g.lineWidth = r.width;
        g.beginPath();
        for (let x = -24; x <= w + 24; x += 20) { const y = ribbonY(r, x); if (x === -24) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
      }
      g.fillStyle = rgba(tint, 1);
      for (const r of ribbons) {
        const u = (clock * r.riderSpeed + r.rider) % 1;
        const x = -40 + u * (w + 80), y = ribbonY(r, x), fade = Math.sin(Math.PI * u);
        g.globalAlpha = 0.22 * level * fade; disc(x, y, 7);
        g.globalAlpha = 0.9 * level * fade; disc(x, y, 1.8);
      }

      // 3. Flow streams.
      drawStreams();

      // 4. Constellation links (also feeds the pulse spawner).
      const maxD = clamp(Math.min(w, h) * 0.2, 105, 175), max2 = maxD * maxD;
      links.length = 0;
      g.strokeStyle = rgba(tint, 1); g.lineWidth = 0.8;
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j], dx = a.x - b.x;
          if (dx > maxD || dx < -maxD) continue;
          const dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 >= max2) continue;
          const closeness = 1 - Math.sqrt(d2) / maxD;
          g.globalAlpha = closeness * closeness * 0.5 * level;
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
          if (links.length < 160) links.push(i, j);
        }
      }

      // Pointer halo and tethers.
      if (pointer.fade > 0.02) {
        const reach = 170;
        const halo = g.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 150);
        halo.addColorStop(0, rgba(tint, 0.12)); halo.addColorStop(1, rgba(tint, 0));
        g.globalAlpha = pointer.fade * level; g.fillStyle = halo;
        g.fillRect(pointer.x - 150, pointer.y - 150, 300, 300);
        g.strokeStyle = rgba(tint, 1); g.lineWidth = 0.8;
        for (const d of dots) {
          const dx = pointer.x - d.x, dy = pointer.y - d.y, d2 = dx * dx + dy * dy;
          if (d2 > reach * reach) continue;
          g.globalAlpha = (1 - Math.sqrt(d2) / reach) * 0.55 * pointer.fade * level;
          g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(pointer.x, pointer.y); g.stroke();
        }
      }

      // Nodes.
      for (const d of dots) {
        const twinkle = 0.55 + 0.35 * Math.sin(clock * 1.3 + d.phase);
        if (d.r > 1.6) { g.fillStyle = d.glow; g.globalAlpha = twinkle * level; disc(d.x, d.y, d.r * 3.2); }
        g.fillStyle = d.css; g.globalAlpha = twinkle * 0.9 * level; disc(d.x, d.y, d.r);
      }

      // Pulses travelling along links.
      g.fillStyle = rgba(tint, 1); g.strokeStyle = rgba(tint, 1);
      for (const p of pulses) {
        const a = dots[p.a], b = dots[p.b];
        if (!a || !b) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy > max2 * 1.3) continue;
        const ease = p.t * p.t * (3 - 2 * p.t), tail = Math.max(0, ease - 0.16), fade = Math.sin(Math.PI * p.t);
        const x = a.x + (b.x - a.x) * ease, y = a.y + (b.y - a.y) * ease;
        g.globalAlpha = 0.5 * fade * level; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(a.x + (b.x - a.x) * tail, a.y + (b.y - a.y) * tail); g.lineTo(x, y); g.stroke();
        g.globalAlpha = 0.22 * fade * level; disc(x, y, 7);
        g.globalAlpha = 0.95 * fade * level; disc(x, y, 2);
      }

      // 5. Events: rings where pulses land, click ripples, comets, and the cursor trail.
      g.strokeStyle = rgba(tint, 1);
      for (const ping of pings) {
        const e = 1 - Math.pow(1 - ping.t, 3);
        g.globalAlpha = (1 - ping.t) * 0.55 * level; g.lineWidth = 1.2;
        g.beginPath(); g.arc(ping.x, ping.y, 3 + 22 * e, 0, Math.PI * 2); g.stroke();
      }
      for (const r of ripples) {
        const e = 1 - Math.pow(1 - r.t, 3), fade = 1 - r.t;
        g.strokeStyle = rgba(tint, 1); g.lineWidth = 0.6 + 2 * fade; g.globalAlpha = 0.7 * fade * fade * lv;
        g.beginPath(); g.arc(r.x, r.y, r.max * e, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = rgba(tint2, 1); g.lineWidth = 0.5 + fade; g.globalAlpha = 0.45 * fade * fade * lv;
        g.beginPath(); g.arc(r.x, r.y, r.max * e * 0.62, 0, Math.PI * 2); g.stroke();
        g.fillStyle = rgba(tint, 1); g.globalAlpha = 0.07 * fade * lv;
        g.beginPath(); g.arc(r.x, r.y, r.max * e * 0.9, 0, Math.PI * 2); g.fill();
      }
      for (const c of comets) {
        const tx = c.x - c.ux * c.len, ty = c.y - c.uy * c.len;
        const streak = g.createLinearGradient(c.x, c.y, tx, ty);
        streak.addColorStop(0, rgba(SPARK, 0.95)); streak.addColorStop(0.2, rgba(tint, 0.45)); streak.addColorStop(1, rgba(tint, 0));
        g.globalAlpha = lv; g.strokeStyle = streak; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(tx, ty); g.stroke();
        g.fillStyle = rgba(tint, 1); g.globalAlpha = 0.25 * lv; disc(c.x, c.y, 9);
        g.fillStyle = rgba(SPARK, 1); g.globalAlpha = 0.95 * lv; disc(c.x, c.y, 2.2);
      }
      const now = performance.now();
      while (trailPoints.length && now - trailPoints[0].at > 480) trailPoints.shift();
      if (trailPoints.length > 1) {
        g.strokeStyle = rgba(tint, 1);
        for (let i = 1; i < trailPoints.length; i++) {
          const a = trailPoints[i - 1], b = trailPoints[i], age = 1 - (now - b.at) / 480;
          g.globalAlpha = age * age * 0.7 * Math.max(lv, 0.7); g.lineWidth = 0.6 + age * 3.2;
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
      }
      g.globalAlpha = 1;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const elapsed = now - lastFrame;
      const interval = 1000 / 30;
      if (elapsed < interval - 1) return;
      const dt = Math.min(0.05, elapsed / 1000);
      lastFrame = elapsed < interval ? now : now - (elapsed % interval); clock += dt;
      const started = performance.now();
      frameCount++;
      update(dt);
      render();
      workAverage = workAverage * 0.85 + (performance.now() - started) * 0.15;
      if (frameCount % 20 === 0 && (workAverage > 8 || elapsed > 65) && quality > 0.45) {
        quality = Math.max(0.45, quality - 0.15);
        resize();
      }
    }

    function sync() {
      modalOpen = document.querySelector("dialog[open]") !== null;
      host.toggleAttribute("data-suspended", document.hidden || modalOpen);
      if (running()) {
        if (!raf) { lastFrame = performance.now(); raf = requestAnimationFrame(frame); }
      } else {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (!document.hidden) { level = target; render(); }
      }
    }

    /* ---------- input ---------- */

    const onMove = (event: PointerEvent) => {
      pointer.impulse += Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) * (pointer.active ? 1 : 0);
      pointer.x = event.clientX; pointer.y = event.clientY;
      pointer.tx = event.clientX / Math.max(w, 1); pointer.ty = event.clientY / Math.max(h, 1);
      pointer.active = true;
      if (running()) { trailPoints.push({ x: event.clientX, y: event.clientY, at: performance.now() }); if (trailPoints.length > 28) trailPoints.shift(); }
    };
    const onRelease = (event: PointerEvent) => { if (event.pointerType !== "mouse") pointer.active = false; };
    const onLeave = () => { pointer.active = false; };
    // Read scrolling once in its passive event, never force layout from the canvas drawing loop.
    const onScroll = () => { scroll.y = window.scrollY || 0; };
    // "click" (not pointerdown) so scrolling by touch never fires a ripple; detail === 0 is a keyboard activation.
    const onClick = (event: MouseEvent) => {
      if (!running() || event.detail === 0) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (ripples.length >= 5) ripples.shift();
      ripples.push({ x: event.clientX, y: event.clientY, t: 0, max: rand(190, 260) * clamp(scale, 0.8, 1.15) });
    };
    let resizeFrame = 0;
    const onResize = () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(resize); };

    scroll.y = window.scrollY || 0; scroll.s = scroll.y; scroll.prevS = scroll.y;
    resize();
    warmup();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onRelease, { passive: true });
    window.addEventListener("pointercancel", onRelease, { passive: true });
    window.addEventListener("click", onClick, { passive: true, capture: true });
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", sync);
    const modalObserver = new MutationObserver(sync);
    modalObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    const sizeObserver = new ResizeObserver(() => { maxScroll = Math.max(1, document.documentElement.scrollHeight - h); });
    sizeObserver.observe(document.body);

    engineRef.current = {
      setMotion(nextPaused, nextReduced) { isPaused = nextPaused; isReduced = nextReduced; sync(); },
      setLevel(next) { target = next; if (!running()) { level = next; syncStreamers(true); if (!document.hidden) render(); } }
    };

    return () => {
      engineRef.current = null;
      cancelAnimationFrame(raf); cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
      window.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", sync);
      modalObserver.disconnect();
      sizeObserver.disconnect();
    };
  }, []);

  useEffect(() => { engineRef.current?.setMotion(paused, reduced); }, [paused, reduced]);
  useEffect(() => { engineRef.current?.setLevel(levelFor(pathname)); }, [pathname]);

  function toggle() {
    const next = !paused;
    try { localStorage.setItem(STORAGE_KEY, next ? "off" : "on"); setTemporaryPaused(null); window.dispatchEvent(new Event(MOTION_EVENT)); } catch { setTemporaryPaused(next); }
  }

  return <>
    <div className="ambient" aria-hidden="true" ref={rootRef} data-paused={paused ? "true" : undefined}>
      <div className="ambient-aurora ambient-aurora-a" />
      <div className="ambient-aurora ambient-aurora-b" />
      <div className="ambient-beam" />
      <div className="ambient-grid"><span /></div>
      <canvas ref={canvasRef} className="ambient-canvas" />
    </div>
    {!reduced && <button type="button" className="motion-toggle" onClick={toggle} aria-label={paused ? "Resume background animation" : "Pause background animation"} title={paused ? "Resume background animation" : "Pause background animation"}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{paused ? <path d="M7 4l13 8-13 8z" /> : <path d="M6 4h4v16H6z M14 4h4v16h-4z" />}</svg>
      <span>{paused ? "Motion off" : "Motion on"}</span>
    </button>}
  </>;
}
