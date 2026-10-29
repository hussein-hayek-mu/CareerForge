import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { expect } from "@playwright/test";

// The supplied component is intentionally unchanged. Exercise its real controls
// while proving that its local sample edits cannot modify saved account facts.
export async function verifySuppliedBuilderLive(context) {
  const profileResponse = await context.request.get("/api/v1/profile");
  assert.equal(profileResponse.status(), 200);
  const savedProfile = await profileResponse.json();
  const page = await context.newPage();
  const errors = [];
  const accountWrites = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (["/api/v1/profile", "/api/v1/portfolio"].includes(path) && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      accountWrites.push(`${request.method()} ${path}`);
    }
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto("/portfolio");
    assert.equal(response.status(), 200);
    assert.ok(response.headers()["cache-control"].includes("no-store"));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator(".supplied-builder-bar")).toContainText("Sample builder");
    await expect(page.locator(".supplied-builder-bar")).toContainText("Edits stay in this tab");
    await expect(page.getByRole("heading", { name: "Turn rough notes into a portfolio and CV", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Web portfolio", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".pb .hero h2")).toHaveText("Sara Khoury");
    const avatar = await page.locator(".pb .avatar").boundingBox();
    assert.ok(avatar.width > 150 && Math.abs(avatar.height / avatar.width - 1.25) < 0.02, "Portfolio photo frame must retain the supplied 4:5 layout");
    await expect(page.getByRole("link", { name: "Saved-profile CV", exact: true })).toHaveAttribute("href", "/cv/saved");
    await expect(page.getByRole("link", { name: "Manage publication", exact: true })).toHaveAttribute("href", "/portfolio/publication");

    await page.getByRole("button", { name: "emerald", exact: true }).click();
    await expect(page.getByRole("button", { name: "emerald", exact: true })).toHaveAttribute("aria-pressed", "true");
    assert.equal(await page.locator(".pb").evaluate(element => element.style.getPropertyValue("--a")), "#3ddc97");
    await page.getByLabel("Custom color", { exact: true }).fill("#e06b50");
    assert.equal(await page.locator(".pb").evaluate(element => element.style.getPropertyValue("--a")), "#e06b50");
    await page.getByRole("button", { name: "Switch to light mode", exact: true }).click();
    await expect(page.locator(".pb")).toHaveAttribute("data-mode", "light");
    await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
    await expect(page.locator(".pb")).toHaveAttribute("data-mode", "dark");

    await page.locator(".pb .hero h2").fill("Local Draft Person");
    await page.getByRole("tab", { name: "CV", exact: true }).click();
    await expect(page.locator(".pb .cv.modern h1")).toHaveText("Local Draft Person");
    await expect(page.getByRole("checkbox", { name: "Photo on CV", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Download PDF", exact: true })).toBeEnabled();
    await page.getByRole("tab", { name: "ATS-safe", exact: true }).click();
    await expect(page.locator(".pb .cv.ats h1")).toHaveText("Local Draft Person");
    await expect(page.locator(".pb .cv.ats")).toContainText("Summary");
    await page.getByRole("tab", { name: "Modern", exact: true }).click();
    await expect(page.locator(".pb .cv.modern")).toBeVisible();

    await page.getByRole("tab", { name: "Web portfolio", exact: true }).click();
    // This tiny local image never leaves the browser or enters account storage.
    await page.locator('.pb input[type="file"]').setInputFiles({
      name: "local-test-photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6txsAAAAASUVORK5CYII=", "base64")
    });
    await expect(page.locator(".pb .avatar img")).toHaveAttribute("src", /^data:image\/png;base64,/);
    await page.getByRole("tab", { name: "CV", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Photo on CV", exact: true })).toBeEnabled();
    await expect(page.locator(".pb .mx-photo")).toBeVisible();
    await page.getByRole("checkbox", { name: "Photo on CV", exact: true }).uncheck();
    await expect(page.locator(".pb .mx-photo")).toHaveCount(0);

    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `CV overflow at ${width}px`);
      await page.screenshot({ path: `test-results/supplied-builder-cv-${width}.png`, fullPage: true, animations: "disabled" });
      await page.getByRole("tab", { name: "Web portfolio", exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Portfolio overflow at ${width}px`);
      await page.screenshot({ path: `test-results/supplied-builder-portfolio-${width}.png`, fullPage: true, animations: "disabled" });
      await page.getByRole("tab", { name: "CV", exact: true }).click();
    }

    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".pb .toolbar")).not.toBeVisible();
    await expect(page.locator(".supplied-builder-bar")).not.toBeVisible();
    await expect(page.locator(".pb .cv.modern")).toBeVisible();
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.length > 1000);
    await writeFile("test-results/supplied-builder-cv.pdf", pdf);
    await page.emulateMedia({ media: "screen" });

    await page.getByLabel("Your notes", { exact: true }).fill("i'm demo applicant, frontend developer.");
    const generation = page.waitForResponse(response => new URL(response.url()).pathname === "/api/generate" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Generate with AI", exact: true }).click();
    assert.equal((await generation).status(), 501);
    await expect(page.locator(".pb .note[role=status]")).toContainText("Demo mode");
    await expect(page.locator(".pb .cv h1")).toHaveText("Demo Applicant");
    assert.deepEqual(await (await context.request.get("/api/v1/profile")).json(), savedProfile);
    assert.deepEqual(accountWrites, []);

    const cvRoute = await page.goto("/cv");
    assert.equal(cvRoute.status(), 200);
    assert.ok(cvRoute.headers()["cache-control"].includes("no-store"));
    await expect(page.getByRole("tab", { name: "Web portfolio", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".pb .hero h2")).toHaveText("Sara Khoury");
    await page.getByRole("tab", { name: "CV", exact: true }).click();
    await expect(page.locator(".pb .cv.modern h1")).toHaveText("Sara Khoury");
    await page.reload();
    await expect(page.locator(".pb .hero h2")).toHaveText("Sara Khoury");
    assert.deepEqual(errors, []);
    console.log("PASS: exact supplied builder on CV/portfolio routes; local edits, styles, accent/mode/photo, demo generation, source isolation, 320/1440 reflow and PDF");
  } catch (error) {
    await page.screenshot({ path: "test-results/supplied-builder-failure.png", fullPage: true }).catch(() => {});
    throw error;
  } finally { await page.close(); }
}
