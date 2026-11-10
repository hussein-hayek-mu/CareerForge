import { test } from "node:test";
import assert from "node:assert/strict";
import { documentDemoHandlers } from "./document-demo-handlers";

const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/generate", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body)
});

test("document demo rejects foreign origins before auth and denies unsigned users", async () => {
  let calls = 0;
  const handlers = documentDemoHandlers(async () => { calls++; return false; });
  assert.equal((await handlers.POST(request({ text: "notes" }, "https://foreign.example"))).status, 403);
  assert.equal(calls, 0);
  assert.equal((await handlers.POST(request({ text: "notes" }))).status, 401);
  assert.equal(calls, 1);
});

test("document demo validates bounded notes without accepting arbitrary fields", async () => {
  const { POST } = documentDemoHandlers(async () => true);
  for (const body of [null, {}, { text: "   " }, { text: 12 }, { text: "x".repeat(8001) }, { text: "notes", ownerId: "someone-else" }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  const malformed = new Request("http://localhost:3000/api/generate", { method: "POST", body: "{" });
  assert.equal((await POST(malformed)).status, 400);
  const oversized = new Request("http://localhost:3000/api/generate", {
    method: "POST", headers: { "content-length": "65537" }, body: JSON.stringify({ text: "notes" })
  });
  assert.equal((await POST(oversized)).status, 400);
  assert.equal((await POST(request({ text: "x".repeat(65537) }))).status, 400);
});

test("document demo explicitly returns private 501 without echoing applicant notes", async () => {
  const { POST } = documentDemoHandlers(async () => true);
  for (const text of ["private applicant notes", "x".repeat(8000), "🙂".repeat(4000)]) {
    const response = await POST(request({ text }));
    assert.equal(response.status, 501);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("vary"), "Cookie, Authorization");
    const body = await response.json() as { error: { code: string; message: string } };
    assert.equal(body.error.code, "NOT_IMPLEMENTED");
    assert.match(body.error.message, /fictional sample content/);
    assert.equal(body.error.message.includes(text), false);
  }
});

test("document demo reports session outages safely and keeps the supplied UI error shape", async () => {
  const unavailable = documentDemoHandlers(async () => { throw new Error("provider secret"); });
  const response = await unavailable.POST(request({ text: "notes" }));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("provider secret"), false);
  for (const [authorize, body, origin, status] of [
    [async () => true, { text: "notes" }, "http://localhost:3000", 501],
    [async () => false, { text: "notes" }, "http://localhost:3000", 401],
    [async () => true, {}, "http://localhost:3000", 400],
    [async () => true, { text: "notes" }, "https://foreign.example", 403],
    [async () => { throw new Error("secret"); }, { text: "notes" }, "http://localhost:3000", 503]
  ] as const) {
    const legacy = await documentDemoHandlers(authorize).compatibilityPOST(request(body, origin));
    assert.equal(legacy.status, status);
    assert.equal(legacy.headers.get("cache-control"), "no-store");
    assert.equal(typeof (await legacy.json() as { error: unknown }).error, "string");
  }
});
