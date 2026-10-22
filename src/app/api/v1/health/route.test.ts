import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "./route";

test("public health check returns the application status without credentials", async () => {
  const response = GET();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.deepEqual(await response.json(), {
    status: "ok",
    application: "CareerForge"
  });
});
