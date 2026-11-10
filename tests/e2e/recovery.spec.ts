import { expect, test } from "@playwright/test";

test("failed confirmation offers password recovery and safe resend with cooldown", async ({ page }) => {
  await page.goto("/login?confirmation=failed");
  await expect(page.locator(".form-error[role=alert]")).toContainText("may already be confirmed");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.route("**/api/v1/auth/forgot-password", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ requested: true, retryAfter: 60 }) }));
  await page.getByLabel("Email address").fill("test@careerforge.invalid");
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("If this address is eligible");
  await expect(page.getByRole("button", { name: /Request again in/ })).toBeDisabled();
  await page.getByRole("link", { name: "Request confirmation", exact: true }).click();
  await expect(page).toHaveURL(/\/confirm-email$/);
  await page.route("**/api/v1/auth/resend-confirmation", route => route.fulfill({ status: 429, headers: { "Retry-After": "60" }, contentType: "application/json", body: JSON.stringify({ error: { message: "Please wait before requesting another email." } }) }));
  await page.getByLabel("Email address").fill("test@careerforge.invalid");
  await page.getByRole("button", { name: "Send confirmation link", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText("Please wait");
  await expect(page.getByRole("button", { name: /Request again in/ })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("anonymous password changes and callback failures remain safe", async ({ page, request }, testInfo) => {
  const offlineProduction = testInfo.config.metadata.offlineProduction === true;
  const passwordResponse = await request.post("/api/v1/auth/password", { data: { password: "not-a-real-password" } });
  expect(passwordResponse.status()).toBe(offlineProduction ? 403 : 401);
  expect((await passwordResponse.json()).error.code).toBe(offlineProduction ? "FORBIDDEN" : "UNAUTHORIZED");
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "A reset link is needed" })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  if (offlineProduction) {
    // Production requires a trusted HTTPS origin. The offline HTTP fixture deliberately has none.
    for (const suffix of ["error=access_denied", "error=access_denied&error_code=otp_expired&error_description=private-details"]) {
      const callback = await request.get(`/auth/callback?${suffix}`, { maxRedirects: 0 });
      expect(callback.status()).toBe(503);
      expect((await callback.json()).error.code).toBe("AUTH_ORIGIN_UNAVAILABLE");
      expect(callback.headers()["location"]).toBeUndefined();
      expect(callback.headers()["referrer-policy"]).toBe("no-referrer");
    }
    await page.goto("/login?confirmation=failed&reason=expired");
    await expect(page.locator(".form-error[role=alert]")).toContainText("expired or was already used");
    await expect(page.getByRole("link", { name: "Forgot your password?" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("private-details");
    return;
  }
  await page.goto("/auth/callback?error=access_denied");
  await expect(page).toHaveURL(/\/login\?confirmation=failed/);
  await expect(page.getByRole("link", { name: "Forgot your password?" })).toBeVisible();
  await page.goto("/auth/callback?error=access_denied&error_code=otp_expired&error_description=private-details");
  await expect(page).toHaveURL(/confirmation=failed&reason=expired$/);
  await expect(page.locator(".form-error[role=alert]")).toContainText("expired or was already used");
  await expect(page.locator("body")).not.toContainText("private-details");
});
