import { expect, test } from "@playwright/test";

test("private account redirects anonymous visitors and sign-in errors remain usable", async ({ page, request }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/v1/profile")).status()).toBe(401);
  await page.route("**/api/v1/auth/login", route => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { message: "Check your email and password." } }) }));
  await page.getByLabel("Email address").fill("test@careerforge.invalid");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText("Check your email and password");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("registration explains email confirmation without sending real messages", async ({ page }) => {
  await page.route("**/api/v1/auth/register", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ confirmationRequired: true }) }));
  await page.goto("/register");
  await page.getByLabel("Email address").fill("test@careerforge.invalid");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
