import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

// Run against next dev: production React intentionally omits detailed diagnostics.
// The document-start mutation models an extension changing markup before React boots.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const expectRootWarning = process.argv.includes("--expect-root-warning");
const expectBodyWarning = process.argv.includes("--expect-body-warning");
const hydrationMessage = /hydration|hydrated|server rendered HTML/i;
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chromium", headless: true });

async function verifyMutation(selector, attribute, shouldWarn, value = "extension-regression-fixture") {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const diagnostics = [];
  const otherErrors = [];
  const failedRequests = [];
  const runtimeErrors = [];
  let submitted = 0;
  page.on("console", message => {
    if (message.type() === "error" && hydrationMessage.test(message.text())) diagnostics.push(message.text());
    else if (message.type() === "error") otherErrors.push(message.text());
  });
  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("requestfailed", request => failedRequests.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
  try {
    const response = await context.request.get("/login");
    assert.equal(response.status(), 200);
    assert.equal((await response.text()).includes(attribute), false, "The app must not generate the extension attribute");
    await context.addInitScript(({ selector, attribute, value }) => {
      const inject = () => {
        const target = document.querySelector(selector);
        if (!target) return false;
        target.setAttribute(attribute, value);
        return true;
      };
      if (inject()) return;
      const observer = new MutationObserver(() => { if (inject()) observer.disconnect(); });
      observer.observe(document, { childList: true, subtree: true });
    }, { selector, attribute, value });
    // Prove the hydrated submit handler works without contacting Auth or a database.
    await context.route("**/api/v1/auth/login", route => {
      submitted++;
      return route.fulfill({ status: 400, json: { error: { code: "TEST_ONLY", message: "Hydrated form submission confirmed." } } });
    });
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(selector)).toHaveAttribute(attribute, value);
    const email = page.getByLabel("Email address", { exact: true });
    await expect(email).toBeEnabled({ timeout: 20000 });
    await email.fill("hydration-regression@careerforge.invalid");
    await page.getByLabel("Password", { exact: true }).fill("Test-only-password-123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator(".auth-panel").getByRole("alert")).toHaveText("Hydrated form submission confirmed.");
    assert.equal(submitted, 1);
    assert.deepEqual(runtimeErrors, []);
    if (shouldWarn) {
      assert.ok(diagnostics.some(message => message.includes(attribute)), `Expected a hydration diagnostic for ${selector}.${attribute}`);
    } else {
      assert.deepEqual(diagnostics, [], "An injected document-container attribute must not produce hydration diagnostics");
    }
    console.log(`PASS: ${selector} injection ${shouldWarn ? "retains its hydration diagnostic" : "hydrates without a warning"}; language, injected markup and form interaction preserved`);
  } catch (error) {
    console.error(JSON.stringify({ selector, diagnostics, otherErrors, runtimeErrors, failedRequests }, null, 2));
    throw error;
  } finally { await context.close(); }
}

try {
  await verifyMutation("html", "data-mbtss-nonce", expectRootWarning);
  await verifyMutation("body", "cz-shortcut-listen", expectBodyWarning, "true");
  // Container tolerance must not disable diagnostics inside application components.
  await verifyMutation(".auth-panel", "data-hydration-child-fixture", true);
  console.log("PASS: document-container hydration regressions and application diagnostic control; no Auth/database calls");
} finally { await browser.close(); }
