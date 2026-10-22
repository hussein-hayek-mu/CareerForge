import { expect, test } from "@playwright/test";
import { navigate } from "./navigation";

test("demo profile, job matching, saved roles and tracking work across reloads", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Make your next move");
  await navigate(page, "My profile");
  await page.getByLabel("Full name").fill("Test Student");
  await page.getByLabel("Your skills", { exact: true }).fill("React, TypeScript, CSS, Git");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await page.reload();
  await expect(page.getByLabel("Full name")).toHaveValue("Test Student");
  await navigate(page, "Find opportunities");
  await page.getByRole("textbox", { name: "Search opportunities" }).fill("Junior Frontend");
  const card = page.locator(".job-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("100% skill match");
  await card.getByRole("button", { name: "View role" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("100% of listed skills");
  await page.getByRole("button", { name: "Close role details" }).click();
  await card.getByRole("button", { name: "Save Junior Frontend Developer", exact: true }).click();
  await navigate(page, "Applications");
  await page.getByLabel("Status for Junior Frontend Developer").selectOption("Interview");
  await page.reload();
  await expect(page.getByLabel("Status for Junior Frontend Developer")).toHaveValue("Interview");
  await page.getByRole("button", { name: "Remove Junior Frontend Developer from tracker", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your next chapter is still unwritten." })).toBeVisible();
  for (const path of ["/", "/profile", "/jobs", "/applications"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`${path.slice(1) || "overview"}.png`), fullPage: true, animations: "disabled" });
  }
  expect(errors).toEqual([]);
});
