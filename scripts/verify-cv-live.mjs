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
    await expect(page.locator(".cv-skills li")).toHaveCount(0);
    await page.goto("/skill-checks");
    const card = page.locator(".check-card").filter({ has: page.getByRole("heading", { name: "React", exact: true }) });
    await card.getByRole("button", { name: "Start check", exact: true }).click();
    for (const [id, value] of Object.entries({ r1: 1, r2: 2, r3: 1, r4: 2, r5: 0 })) await page.locator(`input[name="${id}"][value="${value}"]`).check();
    await page.getByRole("button", { name: "Submit answers", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("5/5");
    const limited = await context.request.post("/api/v1/skill-checks", { data: { skill: "React", version: 1, answers: { r1: 1, r2: 2, r3: 1, r4: 2, r5: 0 } } });
    assert.equal(limited.status(), 429);
    assert.ok(Number(limited.headers()["retry-after"]) > 0);
    const forged = await context.request.post("/api/v1/skill-checks", { data: { skill: "React", version: 1, answers: { r1: 1, r2: 2, r3: 1, r4: 2, r5: 0 }, passed: true } });
    assert.equal(forged.status(), 400);
    assert.equal((await context.request.post("/api/v1/skill-checks", { headers: { Origin: "https://untrusted.example" }, data: {} })).status(), 403);
    await page.goto("/cv");
    await expect(page.locator(".cv-skills li")).toHaveCount(1);
    await expect(page.locator(".cv-skills li")).toHaveText("React");
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My CV", exact: true })).toHaveAttribute("aria-current", "page");
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
    console.log("PASS: skills absent before assessment, real UI pass unlocks only React, forgery/cooldown denial, CV navigation/reflow and printable PDF");
  } finally { await page.close(); }
}
