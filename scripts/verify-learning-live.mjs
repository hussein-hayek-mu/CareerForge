import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function verifyLearningLive(context) {
  const page = await context.newPage();
  try {
    const response = await page.goto("/learning-roadmap");
    assert.equal(response.status(), 200);
    assert.ok(response.headers()["cache-control"].includes("no-store"));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make your next skill concrete.");
    await expect(page.locator(".learning-step")).toHaveCount(0);
    await page.getByLabel("Target role", { exact: true }).selectOption("1");
    await page.getByRole("button", { name: "Show my plan", exact: true }).click();
    await expect(page).toHaveURL(/\/learning-roadmap\?target=1$/);
    // Fixture account has React and SQL, so the frontend gaps are TS/CSS/Git.
    await expect(page.locator(".learning-step h3")).toHaveText(["TypeScript", "CSS", "Git"]);
    await expect(page.getByRole("link", { name: /TypeScript roadmap on roadmap.sh/ })).toHaveAttribute("href", "https://roadmap.sh/typescript");
    await page.reload();
    await expect(page.getByLabel("Target role", { exact: true })).toHaveValue("1");
    await expect(page.locator(".learning-step")).toHaveCount(3);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await expect(page.getByRole("button", { name: "Show my plan", exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/learning-${width}.png`, fullPage: true, animations: "disabled" });
    }
    await page.goto("/learning-roadmap?target=unknown");
    await expect(page.locator(".form-error[role=alert]")).toContainText("no longer available");
    await expect(page.locator(".learning-step")).toHaveCount(0);
    await page.goto("/learning-roadmap?target=1&target=2");
    await expect(page.locator(".form-error[role=alert]")).toBeVisible();
    await page.goto("/jobs");
    await page.getByRole("button", { name: "Junior Frontend Developer", exact: true }).click();
    await page.getByRole("dialog", { name: "Junior Frontend Developer", exact: true }).getByRole("link", { name: /Build a learning plan/ }).click();
    await expect(page).toHaveURL(/\/learning-roadmap\?target=1$/);
    await expect(page.locator(".learning-step h3")).toHaveText(["TypeScript", "CSS", "Git"]);
    console.log("PASS: private learning plan, exact saved-profile gaps, original resource links, URL target reload, invalid/repeated target handling and 320/768/1440px layouts");
  } finally { await page.close(); }
}
