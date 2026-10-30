import assert from "node:assert/strict";
import { test } from "node:test";
import { profileHistoryHandlers, ProfileHistoryError, type HistoryAccess } from "./profile-history-handlers";
import { educationFieldsSchema, experienceFieldsSchema, type HistoryFields, type HistoryKind } from "./profile-history";

const id = "59c363b4-1182-43a4-a3ef-c7ea9f306f70";
const revision = "144a3ce8-9d77-4870-ac94-41654895817c";
const requestId = "4c805f9a-fcba-4cef-877f-f9fdc4bc82af";
const fields = {
  education: educationFieldsSchema.parse({ institution: "University", degree: "Computer Science", gpa: 3.875, gpaScale: 4 }),
  experience: experienceFieldsSchema.parse({ company: "Company", role: "Developer", description: "Built an accessible form." })
};
function record(kind: HistoryKind, value: HistoryFields = fields[kind]) {
  return { ...value, id, revision, createdAt: "2026-10-30T00:00:00Z", updatedAt: "2026-10-30T00:00:00Z", evidenceStatus: "self_reported" };
}
function request(kind: HistoryKind, method: string, body?: unknown, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000/api/v1/${kind}`, {
    method, headers: { Origin: origin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}
function fixture(kind: HistoryKind, overrides: Partial<HistoryAccess> = {}) {
  let writes = 0;
  const access: HistoryAccess = {
    userId: "verified-owner", readAll: async () => ({ education: [], experience: [] }),
    list: async () => [record(kind)],
    create: async (receivedKind, token, value) => {
      assert.equal(receivedKind, kind); assert.equal(token, requestId); writes++;
      return { record: record(kind, value), created: true };
    },
    update: async (receivedKind, receivedId, token, value) => {
      assert.equal(receivedKind, kind); assert.equal(receivedId, id); assert.equal(token, revision); writes++;
      return record(kind, value);
    },
    remove: async (receivedKind, receivedId, token) => {
      assert.equal(receivedKind, kind); assert.equal(receivedId, id); assert.equal(token, revision); writes++;
    },
    ...overrides
  };
  return { access, writes: () => writes };
}

for (const kind of ["education", "experience"] as const) {
  test(`${kind}: anonymous access and foreign mutations cannot reach private data`, async () => {
    let authorizations = 0;
    const routes = profileHistoryHandlers(kind, async () => { authorizations++; return null; });
    assert.equal((await routes.GET(request(kind, "GET"))).status, 401);
    assert.equal((await routes.POST(request(kind, "POST", { ...fields[kind], requestId }))).status, 401);
    const before = authorizations;
    assert.equal((await routes.POST(request(kind, "POST", {}, "https://foreign.invalid"))).status, 403);
    assert.equal(authorizations, before);
  });

  test(`${kind}: invalid metadata, revisions and bounded JSON cannot perform a write`, async () => {
    const { access, writes } = fixture(kind);
    const routes = profileHistoryHandlers(kind, async () => access, () => 0);
    for (const extra of [{ user_id: "another-owner" }, { evidenceStatus: "verified" }, { id }, { revision }]) {
      assert.equal((await routes.POST(request(kind, "POST", { ...fields[kind], requestId, ...extra }))).status, 400);
    }
    assert.equal((await routes.PUT(request(kind, "PUT", fields[kind]), id)).status, 400);
    assert.equal((await routes.DELETE(request(kind, "DELETE", { revision: "invalid" }), id)).status, 400);
    assert.equal((await routes.PUT(request(kind, "PUT", { ...fields[kind], revision }), "invalid")).status, 400);
    for (const body of ["{", JSON.stringify({ requestId, description: "x".repeat(17_000) })]) {
      const malformed = new Request(`http://localhost:3000/api/v1/${kind}`, { method: "POST", body });
      assert.equal((await routes.POST(malformed)).status, 400);
    }
    assert.equal(writes(), 0);
  });

  test(`${kind}: create, retry, update and delete retain private response and revision contracts`, async () => {
    const { access, writes } = fixture(kind);
    const routes = profileHistoryHandlers(kind, async () => access, () => 0);
    const created = await routes.POST(request(kind, "POST", { ...fields[kind], requestId }));
    assert.equal(created.status, 201);
    assert.equal(created.headers.get("cache-control"), "no-store");
    assert.equal(created.headers.get("vary"), "Cookie, Authorization");
    assert.deepEqual((await created.json()).record, record(kind));
    const retry = profileHistoryHandlers(kind, async () => ({ ...access, create: async () => ({ record: record(kind), created: false }) }), () => 0);
    assert.equal((await retry.POST(request(kind, "POST", { ...fields[kind], requestId }))).status, 200);
    assert.equal((await routes.PUT(request(kind, "PUT", { ...fields[kind], revision }), id)).status, 200);
    const removed = await routes.DELETE(request(kind, "DELETE", { revision }), id);
    assert.equal(removed.status, 204);
    assert.equal(await removed.text(), "");
    assert.equal(writes(), 3);
    assert.equal((await routes.GET(request(kind, "GET"))).status, 200);
    assert.equal((await routes.GET(new Request(`http://localhost:3000/api/v1/${kind}?user_id=another-owner`))).status, 400);
  });

  test(`${kind}: rate limits block changes but preserve reads, and storage failures are sanitized`, async () => {
    const { access, writes } = fixture(kind);
    const limited = profileHistoryHandlers(kind, async () => access, (scope, owner) => {
      assert.equal(scope, "history"); assert.equal(owner, "verified-owner"); return 12;
    });
    const denied = await limited.POST(request(kind, "POST", { ...fields[kind], requestId }));
    assert.equal(denied.status, 429); assert.equal(denied.headers.get("retry-after"), "12");
    assert.equal((await limited.GET(request(kind, "GET"))).status, 200);
    assert.equal(writes(), 0);
    const failing = profileHistoryHandlers(kind, async () => { throw new Error("private-database-details"); });
    const unavailable = await failing.GET(request(kind, "GET"));
    assert.equal(unavailable.status, 503); assert.equal((await unavailable.text()).includes("private-database-details"), false);
    const conflict = profileHistoryHandlers(kind, async () => ({ ...access, update: async () => { throw new ProfileHistoryError("CONFLICT", "Reload saved records.", 409); } }), () => 0);
    assert.equal((await conflict.PUT(request(kind, "PUT", { ...fields[kind], revision }), id)).status, 409);
  });
}

test("history fields reject invalid dates and unsupported claims without rounding valid GPA", () => {
  assert.equal(educationFieldsSchema.parse({ institution: "U", degree: "D", gpa: 3.875, gpaScale: 4 }).gpa, 3.875);
  for (const extra of [
    { gpa: 4.1, gpaScale: 4 }, { gpa: 3.5 }, { gpaScale: 4 },
    { startDate: "2025-02-29" }, { startDate: "2026-01-01", endDate: "2025-01-01" },
    { isCurrent: true, endDate: "2026-01-01" }, { evidenceStatus: "issuer_verified" }
  ]) assert.equal(educationFieldsSchema.safeParse({ institution: "U", degree: "D", ...extra }).success, false);
});
