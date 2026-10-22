import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Local production lab evidence, not Lighthouse scoring or field Core Web Vitals.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chromium", headless: true });
const results = [];
try {
  for (const [path, motion] of [["/", "no-preference"], ["/", "reduce"], ["/jobs", "reduce"], ["/profile", "reduce"], ["/applications", "reduce"]]) {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: motion });
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.addInitScript(() => {
        window.__lab = { lcp: null, lcpElement: null, shifts: [] };
        new PerformanceObserver(list => { for (const entry of list.getEntries()) { window.__lab.lcp = entry.startTime; window.__lab.lcpElement = entry.element?.tagName + "." + entry.element?.className; } }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__lab.shifts.push({ time: entry.startTime, value: entry.value }); }).observe({ type: "layout-shift", buffered: true });
      });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const response = await page.goto(path, { waitUntil: "load", timeout: 60000 });
      await page.getByRole("heading").first().waitFor();
      await page.waitForTimeout(10000);
      const metrics = await page.evaluate(() => {
        let cls = 0, session = 0, start = 0, previous = 0;
        for (const shift of window.__lab.shifts) {
          if (shift.time - previous > 1000 || shift.time - start > 5000) { session = 0; start = shift.time; }
          session += shift.value; cls = Math.max(cls, session); previous = shift.time;
        }
        const resources = performance.getEntriesByType("resource");
        const nav = performance.getEntriesByType("navigation")[0];
        return { lcpMs: window.__lab.lcp, lcpElement: window.__lab.lcpElement, cls, ttfbMs: nav.responseStart, transferBytes: nav.transferSize + resources.reduce((n, r) => n + r.transferSize, 0), scriptBytes: resources.filter(r => r.initiatorType === "script").reduce((n, r) => n + r.transferSize, 0), videoRequests: resources.filter(r => r.name.endsWith(".webm")).length, resources: resources.map(r => ({ path: new URL(r.name).pathname, bytes: r.transferSize, durationMs: Math.round(r.duration) })) };
      });
      results.push({ path, motion, status: response.status(), ...metrics, errors });
      console.log(JSON.stringify({ path, motion, status: response.status(), ...metrics, resources: undefined, errors }));
    } finally { await context.close(); }
  }
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/performance-audit.json", JSON.stringify({ conditions: { baseURL, viewport: "390x844", cpuSlowdown: 4, latencyMs: 150, downloadBytesPerSecond: 200000, cache: "disabled, fresh context per page", observation: "10 seconds after load; one sample per scenario", browser: browser.version() }, results }, null, 2));
  if (results.some(r => r.status !== 200 || r.errors.length || r.lcpMs === null || (r.motion === "reduce" && r.videoRequests))) process.exitCode = 1;
} finally { await browser.close(); }
