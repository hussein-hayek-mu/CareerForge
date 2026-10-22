import { expect, test } from "@playwright/test";

test("missing pages offer accessible recovery without narrow-screen overflow", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A detour, not a dead end.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "CareerForge overview" })).toBeFocused();
  expect(await page.locator(":focus").evaluate(node => getComputedStyle(node).outlineStyle)).toBe("solid");
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("missing-page.png"), fullPage: true });
  await page.getByRole("link", { name: "Explore opportunities" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await page.goto("/this-page-does-not-exist");
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect(page).toHaveURL(/\/$/);
});
