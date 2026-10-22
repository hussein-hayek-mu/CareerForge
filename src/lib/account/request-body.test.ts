import assert from "node:assert/strict";
import { test } from "node:test";
import { readBoundedJson } from "./request-body";
import { authHandler } from "./auth-handlers";
import { recoveryHandler } from "./recovery-handlers";
import { profileHandlers } from "./profile-handlers";
import { trackerHandlers } from "../tracker/handlers";

function streamed(chunks: Uint8Array[], headers: HeadersInit = {}) {
  let cancelled = false;
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { if (index < chunks.length) controller.enqueue(chunks[index++]); else controller.close(); },
    cancel() { cancelled = true; }
  }, { highWaterMark: 0 });
  const request = new Request("http://localhost:3000/api/v1/profile", { method: "POST", headers, body, duplex: "half" } as RequestInit);
  return { request, cancelled: () => cancelled, reads: () => index };
}
const bytes = (text: string) => new TextEncoder().encode(text);

test("maximum-length Unicode profile remains accepted within the profile byte limit", async () => {
  const profile = { name: "界".repeat(100), headline: "界".repeat(160), location: "界".repeat(120), bio: "界".repeat(1000), education: "界".repeat(240), project: "界".repeat(1000), skills: Array.from({ length: 40 }, (_, i) => `${i}` + "界".repeat(58)) };
  let saved = false;
  const handler = profileHandlers(async () => ({ read: async () => profile, write: async value => { saved = true; return value; } }));
  const encoded = JSON.stringify(profile).replace(/界/g, "\\u754c");
  assert.ok(bytes(encoded).length < 32768);
  assert.equal((await handler.PUT(streamed([bytes(encoded)]).request)).status, 200);
  assert.equal(saved, true);
});

test("bounded JSON handles exact limits and UTF-8 split across chunks", async () => {
  const encoded = bytes('"é"');
  assert.equal(await readBoundedJson(streamed([encoded.slice(0, 2), encoded.slice(2)]).request, 4), "é");
  assert.equal(await readBoundedJson(streamed([encoded]).request, 3), null);
  assert.deepEqual(await readBoundedJson(streamed([bytes('{"ok":true}')]).request, 11), { ok: true });
});

test("oversized streams cancel before consuming subsequent chunks, even with false lengths", async () => {
  for (const headers of [new Headers(), new Headers({ "Content-Length": "1" })]) {
    const input = streamed([bytes(" ".repeat(12)), bytes("not read")], headers);
    assert.equal(await readBoundedJson(input.request, 10), null);
    assert.equal(input.cancelled(), true);
    assert.equal(input.reads(), 1);
  }
  const declared = streamed([bytes("not read")], { "Content-Length": "100" });
  assert.equal(await readBoundedJson(declared.request, 10), null);
  assert.equal(declared.reads(), 0);
  assert.equal(declared.cancelled(), true);
});

test("malformed JSON, invalid UTF-8 and broken streams return invalid input", async () => {
  for (const data of [bytes("{"), new Uint8Array([0xff])]) assert.equal(await readBoundedJson(streamed([data]).request, 10), null);
  const body = new ReadableStream({ start(controller) { controller.error(new Error("private transport details")); } });
  assert.equal(await readBoundedJson(new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit), 10), null);
});

test("auth, recovery, profile and tracker reject oversized bodies without performing operations", async () => {
  const forbidden = async (): Promise<never> => { assert.fail("Oversized input must not perform a data operation"); };
  const profile = profileHandlers(async () => ({ read: forbidden, write: forbidden }));
  const tracker = trackerHandlers(async () => ({ jobs: forbidden, list: forbidden, save: forbidden, update: forbidden, remove: forbidden }));
  for (const handler of [authHandler("login", forbidden), authHandler("register", forbidden), recoveryHandler("forgot", forbidden), recoveryHandler("resend", forbidden), recoveryHandler("password", forbidden), profile.PUT, tracker.POST, (r: Request) => tracker.PATCH(r, "1"), (r: Request) => tracker.DELETE(r, "1")]) {
    const input = streamed([bytes(" ".repeat(33000)), bytes("never consumed")]);
    const response = await handler(input.request);
    assert.equal(response.status, 400);
    assert.equal(input.cancelled(), true);
    assert.equal(input.reads(), 1);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
