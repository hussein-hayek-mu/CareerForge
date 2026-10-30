import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { Client } from "pg";

// Explicit development-only check. Pending SQL and all fixture rows are rolled back.
if (!process.argv.includes("--development-rollback") || process.env.NODE_ENV === "production") {
  throw new Error("Run only against a development database with --development-rollback.");
}
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
const owners = [randomUUID(), randomUUID()];
let stage = "connection", inTransaction = false, installed = false;
const checks = [];
async function asOwner(id) {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [id, JSON.stringify({ sub: id, role: "authenticated" })]);
  await client.query("set local role authenticated");
}
async function denied(sql, params, code) {
  await client.query("savepoint expected_denial");
  try { await assert.rejects(client.query(sql, params), error => error.code === code); }
  finally { await client.query("rollback to savepoint expected_denial"); }
}
try {
  await client.connect();
  await client.query("begin"); inTransaction = true;
  stage = "pending migration validation";
  const existing = (await client.query("select to_regclass('public.education_records') as education,to_regclass('public.experience_records') as experience")).rows[0];
  if (!existing.education && !existing.experience) {
    await client.query(await readFile(new URL("../supabase/migrations/202610290001_profile_history.sql", import.meta.url), "utf8"));
    installed = true;
  } else assert.ok(existing.education && existing.experience, "History tables must be present together");
  const security = await client.query("select relname,relrowsecurity from pg_class where oid in ('public.education_records'::regclass,'public.experience_records'::regclass)");
  assert.equal(security.rows.length, 2);
  assert.ok(security.rows.every(row => row.relrowsecurity));
  checks.push("migration SQL and row-level security");

  stage = "temporary owner fixtures";
  for (const owner of owners) await client.query("insert into auth.users(id,email) values($1,$2)", [owner, `${owner}@careerforge.invalid`]);
  const ids = {};
  for (const [table, labelColumns, labels] of [
    ["education_records", "institution,degree", ["Fixture University", "Computer Science"]],
    ["experience_records", "company,role", ["Fixture Company", "Developer"]]
  ]) {
    stage = `${table} owner/revision checks`;
    await asOwner(owners[0]);
    const token = randomUUID();
    const inserted = (await client.query(`insert into public.${table}(user_id,request_id,${labelColumns}) values($1,$2,$3,$4) returning id,revision,creation_payload`, [owners[0], token, ...labels])).rows[0];
    ids[table] = inserted.id;
    assert.ok(inserted.creation_payload);
    assert.equal((await client.query(`insert into public.${table}(user_id,request_id,${labelColumns}) values($1,$2,$3,$4) on conflict(user_id,request_id) do nothing returning id`, [owners[0], token, ...labels])).rowCount, 0);
    const field = table === "education_records" ? "degree" : "role";
    const updated = await client.query(`update public.${table} set ${field}=$1 where id=$2 and revision=$3 returning revision`, ["Updated fixture", inserted.id, inserted.revision]);
    assert.equal(updated.rowCount, 1);
    assert.notEqual(updated.rows[0].revision, inserted.revision);
    assert.equal((await client.query(`update public.${table} set ${field}=$1 where id=$2 and revision=$3`, ["Stale overwrite", inserted.id, inserted.revision])).rowCount, 0);
    await denied(`update public.${table} set user_id=$1 where id=$2`, [owners[1], inserted.id], "42501");
    await denied(`update public.${table} set end_date='2025-01-01',start_date='2026-01-01' where id=$1`, [inserted.id], "23514");
    await denied(`update public.${table} set is_current=true,end_date='2026-01-01' where id=$1`, [inserted.id], "23514");
    await asOwner(owners[1]);
    assert.equal((await client.query(`select id from public.${table} where id=$1`, [inserted.id])).rowCount, 0);
    assert.equal((await client.query(`update public.${table} set ${field}='Blocked' where id=$1`, [inserted.id])).rowCount, 0);
    assert.equal((await client.query(`delete from public.${table} where id=$1`, [inserted.id])).rowCount, 0);
    await denied(`insert into public.${table}(user_id,request_id,${labelColumns}) values($1,$2,$3,$4)`, [owners[0], randomUUID(), ...labels], "42501");
    await client.query(`insert into public.${table}(user_id,request_id,${labelColumns}) values($1,$2,$3,$4)`, [owners[1], randomUUID(), ...labels]);
    await asOwner(owners[0]);
    assert.equal((await client.query(`select id from public.${table}`)).rowCount, 1);
    checks.push(`${table}: owner CRUD, two-way isolation, immutable owner, retry and stale revision`);
  }

  stage = "GPA constraints";
  await asOwner(owners[0]);
  const precise = await client.query("update public.education_records set gpa=3.875,gpa_scale=4 where id=$1 returning gpa", [ids.education_records]);
  assert.equal(precise.rows[0].gpa, 3.875);
  await denied("update public.education_records set gpa=5,gpa_scale=4 where id=$1", [ids.education_records], "23514");
  await denied("update public.education_records set gpa_scale=null where id=$1", [ids.education_records], "23514");
  checks.push("precise GPA and date/current-state constraints");

  stage = "record limit";
  for (let i = 1; i < 20; i++) await client.query("insert into public.education_records(user_id,request_id,institution,degree) values($1,$2,'Limit fixture','Degree')", [owners[0], randomUUID()]);
  await denied("insert into public.education_records(user_id,request_id,institution,degree) values($1,$2,'Limit fixture','Degree')", [owners[0], randomUUID()], "P0001");
  checks.push("education record limit enforced in database");

  stage = "anonymous denial and account cascade";
  await client.query("reset role");
  await client.query("set local role anon");
  for (const table of ["education_records", "experience_records"]) await denied(`select id from public.${table}`, [], "42501");
  await client.query("reset role");
  await client.query("delete from auth.users where id=$1", [owners[0]]);
  for (const table of ["education_records", "experience_records"]) {
    assert.equal((await client.query(`select id from public.${table} where user_id=$1`, [owners[0]])).rowCount, 0);
    assert.equal((await client.query(`select id from public.${table} where user_id=$1`, [owners[1]])).rowCount, 1);
  }
  checks.push("anonymous denial and account-deletion cascade");

  await client.query("rollback"); inTransaction = false;
  assert.equal((await client.query("select id from auth.users where id=any($1::uuid[])", [owners])).rowCount, 0);
  if (installed) assert.equal((await client.query("select to_regclass('public.education_records') as table_name")).rows[0].table_name, null);
  console.log(JSON.stringify({ status: "passed", checks, migrationAppliedOnlyInsideRolledBackTransaction: installed, retainedChanges: false }));
} catch (error) {
  console.error(JSON.stringify({ status: "failed", stage, code: typeof error.code === "string" ? error.code : error.name }));
  process.exitCode = 1;
} finally {
  if (inTransaction) await client.query("rollback").catch(() => {});
  await client.end().catch(() => {});
}
