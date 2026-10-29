import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { expect } from "@playwright/test";

// Exercise the supplied builder inside CareerForge without promoting its local
// sample edits into saved profile facts or approved public snapshots.
export async function verifySuppliedBuilderLive(context) {
  const profileResponse = await context.request.get("/api/v1/profile");
  assert.equal(profileResponse.status(), 200);
  const savedProfile = await profileResponse.json();
  const page = await context.newPage();
  const errors = [];
  const accountWrites = [];
  const builder = page.locator(".pb");
  const desktopNavigation = page.locator(".app-sidebar nav");
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (["/api/v1/profile", "/api/v1/portfolio"].includes(path) && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) {
      accountWrites.push(`${request.method()} ${path}`);
    }
  });
  async function readWorkspaceChrome() {
    return page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const swatch = document.createElement("span");
      swatch.hidden = true;
      document.body.append(swatch);
      const color = token => {
        swatch.style.color = root.getPropertyValue(token);
        return getComputedStyle(swatch).color;
      };
      const palette = ["--paper", "--surface", "--raised"].map(color);
      const accent = color("--green");
      swatch.remove();
      const background = selector => getComputedStyle(document.querySelector(selector)).backgroundColor;
      return {
        palette, accent,
        panels: [".pb .panel", ".pb .toolbar", ".pb .hint", ".supplied-builder-bar"].map(background),
        selectedTab: background(".pb .toolbar > .seg .on"),
        generateButton: background(".pb .panel .btn.primary"),
        generateImage: getComputedStyle(document.querySelector(".pb .panel .btn.primary")).backgroundImage
      };
    });
  }
  async function expectCenteredPortfolio(width) {
    const geometry = await builder.locator(".preview").evaluate(preview => {
      const canvas = preview.querySelector(".port").getBoundingClientRect();
      const frame = preview.getBoundingClientRect();
      return {
        available: preview.clientWidth,
        width: canvas.width,
        center: canvas.left + canvas.width / 2,
        frameCenter: frame.left + preview.clientLeft + preview.clientWidth / 2
      };
    });
    assert.ok(Math.abs(geometry.center - geometry.frameCenter) <= 2, `Portfolio must be centered at ${width}px`);
    assert.ok(geometry.width <= geometry.available + 1 && geometry.width <= 1121, `Portfolio must fit its frame and stay readable at ${width}px`);
    assert.ok(geometry.width >= Math.min(640, Math.max(0, geometry.available - 48)), `Portfolio must use the available space at ${width}px`);
  }
  async function expectUnifiedNavigation(navigation) {
    const documents = navigation.getByRole("link", { name: "CV & Portfolio", exact: true });
    await expect(documents).toHaveCount(1);
    await expect(documents).toHaveAttribute("href", "/documents");
    await expect(documents).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: "My CV", exact: true })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: "My portfolio", exact: true })).toHaveCount(0);
  }
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto("/documents");
    assert.equal(response.status(), 200);
    assert.ok(response.headers()["cache-control"].includes("no-store"));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectUnifiedNavigation(desktopNavigation);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator(".supplied-builder-bar")).toContainText("Sample builder");
    await expect(page.locator(".supplied-builder-bar")).toContainText("Edits stay in this tab");
    await expect(builder.getByRole("heading", { name: "Turn rough notes into a portfolio and CV", exact: true })).toBeVisible();
    await expect(builder.getByRole("tab", { name: "Web portfolio", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(builder.locator(".hero h2")).toHaveText("Sara Khoury");
    const avatar = await builder.locator(".avatar").boundingBox();
    assert.ok(avatar.width > 150 && Math.abs(avatar.height / avatar.width - 1.25) < 0.02, "Portfolio photo frame must retain the supplied 4:5 layout");
    await expect(builder.locator(".socials a")).toHaveCount(5);
    await expect(builder.locator('.socials a[aria-label="Email"]')).toHaveAttribute("href", "mailto:sara.khoury@email.com");
    await expect(page.getByRole("link", { name: "Saved-profile CV", exact: true })).toHaveAttribute("href", "/cv/saved");
    await expect(page.getByRole("link", { name: "Manage publication", exact: true })).toHaveAttribute("href", "/portfolio/publication");

    const initialChrome = await readWorkspaceChrome();
    assert.ok(initialChrome.panels.every(color => initialChrome.palette.includes(color)), "Builder chrome must use the website surface colors");
    assert.equal(initialChrome.selectedTab, initialChrome.accent, "The view selector must use the website accent");
    assert.equal(initialChrome.generateButton, initialChrome.accent, "The Generate action must use the website accent");
    assert.equal(initialChrome.generateImage, "none", "Preview gradients must not theme the workspace action");
    await expectCenteredPortfolio(1440);
    await builder.getByRole("button", { name: "emerald", exact: true }).click();
    await expect(builder.getByRole("button", { name: "emerald", exact: true })).toHaveAttribute("aria-pressed", "true");
    assert.equal(await builder.evaluate(element => element.style.getPropertyValue("--a")), "#3ddc97");
    await builder.getByLabel("Custom color", { exact: true }).fill("#e06b50");
    assert.equal(await builder.evaluate(element => element.style.getPropertyValue("--a")), "#e06b50");
    await builder.getByRole("button", { name: "Switch to light mode", exact: true }).click();
    await expect(builder).toHaveAttribute("data-mode", "light");
    assert.deepEqual(await readWorkspaceChrome(), initialChrome, "Changing the preview theme must not recolor CareerForge controls");
    await builder.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
    await expect(builder).toHaveAttribute("data-mode", "dark");

    await builder.locator(".hero h2").fill("Local Draft Person");
    await builder.getByRole("button", { name: "+ Add skill", exact: true }).click();
    const newSkill = builder.locator(".chip").filter({ hasText: "New skill" });
    await newSkill.scrollIntoViewIfNeeded();
    await expect.poll(() => newSkill.evaluate(element => getComputedStyle(element).opacity)).toBe("1");
    await newSkill.getByRole("button", { name: "Remove New skill", exact: true }).click();
    await expect(newSkill).toHaveCount(0);
    await builder.locator('[data-sec="contact"]').scrollIntoViewIfNeeded();
    await expect(builder.getByRole("button", { name: "Back to top", exact: true })).toHaveClass(/show/);
    await expect.poll(() => builder.locator(".prog").evaluate(element => element.style.transform)).not.toBe("scaleX(0)");
    await builder.getByRole("button", { name: "Back to top", exact: true }).click();

    // Exercise the hero CTA without opening an interactive browser print dialog.
    await page.evaluate(() => { window.__builderPrintCalls = 0; window.print = () => { window.__builderPrintCalls++; }; });
    await builder.getByRole("button", { name: "Download CV", exact: true }).click();
    await expect(builder.getByRole("tab", { name: "CV", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => page.evaluate(() => window.__builderPrintCalls)).toBe(1);
    await expect(builder.locator(".cv.modern h1")).toHaveText("Local Draft Person");
    await expect(builder.getByRole("checkbox", { name: "Photo on CV", exact: true })).toBeDisabled();
    await builder.getByRole("button", { name: "Download PDF", exact: true }).click();
    assert.equal(await page.evaluate(() => window.__builderPrintCalls), 2);

    await builder.getByRole("tab", { name: "Email", exact: true }).click();
    const contact = builder.locator(".cdetail .ed");
    await expect(contact).toHaveText("sara.khoury@email.com");
    await contact.fill("local-draft@careerforge.invalid");
    await builder.getByRole("button", { name: "+ Add education", exact: true }).click();
    const education = builder.locator(".edu");
    await expect(education).toHaveCount(1);
    await education.locator(".cv-row strong .ed").fill("Local Test University");
    await education.locator(".edu-d .ed").fill("Local Degree Draft");
    await education.locator(".per .ed").fill("2024-2026");
    await builder.getByRole("button", { name: "+ Add language", exact: true }).click();
    const languages = builder.locator(".cv-side .mx-skills").nth(1);
    await languages.locator(".ed").fill("Arabic - working proficiency");
    await builder.getByRole("button", { name: "+ Add language", exact: true }).click();
    await languages.locator(".ed").last().fill("French draft");
    await builder.locator(".cv h1").click();
    await languages.locator(".mx-skill").filter({ hasText: "French draft" }).hover();
    await languages.getByRole("button", { name: "Remove French draft", exact: true }).click();
    await expect(languages.locator(".mx-skill")).toHaveCount(1);
    await builder.getByRole("tab", { name: "ATS-safe", exact: true }).click();
    await expect(builder.locator(".cv.ats h1")).toHaveText("Local Draft Person");
    for (const text of ["Local Test University", "Local Degree Draft", "Arabic - working proficiency", "local-draft@careerforge.invalid"]) {
      await expect(builder.locator(".cv.ats")).toContainText(text);
    }
    await builder.getByRole("tab", { name: "Modern", exact: true }).click();
    await education.hover();
    await education.getByRole("button", { name: "Remove education", exact: true }).click();
    await expect(education).toHaveCount(0);
    await builder.getByRole("button", { name: "+ Add education", exact: true }).click();
    await education.locator(".cv-row strong .ed").fill("Local Test University");
    await education.locator(".edu-d .ed").fill("Local Degree Draft");
    await builder.locator(".cv h1").click();

    await builder.getByRole("tab", { name: "Web portfolio", exact: true }).click();
    await expect(builder.locator('[data-sec="education"]')).toContainText("Local Test University");
    await builder.locator('input[type="file"]').setInputFiles({
      name: "local-test-photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6txsAAAAASUVORK5CYII=", "base64")
    });
    await expect(builder.locator(".avatar img")).toHaveAttribute("src", /^data:image\/png;base64,/);
    await builder.getByRole("tab", { name: "CV", exact: true }).click();
    await expect(builder.getByRole("checkbox", { name: "Photo on CV", exact: true })).toBeEnabled();
    await expect(builder.locator(".mx-photo")).toBeVisible();
    await builder.getByRole("checkbox", { name: "Photo on CV", exact: true }).uncheck();
    await expect(builder.locator(".mx-photo")).toHaveCount(0);

    for (const width of [320, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `CV overflow at ${width}px`);
      const menu = page.getByRole("button", { name: "Open navigation", exact: true });
      if (await menu.isVisible()) {
        await menu.click();
        const drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
        await expectUnifiedNavigation(drawer);
        await drawer.getByRole("link", { name: "CV & Portfolio", exact: true }).click();
        await expect(drawer).not.toBeVisible();
        await expect(page).toHaveURL(/\/documents$/);
      }
      await page.screenshot({ path: `test-results/supplied-builder-cv-${width}.png`, fullPage: true, animations: "disabled" });
      await builder.getByRole("tab", { name: "Web portfolio", exact: true }).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Portfolio overflow at ${width}px`);
      await expectCenteredPortfolio(width);
      await page.screenshot({ path: `test-results/supplied-builder-portfolio-${width}.png`, fullPage: true, animations: "disabled" });
      await builder.getByRole("tab", { name: "CV", exact: true }).click();
    }

    await page.emulateMedia({ media: "print" });
    for (const selector of [".pb .toolbar", ".supplied-builder-bar", ".app-sidebar", ".app-topbar"]) {
      await expect(page.locator(selector)).not.toBeVisible();
    }
    assert.equal(await page.locator(".app-main").evaluate(element => getComputedStyle(element).marginLeft), "0px");
    assert.equal(await page.locator(".app-content").evaluate(element => getComputedStyle(element).padding), "0px");
    await expect(builder.locator(".cv.modern")).toBeVisible();
    await expect(builder.locator(".cprint")).toBeVisible();
    await expect(builder.locator(".cprint")).toContainText("local-draft@careerforge.invalid");
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.length > 1000);
    await writeFile("test-results/supplied-builder-cv.pdf", pdf);
    await page.emulateMedia({ media: "screen" });

    await builder.getByLabel("Your notes", { exact: true }).fill("i'm demo applicant, frontend developer.");
    const generation = page.waitForResponse(response => new URL(response.url()).pathname === "/api/generate" && response.request().method() === "POST");
    await builder.getByRole("button", { name: "Generate with AI", exact: true }).click();
    assert.equal((await generation).status(), 501);
    await expect(builder.locator(".note[role=status]")).toContainText("Demo mode");
    await expect(builder.locator(".cv h1")).toHaveText("Demo Applicant");
    assert.deepEqual(await (await context.request.get("/api/v1/profile")).json(), savedProfile);
    assert.deepEqual(accountWrites, []);

    for (const path of ["/cv", "/portfolio"]) {
      const legacy = await page.goto(path);
      assert.equal(legacy.status(), 200);
      assert.ok(legacy.headers()["cache-control"].includes("no-store"));
      await expect(page).toHaveURL(/\/documents$/);
      await expectUnifiedNavigation(desktopNavigation);
      await expect(builder.locator(".hero h2")).toHaveText("Sara Khoury");
    }
    for (const path of ["/cv/saved", "/portfolio/publication"]) {
      await page.goto(path);
      await expectUnifiedNavigation(desktopNavigation);
      await desktopNavigation.getByRole("link", { name: "CV & Portfolio", exact: true }).click();
      await expect(page).toHaveURL(/\/documents$/);
      await expect(builder.locator(".hero h2")).toHaveText("Sara Khoury");
    }
    await builder.getByRole("tab", { name: "CV", exact: true }).click();
    await expect(builder.locator(".cv.modern h1")).toHaveText("Sara Khoury");
    await page.reload();
    await expect(builder.locator(".hero h2")).toHaveText("Sara Khoury");
    assert.deepEqual(errors, []);
    console.log("PASS: unified CV & Portfolio navigation/aliases; supplied education/language/contact/photo editing, visible skill insertion, styles, print CTA/PDF, source isolation, 320/768/1440/1920 centered preview, website-colored chrome and demo generation");
  } catch (error) {
    console.error("Supplied builder verification:", error.message);
    await page.screenshot({ path: "test-results/supplied-builder-failure.png", fullPage: true }).catch(() => {});
    throw error;
  } finally { await page.close(); }
}