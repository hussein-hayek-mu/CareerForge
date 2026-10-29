import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { Client } from "pg";
nextEnv.loadEnvConfig(process.cwd());
const db = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000, statement_timeout: 15000 });
const a = randomUUID(), b = randomUUID(), slug = randomUUID();
const trial = process.argv.includes("--trial-migration");
async function asUser(id) {
  await db.query("reset role"); await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]); await db.query("set local role authenticated");
}
async function rejected(sql, params, code) {
  await db.query("savepoint blocked");
  try { await assert.rejects(db.query(sql, params), error => error.code === code); }
  finally { await db.query("rollback to savepoint blocked"); }
}
const get = async () => (await db.query("select public.get_portfolio() data")).rows[0].data;
const read = async () => (await db.query("select public.get_public_portfolio($1) data", [slug])).rows[0].data;
async function write(data, action, palette, mode) {
  return (await db.query("select public.put_portfolio_design($1,$2,'studio',array['about','skills'],$3,$4,$5) data", [action, data.settings.revision, data.sourceToken, palette, mode])).rows[0].data;
}
try {
  await db.connect(); await db.query("begin");
  await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)", [a, `${a}@careerforge.invalid`, b, `${b}@careerforge.invalid`]);
  await db.query("update public.profiles set full_name='Appearance fixture',bio='Saved source biography' where id=$1", [a]);
  // A pre-design snapshot has no appearance payload. Preserve it through migration.
  await db.query("insert into public.portfolios(user_id,slug,is_public,published_at,published_snapshot) values($1,$2,true,clock_timestamp(),jsonb_build_object('template','studio','profile',careerforge_internal.portfolio_source($1)))", [a, slug]);
  if (trial) await db.query(await readFile(new URL("../supabase/migrations/202610280003_portfolio_appearance.sql", import.meta.url), "utf8"));
  else await db.query("update public.portfolios set color_mode='light' where user_id=$1", [a]);
  await asUser(a);
  let state = await get();
  assert.deepEqual(state.settings.appearance, { palette: "chartreuse", mode: "light" });
  const legacy = await read();
  assert.equal(legacy.snapshot.appearance, undefined);
  const original = state;
  state = await write(state, "save", "rose", "dark");
  assert.deepEqual(state.settings.appearance, { palette: "rose", mode: "dark" });
  assert.deepEqual(await read(), legacy, "Saved cosmetic changes must not modify a shared snapshot");
  assert.equal((await write(original, "publish", "sky", "dark")).conflict, true);
  state = await write(state, "publish", "rose", "dark");
  const published = await read();
  assert.deepEqual(published.snapshot.appearance, { palette: "rose", mode: "dark" });
  assert.equal(published.snapshot.profile.bio, "Saved source biography");
  state = await write(state, "save", "indigo", "light");
  assert.deepEqual(await read(), published);
  state = (await db.query("select public.put_portfolio('publish',$1,'studio',array['about','skills'],$2) data", [state.settings.revision, state.sourceToken])).rows[0].data;
  assert.deepEqual((await read()).snapshot.appearance, { palette: "indigo", mode: "light" });
  await rejected("select public.put_portfolio_design('save',$1,'studio',array['about'],$2,'url(bad)','dark')", [state.settings.revision, state.sourceToken], "22023");
  await rejected("update public.portfolios set palette='rose' where user_id=$1", [a], "42501");
  await rejected("select careerforge_internal.put_portfolio('save',null,'studio',array['about'],null)", [], "42501");
  await asUser(b);
  assert.deepEqual((await get()).settings.appearance, { palette: "chartreuse", mode: "dark" });
  assert.equal((await db.query("select * from public.portfolios where user_id=$1", [a])).rowCount, 0);
  await db.query("reset role"); await db.query("set local role anon");
  await rejected("select public.put_portfolio_design('save',null,'studio',array['about'],null,'rose','dark')", [], "42501");
  assert.equal((await read()).snapshot.profile.name, "Appearance fixture");
  await asUser(a);
  await write(state, "unpublish", "sky", "dark");
  assert.equal(await read(), null);
  console.log("PASS: legacy appearance preserved, new dark defaults, persisted presets, approved public style snapshots, old-client writes, stale revisions, invalid-style/direct-write denial, ownership and revocation");
} catch (error) { console.error("Portfolio appearance verification failed:", error.code ?? error.message); process.exitCode = 1; }
finally { await db.query("rollback").catch(() => {}); await db.end().catch(() => {}); console.log("Appearance verification transaction rolled back."); }
