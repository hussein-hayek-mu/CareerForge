import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { Client } from "pg";
import { verifyTrackerRls } from "./verify-tracker-rls.mjs";

nextEnv.loadEnvConfig(process.cwd());
const client = new Client({ connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL, connectionTimeoutMillis: 15000, statement_timeout: 15000 });
const a = randomUUID(), b = randomUUID();
async function denied(sql, params = [], code = "42501") {
  await client.query("savepoint blocked_operation");
  try {
    await assert.rejects(client.query(sql, params), error => error.code === code);
  } finally { await client.query("rollback to savepoint blocked_operation"); }
}
async function asUser(id) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)", [id, JSON.stringify({ sub: id, role: "authenticated" })]);
  await client.query("set local role authenticated");
}
try {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) throw new Error("MISSING_DATABASE_URL");
  await client.connect();
  await client.query("begin");
  await client.query("insert into auth.users (id, email) values ($1, $2), ($3, $4)", [a, `${a}@careerforge.invalid`, b, `${b}@careerforge.invalid`]);
  const enabled = await client.query("select relrowsecurity from pg_class where oid='public.profiles'::regclass");
  assert.equal(enabled.rows[0].relrowsecurity, true);
  await asUser(a);
  assert.equal((await client.query("select id from public.profiles")).rows.length, 1);
  assert.equal((await client.query("select id from public.profiles where id=$1", [b])).rowCount, 0);
  assert.equal((await client.query("update public.profiles set full_name='Blocked' where id=$1", [b])).rowCount, 0);
  assert.equal((await client.query("delete from public.profiles where id=$1", [b])).rowCount, 0);
  await denied("insert into public.profiles (id, full_name) values ($1, 'Blocked')", [b]);
  await denied("update public.profiles set role='admin' where id=$1", [a]);
  await denied("update public.profiles set id=$1 where id=$2", [b, a]);
  assert.equal((await client.query("update public.profiles set full_name='Owner A' where id=$1", [a])).rowCount, 1);
  assert.equal((await client.query("delete from public.profiles where id=$1", [a])).rowCount, 1);
  assert.equal((await client.query("insert into public.profiles (id, full_name) values ($1, 'Owner A') returning id", [a])).rowCount, 1);
  await asUser(b);
  assert.equal((await client.query("select id from public.profiles")).rows.length, 1);
  assert.equal((await client.query("select id from public.profiles where id=$1", [a])).rowCount, 0);
  assert.equal((await client.query("update public.profiles set full_name='Blocked' where id=$1", [a])).rowCount, 0);
  assert.equal((await client.query("delete from public.profiles where id=$1", [a])).rowCount, 0);
  await denied("insert into public.profiles (id) values ($1)", [a]);
  await client.query("reset role");
  await client.query("set local role anon");
  await denied("select id from public.profiles");
  console.log("PASS: profile trigger, owner CRUD, two-way isolation, role/id protection, anonymous denial");
  await verifyTrackerRls(client, asUser, denied, a, b);
} catch (error) {
  console.error("RLS verification failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await client.query("rollback").catch(() => {});
  await client.end().catch(() => {});
  console.log("Test transaction rolled back; no test users or profiles retained.");
}
