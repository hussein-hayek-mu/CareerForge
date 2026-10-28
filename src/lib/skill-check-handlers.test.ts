import assert from "node:assert/strict";
import { test } from "node:test";
import { skillCheckHandlers, type SkillCheckAccess } from "./skill-check-handlers";

const sessionId = "f6d04d98-8104-4ea6-8cfa-c488c9af2197";
const session = { id: sessionId, skill: "React", version: 1, timingMode: "standard", state: "active", startedAt: "2026-10-28T10:00:00Z", deadlineAt: "2026-10-28T10:10:00Z", serverNow: "2026-10-28T10:00:01Z" };
const start = { action: "start", skill: "React", version: 1, timingMode: "standard" };
const input = { sessionId, answers: { r1: 0, r2: 1, r3: 2, r4: 0, r5: 1 } };
const grade = { skill: "React", version: 1, score: 5, total: 5, passed: true, takenAt: "2026-10-28T10:01:00Z" };
const access: SkillCheckAccess = { start: async () => ({ session }), cancel: async () => ({ cancelled: true }), submit: async () => grade };
const request = (data: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/v1/skill-checks", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(data) });

test("assessment mutations deny foreign origins and anonymous access before grading", async () => {
  let calls = 0;
  const handlers = skillCheckHandlers(async () => { calls++; return null; });
  for (const method of [handlers.submit, handlers.session]) {
    assert.equal((await method(request(input, "https://other.example"))).status, 403);
    assert.equal(calls, 0);
    assert.equal((await method(request(input))).status, 401);
    calls = 0;
  }
});

test("assessment payloads cannot set owner, deadline, grade or arbitrary timing", async () => {
  let calls = 0;
  const handlers = skillCheckHandlers(async () => ({ ...access, start: async () => { calls++; return { session }; }, submit: async () => { calls++; return grade; } }));
  for (const change of [{ ownerId: "other" }, { deadlineAt: "2099-01-01" }, { timingMode: "unlimited" }, { version: 2 }]) {
    assert.equal((await handlers.session(request({ ...start, ...change }))).status, 400);
  }
  for (const change of [{ user_id: "other" }, { passed: true }, { score: 5 }, { skill: "React" }, { sessionId: "invalid" }, { answers: {} }]) {
    assert.equal((await handlers.submit(request({ ...input, ...change }))).status, 400);
  }
  const malformed = new Request("http://localhost:3000/api/v1/skill-checks", { method: "POST", body: "{" });
  assert.equal((await handlers.submit(malformed)).status, 400);
  assert.equal(calls, 0);
});

test("assessment success returns verified metadata, safe cancellation and bounded grades", async () => {
  const handlers = skillCheckHandlers(async () => access);
  const started = await handlers.session(request(start));
  assert.equal(started.status, 200);
  assert.deepEqual((await started.json()).session, session);
  assert.equal(started.headers.get("cache-control"), "no-store");
  assert.equal((await handlers.session(request({ action: "cancel", sessionId }))).status, 200);
  assert.deepEqual((await (await handlers.submit(request(input))).json()).result, grade);
});

test("assessment terminal, conflict and rate-limit outcomes have explicit safe responses", async () => {
  for (const [outcome, status] of [
    [{ expired: true }, 410], [{ notFound: true }, 404], [{ bankChanged: true }, 409],
    [{ conflict: true }, 409], [{ skillNotSelected: true }, 400], [{ rateLimited: true, retryAfter: 18.2 }, 429]
  ] as const) {
    const handlers = skillCheckHandlers(async () => ({ ...access, start: async () => outcome, submit: async () => outcome }));
    for (const response of [await handlers.submit(request(input)), await handlers.session(request(start))]) {
      assert.equal(response.status, status);
      assert.equal(response.headers.get("cache-control"), "no-store");
      if (status === 429) assert.equal(response.headers.get("retry-after"), "19");
    }
  }
});

test("malformed provider output and failures cannot fabricate a saved assessment", async () => {
  for (const invalid of [null, {}, { ...grade, passed: false }, { ...grade, score: 20 }]) {
    const handlers = skillCheckHandlers(async () => ({ ...access, start: async () => invalid, submit: async () => invalid }));
    assert.equal((await handlers.submit(request(input))).status, 503);
    assert.equal((await handlers.session(request(start))).status, 503);
  }
  const handlers = skillCheckHandlers(async () => { throw new Error("private provider details"); });
  const response = await handlers.submit(request(input));
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("private provider details"), false);
});
