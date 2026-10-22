import assert from "node:assert/strict";
import { expect } from "@playwright/test";

export async function verifyTrackerLive({ a, b, second, userB }) {
  const list = async client => (await (await client.context.request.get("/api/v1/applications")).json()).applications;
  const endpoint = "/api/v1/applications/1";
  const first = (await list(a))[0];
  assert.equal(first.jobId, "1");
  assert.equal(first.status, "Saved");
  assert.equal((await (await second.context.request.get("/api/v1/applications")).json()).applications[0].revision, first.revision);
  await second.page.goto("/applications");
  const selector = second.page.getByLabel("Status for Junior Frontend Developer");
  await selector.selectOption("Interview");
  await expect(second.page.getByRole("status")).toContainText("status saved to your account");
  await second.page.reload();
  await expect(selector).toHaveValue("Interview");
  assert.equal(await second.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  // Saving again is idempotent and must preserve Interview, never reset Saved.
  const repeated = await a.context.request.post("/api/v1/applications", { data: { jobId: "1" } });
  assert.equal(repeated.status(), 200);
  assert.equal((await repeated.json()).application.status, "Interview");
  assert.equal((await list(a)).length, 1);
  assert.equal((await a.context.request.patch(endpoint, { data: { status: "Offer", revision: first.revision } })).status(), 409);
  assert.equal((await a.context.request.delete(endpoint, { data: { revision: first.revision } })).status(), 409);
  assert.equal((await a.context.request.post("/api/v1/applications", { data: { jobId: "1", user_id: userB } })).status(), 400);
  assert.equal((await a.context.request.post("/api/v1/applications", { headers: { Origin: "https://untrusted.example" }, data: { jobId: "1" } })).status(), 403);
  assert.equal((await a.context.request.post("/api/v1/applications", { data: { jobId: "missing-role" } })).status(), 404);
  assert.equal((await b.context.request.patch(endpoint, { data: { status: "Offer", revision: first.revision } })).status(), 404);
  assert.equal((await list(b)).length, 0);

  await a.page.goto("/applications");
  const desktopStatus = a.page.getByLabel("Status for Junior Frontend Developer");
  await expect(desktopStatus).toHaveValue("Interview");
  // Simulate another device changing the row while this screen stays open.
  const previous = (await list(a))[0];
  assert.equal((await second.context.request.patch(endpoint, { data: { status: "Offer", revision: previous.revision } })).status(), 200);
  await desktopStatus.selectOption("Applied");
  await expect(a.page.getByRole("status")).toContainText("changed elsewhere");
  await expect(desktopStatus).toHaveValue("Offer");

  // A failed write must not display an optimistic success or lose confirmed state.
  await a.page.route("**/api/v1/applications/1", route => route.request().method() === "PATCH"
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "TEST_OUTAGE", message: "Temporary outage" } }) }) : route.continue());
  await desktopStatus.selectOption("Rejected");
  await expect(a.page.getByRole("status")).toContainText("could not be confirmed");
  await expect(desktopStatus).toHaveValue("Offer");
  await a.page.unroute("**/api/v1/applications/1");

  // Refresh outage keeps confirmed data visible and blocks edits until retry.
  await a.page.route("**/api/v1/applications", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await a.page.getByRole("button", { name: "Refresh opportunities" }).click();
  await expect(a.page.locator(".account-error[role=alert]")).toContainText("could not be refreshed");
  await expect(desktopStatus).toBeDisabled();
  await a.page.unroute("**/api/v1/applications");
  await a.page.getByRole("button", { name: "Refresh opportunities" }).click();
  await expect(desktopStatus).toBeEnabled();
  await a.page.screenshot({ path: "test-results/tracker-desktop.png", fullPage: true, animations: "disabled" });

  await second.page.goto("/applications");
  await expect(selector).toHaveValue("Offer");
  await second.page.screenshot({ path: "test-results/tracker-mobile.png", fullPage: true, animations: "disabled" });
  await second.page.getByRole("button", { name: "Remove Junior Frontend Developer from tracker", exact: true }).click();
  await expect(second.page.getByRole("status")).toContainText("removed from your account");
  await expect(second.page.locator(".tracker-row")).toHaveCount(0);
  await a.page.reload();
  await expect(a.page.locator(".tracker-row")).toHaveCount(0);
  assert.equal((await list(a)).length, 0);
  await a.page.goto("/account");
  console.log("PASS: cross-browser/phone tracker persistence, duplicate-save preservation, conflict recovery, owner isolation, failed write/refresh recovery and removal");
}
