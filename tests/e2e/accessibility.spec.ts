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
  await page.goto("/profile");
  await page.getByLabel("Full name").focus();
  await page.keyboard.press("Tab");
  const location = page.getByLabel("Location", { exact: true });
  await expect(location).toBeFocused();
  const outline = await location.evaluate(node => ({ style: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth }));
  expect(outline.style).not.toBe("none");
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  // Half a desktop's CSS viewport approximates the reflow demand of 200%
  // browser zoom; it is not a claim of a physical device/assistive-tech audit.
  for (const width of [320, 360, 640]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/profile", "/jobs", "/applications", "/login", "/register", "/forgot-password", "/confirm-email", "/reset-password"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}px`).toBe(true);
    }
  }
});

test("role dialog returns focus after removing its original trigger and touch actions stay reachable", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Save Junior Frontend Developer", exact: true }).click();
  await page.goto("/applications");
  const remove = page.getByRole("button", { name: "Remove Junior Frontend Developer from tracker", exact: true });
  const bounds = await remove.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  const trigger = page.getByRole("button", { name: "Junior Frontend Developer", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Junior Frontend Developer", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close role details" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Remove from tracker", exact: true }).click();
  await expect(page.locator(".tracker-row")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#main-content")).toBeFocused();
});
