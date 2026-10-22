import assert from "node:assert/strict";

// Called inside the existing rolled-back RLS transaction with synthetic users.
export async function verifyTrackerRls(client, asUser, denied, a, b) {
  await client.query("reset role");
  const rls = await client.query("select relrowsecurity from pg_class where oid in ('public.job_postings'::regclass, 'public.saved_jobs'::regclass)");
  assert.equal(rls.rows.length, 2);
  assert.ok(rls.rows.every(row => row.relrowsecurity));
  assert.equal((await client.query("select id from public.job_postings where id in ('1','2','3','4','5','6') and is_fictional")).rowCount, 6);

  await asUser(a);
  assert.equal((await client.query("select id from public.job_postings where is_active")).rowCount >= 6, true);
  for (const sql of [
    "insert into public.job_postings (id) values ('blocked')",
    "update public.job_postings set title='Blocked' where id='1'",
    "delete from public.job_postings where id='1'"
  ]) await denied(sql);
  const first = (await client.query("insert into public.saved_jobs (user_id,job_id) values ($1,'1') returning *", [a])).rows[0];
  assert.equal(first.status, "Saved");
  assert.ok(first.revision && first.created_at && first.updated_at);
  await denied("insert into public.saved_jobs (user_id,job_id) values ($1,'1')", [a], "23505");
  await denied("insert into public.saved_jobs (user_id,job_id) values ($1,'2')", [b]);
  await denied("insert into public.saved_jobs (user_id,job_id) values ($1,'missing-job')", [a], "23514");
  await denied("insert into public.saved_jobs (user_id,job_id,status) values ($1,'2','Offer')", [a]);
  for (const assignment of ["user_id=gen_random_uuid()", "job_id='2'", "revision=gen_random_uuid()", "created_at=now()", "updated_at=now()"]) {
    await denied(`update public.saved_jobs set ${assignment} where user_id=$1`, [a]);
  }
  await denied("update public.saved_jobs set status='Invalid' where user_id=$1", [a], "23514");
  for (const status of ["Applied", "Interview", "Offer", "Rejected", "Saved"]) {
    assert.equal((await client.query("update public.saved_jobs set status=$2 where user_id=$1", [a, status])).rowCount, 1);
  }
  // A stale compare-and-swap must not overwrite a newer edit, even to the same status.
  assert.equal((await client.query("update public.saved_jobs set status='Offer' where user_id=$1 and job_id='1' and revision=$2", [a, first.revision])).rowCount, 0);
  const current = (await client.query("select * from public.saved_jobs where user_id=$1", [a])).rows[0];
  assert.notEqual(current.revision, first.revision);
  assert.ok(current.updated_at >= first.updated_at);
  assert.equal((await client.query("delete from public.saved_jobs where user_id=$1 and revision=$2", [a, first.revision])).rowCount, 0);
  assert.equal((await client.query("delete from public.saved_jobs where user_id=$1 and revision=$2", [a, current.revision])).rowCount, 1);
  const recreated = (await client.query("insert into public.saved_jobs (user_id,job_id) values ($1,'1') returning revision", [a])).rows[0];
  assert.notEqual(recreated.revision, current.revision);
  assert.equal((await client.query("update public.saved_jobs set status='Offer' where user_id=$1 and revision=$2", [a, current.revision])).rowCount, 0);
  await client.query("insert into public.saved_jobs (user_id,job_id) values ($1,'2')", [a]);

  await asUser(b);
  assert.equal((await client.query("select * from public.saved_jobs")).rowCount, 0);
  assert.equal((await client.query("update public.saved_jobs set status='Offer' where user_id=$1", [a])).rowCount, 0);
  assert.equal((await client.query("delete from public.saved_jobs where user_id=$1", [a])).rowCount, 0);
  await denied("insert into public.saved_jobs (user_id,job_id) values ($1,'3')", [a]);
  await client.query("insert into public.saved_jobs (user_id,job_id) values ($1,'1')", [b]);
  assert.equal((await client.query("select * from public.saved_jobs")).rowCount, 1);
  await asUser(a);
  assert.equal((await client.query("select * from public.saved_jobs where user_id=$1", [b])).rowCount, 0);
  assert.equal((await client.query("update public.saved_jobs set status='Offer' where user_id=$1", [b])).rowCount, 0);
  assert.equal((await client.query("delete from public.saved_jobs where user_id=$1", [b])).rowCount, 0);

  await client.query("reset role");
  await client.query("update public.job_postings set is_active=false where id='2'");
  await denied("delete from public.job_postings where id='1'", [], "23503");
  await asUser(a);
  assert.equal((await client.query("select id from public.job_postings where id='2'")).rowCount, 1);
  assert.equal((await client.query("update public.saved_jobs set status='Interview' where user_id=$1 and job_id='2'", [a])).rowCount, 1);
  await asUser(b);
  assert.equal((await client.query("select id from public.job_postings where id='2'")).rowCount, 0);
  await denied("insert into public.saved_jobs (user_id,job_id) values ($1,'2')", [b], "23514");
  await asUser(a);
  assert.equal((await client.query("delete from public.saved_jobs where user_id=$1 and job_id='2'", [a])).rowCount, 1);
  await denied("insert into public.saved_jobs (user_id,job_id) values ($1,'2')", [a], "23514");

  await client.query("reset role");
  await client.query("delete from auth.users where id=$1", [a]);
  assert.equal((await client.query("select * from public.saved_jobs where user_id=$1", [a])).rowCount, 0);
  assert.equal((await client.query("select * from public.saved_jobs where user_id=$1", [b])).rowCount, 1);
  await client.query("set local role anon");
  for (const sql of [
    "select * from public.saved_jobs", "select * from public.job_postings",
    "insert into public.saved_jobs (user_id,job_id) values (gen_random_uuid(),'1')",
    "update public.saved_jobs set status='Offer'", "delete from public.saved_jobs"
  ]) await denied(sql);
  console.log("PASS: tracker owner CRUD, two-way isolation, protected columns, catalog grants, constraints, stale revisions, inactive history and account-deletion cascade");
}
