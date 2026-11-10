-- Timed assessment sessions preserve historical result rows and CV eligibility.
-- The browser never chooses timestamps, writes grades or extends a live deadline.
create table public.skill_check_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  version integer not null check (version > 0),
  timing_mode text not null check (timing_mode in ('standard', 'extended')),
  started_at timestamptz not null,
  deadline_at timestamptz not null,
  state text not null default 'active' check (state in ('active', 'submitted', 'expired', 'cancelled')),
  result_id uuid unique references public.skill_check_attempts(id),
  finished_at timestamptz,
  constraint skill_check_session_deadline check (
    deadline_at = started_at + case timing_mode when 'standard' then interval '600 seconds' else interval '6000 seconds' end
  ),
  constraint skill_check_session_lifecycle check (
    (state = 'active' and result_id is null and finished_at is null)
    or (state = 'submitted' and result_id is not null and finished_at is not null)
    or (state in ('expired', 'cancelled') and result_id is null and finished_at is not null)
  )
);
create unique index skill_check_one_active_owner_idx on public.skill_check_sessions(user_id) where state = 'active';
create index skill_check_session_owner_time_idx on public.skill_check_sessions(user_id, started_at desc);
alter table public.skill_check_sessions enable row level security;
revoke all on public.skill_check_sessions from public, anon, authenticated;
grant select on public.skill_check_sessions to authenticated;
create policy skill_check_session_owner_read on public.skill_check_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

-- No answer material or grading-key fingerprint enters the public payload.
create function careerforge_internal.skill_check_session_payload(p_session public.skill_check_sessions, p_now timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', p_session.id, 'skill', p_session.skill, 'version', p_session.version,
    'timingMode', p_session.timing_mode, 'startedAt', p_session.started_at,
    'deadlineAt', p_session.deadline_at,
    'state', case when p_session.state = 'active' and p_session.deadline_at <= p_now then 'expired' else p_session.state end,
    'serverNow', p_now
  );
$$;
revoke all on function careerforge_internal.skill_check_session_payload(public.skill_check_sessions, timestamptz) from public, anon, authenticated;

create function public.current_skill_check_session() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); session_row public.skill_check_sessions;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  select * into session_row from public.skill_check_sessions
    where user_id = owner_id and state = 'active' order by started_at desc limit 1;
  if not found then return jsonb_build_object('session', null); end if;
  return jsonb_build_object('session', careerforge_internal.skill_check_session_payload(session_row, clock_timestamp()));
end $$;
revoke all on function public.current_skill_check_session() from public, anon;
grant execute on function public.current_skill_check_session() to authenticated;

create function public.start_skill_check(p_skill text, p_version integer, p_timing_mode text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); session_row public.skill_check_sessions;
  checked_at timestamptz; latest timestamptz;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if p_timing_mode is null or p_timing_mode not in ('standard', 'extended')
    or not exists (select 1 from careerforge_internal.skill_check_banks where skill = p_skill and version = p_version)
    then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.profiles p, unnest(p.self_reported_skills) selected_skill
    where p.id = owner_id and lower(btrim(selected_skill)) = lower(btrim(p_skill))
  ) then return jsonb_build_object('skillNotSelected', true); end if;

  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 76211));
  checked_at := clock_timestamp();
  update public.skill_check_sessions set state = 'expired', finished_at = checked_at
    where user_id = owner_id and state = 'active' and deadline_at <= checked_at;
  select * into session_row from public.skill_check_sessions where user_id = owner_id and state = 'active' for update;
  if found then
    if session_row.skill = p_skill and session_row.version = p_version then
      return jsonb_build_object('session', careerforge_internal.skill_check_session_payload(session_row, checked_at));
    end if;
    return jsonb_build_object('conflict', true, 'session', careerforge_internal.skill_check_session_payload(session_row, checked_at));
  end if;

  select max(event_time) into latest from (
    select started_at as event_time from public.skill_check_sessions where user_id = owner_id
    union all
    select taken_at as event_time from public.skill_check_attempts where user_id = owner_id
  ) events;
  if latest > checked_at - interval '60 seconds' then
    return jsonb_build_object('rateLimited', true, 'retryAfter', greatest(1, ceil(extract(epoch from latest + interval '60 seconds' - checked_at))::integer));
  end if;
  insert into public.skill_check_sessions(user_id, skill, version, timing_mode, started_at, deadline_at)
    values(owner_id, p_skill, p_version, p_timing_mode, checked_at,
      checked_at + case p_timing_mode when 'standard' then interval '600 seconds' else interval '6000 seconds' end)
    returning * into session_row;
  return jsonb_build_object('session', careerforge_internal.skill_check_session_payload(session_row, checked_at));
end $$;
revoke all on function public.start_skill_check(text, integer, text) from public, anon;
grant execute on function public.start_skill_check(text, integer, text) to authenticated;

create function public.cancel_skill_check(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); session_row public.skill_check_sessions; checked_at timestamptz;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 76211));
  select * into session_row from public.skill_check_sessions where id = p_session_id and user_id = owner_id for update;
  if not found then return jsonb_build_object('notFound', true); end if;
  if session_row.state = 'active' then
    checked_at := clock_timestamp();
    update public.skill_check_sessions set
      state = case when deadline_at <= checked_at then 'expired' else 'cancelled' end,
      finished_at = checked_at
      where id = session_row.id;
  end if;
  return jsonb_build_object('cancelled', true);
end $$;
revoke all on function public.cancel_skill_check(uuid) from public, anon;
grant execute on function public.cancel_skill_check(uuid) to authenticated;

create function public.submit_timed_skill_check(p_session_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid(); session_row public.skill_check_sessions;
  bank careerforge_internal.skill_check_banks; result public.skill_check_attempts;
  checked_at timestamptz; latest timestamptz; points integer;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 76211));
  select * into session_row from public.skill_check_sessions where id = p_session_id and user_id = owner_id for update;
  if not found then return jsonb_build_object('notFound', true); end if;
  -- A lost successful response may be retried after its deadline or cooldown.
  -- Return that immutable result without grading again or creating a second row.
  if session_row.state = 'submitted' then
    select * into result from public.skill_check_attempts where id = session_row.result_id and user_id = owner_id;
  else
    checked_at := clock_timestamp();
    if session_row.state = 'expired' or (session_row.state = 'active' and session_row.deadline_at <= checked_at) then
      if session_row.state = 'active' then
        update public.skill_check_sessions set state = 'expired', finished_at = checked_at where id = session_row.id;
      end if;
      return jsonb_build_object('expired', true);
    end if;
    if session_row.state <> 'active' then return jsonb_build_object('notFound', true); end if;
    select * into bank from careerforge_internal.skill_check_banks where skill = session_row.skill and version = session_row.version;
    if not found then
      update public.skill_check_sessions set state = 'cancelled', finished_at = checked_at where id = session_row.id;
      return jsonb_build_object('bankChanged', true);
    end if;
    if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
    if (select count(*) from jsonb_object_keys(p_answers)) <> jsonb_array_length(bank.questions)
      or exists (select 1 from jsonb_array_elements(bank.questions) q where
        jsonb_typeof(p_answers -> (q->>'id')) is distinct from 'number'
        or (p_answers ->> (q->>'id')) !~ '^[0-2]$')
      then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
    select max(taken_at) into latest from public.skill_check_attempts where user_id = owner_id;
    if latest > checked_at - interval '60 seconds' then
      return jsonb_build_object('rateLimited', true, 'retryAfter', greatest(1, ceil(extract(epoch from latest + interval '60 seconds' - checked_at))::integer));
    end if;
    select count(*)::integer into points from jsonb_array_elements(bank.questions) q
      where p_answers ->> (q->>'id') = q->>'answer';
    insert into public.skill_check_attempts(user_id, skill, version, score, passed, taken_at)
      values(owner_id, bank.skill, bank.version, points, points >= 4, checked_at) returning * into result;
    update public.skill_check_sessions set state = 'submitted', result_id = result.id, finished_at = checked_at where id = session_row.id;
  end if;
  return jsonb_build_object('skill', result.skill, 'version', result.version, 'score', result.score,
    'total', 5, 'passed', result.passed, 'takenAt', result.taken_at);
end $$;
revoke all on function public.submit_timed_skill_check(uuid, jsonb) from public, anon;
grant execute on function public.submit_timed_skill_check(uuid, jsonb) to authenticated;

-- Old browser/direct RPC clients must not bypass session ownership and deadlines.
revoke all on function public.submit_skill_check(text, integer, jsonb) from public, anon, authenticated;
