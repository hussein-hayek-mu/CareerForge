import { expect, test, type Locator, type Page } from "@playwright/test";

function watchRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && /hydration|hydrated|server rendered HTML/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

// Compare rendered pixels over several browser frames rather than depending on
// an internal animation counter or assuming a particular generated scene.
async function canvasChanges(canvas: Locator) {
  return canvas.evaluate(async node => {
    const surface = node as HTMLCanvasElement;
    const before = surface.toDataURL();
    await new Promise<void>(resolve => {
      let remaining = 6;
      const next = () => { if (--remaining === 0) resolve(); else requestAnimationFrame(next); };
      requestAnimationFrame(next);
    });
    return before !== surface.toDataURL();
  });
}

test("background pause and resume persist across reloads and public routes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = watchRuntimeErrors(page);
  await page.goto("/");
  const canvas = page.locator(".ambient-canvas");
  await expect.poll(() => canvas.evaluate(node => (node as HTMLCanvasElement).width)).toBeGreaterThan(0);
  await expect.poll(() => canvasChanges(canvas)).toBe(true);
  await page.getByRole("button", { name: "Pause background animation", exact: true }).click();
  await expect(page.locator(".ambient")).toHaveAttribute("data-paused", "true");
  expect(await page.evaluate(() => localStorage.getItem("careerforge-motion"))).toBe("off");
  expect(await canvasChanges(canvas)).toBe(false);
  expect(await page.locator(".ambient-aurora-a").evaluate(node => getComputedStyle(node).animationPlayState)).toBe("paused");
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume background animation", exact: true })).toBeVisible();
  await expect(page.locator(".ambient")).toHaveAttribute("data-paused", "true");
  expect(await canvasChanges(canvas)).toBe(false);
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Resume background animation", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume background animation", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("careerforge-motion"))).toBe("on");
  await expect(page.locator(".ambient")).not.toHaveAttribute("data-paused", "true");
  await expect.poll(() => canvasChanges(canvas)).toBe(true);
  expect(errors).toEqual([]);
});

test("reduced motion shows a still background and follows changed system preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = watchRuntimeErrors(page);
  await page.goto("/");
  const canvas = page.locator(".ambient-canvas");
  await expect.poll(() => canvas.evaluate(node => (node as HTMLCanvasElement).width)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /background animation/ })).toHaveCount(0);
  expect(await canvasChanges(canvas)).toBe(false);
  expect(await page.locator(".ambient-aurora-a").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await expect(page.getByRole("link", { name: "Start your journey", exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("button", { name: "Pause background animation", exact: true })).toBeVisible();
  await expect.poll(() => canvasChanges(canvas)).toBe(true);
  expect(errors).toEqual([]);
});

test("unavailable canvas rendering leaves registration and background controls usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", { configurable: true, value: () => null });
  });
  const errors = watchRuntimeErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build a career");
  const aurora = page.locator(".ambient-aurora-a");
  expect(await aurora.evaluate(node => getComputedStyle(node).animationPlayState)).toBe("running");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Menu", exact: true });
  await expect(menu).toBeVisible();
  expect(await aurora.evaluate(node => getComputedStyle(node).animationPlayState)).toBe("paused");
  await menu.getByRole("button", { name: "Close menu", exact: true }).click();
  await expect(menu).toBeHidden();
  expect(await aurora.evaluate(node => getComputedStyle(node).animationPlayState)).toBe("running");
  await page.getByRole("button", { name: "Pause background animation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume background animation", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Start your journey", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile menu holds page position and background motion until it closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Open menu", exact: true });
  await expect(menuButton).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  const before = await page.evaluate(() => scrollY);
  await menuButton.click();
  const menu = page.getByRole("dialog", { name: "Menu", exact: true });
  await expect(menu.getByRole("button", { name: "Close menu", exact: true })).toBeFocused();
  const canvas = page.locator(".ambient-canvas");
  await page.mouse.wheel(0, 500);
  expect(await canvasChanges(canvas)).toBe(false);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  expect(await page.locator(".ambient-aurora-a").evaluate(node => getComputedStyle(node).animationPlayState)).toBe("paused");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuButton).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect.poll(() => canvasChanges(canvas)).toBe(true);
});

test("high-DPI screens keep background pixels within its rendering budget", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const canvas = page.locator(".ambient-canvas");
    await expect.poll(() => canvas.evaluate(node => (node as HTMLCanvasElement).width)).toBeGreaterThan(0);
    const pixels = await canvas.evaluate(node => (node as HTMLCanvasElement).width * (node as HTMLCanvasElement).height);
    expect(pixels).toBeLessThanOrEqual(1_310_000);
    await expect(page.getByRole("link", { name: "Start your journey", exact: true })).toBeVisible();
  } finally { await context.close(); }
});
