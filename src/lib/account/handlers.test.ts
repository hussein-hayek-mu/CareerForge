import assert from "node:assert/strict";
import { test } from "node:test";
import { authHandler, type AuthProvider } from "./auth-handlers";
import { profileHandlers } from "./profile-handlers";
import { emptyProfile, profileFromRow, profileSchema, profileToRow } from "./schemas";
import { isSameOrigin, requestOrigin } from "./http";

const sample = { ...emptyProfile, name: "User A", skills: ["React"] };
const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/v1/profile", { method: "PUT", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
test("origin validation accepts the real LAN Host while rejecting cross-origin writes", () => {
  const lan = new Request("http://0.0.0.0:3000/api/v1/profile", { headers: { Host: "192.168.10.133:3000", Origin: "http://192.168.10.133:3000" } });
  assert.equal(isSameOrigin(lan), true);
  assert.equal(requestOrigin(lan), "http://192.168.10.133:3000");
  const forged = new Request(lan, { headers: { Host: "192.168.10.133:3000", Origin: "https://untrusted.example" } });
  assert.equal(isSameOrigin(forged), false);
});
test("profile API denies unauthenticated access before reading or saving data", async () => {
  const routes = profileHandlers(async () => null);
  assert.equal((await routes.GET()).status, 401);
  assert.equal((await routes.PUT(request(sample))).status, 401);
});
test("profile API validates inputs, rejects owner/role injection and cross-origin writes", async () => {
  let writes = 0;
  const routes = profileHandlers(async () => ({ read: async () => sample, write: async p => { writes++; return p; } }));
  for (const body of [{ ...sample, id: "user-b" }, { ...sample, user_id: "user-b" }, { ...sample, role: "admin" }, { ...sample, name: "" }, { ...sample, skills: Array(41).fill("SQL") }, { ...sample, skills: ["x".repeat(61)] }]) {
    assert.equal((await routes.PUT(request(body))).status, 400);
  }
  assert.equal((await routes.PUT(request(sample, "https://other.example"))).status, 403);
  assert.equal(writes, 0);
});
test("profile API returns normalized private data and never caches it", async () => {
  let stored = sample;
  const routes = profileHandlers(async () => ({ read: async () => stored, write: async p => { stored = p; return p; } }));
  const saved = await routes.PUT(request({ ...sample, skills: [" React ", "react", "SQL"] }));
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).profile.skills, ["react", "SQL"]);
  const read = await routes.GET();
  assert.equal(read.headers.get("cache-control"), "no-store");
  assert.equal((await read.json()).profile.name, "User A");
});
test("profile API sanitizes storage errors and never overwrites with demo data", async () => {
  const routes = profileHandlers(async () => { throw new Error("private database details"); });
  const response = await routes.GET();
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("private database details"), false);
});
test("profile mapping round-trips current summary fields", () => {
  assert.deepEqual(profileFromRow(profileToRow(sample)), sample);
  assert.equal(profileSchema.safeParse({ ...sample, role: "admin" }).success, false);
});
const provider: AuthProvider = { login: async () => ({ error: null }), register: async () => ({ error: null, hasSession: false }), logout: async () => ({ error: null }) };
test("auth routes validate input before calling provider and block cross-origin requests", async () => {
  let calls = 0;
  const handler = authHandler("login", async () => { calls++; return provider; });
  assert.equal((await handler(request({ email: "bad", password: "x" }))).status, 400);
  assert.equal((await handler(request({ email: "person@example.com", password: "password123" }, "https://other.example"))).status, 403);
  assert.equal(calls, 0);
});
test("auth routes handle login, confirmation-required registration, and logout without returning tokens", async () => {
  const credentials = { email: "person@example.com", password: "password123" };
  for (const kind of ["login", "register", "logout"] as const) {
    const response = await authHandler(kind, async () => provider)(request(credentials));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    if (kind === "register") assert.equal(body.confirmationRequired, true);
    if (kind === "login") assert.equal(body.signedIn, true);
    assert.equal("access_token" in body, false);
  }
});
test("auth routes use clean invalid-credential, rate-limit, and provider-failure responses", async () => {
  const credentials = request({ email: "person@example.com", password: "password123" });
  const denied = await authHandler("login", async () => ({ ...provider, login: async () => ({ error: { status: 400 } }) }))(credentials.clone());
  assert.equal(denied.status, 401);
  const limited = await authHandler("login", async () => ({ ...provider, login: async () => ({ error: { status: 429 } }) }))(credentials.clone());
  assert.equal(limited.status, 429);
  const unavailable = await authHandler("login", async () => { throw new Error("secret"); })(credentials.clone());
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.text()).includes("secret"), false);
});
