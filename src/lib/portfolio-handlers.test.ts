import { test } from "node:test";
import assert from "node:assert/strict";
import { portfolioHandlers, type PortfolioAccess } from "./portfolio-handlers";
import { emptyProfile } from "./account/schemas";
const data = { source: emptyProfile, sourceToken: "a".repeat(32), settings: { template: "studio", sections: ["about"], revision: null, isPublic: false, slug: null, publishedAt: null } };
const input = { action: "save", template: "studio", sections: ["about"], revision: null, sourceToken: data.sourceToken };
const access: PortfolioAccess = { userId: "verified-owner", read: async () => data, write: async () => data };
const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/v1/portfolio", { method: "PUT", headers: { Origin: origin }, body: JSON.stringify(body) });
test("portfolio API blocks anonymous and foreign-origin access before reading/writing", async () => {
  let calls = 0;
  const handlers = portfolioHandlers(async () => { calls++; return null; });
  assert.equal((await handlers.PUT(request(input, "https://other.example"))).status, 403);
  assert.equal(calls, 0);
  assert.equal((await handlers.GET()).status, 401);
  assert.equal((await handlers.PUT(request(input))).status, 401);
});
test("portfolio API validates before writes, uses owner budget and keeps responses private", async () => {
  let writes = 0;
  const handlers = portfolioHandlers(async () => ({ ...access, write: async () => { writes++; return data; } }), (scope, owner) => { assert.equal(scope, "portfolio"); assert.equal(owner, "verified-owner"); return 8; });
  assert.equal((await handlers.PUT(request({ ...input, userId: "other" }))).status, 400);
  const limited = await handlers.PUT(request(input));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "8");
  assert.equal(writes, 0);
  const read = await handlers.GET();
  assert.equal(read.status, 200);
  assert.equal(read.headers.get("cache-control"), "no-store");
});
test("portfolio API preserves conflict/source/profile failures and rejects malformed saved state", async () => {
  for (const [output, status] of [[data, 200], [{ conflict: true }, 409], [{ sourceChanged: true }, 409], [{ profileRequired: true }, 400], [{}, 503]] as const) {
    const handler = portfolioHandlers(async () => ({ ...access, write: async () => output }), () => 0);
    assert.equal((await handler.PUT(request(input))).status, status);
  }
  const handler = portfolioHandlers(async () => { throw new Error("secret"); });
  assert.equal((await handler.GET()).status, 503);
  assert.equal((await (await handler.PUT(request(input))).text()).includes("secret"), false);
});
