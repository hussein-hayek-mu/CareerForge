import assert from "node:assert/strict";
import { test } from "node:test";
import { jobs } from "@/lib/demo-workspace";
import { trackerHandlers, TrackerError, type TrackerAccess } from "./handlers";

const job = { ...jobs[0], isActive: true, isFictional: true };
const entry = { jobId: "1", status: "Interview" as const, revision: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", createdAt: "2026-10-22", updatedAt: "2026-10-22", job };
test("limited tracker writes share an owner budget while reads remain available", async () => {
  let writes = 0;
  const fail = async (): Promise<never> => { writes++; throw new Error("Must not write"); };
  const handler = trackerHandlers(async () => access({ userId: "verified-owner", save: fail, update: fail, remove: fail }), (scope, id) => {
    assert.equal(scope, "tracker"); assert.equal(id, "verified-owner"); return 15;
  });
  for (const response of [await handler.POST(request("POST", { jobId: "1" })), await handler.PATCH(request("PATCH", { revision: entry.revision, status: "Offer" }), "1"), await handler.DELETE(request("DELETE", { revision: entry.revision }), "1")]) {
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("Retry-After"), "15");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(writes, 0);
  assert.equal((await handler.GET(request("GET"))).status, 200);
});
function access(overrides: Partial<TrackerAccess> = {}): TrackerAccess {
  return { userId: "tracker-test-owner", jobs: async () => [job], list: async () => [entry], save: async () => ({ application: entry, created: false }), update: async () => entry, remove: async () => {}, ...overrides };
}
function request(method: string, body?: unknown, headers = {}) {
  return new Request("http://localhost/api/v1/applications", { method, headers: { "Content-Type": "application/json", ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

test("tracker routes deny anonymous reads and mutations and block foreign origins", async () => {
  const h = trackerHandlers(async () => null);
  for (const result of [await h.GET(request("GET")), await h.jobs(request("GET")), await h.POST(request("POST", { jobId: "1" })), await h.PATCH(request("PATCH", {}), "1"), await h.DELETE(request("DELETE", {}), "1")]) assert.equal(result.status, 401);
  assert.equal((await h.POST(request("POST", {}, { Origin: "https://untrusted.example" }))).status, 403);
});

test("tracker validates status/revision/owner injection and filters before accessing data", async () => {
  const fail = async (): Promise<never> => { throw new Error("Should not access data"); };
  const h = trackerHandlers(async () => access({ save: fail, update: fail, remove: fail, jobs: fail, list: fail }));
  assert.equal((await h.POST(request("POST", { jobId: "1", user_id: "other" }))).status, 400);
  assert.equal((await h.POST(request("POST", { jobId: "../1" }))).status, 400);
  assert.equal((await h.POST(request("POST", { jobId: "x".repeat(2100) }))).status, 400);
  assert.equal((await h.PATCH(request("PATCH", { status: "Invalid", revision: entry.revision }), "1")).status, 400);
  assert.equal((await h.PATCH(request("PATCH", { status: "Saved", revision: "invalid" }), "1")).status, 400);
  assert.equal((await h.DELETE(request("DELETE", { revision: entry.revision, role: "admin" }), "1")).status, 400);
  assert.equal((await h.jobs(new Request("http://localhost/api/v1/jobs?mode=Wrong"))).status, 400);
  assert.equal((await h.GET(new Request("http://localhost/api/v1/applications?user_id=other"))).status, 400);
});

test("tracker returns private uncached data and duplicate saves preserve current status", async () => {
  const h = trackerHandlers(async () => access());
  const result = await h.POST(request("POST", { jobId: "1" }));
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal((await result.json()).application.status, "Interview");
  assert.equal((await h.POST(request("POST", { jobId: "1" }))).status, 200);
  assert.equal((await h.GET(request("GET"))).status, 200);
  assert.equal((await h.jobs(new Request("http://localhost/api/v1/jobs?search=React&mode=Hybrid"))).status, 200);
  const filtered = await h.jobs(new Request("http://localhost/api/v1/jobs?search=does-not-exist"));
  assert.deepEqual(await filtered.json(), { jobs: [] });
});

test("tracker forwards validated CAS revisions and returns proper create/delete responses", async () => {
  const h = trackerHandlers(async () => access({
    save: async () => ({ application: entry, created: true }),
    update: async (id, revision, status) => { assert.equal(id, "1"); assert.equal(revision, entry.revision); assert.equal(status, "Offer"); return { ...entry, status }; },
    remove: async (id, revision) => { assert.equal(id, "1"); assert.equal(revision, entry.revision); }
  }));
  assert.equal((await h.POST(request("POST", { jobId: "1" }))).status, 201);
  assert.equal((await h.PATCH(request("PATCH", { revision: entry.revision, status: "Offer" }), "1")).status, 200);
  const removed = await h.DELETE(request("DELETE", { revision: entry.revision }), "1");
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), "");
});

test("tracker distinguishes conflicts/missing entries and sanitizes storage failures", async () => {
  for (const [error, status] of [[new TrackerError("CONFLICT", "Refresh and choose again.", 409), 409], [new TrackerError("NOT_FOUND", "Unavailable.", 404), 404], [new Error("secret database string"), 503]] as const) {
    const h = trackerHandlers(async () => access({ update: async () => { throw error; } }));
    const result = await h.PATCH(request("PATCH", { revision: entry.revision, status: "Offer" }), "1");
    assert.equal(result.status, status);
    assert.equal((await result.text()).includes("secret database"), false);
  }
});
