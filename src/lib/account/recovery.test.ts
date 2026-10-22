import assert from "node:assert/strict";
import { test } from "node:test";
import { recoveryHandler, emailCooldown, type RecoveryProvider } from "./recovery-handlers";
import { callbackHandler } from "./callback-handler";
import { authHandler, type AuthProvider } from "./auth-handlers";

const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/v1/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
const provider: RecoveryProvider = { resend: async () => ({ error: null }), forgot: async () => ({ error: null }), changePassword: async () => ({ error: null }) };
const noLimit = () => 0;

test("email recovery validates and blocks foreign origins before requesting mail", async () => {
  let calls = 0;
  const handler = recoveryHandler("forgot", async () => { calls++; return provider; }, noLimit);
  for (const body of [{ email: "invalid" }, { email: "person@example.com", role: "admin" }, { email: "x".repeat(3000) }]) assert.equal((await handler(request(body))).status, 400);
  assert.equal((await handler(request({ email: "person@example.com" }, "https://untrusted.example"))).status, 403);
  assert.equal(calls, 0);
});

test("forgot/resend normalize emails, use the real callback origin and hide eligibility", async () => {
  for (const kind of ["forgot", "resend"] as const) {
    const handler = recoveryHandler(kind, async () => ({ ...provider, [kind]: async (email: string, callback: string) => {
      assert.equal(email, "person@example.com"); assert.equal(callback, "http://localhost:3000/auth/callback");
      return { error: { status: 400, code: "user_not_found" } };
    } }), noLimit);
    const response = await handler(request({ email: " Person@Example.com " }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { requested: true, retryAfter: 60 });
  }
});

test("recovery enforces cooldown/provider limits and sanitizes delivery failures", async () => {
  const input = { email: "person@example.com" };
  const blocked = await recoveryHandler("forgot", async () => { throw new Error("Must not call"); }, () => 35)(request(input));
  assert.equal(blocked.status, 429); assert.equal(blocked.headers.get("Retry-After"), "35");
  for (const [status, expected] of [[429, 429], [500, 503]]) {
    const result = await recoveryHandler("resend", async () => ({ ...provider, resend: async () => ({ error: { status } }) }), noLimit)(request(input));
    assert.equal(result.status, expected);
  }
  const unavailable = await recoveryHandler("forgot", async () => { throw new Error("Private SMTP credentials"); }, noLimit)(request(input));
  assert.equal(unavailable.status, 503); assert.equal((await unavailable.text()).includes("SMTP credentials"), false);
  assert.equal(emailCooldown("cooldown-test@example.com", 1000), 0);
  assert.equal(emailCooldown("cooldown-test@example.com", 1100), 60);
  assert.equal(emailCooldown("cooldown-test@example.com", 61001), 0);
});

test("password update validates bounds, requires verified identity and handles failure", async () => {
  const handler = recoveryHandler("password", async () => provider);
  assert.equal((await handler(request({ password: "short" }))).status, 400);
  assert.equal((await handler(request({ password: "password123", user_id: "other" }))).status, 400);
  const anonymous = recoveryHandler("password", async () => ({ ...provider, changePassword: async () => null }));
  assert.equal((await anonymous(request({ password: "password123" }))).status, 401);
  assert.deepEqual(await (await handler(request({ password: "password123" }))).json(), { passwordUpdated: true });
});

test("callback safely routes confirmation/recovery and forwards isolated PKCE flow IDs", async () => {
  for (const type of [null, "recovery"]) {
    const handler = callbackHandler(async (code, flow) => { assert.equal(code, "private-code"); assert.equal(flow, "flow-id"); return { data: { redirectType: type }, error: null }; });
    const response = await handler(new Request("http://localhost:3000/auth/callback?code=private-code&sb_flow_id=flow-id&next=https://untrusted.example"));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("Location"), `http://localhost:3000/${type ? "reset-password" : "account"}`);
    assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
  }
});

test("expired/missing/error callbacks stay recoverable and never echo tokens", async () => {
  for (const query of ["", "?error=access_denied", "?code=private-code"]) {
    const response = await callbackHandler(async () => ({ data: {}, error: { code: "otp_expired" } }))(new Request(`http://localhost:3000/auth/callback${query}`));
    assert.ok(response.headers.get("Location")?.startsWith("http://localhost:3000/login?confirmation=failed"));
    assert.equal(response.headers.get("Location")?.includes("private-code"), false);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});

test("login distinguishes unconfirmed email from invalid credentials without provider details", async () => {
  const auth: AuthProvider = { login: async () => ({ error: { status: 400, code: "email_not_confirmed" } }), register: async () => ({ error: null }), logout: async () => ({ error: null }) };
  const response = await authHandler("login", async () => auth)(request({ email: "person@example.com", password: "password123" }));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "EMAIL_NOT_CONFIRMED");
});
