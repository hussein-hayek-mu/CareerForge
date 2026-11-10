import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function verifyPortfolioLive(context) {
  const profileResponse = await context.request.get("/api/v1/profile");
  const original = (await profileResponse.json()).profile;
  const baseURL = new URL(profileResponse.url()).origin;
  const page = await context.newPage();
  const anonymous = await context.browser().newContext({ baseURL });
  const publicPage = await anonymous.newPage();
  const fixture = { ...original, bio: "Portfolio introduction from source.", education: "Private education detail", project: "Portfolio project from source.", location: "Private location detail" };
  try {
    assert.equal((await context.request.put("/api/v1/profile", { data: fixture })).status(), 200);
    const response = await page.goto("/portfolio/publication");
    assert.equal(response.status(), 200);
    assert.ok(response.headers()["cache-control"].includes("no-store"));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make your work visible.");
    await expect(page.getByRole("button", { name: "Publish reviewed portfolio", exact: true })).toBeDisabled();
    const preview = page.getByRole("article", { name: "Portfolio preview" });
    await expect(preview).toContainText(fixture.bio);
    await expect(preview.locator(".portfolio-skills li")).toHaveCount(1);
    await expect(preview.locator(".portfolio-skills li")).toContainText("React");
    await expect(preview).not.toContainText(fixture.education);
    await expect(preview).not.toContainText(fixture.location);
    await page.getByRole("radio", { name: /Editorial/ }).check();
    await page.getByRole("button", { name: "Save private choices", exact: true }).click();
    await expect(page.locator(".notice[role=status]")).toContainText("choices saved");
    let state = await (await context.request.get("/api/v1/portfolio")).json();
    const path = `/p/${state.settings.slug}`;
    assert.equal((await anonymous.request.get(path)).status(), 404);
    assert.equal((await anonymous.request.get("/api/v1/portfolio")).status(), 401);
    await page.reload();
    await expect(page.getByRole("radio", { name: /Editorial/ })).toBeChecked();
    await page.getByRole("checkbox", { name: /I reviewed this preview/ }).check();
    await page.getByRole("button", { name: "Publish reviewed portfolio", exact: true }).click();
    await expect(page.locator(".notice[role=status]")).toContainText("snapshot is public");
    const shared = await publicPage.goto(path);
    assert.equal(shared.status(), 200);
    assert.ok(shared.headers()["cache-control"].includes("no-store"));
    await expect(publicPage.getByRole("heading", { level: 1 })).toHaveText(fixture.name);
    await expect(publicPage.getByRole("article")).toContainText(fixture.project);
    await expect(publicPage.getByRole("article")).not.toContainText(fixture.education);
    await expect(publicPage.getByRole("article")).not.toContainText(fixture.location);
    assert.equal((await publicPage.content()).includes("careerforge.invalid"), false);
    await expect(publicPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await publicPage.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await publicPage.evaluate(() => window.scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/portfolio-editor-${width}.png`, fullPage: true, animations: "disabled" });
      await publicPage.screenshot({ path: `test-results/portfolio-public-${width}.png`, fullPage: true, animations: "disabled" });
    }
    const changed = { ...fixture, project: "New private project after publication." };
    assert.equal((await context.request.put("/api/v1/profile", { data: changed })).status(), 200);
    await publicPage.reload();
    await expect(publicPage.getByRole("article")).toContainText(fixture.project);
    await expect(publicPage.getByRole("article")).not.toContainText(changed.project);
    await page.getByRole("checkbox", { name: /I reviewed this preview/ }).check();
    await page.getByRole("button", { name: "Update public snapshot", exact: true }).click();
    await expect(page.locator(".form-error[role=alert]")).toContainText("evidence changed");
    await page.getByRole("button", { name: "Reload saved state", exact: true }).click();
    await expect(preview).toContainText(changed.project);
    state = await (await context.request.get("/api/v1/portfolio")).json();
    assert.equal((await context.request.put("/api/v1/portfolio", { data: { action: "save", template: "studio", sections: state.settings.sections, revision: state.settings.revision, sourceToken: state.sourceToken } })).status(), 200);
    await page.getByRole("radio", { name: /Studio/ }).check();
    await page.getByRole("button", { name: "Save private choices", exact: true }).click();
    await expect(page.locator(".form-error[role=alert]")).toContainText("changed elsewhere");
    await expect(page.getByRole("radio", { name: /Studio/ })).toBeChecked();
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Reload saved state", exact: true }).click();
    await page.route("**/api/v1/portfolio", route => route.request().method() === "PUT" ? route.fulfill({ status: 503, json: { error: { message: "Temporary portfolio outage" } } }) : route.continue());
    await page.getByRole("radio", { name: /Editorial/ }).check();
    await page.getByRole("button", { name: "Save private choices", exact: true }).click();
    await expect(page.locator(".form-error[role=alert]")).toContainText("Temporary portfolio outage");
    await expect(page.getByRole("radio", { name: /Editorial/ })).toBeChecked();
    await page.unroute("**/api/v1/portfolio");
    await page.getByRole("button", { name: "Make private & save choices", exact: true }).click();
    await expect(page.locator(".notice[role=status]")).toContainText("portfolio is private");
    assert.equal((await publicPage.goto(path)).status(), 404);
    assert.equal((await anonymous.request.get("/p/invalid-slug")).status(), 404);
    console.log("PASS: portfolio template persistence, consent-gated publication, selected-field and assessed-skill privacy, no-store/noindex, source/revision conflicts, draft preservation, 320/768/1440 reflow and public revocation");
  } catch (error) {
    console.error("Portfolio UI message:", await page.locator(".form-error[role=alert]").allTextContents().catch(() => []));
    await page.screenshot({ path: "test-results/portfolio-failure.png", fullPage: true }).catch(() => {});
    throw error;
  } finally {
    const current = await context.request.get("/api/v1/portfolio");
    if (current.ok()) {
      const data = await current.json();
      if (data.settings.isPublic) assert.equal((await context.request.put("/api/v1/portfolio", { data: { action: "unpublish", ...{ revision: data.settings.revision, template: data.settings.template, sections: data.settings.sections, sourceToken: data.sourceToken } } })).status(), 200);
    }
    assert.equal((await context.request.put("/api/v1/profile", { data: original })).status(), 200);
    await publicPage.close(); await anonymous.close(); await page.close();
  }
}
