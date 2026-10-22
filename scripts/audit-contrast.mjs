import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { textContrast } from "./text-contrast.mjs";

const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chromium", headless: true, args: ["--disable-gpu"] });
try {
  const page = await browser.newPage({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000", reducedMotion: "reduce" });
  const results = [];
  for (const path of ["/", "/profile", "/jobs", "/applications", "/login?confirmation=failed", "/register", "/forgot-password", "/confirm-email", "/reset-password"]) {
    await page.goto(path);
    await page.getByRole("heading").first().waitFor();
    const result = await textContrast(page);
    results.push({ path, ...result });
  }
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/contrast-audit.json", JSON.stringify(results, null, 2));
  const failures = results.flatMap(r => r.samples.filter(s => !s.passes).map(s => ({ path: r.path, ...s })));
  console.log(JSON.stringify({ samples: results.reduce((n, r) => n + r.samples.length, 0), failures, skippedComplexSurfaces: results.reduce((n, r) => n + r.skipped.length, 0) }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
