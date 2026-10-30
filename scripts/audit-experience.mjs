import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Compare local builds under identical browser conditions; this is not field INP/FPS evidence.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const outputPath = process.argv[2] ?? "test-results/experience-performance.json";
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chromium", headless: true });
const results = [];
try {
  for (const scenario of [
    { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, cpu: 1 },
    { name: "desktop-throttled", width: 1440, height: 900, deviceScaleFactor: 2, cpu: 4 },
    { name: "mobile-throttled", width: 390, height: 844, deviceScaleFactor: 3, cpu: 4 }
  ]) {
    const context = await browser.newContext({
      baseURL, viewport: { width: scenario.width, height: scenario.height },
      deviceScaleFactor: scenario.deviceScaleFactor, reducedMotion: "no-preference",
      isMobile: scenario.width < 700, hasTouch: scenario.width < 700
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.addInitScript(() => {
        window.__ambientFrames = 0;
        const clear = CanvasRenderingContext2D.prototype.clearRect;
        CanvasRenderingContext2D.prototype.clearRect = function (...args) {
          if (this.canvas.classList.contains("ambient-canvas")) window.__ambientFrames++;
          return clear.apply(this, args);
        };
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Performance.enable");
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: scenario.cpu });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.getByRole("heading", { level: 1 }).waitFor();
      const before = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(m => [m.name, m.value]));
      const sample = await page.evaluate(async () => {
        const intervals = [], longTasks = [];
        const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
        observer.observe({ type: "longtask" });
        const frameStart = window.__ambientFrames;
        const started = performance.now();
        let previous = started;
        await new Promise(resolve => {
          const tick = now => {
            intervals.push(now - previous); previous = now;
            const elapsed = now - started;
            window.scrollTo(0, Math.max(0, Math.sin(elapsed / 1100) * 1900));
            window.dispatchEvent(new PointerEvent("pointermove", {
              clientX: innerWidth * (.5 + Math.sin(elapsed / 600) * .35),
              clientY: innerHeight * .35, pointerType: "mouse"
            }));
            if (elapsed < 5000) requestAnimationFrame(tick); else resolve();
          };
          requestAnimationFrame(tick);
        });
        observer.disconnect();
        const elapsed = performance.now() - started;
        intervals.sort((a, b) => a - b);
        return {
          durationMs: Math.round(elapsed), ambientFps: Math.round((window.__ambientFrames - frameStart) * 1000 / elapsed),
          rafP95Ms: Math.round(intervals[Math.floor(intervals.length * .95)]),
          longTasks: longTasks.length, blockingMs: Math.round(longTasks.reduce((n, d) => n + Math.max(0, d - 50), 0)),
          canvas: [document.querySelector(".ambient-canvas").width, document.querySelector(".ambient-canvas").height]
        };
      });
      const after = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map(m => [m.name, m.value]));
      const result = { ...scenario, ...sample, errors };
      for (const metric of ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"]) {
        result[`${metric}Ms`] = Math.round((after[metric] - before[metric]) * 1000);
      }
      results.push(result);
      console.log(JSON.stringify(result));
    } finally { await context.close(); }
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify({ browser: browser.version(), baseURL, results }, null, 2));
  if (results.some(result => result.errors.length)) process.exitCode = 1;
} finally { await browser.close(); }
