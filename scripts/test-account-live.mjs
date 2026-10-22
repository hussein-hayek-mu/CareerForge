import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import nextEnv from "@next/env";
import { Client } from "pg";
import { chromium, devices, expect } from "@playwright/test";

nextEnv.loadEnvConfig(process.cwd());
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const users = [randomUUID(), randomUUID()].map(id => ({ id, email: `${id}@careerforge.invalid`, password: `Test-${randomUUID()}!` }));
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, statement_timeout: 15000 });
let browser;
let currentPage;
let stage = "connection";
try {
  if (!process.env.DATABASE_URL) throw new Error("MISSING_DATABASE_URL");
  await db.connect();
  // These temporary confirmed identities never send mail and are deleted below.
  // Never run this script against production.
  stage = "temporary test users";
  await db.query("begin");
  for (const user of users) {
    await db.query(`insert into auth.users
      (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       email_change_token_current, phone_change, phone_change_token, reauthentication_token)
      values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2,
       extensions.crypt($3, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '')`, [user.id, user.email, user.password]);
    await db.query(`insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
      values ($1, $2::text, $2::uuid, $3, 'email', now(), now())`, [randomUUID(), user.id, JSON.stringify({ sub: user.id, email: user.email, email_verified: true })]);
  }
  await db.query("commit");
  stage = "browser launch";
  browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : "chromium", headless: true });
  await mkdir("test-results", { recursive: true });
  const errors = [];
  async function signIn(user, options = {}) {
    const context = await browser.newContext({ baseURL, ...options });
    const page = await context.newPage();
    currentPage = page;
    page.on("response", response => { if (response.url().endsWith("/api/v1/auth/login")) console.log("Login API status:", response.status()); });
    page.on("pageerror", error => errors.push(error.name));
    await page.goto("/login");
    await page.getByLabel("Email address").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    stage = "waiting for authenticated account page";
    await expect(page).toHaveURL(`${baseURL}/account`, { timeout: 20000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your story starts here");
    const menu = page.getByRole("button", { name: "Open navigation", exact: true });
    const mobileNavigation = await menu.isVisible();
    if (mobileNavigation) await menu.click();
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My account", exact: true })).toHaveAttribute("aria-current", "page");
    if (mobileNavigation) await page.getByRole("button", { name: "Close navigation", exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const sessionCookies = (await context.cookies()).filter(c => c.name.startsWith("sb-"));
    assert.ok(sessionCookies.length > 0);
    assert.ok(sessionCookies.every(c => c.httpOnly && c.sameSite === "Lax"));
    return { context, page };
  }
  stage = "owner A login and save";
  const a = await signIn(users[0], { viewport: { width: 1440, height: 1000 } });
  stage = "owner A profile persistence";
  await a.page.getByLabel("Full name").fill("Live Test Owner A");
  await a.page.getByLabel("Your skills", { exact: true }).fill("React, SQL");
  await a.page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(a.page.getByRole("status")).toContainText("saved to your account");
  await a.page.reload();
  await expect(a.page.getByLabel("Full name")).toHaveValue("Live Test Owner A");
  await expect(a.page.getByLabel("Your skills", { exact: true })).toHaveValue("React, SQL");
  const aProfile = await (await a.context.request.get("/api/v1/profile")).json();
  assert.equal(aProfile.profile.name, "Live Test Owner A");
  await a.page.evaluate(() => window.scrollTo(0, 0));
  await a.page.screenshot({ path: "test-results/account-desktop.png", fullPage: true, animations: "disabled" });

  stage = "owner B isolation and phone layout";
  const phone = { ...devices["iPhone 13"] };
  delete phone.defaultBrowserType;
  const b = await signIn(users[1], phone);
  stage = "owner B profile and isolation";
  await expect(b.page.getByLabel("Full name")).toHaveValue("");
  await b.page.getByLabel("Full name").fill("Live Test Owner B");
  await b.page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(b.page.getByRole("status")).toContainText("saved to your account");
  assert.equal((await (await a.context.request.get(`/api/v1/profile?user_id=${users[1].id}`)).json()).profile.name, "Live Test Owner A");
  const injected = await a.context.request.put("/api/v1/profile", { data: { ...aProfile.profile, id: users[1].id } });
  assert.equal(injected.status(), 400);
  const crossOrigin = await a.context.request.put("/api/v1/profile", { headers: { Origin: "https://untrusted.example" }, data: aProfile.profile });
  assert.equal(crossOrigin.status(), 403);
  assert.equal(await b.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await b.page.evaluate(() => window.scrollTo(0, 0));
  await b.page.screenshot({ path: "test-results/account-mobile.png", fullPage: true, animations: "disabled" });

  stage = "save failure recovery";
  await a.page.route("**/api/v1/profile", route => route.request().method() === "PUT"
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Temporary test outage" } }) }) : route.continue());
  await a.page.getByLabel("Full name").fill("Unsaved edit");
  await a.page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(a.page.locator(".account-error[role=alert]")).toContainText("Temporary test outage");
  await expect(a.page.getByLabel("Full name")).toHaveValue("Unsaved edit");
  await a.page.unroute("**/api/v1/profile");

  stage = "logout and anonymous denial";
  await a.page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(a.page).toHaveURL(`${baseURL}/login`);
  assert.equal((await a.context.request.get("/api/v1/profile")).status(), 401);
  await a.page.goto("/account");
  await expect(a.page).toHaveURL(`${baseURL}/login`);
  await b.page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(b.page).toHaveURL(`${baseURL}/login`);
  assert.deepEqual(errors, []);
  console.log("PASS: real login, HttpOnly sessions, Supabase persistence, two-user isolation, phone layout, save-error recovery, logout, anonymous denial");
} catch (error) {
  console.error("Live account verification failed at", stage, "(", error.code ?? error.name, ")");
  if (currentPage) {
    console.error("Visible account state:", await currentPage.getByRole("heading", { level: 1 }).allTextContents().catch(() => []));
    console.error("Form message:", await currentPage.getByRole("alert").allTextContents().catch(() => []));
    await currentPage.screenshot({ path: "test-results/account-failure.png", fullPage: true }).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  await db.query("rollback").catch(() => {});
  try {
    await db.query("delete from auth.users where id = any($1::uuid[])", [users.map(u => u.id)]);
    console.log("Temporary live-test accounts and profiles removed.");
  } catch { console.error("Test cleanup failed; inspect reserved @careerforge.invalid test accounts."); process.exitCode = 1; }
  await db.end().catch(() => {});
}
