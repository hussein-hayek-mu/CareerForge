import assert from "node:assert/strict";
import { test } from "node:test";
import { recoveryHandler, emailCooldown, type RecoveryProvider } from "./recovery-handlers";
import { callbackHandler } from "./callback-handler";
import { authHandler, type AuthProvider } from "./auth-handlers";
import { requestOrigin, isSameOrigin } from "./http";

const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/v1/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
const provider: RecoveryProvider = { resend: async () => ({ error: null }), forgot: async () => ({ error: null }), changePassword: async () => ({ error: null }) };
const noLimit = () => 0;

test("production auth trusts only its configured HTTPS origin and fails closed", async () => {
  const previous = { mode: process.env.NODE_ENV, origin: process.env.APP_ORIGIN };
  try {
    Object.assign(process.env, { NODE_ENV: "production", APP_ORIGIN: "https://careerforge.example" });
    const trusted = new Request("http://internal:3000/auth/callback?code=test", { headers: { Host: "careerforge.example", Origin: "https://careerforge.example", "X-Forwarded-Proto": "http", "X-Forwarded-Host": "evil.example" } });
    assert.equal(requestOrigin(trusted), "https://careerforge.example");
    assert.equal(isSameOrigin(trusted), true);
    let calls = 0;
    const callback = callbackHandler(async () => { calls++; return { data: {}, error: null }; });
    const success = await callback(trusted);
    assert.equal(success.headers.get("Location"), "https://careerforge.example/account");
    for (const host of ["evil.example", "careerforge.example.evil.example", "careerforge.example:8443", "careerforge.example@evil.example"]) {
      const forged = new Request(trusted, { headers: { Host: host, Origin: `https://${host}` } });
      assert.equal(isSameOrigin(forged), false);
      const response = await callback(forged);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("Location"), null);
    }
    assert.equal(calls, 1);
    for (const value of [undefined, "http://careerforge.example", "https://careerforge.example/path", "https://user:pass@careerforge.example", "not-a-url", "https://careerforge.example?next=evil"]) {
      if (value === undefined) delete process.env.APP_ORIGIN;
      else process.env.APP_ORIGIN = value;
      assert.equal(isSameOrigin(trusted), false);
      assert.equal((await callback(trusted)).status, 503);
    }
    assert.equal(calls, 1);
  } finally {
    if (previous.mode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous.mode });
    if (previous.origin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous.origin;
  }
});

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

test("callback rejects ambiguous or oversized PKCE inputs without contacting auth", async () => {
  let calls = 0;
  const handler = callbackHandler(async () => { calls++; throw new Error("Must not exchange"); });
  for (const query of ["code=a&code=b", "code=a&sb_flow_id=a&sb_flow_id=b", `code=a&sb_flow_id=${"x".repeat(257)}`, `code=${"x".repeat(2049)}`, "code=a&error_code=unexpected"]) {
    const result = await handler(new Request(`http://localhost:3000/auth/callback?${query}`));
    assert.equal(result.headers.get("Location"), "http://localhost:3000/login?confirmation=failed");
  }
  assert.equal(calls, 0);
});

test("provider expiry callbacks and exchange exceptions remain safe and recoverable", async () => {
  for (const errorCode of ["otp_expired", "flow_state_expired"]) {
    const result = await callbackHandler(async () => { throw new Error("Must not exchange"); })(new Request(`http://localhost:3000/auth/callback?error=access_denied&error_code=${errorCode}&error_description=private-details`));
    assert.equal(result.headers.get("Location"), "http://localhost:3000/login?confirmation=failed&reason=expired");
    assert.equal(result.headers.get("Location")?.includes("private-details"), false);
  }
  const result = await callbackHandler(async () => { throw new Error("private-token"); })(new Request("http://localhost:3000/auth/callback?code=secret"));
  assert.equal(result.headers.get("Location"), "http://localhost:3000/login?confirmation=failed");
});
