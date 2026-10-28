-- Portfolio facts are composed by the database, never accepted from a browser.
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  slug uuid not null unique default gen_random_uuid(),
  template text not null default 'studio' check (template in ('studio', 'editorial')),
  sections text[] not null default array['about','project','skills'],
  revision uuid not null default gen_random_uuid(),
  is_public boolean not null default false,
  published_snapshot jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  constraint portfolio_sections_valid check (sections <@ array['about','project','skills','education','location']::text[] and cardinality(sections) <= 5 and array_position(sections, null) is null),
  constraint portfolio_visibility_consistent check (
    (is_public and published_snapshot is not null and published_at is not null)
    or (not is_public and published_snapshot is null and published_at is null)
  )
);
alter table public.portfolios enable row level security;
revoke all on public.portfolios from public, anon, authenticated;
grant select on public.portfolios to authenticated;
create policy portfolio_owner_read on public.portfolios for select to authenticated using ((select auth.uid()) = user_id);

create function careerforge_internal.portfolio_source(p_owner uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'name', p.full_name, 'headline', p.headline, 'location', p.location,
    'bio', p.bio, 'education', p.education_summary, 'project', p.project_summary,
    'skills', coalesce((select jsonb_agg(s.skill order by s.position) from unnest(p.self_reported_skills) with ordinality s(skill,position)
      where exists (select 1 from public.skill_check_attempts a where a.user_id = p_owner and a.version = 1
        and a.skill in ('React','SQL') and a.passed and lower(a.skill) = lower(btrim(s.skill)))), '[]'::jsonb)
  ) from public.profiles p where p.id = p_owner;
$$;
revoke all on function careerforge_internal.portfolio_source(uuid) from public, anon, authenticated;

create function public.get_portfolio() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); source jsonb; item public.portfolios;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  source := careerforge_internal.portfolio_source(owner_id);
  if source is null then raise exception 'PROFILE_UNAVAILABLE'; end if;
  select * into item from public.portfolios where user_id = owner_id;
  return jsonb_build_object('source', source, 'sourceToken', md5(source::text),
    'settings', jsonb_build_object('template', coalesce(item.template, 'studio'),
      'sections', coalesce(item.sections, array['about','project','skills']), 'revision', item.revision,
      'isPublic', coalesce(item.is_public, false), 'slug', item.slug, 'publishedAt', item.published_at));
end $$;
revoke all on function public.get_portfolio() from public, anon;
grant execute on function public.get_portfolio() to authenticated;

create function public.put_portfolio(p_action text, p_revision uuid, p_template text, p_sections text[], p_source_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); item public.portfolios; source jsonb; snapshot jsonb; checked_at timestamptz;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if p_action is null or p_action not in ('save','publish','unpublish') or p_template is null or p_template not in ('studio','editorial')
    or p_sections is null or not (p_sections <@ array['about','project','skills','education','location']::text[])
    or cardinality(p_sections) > 5 or array_position(p_sections, null) is not null
    then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 76212));
  select * into item from public.portfolios where user_id = owner_id for update;
  if (found and item.revision is distinct from p_revision) or (not found and p_revision is not null) then
    return jsonb_build_object('conflict', true);
  end if;
  source := careerforge_internal.portfolio_source(owner_id);
  if source is null then raise exception 'PROFILE_UNAVAILABLE'; end if;
  if p_action = 'publish' then
    if btrim(source->>'name') = '' then return jsonb_build_object('profileRequired', true); end if;
    if p_source_token is distinct from md5(source::text) then return jsonb_build_object('sourceChanged', true); end if;
    snapshot := jsonb_build_object('template', p_template, 'profile', jsonb_build_object(
      'name', source->'name', 'headline', source->'headline',
      'location', case when 'location' = any(p_sections) then source->'location' else '""'::jsonb end,
      'bio', case when 'about' = any(p_sections) then source->'bio' else '""'::jsonb end,
      'education', case when 'education' = any(p_sections) then source->'education' else '""'::jsonb end,
      'project', case when 'project' = any(p_sections) then source->'project' else '""'::jsonb end,
      'skills', case when 'skills' = any(p_sections) then source->'skills' else '[]'::jsonb end));
  end if;
  checked_at := clock_timestamp();
  if item.id is null then
    insert into public.portfolios(user_id) values(owner_id) returning * into item;
  end if;
  update public.portfolios set template = p_template, sections = p_sections, revision = gen_random_uuid(), updated_at = checked_at,
    is_public = case p_action when 'publish' then true when 'unpublish' then false else is_public end,
    published_snapshot = case p_action when 'publish' then snapshot when 'unpublish' then null else published_snapshot end,
    published_at = case p_action when 'publish' then checked_at when 'unpublish' then null else published_at end
    where id = item.id;
  return public.get_portfolio();
end $$;
revoke all on function public.put_portfolio(text, uuid, text, text[], text) from public, anon;
grant execute on function public.put_portfolio(text, uuid, text, text[], text) to authenticated;

-- No user ID/settings/source token are exposed through public reads.
create function public.get_public_portfolio(p_slug uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('snapshot', p.published_snapshot, 'publishedAt', p.published_at)
  from public.portfolios p where p.slug = p_slug and p.is_public;
$$;
revoke all on function public.get_public_portfolio(uuid) from public;
grant execute on function public.get_public_portfolio(uuid) to anon, authenticated;
