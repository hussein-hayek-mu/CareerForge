import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import { Client } from "pg";

nextEnv.loadEnvConfig(process.cwd());
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, statement_timeout: 15000 });
const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];
const reactAnswers = { r1: 1, r2: 2, r3: 1, r4: 2, r5: 0 };
const sqlAnswers = { s1: 2, s2: 2, s3: 2, s4: 2, s5: 2 };

async function asUser(id) {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
  await db.query("set local role authenticated");
}
async function rejected(sql, params = [], code = "42501") {
  await db.query("savepoint rejected");
  try { await assert.rejects(db.query(sql, params), error => error.code === code); }
  finally { await db.query("rollback to savepoint rejected"); }
}
async function rpc(sql, params = []) {
  return (await db.query(`select ${sql} as data`, params)).rows[0].data;
}
async function start(skill, mode = "standard") {
  return rpc("public.start_skill_check($1,1,$2)", [skill, mode]);
}
async function submit(id, answers) {
  return rpc("public.submit_timed_skill_check($1,$2::jsonb)", [id, JSON.stringify(answers)]);
}

try {
  await db.connect();
  await db.query("begin");
  for (const id of [a, b, c]) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [id, `${id}@careerforge.invalid`]);
  }
  await db.query("update public.profiles set self_reported_skills = array[' React ', 'SQL'] where id = $1", [a]);
  await db.query("update public.profiles set self_reported_skills = array['React'] where id = $1", [c]);

  await asUser(a);
  const catalog = await rpc("public.skill_check_catalog()");
  assert.equal(catalog.length, 2);
  assert.equal(JSON.stringify(catalog).includes('\"answer\"'), false);
  assert.deepEqual(await rpc("public.current_skill_check_session()"), { session: null });
  await rejected("select * from careerforge_internal.skill_check_banks");
  await rejected("select public.submit_skill_check('React',1,$1::jsonb)", [JSON.stringify(reactAnswers)]);
  await rejected("insert into public.skill_check_attempts(user_id,skill,version,score,passed) values($1,'React',1,5,true)", [a]);
  await rejected("select public.start_skill_check('React',1,'forged')", [], "22023");
  await rejected("select public.start_skill_check('React',2,'standard')", [], "22023");

  const sessionA = (await start("React")).session;
  assert.equal(sessionA.state, "active");
  assert.equal(sessionA.timingMode, "standard");
  assert.equal(Date.parse(sessionA.deadlineAt) - Date.parse(sessionA.startedAt), 600_000);
  assert.ok(Date.parse(sessionA.serverNow) >= Date.parse(sessionA.startedAt));
  assert.equal(JSON.stringify(sessionA).includes('\"answer\"'), false);
  assert.deepEqual(Object.keys(sessionA).sort(), ["id", "skill", "version", "timingMode", "startedAt", "deadlineAt", "state", "serverNow"].sort());
  const resumed = (await start("React", "extended")).session;
  assert.equal(resumed.id, sessionA.id);
  assert.equal(resumed.deadlineAt, sessionA.deadlineAt);
  assert.equal(resumed.timingMode, "standard");
  const conflict = await start("SQL");
  assert.equal(conflict.conflict, true);
  assert.equal(conflict.session.id, sessionA.id);
  assert.equal((await rpc("public.current_skill_check_session()")).session.id, sessionA.id);
  assert.equal((await db.query("select * from public.skill_check_sessions")).rowCount, 1);
  await rejected("insert into public.skill_check_sessions(user_id,skill,version,timing_mode,started_at,deadline_at) values($1,'SQL',1,'standard',now(),now()+interval '600 seconds')", [a]);
  await rejected("update public.skill_check_sessions set deadline_at=deadline_at+interval '600 seconds'");
  await rejected("delete from public.skill_check_sessions");

  await asUser(b);
  assert.equal((await db.query("select * from public.skill_check_sessions")).rowCount, 0);
  assert.equal((await db.query("select * from public.skill_check_attempts")).rowCount, 0);
  assert.deepEqual(await rpc("public.current_skill_check_session()"), { session: null });
  assert.deepEqual(await submit(sessionA.id, reactAnswers), { notFound: true });
  assert.deepEqual(await rpc("public.cancel_skill_check($1)", [sessionA.id]), { notFound: true });
  assert.deepEqual(await start("SQL"), { skillNotSelected: true });
  await db.query("update public.profiles set self_reported_skills = array['SQL'] where id = $1", [b]);
  const sessionB = (await start("SQL", "extended")).session;
  assert.equal(Date.parse(sessionB.deadlineAt) - Date.parse(sessionB.startedAt), 6_000_000);
  await rejected("select public.submit_timed_skill_check($1,'{}'::jsonb)", [sessionB.id], "22023");
  await rejected("select public.submit_timed_skill_check($1,$2::jsonb)", [sessionB.id, JSON.stringify({ ...sqlAnswers, s5: undefined, fake: 0 })], "22023");
  const failed = await submit(sessionB.id, sqlAnswers);
  assert.equal(failed.passed, false);
  assert.equal(failed.score, 1);
  assert.deepEqual(await submit(sessionB.id, sqlAnswers), failed);
  assert.equal((await db.query("select * from public.skill_check_attempts")).rowCount, 1);
  assert.deepEqual(await rpc("public.current_skill_check_session()"), { session: null });
  const limitedB = await start("SQL");
  assert.equal(limitedB.rateLimited, true);
  assert.ok(limitedB.retryAfter >= 1 && limitedB.retryAfter <= 60);

  await asUser(a);
  const passed = await submit(sessionA.id, reactAnswers);
  assert.equal(passed.passed, true);
  assert.equal(passed.score, 5);
  assert.equal(passed.total, 5);
  // The first committed grade wins, even if a retry has a different payload.
  assert.deepEqual(await submit(sessionA.id, {}), passed);
  assert.equal((await db.query("select * from public.skill_check_attempts")).rowCount, 1);
  const limitedA = await start("React");
  assert.equal(limitedA.rateLimited, true);
  assert.ok(limitedA.retryAfter >= 1 && limitedA.retryAfter <= 60);
  await rejected("update public.skill_check_attempts set passed=false");
  const submittedBeforeCancel = (await db.query("select state,result_id,finished_at from public.skill_check_sessions where id=$1", [sessionA.id])).rows[0];
  assert.deepEqual(await rpc("public.cancel_skill_check($1)", [sessionA.id]), { cancelled: true });
  assert.deepEqual((await db.query("select state,result_id,finished_at from public.skill_check_sessions where id=$1", [sessionA.id])).rows[0], submittedBeforeCancel);

  // Privileged test-fixture aging is rolled back; clients cannot set these times.
  await db.query("reset role");
  await db.query("update public.skill_check_attempts set taken_at=clock_timestamp()-interval '2 minutes' where user_id=$1", [a]);
  await db.query("with timing as materialized (select clock_timestamp() t) update public.skill_check_sessions set started_at=timing.t-interval '2 minutes',deadline_at=timing.t-interval '2 minutes'+interval '600 seconds' from timing where id=$1", [sessionA.id]);
  await asUser(a);
  const expiring = (await start("SQL")).session;
  await db.query("reset role");
  await db.query("with timing as materialized (select clock_timestamp() t) update public.skill_check_sessions set started_at=timing.t-interval '601 seconds',deadline_at=timing.t-interval '1 second' from timing where id=$1", [expiring.id]);
  await asUser(a);
  assert.equal((await rpc("public.current_skill_check_session()")).session.state, "expired");
  assert.deepEqual(await submit(expiring.id, sqlAnswers), { expired: true });
  assert.deepEqual(await submit(expiring.id, sqlAnswers), { expired: true });
  assert.equal((await db.query("select * from public.skill_check_attempts")).rowCount, 1);
  assert.deepEqual(await rpc("public.current_skill_check_session()"), { session: null });
  const cancelling = (await start("React", "extended")).session;
  assert.deepEqual(await rpc("public.cancel_skill_check($1)", [cancelling.id]), { cancelled: true });
  assert.deepEqual(await rpc("public.cancel_skill_check($1)", [cancelling.id]), { cancelled: true });
  assert.deepEqual(await submit(cancelling.id, reactAnswers), { notFound: true });
  assert.deepEqual(await rpc("public.current_skill_check_session()"), { session: null });
  assert.equal((await start("React")).rateLimited, true);

  await asUser(c);
  const changed = (await start("React")).session;
  await db.query("reset role");
  await db.query("update careerforge_internal.skill_check_banks set version=2 where skill='React'");
  await asUser(c);
  assert.deepEqual(await submit(changed.id, reactAnswers), { bankChanged: true });
  assert.equal((await db.query("select * from public.skill_check_attempts")).rowCount, 0);
  assert.deepEqual(await rpc("public.current_skill_check_session()"), { session: null });
  await db.query("reset role");
  await db.query("update careerforge_internal.skill_check_banks set version=1 where skill='React'");
  await rejected("insert into public.skill_check_sessions(user_id,skill,version,timing_mode,started_at,deadline_at) values($1,'SQL',1,'standard',now(),now()+interval '6000 seconds')", [c], "23514");
  await rejected("insert into public.skill_check_sessions(user_id,skill,version,timing_mode,started_at,deadline_at,state) values($1,'SQL',1,'standard',now(),now()+interval '600 seconds','submitted')", [c], "23514");
  await rejected("insert into public.skill_check_sessions(user_id,skill,version,timing_mode,started_at,deadline_at) values($1,'SQL',1,'unlimited',now(),now()+interval '6000 seconds')", [c], "23514");

  await db.query("set local role anon");
  await rejected("select * from public.skill_check_sessions");
  await rejected("select public.skill_check_catalog()");
  await rejected("select public.current_skill_check_session()");
  await rejected("select public.start_skill_check('React',1,'standard')");
  await rejected("select public.cancel_skill_check($1)", [sessionA.id]);
  await rejected("select public.submit_timed_skill_check($1,'{}'::jsonb)", [sessionA.id]);
  await rejected("select public.submit_skill_check('React',1,'{}'::jsonb)");
  console.log("PASS: server timing/mode constraints, stable resume, active conflict, selected-skill gate, deterministic pass/fail grading, idempotent retries, expiry/cancellation, bank-change invalidation, cooldown, hidden keys, direct-write/legacy-RPC denial and cross-user/anonymous isolation");
} catch (error) {
  console.error("Skill-check DB verification failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await db.query("rollback").catch(() => {});
  await db.end().catch(() => {});
  console.log("Temporary DB verification transaction rolled back.");
}