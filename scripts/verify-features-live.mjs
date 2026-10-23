import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function verifyFeaturesLive(context) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/features");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A place for every next step.");
    const nav = page.locator(".app-sidebar nav");
    const plannedLinks = await nav.locator('a[title$="(planned)"], a[title$="(stretch)"]').evaluateAll(links => links.map(link => ({ href: link.getAttribute("href"), label: link.getAttribute("aria-label") })));
    assert.equal(plannedLinks.length, 10);
    await page.screenshot({ path: "test-results/features-1440.png", fullPage: true, animations: "disabled" });
    for (const { href, label } of plannedLinks) {
      const response = await page.goto(href);
      assert.equal(response.status(), 200);
      assert.ok(response.headers()["cache-control"].includes("no-store"));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${label}.`);
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".feature-workflow li")).toHaveCount(3);
      await expect(page.locator(".feature-readiness-note")).toContainText("does not run this feature");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.goto("/application-agent");
    await page.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
    await expect(nav.getByRole("link", { name: "My CV", exact: true })).toHaveAccessibleName("My CV");
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Expand sidebar", exact: true }).click();
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      for (const marker of await page.locator(".feature-workflow li > span").all()) {
        const bounds = await marker.boundingBox();
        assert.ok(bounds.width >= 24 && bounds.height < 24, "step number must stay on one line");
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const menu = page.getByRole("button", { name: "Open navigation", exact: true });
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Navigation", exact: true });
    await expect(dialog.getByRole("button", { name: "Close navigation", exact: true })).toBeFocused();
    await dialog.getByRole("link", { name: "Graduation simulator", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Graduation simulator.");
    await menu.click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await page.goto("/features");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: "test-results/features-390.png", fullPage: true, animations: "disabled" });
    await page.goto("/application-agent");
    await page.screenshot({ path: "test-results/agent-390.png", fullPage: true, animations: "disabled" });
    console.log("PASS: ten honest planned/stretch destinations, active links, no-store/noindex, sidebar persistence, narrow reflow and last mobile navigation item");
  } finally { await page.close(); }
}
