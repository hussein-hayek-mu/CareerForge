import { expect, test } from "@playwright/test";

test("account-mode navigation animates continuously and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/login");
  const navigation = page.getByRole("navigation", { name: "Account access" });
  const indicator = navigation.locator(".auth-mode-indicator");
  await indicator.evaluate(node => {
    node.setAttribute("data-continuity", "preserved");
    node.addEventListener("transitionrun", () => node.setAttribute("data-animated", "yes"));
  });
  await navigation.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();
  await expect(indicator).toHaveAttribute("data-continuity", "preserved");
  await expect(indicator).toHaveAttribute("data-animated", "yes");
  await expect.poll(() => indicator.evaluate(node => node.getAnimations().length)).toBe(0);
  await indicator.evaluate(node => node.removeAttribute("data-animated"));
  await navigation.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(indicator).toHaveAttribute("data-animated", "yes");
  await expect(indicator).toHaveAttribute("data-continuity", "preserved");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await navigation.getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  expect(await indicator.evaluate(node => getComputedStyle(node).transitionDuration)).toBe("0s");
  expect(await page.locator(".auth-form-content").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(navigation.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("aria-current", "page");
});

test("private account redirects anonymous visitors and sign-in errors remain usable", async ({ page, request }, testInfo) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
  const offlineProduction = testInfo.config.metadata.offlineProduction === true;
  const profileResponse = await request.get("/api/v1/profile");
  // The offline build intentionally has no Auth provider. Configured anonymous
  // requests return 401; unavailable Auth must remain a sanitized service error.
  expect(profileResponse.status()).toBe(offlineProduction ? 503 : 401);
  const profileBody = await profileResponse.json();
  expect(profileBody.error.code).toBe(offlineProduction ? "PROFILE_UNAVAILABLE" : "UNAUTHORIZED");
  expect(profileBody.profile).toBeUndefined();
  expect(profileResponse.headers()["cache-control"].split(",").map(value => value.trim())).toContain("no-store");
  await page.route("**/api/v1/auth/login", route => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { message: "Check your email and password." } }) }));
  await page.getByLabel("Email address").fill("test@careerforge.invalid");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText("Check your email and password");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("registration explains email confirmation without sending real messages", async ({ page }) => {
  let registrations = 0;
  await page.route("**/api/v1/auth/register", route => {
    registrations++;
    expect(route.request().postDataJSON()).toEqual({ email: "test@careerforge.invalid", password: "not-a-real-password" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ confirmationRequired: true }) });
  });
  await page.goto("/register");
  await expect(page).toHaveTitle("Create account | CareerForge");
  await expect(page.getByRole("heading", { name: "Create your account", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Account access" }).getByRole("link", { name: "Create account", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Forgot your password?" })).toHaveCount(0);
  await page.getByLabel("Email address").fill("test@careerforge.invalid");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByLabel("Confirm password", { exact: true }).fill("different-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText("Passwords do not match");
  await expect(page.getByLabel("Confirm password", { exact: true })).toBeFocused();
  expect(registrations).toBe(0);
  await page.getByLabel("Confirm password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(registrations).toBe(1);
  await page.getByRole("link", { name: "Go to sign in" }).click();
  await expect(page).toHaveTitle("Sign in | CareerForge");
  await expect(page.getByRole("heading", { name: "Sign in to CareerForge" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Confirm password", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Forgot your password?" })).toBeVisible();
  await page.getByRole("navigation", { name: "Account access" }).getByRole("link", { name: "Create account", exact: true }).click();
  await expect(page.getByLabel("Email address")).toHaveValue("");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Check your email" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("registration failure retains inputs and switching to login clears the error", async ({ page }) => {
  await page.route("**/api/v1/auth/register", route => route.fulfill({ status: 503, json: { error: { message: "Registration is temporarily unavailable." } } }));
  await page.goto("/register");
  await page.getByLabel("Email address").fill("test@careerforge.invalid");
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByLabel("Confirm password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.locator(".form-error[role=alert]")).toContainText("temporarily unavailable");
  await expect(page.getByLabel("Email address")).toHaveValue("test@careerforge.invalid");
  await expect(page.getByLabel("Confirm password", { exact: true })).toHaveValue("not-a-real-password");
  await page.getByRole("navigation", { name: "Account access" }).getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Email address")).toHaveValue("");
  await expect(page.locator(".form-error[role=alert]")).toHaveCount(0);
});
