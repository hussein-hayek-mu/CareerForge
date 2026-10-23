import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

export async function verifyCVLive(context) {
  const response = await context.request.get("/api/v1/profile");
  assert.equal(response.status(), 200);
  const { profile } = await response.json();
  const page = await context.newPage();
  try {
    const navigation = await page.goto("/cv");
    assert.ok(navigation.headers()["cache-control"].includes("no-store"));
    await expect(page.getByRole("article", { name: "CV preview" }).getByRole("heading", { level: 2 })).toHaveText(profile.name);
    await expect(page.locator(".cv-skills li")).toHaveCount(profile.skills.length);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("button", { name: "Print / save as PDF" })).toBeEnabled();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/cv-${width}.png`, fullPage: true, animations: "disabled" });
    }
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".cv-tools")).not.toBeVisible();
    await expect(page.locator(".cv-sheet")).toBeVisible();
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.length > 1000);
    await writeFile("test-results/cv-preview.pdf", pdf);
    console.log("PASS: owner CV reflects saved profile, no-store/noindex, 320/1440 reflow and printable PDF output");
  } finally { await page.close(); }
}
