-- Preserve existing light drafts; future new portfolios start in showcase dark.
alter table public.portfolios add column palette text not null default 'chartreuse'
  check (palette in ('chartreuse','indigo','emerald','rose','amber','sky'));
alter table public.portfolios add column color_mode text not null default 'light' check (color_mode in ('light','dark'));
alter table public.portfolios alter column color_mode set default 'dark';

create or replace function public.get_portfolio() returns jsonb
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
      'isPublic', coalesce(item.is_public, false), 'slug', item.slug, 'publishedAt', item.published_at,
      'appearance', jsonb_build_object('palette', coalesce(item.palette, 'chartreuse'), 'mode', coalesce(item.color_mode, 'dark'))));
end $$;

-- Keep the original, reviewed fact/revision checks as an internal implementation.
alter function public.put_portfolio(text, uuid, text, text[], text) set schema careerforge_internal;
revoke all on function careerforge_internal.put_portfolio(text, uuid, text, text[], text) from public, anon, authenticated;

create function public.put_portfolio_design(p_action text, p_revision uuid, p_template text, p_sections text[], p_source_token text, p_palette text, p_color_mode text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid(); item public.portfolios; result jsonb; chosen_palette text; chosen_mode text;
begin
  if owner_id is null then raise insufficient_privilege; end if;
  if (p_palette is not null and p_palette not in ('chartreuse','indigo','emerald','rose','amber','sky'))
    or (p_color_mode is not null and p_color_mode not in ('light','dark'))
    then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 76212));
  select * into item from public.portfolios where user_id = owner_id for update;
  chosen_palette := coalesce(p_palette, item.palette, 'chartreuse');
  chosen_mode := coalesce(p_color_mode, item.color_mode, 'dark');
  result := careerforge_internal.put_portfolio(p_action, p_revision, p_template, p_sections, p_source_token);
  if not (result ? 'settings') then return result; end if;
  update public.portfolios set palette = chosen_palette, color_mode = chosen_mode,
    published_snapshot = case when p_action = 'publish' then published_snapshot || jsonb_build_object('appearance', jsonb_build_object('palette', chosen_palette, 'mode', chosen_mode)) else published_snapshot end
    where user_id = owner_id;
  return public.get_portfolio();
end $$;
revoke all on function public.put_portfolio_design(text, uuid, text, text[], text, text, text) from public, anon;
grant execute on function public.put_portfolio_design(text, uuid, text, text[], text, text, text) to authenticated;

-- Older callers may omit cosmetic choices, retaining the owner's saved style.
create function public.put_portfolio(p_action text, p_revision uuid, p_template text, p_sections text[], p_source_token text) returns jsonb
language sql security definer set search_path = '' as $$
  select public.put_portfolio_design(p_action, p_revision, p_template, p_sections, p_source_token, null, null);
$$;
revoke all on function public.put_portfolio(text, uuid, text, text[], text) from public, anon;
grant execute on function public.put_portfolio(text, uuid, text, text[], text) to authenticated;
