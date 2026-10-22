import { expect, test } from "@playwright/test";
import { textContrast } from "../../scripts/text-contrast.mjs";

test("contrast sampler detects weak text and placeholders and skips uncertain backgrounds", async ({ page }) => {
  await page.setContent(`<style>body { background: white; color: black; }.weak { color: #777; }.large { font-size: 32px; }.gradient { background: linear-gradient(black,white); }.translucent { opacity: .5; }.opaque { background: white; }input { background: white; color: black; }input::placeholder { color: #888; opacity: 1; }</style>
    <p class="strong">Strong text</p><p class="weak">Weak text</p><p class="weak large">Large text</p><input placeholder="Weak placeholder"><p class="gradient">Gradient text</p><div class="translucent"><p class="opaque">Transparent ancestor</p></div>`);
  const result = await textContrast(page);
  const sample = (text: string) => result.samples.find((item: { text: string }) => item.text === text);
  expect(sample("Strong text")?.ratio).toBe(21);
  expect(sample("Weak text")?.passes).toBe(false);
  expect(sample("Large text")?.passes).toBe(true);
  expect(sample("Weak placeholder")?.passes).toBe(false);
  expect(sample("Weak placeholder")?.foreground).toBe("rgb(136, 136, 136)");
  expect(sample("Gradient text")).toBeUndefined();
  expect(sample("Transparent ancestor")).toBeUndefined();
});

test("sampled public text contrast stays above its threshold", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let checked = 0;
  for (const path of ["/", "/profile", "/jobs", "/applications", "/login?confirmation=failed", "/register", "/forgot-password", "/confirm-email", "/reset-password"]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
    const result = await textContrast(page);
    expect(result.samples.filter((sample: { passes: boolean }) => !sample.passes), path).toEqual([]);
    checked += result.samples.length;
  }
  expect(checked).toBeGreaterThan(100);
});
