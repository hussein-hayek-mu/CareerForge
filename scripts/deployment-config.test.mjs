import { test } from "node:test";
import assert from "node:assert/strict";
import { deploymentConfigErrors } from "./deployment-config.mjs";

const fixture = { APP_ORIGIN: "https://careerforge.test", NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture", DATABASE_URL: "postgresql://user:private-password@db.test:6543/postgres", DIRECT_URL: "postgresql://user:private-password@db.test:5432/postgres" };
test("deployment preflight accepts shaped config without contacting services", () => {
  assert.deepEqual(deploymentConfigErrors(fixture), []);
  const anon = `header.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.signature`;
  assert.deepEqual(deploymentConfigErrors({ ...fixture, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anon }), []);
});
test("deployment preflight rejects missing values, unsafe origins and privileged public keys", () => {
  assert.equal(deploymentConfigErrors({}).length, 5);
  for (const APP_ORIGIN of ["http://careerforge.test", "https://user:pass@careerforge.test", "https://careerforge.test/path", "https://careerforge.test?q=private", "https://careerforge.example.com"]) assert.ok(deploymentConfigErrors({ ...fixture, APP_ORIGIN }).length);
  for (const key of ["sb_secret_private", `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.sig`]) assert.ok(deploymentConfigErrors({ ...fixture, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }).length);
  assert.ok(deploymentConfigErrors({ ...fixture, NEXT_PUBLIC_OPENAI_API_KEY: "secret" }).length);
});
test("deployment preflight never includes supplied values in diagnostic output", () => {
  const errors = deploymentConfigErrors({ ...fixture, APP_ORIGIN: "https://private-user:private-password@host.test", DATABASE_URL: "private-database", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "private-key" });
  assert.equal(JSON.stringify(errors).includes("private-"), false);
});
