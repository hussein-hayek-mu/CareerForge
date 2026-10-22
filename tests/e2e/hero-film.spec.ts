import { expect, test } from "@playwright/test";

test("original hero video plays silently, loops, and supports pause/resume", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const video = page.locator(".hero-film video");
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(.1);
  expect(await video.evaluate(node => {
    const element = node as HTMLVideoElement;
    return { muted: element.muted, loop: element.loop, inline: element.playsInline, ready: element.readyState >= 2 };
  })).toEqual({ muted: true, loop: true, inline: true, ready: true });
  await page.getByRole("button", { name: "Pause background video", exact: true }).click();
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).paused)).toBe(true);
  await page.getByRole("button", { name: "Play background video", exact: true }).click();
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).paused)).toBe(false);
  // Seek near the end and verify real loop playback, not just the HTML flag.
  await video.evaluate(node => { (node as HTMLVideoElement).currentTime = 11.7; });
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime), { timeout: 8000 }).toBeLessThan(5);
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).paused)).toBe(false);
  // A tall desktop viewport can still include the hero while the footer is
  // visible. Use a short viewport to ensure the video really leaves view.
  await page.setViewportSize({ width: page.viewportSize()?.width ?? 1440, height: 420 });
  await page.locator(".page-footer").scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).paused)).toBe(true);
  await page.locator(".launchpad").scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).paused)).toBe(false);
});

test("reduced motion keeps the still without downloading video until explicitly played", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const videoRequests: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".webm")) videoRequests.push(request.url()); });
  await page.goto("/");
  const video = page.locator(".hero-film video");
  await expect(page.locator(".hero-film-poster")).toBeVisible();
  await expect(video).not.toHaveAttribute("src", /webm/);
  expect(videoRequests).toEqual([]);
  await page.getByRole("button", { name: "Play background video", exact: true }).click();
  await expect.poll(() => video.evaluate(node => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(.1);
});

test("a blocked video retains its poster and leaves the hero usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/*.webm", route => route.abort());
  await page.goto("/");
  await expect(page.locator(".hero-film-poster")).toBeVisible();
  await expect(page.getByRole("button", { name: /background video/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Build your profile", exact: true })).toBeVisible();
});

test("data saving defaults to the poster without requesting the video", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => { Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) }); });
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".webm")) requests.push(request.url()); });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Play background video", exact: true })).toBeVisible();
  await expect(page.locator(".hero-film video")).not.toHaveAttribute("src", /webm/);
  expect(requests).toEqual([]);
});
