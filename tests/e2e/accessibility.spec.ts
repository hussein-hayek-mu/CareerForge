import { expect, test } from "@playwright/test";

test("skip navigation, form focus and narrow layouts remain usable from the keyboard", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Start from a known focus point rather than racing Next's initial route
  // focus management or the browser chrome for the first Tab event.
  await page.getByRole("link", { name: "Skip to content", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.goto("/login");
  await expect(page.getByLabel("Email address")).toBeEnabled();
  await page.getByLabel("Email address").focus();
  await page.keyboard.press("Tab");
  const location = page.getByLabel("Password", { exact: true });
  await expect(location).toBeFocused();
  const outline = await location.evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth }));
  expect(outline.style).not.toBe("none");
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  // Half a desktop's CSS viewport approximates the reflow demand of 200%
  // browser zoom; it is not a claim of a physical device/assistive-tech audit.
  for (const width of [320, 360, 640]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/login", "/register", "/forgot-password", "/confirm-email", "/reset-password"]) {
      await page.goto(path);
      await expect(page.getByRole("heading").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true);
    }
  }
});

// Private tracker/dialog coverage belongs to the authenticated live suite.
