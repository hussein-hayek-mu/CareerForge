import assert from "node:assert/strict";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

export async function verifyCVLive(context) {
  const response = await context.request.get("/api/v1/profile");
  assert.equal(response.status(), 200);
  const { profile } = await response.json();
  const page = await context.newPage();
  try {
    const navigation = await page.goto("/cv");
    assert.ok(navigation.headers()["cache-control"].includes("no-store"));
    await expect(page.getByRole("article", { name: "CV preview" }).getByRole("heading", { level: 2 })).toHaveText(profile.name);
    await expect(page.locator(".cv-skills li")).toHaveCount(0);
    await page.goto("/skill-checks");
    const card = page.locator(".check-card").filter({ has: page.getByRole("heading", { name: "React", exact: true }) });
    const firstStart = page.waitForResponse(response => response.url().endsWith("/api/v1/skill-checks/sessions") && response.request().method() === "POST");
    await card.getByRole("button", { name: "Start check", exact: true }).click();
    const firstStartResponse = await firstStart;
    const firstStartBody = await firstStartResponse.json();
    assert.equal(firstStartResponse.status(), 200, firstStartBody.error?.message);
    const firstSession = firstStartBody.session;
    assert.equal(firstSession.timingMode, "standard");
    assert.equal(Date.parse(firstSession.deadlineAt) - Date.parse(firstSession.startedAt), 600000);
    await expect(page.getByRole("heading", { name: "React basics", exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Back to checks", exact: true }).click();
    await expect(card.getByRole("button", { name: "Resume check", exact: true })).toBeFocused();
    const resumed = page.waitForResponse(response => response.url().endsWith("/api/v1/skill-checks/sessions") && response.request().method() === "POST");
    await card.getByRole("button", { name: "Resume check", exact: true }).click();
    const resumedSession = (await (await resumed).json()).session;
    assert.equal(resumedSession.id, firstSession.id);
    assert.equal(resumedSession.deadlineAt, firstSession.deadlineAt);
    await page.reload();
    await expect(page.getByRole("heading", { name: "React basics", exact: true })).toBeVisible();
    await expect(page.locator(".notice")).toContainText("deadline has not restarted");
    await page.locator('input[name="r1"][value="1"]').check();
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("button", { name: "Back to checks", exact: true }).click();
    await expect(page.locator('input[name="r1"][value="1"]')).toBeChecked();
    page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("link", { name: "View my CV", exact: true }).click();
    await expect(page).toHaveURL(/\/skill-checks$/);
    await expect(page.locator('input[name="r1"][value="1"]')).toBeChecked();
    for (const [id, value] of Object.entries({ r1: 1, r2: 2, r3: 1, r4: 2, r5: 0 })) await page.locator(`input[name="${id}"][value="${value}"]`).check();
    const submission = "**/api/v1/skill-checks";
    await page.route(submission, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Temporary assessment outage" } }) }));
    await page.getByRole("button", { name: "Submit answers", exact: true }).click();
    await expect(page.locator(".form-error[role=alert]")).toContainText("Temporary assessment outage");
    await expect(page.locator('input[name="r1"][value="1"]')).toBeChecked();
    await expect(page.getByRole("button", { name: "Submit answers", exact: true })).toBeEnabled();
    await page.unroute(submission);
    await page.route(submission, route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { skill: "React", score: 5, passed: true } }) }));
    await page.getByRole("button", { name: "Submit answers", exact: true }).click();
    await expect(page.locator(".form-error[role=alert]")).toContainText("could not be verified");
    await expect(page.getByRole("heading", { name: "React basics", exact: true })).toBeVisible();
    await page.unroute(submission);
    await page.getByRole("button", { name: "Submit answers", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("5/5");
    await expect(card.getByRole("button")).toBeFocused();
    const repeated = await context.request.post("/api/v1/skill-checks", { data: { sessionId: firstSession.id, answers: { r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 } } });
    assert.equal(repeated.status(), 200);
    assert.equal((await repeated.json()).result.score, 5);
    const limited = await context.request.post("/api/v1/skill-checks/sessions", { data: { action: "start", skill: "SQL", version: 1, timingMode: "extended" } });
    assert.equal(limited.status(), 429);
    assert.ok(Number(limited.headers()["retry-after"]) > 0);
    const forged = await context.request.post("/api/v1/skill-checks", { data: { sessionId: firstSession.id, answers: { r1: 1, r2: 2, r3: 1, r4: 2, r5: 0 }, passed: true } });
    assert.equal(forged.status(), 400);
    assert.equal((await context.request.post("/api/v1/skill-checks", { headers: { Origin: "https://untrusted.example" }, data: {} })).status(), 403);
    // UI-only clock fixture. Real expiry, allowance and cancellation enforcement
    // are checked in the rolled-back DB suite; this never creates a grade.
    let selectedMode;
    await page.route("**/api/v1/skill-checks/sessions", route => {
      const input = route.request().postDataJSON();
      if (input.action === "cancel") return route.fulfill({ json: { cancelled: true } });
      selectedMode = input.timingMode;
      const fixture = input.timingMode === "extended"
        ? { ...firstSession, timingMode: "extended", deadlineAt: new Date(Date.parse(firstSession.startedAt) + 6000000).toISOString(), serverNow: firstSession.startedAt }
        : { ...firstSession, serverNow: new Date(Date.parse(firstSession.deadlineAt) - 4000).toISOString() };
      return route.fulfill({ json: { session: fixture } });
    });
    await card.getByRole("button", { name: "Retake check", exact: true }).click();
    await page.getByRole("button", { name: "Back to checks", exact: true }).click();
    await expect(card.getByRole("button", { name: "Start new attempt", exact: true })).toBeVisible({ timeout: 8000 });
    await expect(page.getByLabel("Time allowance for a new attempt")).toBeEnabled();
    await page.getByLabel("Time allowance for a new attempt").selectOption("extended");
    await card.getByRole("button", { name: "Start new attempt", exact: true }).click();
    await expect(page.getByRole("heading", { name: "React basics", exact: true })).toBeVisible();
    assert.equal(selectedMode, "extended");
    await expect(page.getByRole("timer")).toHaveText(/^(100:00|99:5\d)$/);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "End attempt", exact: true }).click();
    await expect(card.getByRole("button", { name: "Retake check", exact: true })).toBeVisible();
    await page.unroute("**/api/v1/skill-checks/sessions");
    await page.goto("/cv");
    await expect(page.locator(".cv-skills li")).toHaveCount(1);
    await expect(page.locator(".cv-skills li")).toHaveText("React");
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My CV", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("button", { name: "Print / save as PDF" })).toBeEnabled();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `test-results/cv-${width}.png`, fullPage: true, animations: "disabled" });
    }
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".cv-tools")).not.toBeVisible();
    await expect(page.locator(".cv-sheet")).toBeVisible();
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    assert.ok(pdf.length > 1000);
    await writeFile("test-results/cv-preview.pdf", pdf);
    console.log("PASS: real timed start/resume/reload and idempotent grading; draft/focus/error recovery; UI expiry while on list and extended-time selection; forged/cooldown denial; CV eligibility/reflow/PDF");
  } finally { await page.close(); }
}
