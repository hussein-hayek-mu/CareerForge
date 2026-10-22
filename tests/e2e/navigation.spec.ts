import { expect, test } from "@playwright/test";
import { navigate } from "./navigation";

test("shared navigation is accessible, responsive, and preserves desktop collapse preference", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    const menu = page.getByRole("button", { name: "Open navigation" });
    await menu.click();
    const drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Close navigation" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await drawer.evaluate(node => node.contains(document.activeElement))).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();
    await expect(menu).toBeFocused();
    await navigate(page, "Find opportunities");
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(drawer).not.toBeVisible();
    await menu.click();
    await expect(drawer.getByRole("link", { name: "Find opportunities", exact: true })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
  } else {
    await expect(page.locator(".app-sidebar")).toHaveCSS("scrollbar-width", "none");
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.locator(".app-shell")).toHaveClass(/sidebar-collapsed/);
    await navigate(page, "Find opportunities");
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(page.locator(".app-shell")).not.toHaveClass(/sidebar-collapsed/);
    await page.setViewportSize({ width: 1440, height: 480 });
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My account", exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My account", exact: true })).toBeInViewport();
  }
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await navigate(page, "My account");
  if (testInfo.config.metadata.offlineAuth) {
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "Your account is temporarily unavailable." })).toBeVisible();
    await page.getByRole("link", { name: "Back to sign in", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/login$/);
});
