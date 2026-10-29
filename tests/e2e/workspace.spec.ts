import { expect, test } from "@playwright/test";
import { features } from "../../src/lib/features";
test("guest direct navigation cannot open private features even with stored demo data", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("careerforge-demo-v1", JSON.stringify({ profile: { name: "Unauthorized local user" } })));
  for (const path of ["/profile", "/features", "/cv", "/portfolio", "/cv/saved", "/portfolio/publication", ...features.map(feature => feature.href).filter(path => path !== "/")]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByText("Unauthorized local user")).toHaveCount(0);
  }
  await page.goto("/");
  await page.getByRole("link", { name: "Start your journey" }).click();
  await expect(page).toHaveURL(/\/register$/);
});
