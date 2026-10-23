create table public.skill_check_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  version integer not null,
  score integer not null check (score between 0 and 5),
  passed boolean not null,
  taken_at timestamptz not null default now(),
  constraint skill_check_result_consistent check (passed = (score >= 4))
);
create index skill_check_owner_time_idx on public.skill_check_attempts(user_id, taken_at desc);
alter table public.skill_check_attempts enable row level security;
revoke all on public.skill_check_attempts from anon, authenticated;
grant select on public.skill_check_attempts to authenticated;
create policy skill_check_owner_read on public.skill_check_attempts for select to authenticated using ((select auth.uid()) = user_id);

create schema if not exists careerforge_internal;
revoke all on schema careerforge_internal from public, anon, authenticated;
create table careerforge_internal.skill_check_banks (skill text primary key, version integer not null, questions jsonb not null);
insert into careerforge_internal.skill_check_banks values
('React', 1, '[
 {"id":"r1","prompt":"Two increments depend on the previous state. Which update avoids a stale value?","options":["setCount(count + 1)","setCount(previous => previous + 1)","count++"],"answer":1},
 {"id":"r2","prompt":"Which key best preserves list-item identity after reordering?","options":["A random number on each render","The current array index","A stable unique record ID"],"answer":2},
 {"id":"r3","prompt":"An effect subscribes to an event. How should it unsubscribe?","options":["During rendering","Return a cleanup function from the effect","Only on a full page reload"],"answer":1},
 {"id":"r4","prompt":"How should you change one record in an array held in state?","options":["Mutate the record directly","Push into the original array","Create a new array with the changed record"],"answer":2},
 {"id":"r5","prompt":"A filtered list can be calculated from props during rendering. What is usually appropriate?","options":["Derive it from the props without duplicate state","Always copy it into state in an effect","Change the props directly"],"answer":0}
]'::jsonb),
('SQL', 1, '[
 {"id":"s1","prompt":"Which clause filters individual rows before grouping?","options":["ORDER BY","WHERE","HAVING"],"answer":1},
 {"id":"s2","prompt":"Which join keeps every row from the left table even without a matching right row?","options":["LEFT JOIN","INNER JOIN","CROSS JOIN"],"answer":0},
 {"id":"s3","prompt":"A column contains NULL values. What does COUNT(column) count?","options":["Every row","Only NULL rows","Only rows where that column is non-NULL"],"answer":2},
 {"id":"s4","prompt":"How should untrusted input be supplied to a database query?","options":["Concatenate it into SQL","Use bound query parameters","Remove spaces and concatenate it"],"answer":1},
 {"id":"s5","prompt":"What supports committing related writes together or rolling them back together?","options":["A transaction","An ORDER BY clause","A view name"],"answer":0}
]'::jsonb);

create function public.skill_check_catalog() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  return (select jsonb_agg(jsonb_build_object('skill', b.skill, 'version', b.version,
    'questions', (select jsonb_agg(q - 'answer') from jsonb_array_elements(b.questions) q)))
    from careerforge_internal.skill_check_banks b);
end $$;
revoke all on function public.skill_check_catalog() from public, anon;
grant execute on function public.skill_check_catalog() to authenticated;

create function public.submit_skill_check(p_skill text, p_version integer, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); bank careerforge_internal.skill_check_banks;
  latest timestamptz; result public.skill_check_attempts; points integer;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  select * into bank from careerforge_internal.skill_check_banks where skill = p_skill and version = p_version;
  if not found or jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(p_answers)) <> jsonb_array_length(bank.questions)
    or exists (select 1 from jsonb_array_elements(bank.questions) q where
      jsonb_typeof(p_answers -> (q->>'id')) is distinct from 'number'
      or (p_answers ->> (q->>'id')) !~ '^[0-2]$')
    then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 76211));
  select max(taken_at) into latest from public.skill_check_attempts where user_id=owner_id;
  if latest > now() - interval '60 seconds' then
    return jsonb_build_object('rateLimited', true, 'retryAfter', ceil(extract(epoch from latest + interval '60 seconds' - now())));
  end if;
  select count(*)::integer into points from jsonb_array_elements(bank.questions) q where p_answers ->> (q->>'id') = q->>'answer';
  insert into public.skill_check_attempts(user_id, skill, version, score, passed)
    values(owner_id, bank.skill, bank.version, points, points >= 4) returning * into result;
  return jsonb_build_object('skill', result.skill, 'version', result.version, 'score', result.score,
    'total', 5, 'passed', result.passed, 'takenAt', result.taken_at);
end $$;
revoke all on function public.submit_skill_check(text, integer, jsonb) from public, anon;
grant execute on function public.submit_skill_check(text, integer, jsonb) to authenticated;
