import { expect, test } from "@playwright/test";

test("the reference navbar stays on the homepage with session cookies and unavailable Auth", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "sb-navbar-regression-auth-token", value: "session-cookie-fixture", url: baseURL! }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build a career");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  const island = page.locator(".lp-island");
  await expect(island).toBeVisible();
  const before = await island.boundingBox();
  expect(before?.y).toBeGreaterThanOrEqual(0);
  expect(before?.y).toBeLessThan(30);
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" }));
  await expect(island).toHaveAttribute("data-scrolled", "true");
  const after = await island.boundingBox();
  expect(after?.y).toBeGreaterThanOrEqual(0);
  expect(after?.y).toBeLessThan(30);
  await expect(island.getByRole("link", { name: "CareerForge home", exact: true })).toBeVisible();
});

test("guests have a public homepage and sign-in entry without workspace navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build a career");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 860) {
      await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Public navigation" })).toBeHidden();
    } else {
      await expect(page.getByRole("navigation", { name: "Public navigation" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeHidden();
    }
  }
  await page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("landing navigation reaches sections and sign-in with a keyboard-accessible mobile menu", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Open menu", exact: true });
  if ((page.viewportSize()?.width ?? 1440) <= 860) {
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const menu = page.getByRole("dialog", { name: "Menu", exact: true });
    await expect(menu).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await menu.getByRole("link", { name: "02 Features", exact: true }).click();
    await expect(page).toHaveURL(/\/#features$/);
    await expect(menu).toBeHidden();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(menuButton).toBeFocused();
    await menuButton.click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(menuButton).toBeFocused();
    await menuButton.click();
    await menu.getByRole("link", { name: "04 Sign in", exact: true }).click();
  } else {
    const navigation = page.getByRole("navigation", { name: "Public navigation" });
    await navigation.getByRole("link", { name: "Platform", exact: true }).click();
    await expect(page).toHaveURL(/\/#platform$/);
    await expect(page.locator("#platform")).toBeInViewport();
    await navigation.getByRole("link", { name: "Features", exact: true }).click();
    await expect(page).toHaveURL(/\/#features$/);
    await expect(page.locator("#features")).toBeInViewport();
    await navigation.getByRole("link", { name: "Sign in", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
});
