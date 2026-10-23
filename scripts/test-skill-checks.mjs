import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { Client } from "pg";
nextEnv.loadEnvConfig(process.cwd());
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const a = randomUUID(), b = randomUUID();
async function asUser(id) {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
  await db.query("set local role authenticated");
}
async function denied(sql) {
  await db.query("savepoint denied");
  try { await assert.rejects(db.query(sql), e => e.code === "42501"); }
  finally { await db.query("rollback to savepoint denied"); }
}
try {
  await db.connect(); await db.query("begin");
  await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)", [a, `${a}@careerforge.invalid`, b, `${b}@careerforge.invalid`]);
  await asUser(a);
  const catalog = (await db.query("select public.skill_check_catalog() data")).rows[0].data;
  assert.equal(catalog.length, 2);
  assert.equal(JSON.stringify(catalog).includes('"answer"'), false);
  await denied("select * from careerforge_internal.skill_check_banks");
  await denied(`insert into public.skill_check_attempts(user_id,skill,version,score,passed) values('${a}','React',1,5,true)`);
  const answers = { r1: 1, r2: 2, r3: 1, r4: 2, r5: 0 };
  let result = (await db.query("select public.submit_skill_check('React',1,$1::jsonb) data", [JSON.stringify(answers)])).rows[0].data;
  assert.equal(result.passed, true); assert.equal(result.score, 5);
  result = (await db.query("select public.submit_skill_check('React',1,$1::jsonb) data", [JSON.stringify(answers)])).rows[0].data;
  assert.equal(result.rateLimited, true);
  assert.equal((await db.query("select * from public.skill_check_attempts")).rowCount, 1);
  await denied("update public.skill_check_attempts set passed=false");
  await asUser(b);
  assert.equal((await db.query("select * from public.skill_check_attempts")).rowCount, 0);
  const failed = (await db.query("select public.submit_skill_check('React',1,$1::jsonb) data", [JSON.stringify({ r1: 0, r2: 0, r3: 0, r4: 0, r5: 2 })])).rows[0].data;
  assert.equal(failed.passed, false); assert.equal(failed.score, 0);
  await db.query("savepoint malformed");
  await assert.rejects(db.query("select public.submit_skill_check('React',1,'{}'::jsonb)"), e => e.code === "22023");
  await db.query("rollback to savepoint malformed");
  await db.query("reset role"); await db.query("set local role anon");
  await denied("select public.skill_check_catalog()");
  await denied("select public.submit_skill_check('React',1,'{}'::jsonb)");
  console.log("PASS: DB grading, hidden keys, passing/failing results, cross-user RLS, forgery denial, malformed answers and durable cooldown");
} catch (error) { console.error("Skill-check DB verification failed:", error.code ?? error.message); process.exitCode = 1; }
finally { await db.query("rollback").catch(() => {}); await db.end().catch(() => {}); console.log("Temporary DB verification transaction rolled back."); }
