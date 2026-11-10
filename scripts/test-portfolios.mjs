import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { Client } from "pg";
nextEnv.loadEnvConfig(process.cwd());
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, statement_timeout: 15000 });
const a = randomUUID(), b = randomUUID();
async function asUser(id) {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
  await db.query("set local role authenticated");
}
async function denied(sql, params = []) {
  await db.query("savepoint denied");
  try { await assert.rejects(db.query(sql, params), error => error.code === "42501"); }
  finally { await db.query("rollback to savepoint denied"); }
}
const get = async () => (await db.query("select public.get_portfolio() data")).rows[0].data;
const publicRead = async slug => (await db.query("select public.get_public_portfolio($1) data", [slug])).rows[0].data;
async function put(action, data, template = "editorial", sections = ["about", "skills"]) {
  return (await db.query("select public.put_portfolio($1,$2,$3,$4,$5) data", [action, data.settings.revision, template, sections, data.sourceToken])).rows[0].data;
}
try {
  await db.connect(); await db.query("begin");
  if (process.argv.includes("--trial-migration")) await db.query(await readFile(new URL("../supabase/migrations/202610280002_portfolios.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)", [a, `${a}@careerforge.invalid`, b, `${b}@careerforge.invalid`]);
  await db.query("update public.profiles set full_name='Portfolio Owner A', headline='Student', bio='Approved biography', education_summary='Private degree', project_summary='Private project', location='Private location', self_reported_skills=array['React','SQL','TypeScript'] where id=$1", [a]);
  await db.query("update public.profiles set full_name='Portfolio Owner B' where id=$1", [b]);
  await db.query("insert into public.skill_check_attempts(user_id,skill,version,score,passed) values($1,'React',1,5,true)", [a]);
  await asUser(a);
  const initial = await get();
  assert.equal(initial.settings.revision, null);
  assert.equal(initial.settings.isPublic, false);
  assert.deepEqual(initial.source.skills, ["React"]);
  let saved = await put("save", initial);
  const slug = saved.settings.slug;
  assert.equal(saved.settings.template, "editorial");
  assert.equal(await publicRead(slug), null);
  await denied("update public.portfolios set is_public=true where user_id=$1", [a]);
  await denied("insert into public.portfolios(user_id) values($1)", [b]);
  await denied("select careerforge_internal.portfolio_source($1)", [b]);
  assert.equal((await put("save", initial)).conflict, true);
  await db.query("update public.profiles set bio='Reviewed new biography' where id=$1", [a]);
  assert.equal((await put("publish", saved)).sourceChanged, true);
  assert.equal(await publicRead(slug), null);
  saved = await get();
  saved = await put("publish", saved);
  assert.equal(saved.settings.isPublic, true);
  const published = await publicRead(slug);
  assert.equal(published.snapshot.profile.bio, "Reviewed new biography");
  assert.deepEqual(published.snapshot.profile.skills, ["React"]);
  for (const key of ["location", "education", "project"]) assert.equal(published.snapshot.profile[key], "");
  for (const secret of [a, "Private location", "Private degree", "Private project", "TypeScript", "sourceToken", "revision"]) assert.equal(JSON.stringify(published).includes(secret), false);
  await db.query("update public.profiles set bio='New private biography' where id=$1", [a]);
  saved = await put("save", saved, "studio", ["about", "education"]);
  assert.deepEqual(await publicRead(slug), published, "Draft/profile edits must not silently change public content");
  await asUser(b);
  assert.equal((await db.query("select * from public.portfolios where user_id=$1", [a])).rowCount, 0);
  assert.equal((await get()).source.name, "Portfolio Owner B");
  assert.equal((await get()).settings.slug, null);
  await db.query("reset role"); await db.query("set local role anon");
  await denied("select * from public.portfolios");
  await denied("select public.get_portfolio()");
  await denied("select public.put_portfolio('unpublish',null,'studio',array['about'],null)");
  assert.deepEqual(await publicRead(slug), published);
  assert.equal(await publicRead(randomUUID()), null);
  await asUser(a);
  saved = await put("unpublish", saved);
  assert.equal(saved.settings.isPublic, false);
  assert.equal(saved.settings.publishedAt, null);
  assert.equal(await publicRead(slug), null);
  assert.equal((await db.query("select published_snapshot from public.portfolios where user_id=$1", [a])).rows[0].published_snapshot, null);
  console.log("PASS: private defaults, selected/current passed skills only, two templates, owner/anon isolation, direct-write denial, source/revision conflicts, approved-field snapshots, draft isolation and public revocation");
} catch (error) { console.error("Portfolio DB verification failed:", error.code ?? error.message); process.exitCode = 1; }
finally { await db.query("rollback").catch(() => {}); await db.end().catch(() => {}); console.log("Portfolio verification transaction rolled back."); }
