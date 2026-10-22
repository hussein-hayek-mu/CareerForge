import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "./route";
import { databaseHealthHandler } from "@/lib/database-health";

test("disabled database diagnostics never query storage", async () => {
  let calls = 0;
  const response = await databaseHealthHandler(async () => { calls++; }, () => false)();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls, 0);
});

test("development database diagnostics report health without leaking failures", async () => {
  const healthy = await databaseHealthHandler(async () => {}, () => true)();
  assert.equal(healthy.status, 200);
  const failed = await databaseHealthHandler(async () => { throw new Error("private connection string"); }, () => true)();
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { status: "error", database: "unavailable" });
  assert.equal(failed.headers.get("cache-control"), "no-store");
});

test("public health check returns the application status without credentials", async () => {
  const response = GET();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await response.json(), {
    status: "ok",
    application: "CareerForge"
  });
});
