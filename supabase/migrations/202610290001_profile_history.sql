-- Private profile history. Saving a record does not verify the claim.
create table public.education_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 institution text not null check (char_length(btrim(institution)) between 1 and 160),
 degree text not null check (char_length(btrim(degree)) between 1 and 160),
 start_date date check (start_date between date '1900-01-01' and date '2100-12-31'),
 end_date date check (end_date between date '1900-01-01' and date '2100-12-31'),
 is_current boolean not null default false,
 gpa double precision,
 gpa_scale double precision,
 revision uuid not null default gen_random_uuid(),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 creation_payload jsonb not null default '{}'::jsonb,
 unique (user_id, request_id),
 constraint education_dates_valid check (start_date is null or end_date is null or end_date >= start_date),
 constraint education_current_valid check (not is_current or end_date is null),
 constraint education_gpa_valid check ((gpa is null and gpa_scale is null) or
  (gpa is not null and gpa_scale is not null and gpa >= 0 and gpa_scale > 0 and gpa_scale <= 100 and gpa <= gpa_scale))
);
create table public.experience_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 company text not null check (char_length(btrim(company)) between 1 and 160),
 role text not null check (char_length(btrim(role)) between 1 and 160),
 description text not null default '' check (char_length(description) <= 2000),
 start_date date check (start_date between date '1900-01-01' and date '2100-12-31'),
 end_date date check (end_date between date '1900-01-01' and date '2100-12-31'),
 is_current boolean not null default false,
 revision uuid not null default gen_random_uuid(),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 creation_payload jsonb not null default '{}'::jsonb,
 unique (user_id, request_id),
 constraint experience_dates_valid check (start_date is null or end_date is null or end_date >= start_date),
 constraint experience_current_valid check (not is_current or end_date is null)
);
alter table public.education_records enable row level security;
alter table public.experience_records enable row level security;
revoke all on public.education_records, public.experience_records from public, anon, authenticated;
grant select, delete on public.education_records, public.experience_records to authenticated;
grant insert (user_id, request_id, institution, degree, start_date, end_date, is_current, gpa, gpa_scale) on public.education_records to authenticated;
grant update (institution, degree, start_date, end_date, is_current, gpa, gpa_scale) on public.education_records to authenticated;
grant insert (user_id, request_id, company, role, description, start_date, end_date, is_current) on public.experience_records to authenticated;
grant update (company, role, description, start_date, end_date, is_current) on public.experience_records to authenticated;
create policy education_owner_select on public.education_records for select to authenticated using ((select auth.uid()) = user_id);
create policy education_owner_insert on public.education_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy education_owner_update on public.education_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy education_owner_delete on public.education_records for delete to authenticated using ((select auth.uid()) = user_id);
create policy experience_owner_select on public.experience_records for select to authenticated using ((select auth.uid()) = user_id);
create policy experience_owner_insert on public.experience_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy experience_owner_update on public.experience_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy experience_owner_delete on public.experience_records for delete to authenticated using ((select auth.uid()) = user_id);
create function public.careerforge_guard_profile_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if tg_op = 'UPDATE' then
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
   or new.request_id is distinct from old.request_id or new.created_at is distinct from old.created_at
   or new.creation_payload is distinct from old.creation_payload then raise insufficient_privilege; end if;
  new.revision := gen_random_uuid();
  new.updated_at := clock_timestamp();
  return new;
 end if;
 if auth.uid() is not null and new.user_id is distinct from auth.uid() then raise insufficient_privilege; end if;
 -- Serialize creates per owner, including authenticated writes that bypass the API.
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 2910202601));
 if tg_table_name = 'education_records' then
  new.creation_payload := jsonb_build_object('institution',new.institution,'degree',new.degree,
   'startDate',new.start_date,'endDate',new.end_date,'isCurrent',new.is_current,'gpa',new.gpa,'gpaScale',new.gpa_scale);
  if not exists (select 1 from public.education_records where user_id=new.user_id and request_id=new.request_id)
   and (select count(*) from public.education_records where user_id=new.user_id) >= 20 then
   raise exception 'HISTORY_LIMIT_REACHED' using errcode = 'P0001'; end if;
 elsif tg_table_name = 'experience_records' then
  new.creation_payload := jsonb_build_object('company',new.company,'role',new.role,'description',new.description,
   'startDate',new.start_date,'endDate',new.end_date,'isCurrent',new.is_current);
  if not exists (select 1 from public.experience_records where user_id=new.user_id and request_id=new.request_id)
   and (select count(*) from public.experience_records where user_id=new.user_id) >= 50 then
   raise exception 'HISTORY_LIMIT_REACHED' using errcode = 'P0001'; end if;
 else raise exception 'Unsupported history table'; end if;
 return new;
end;
$$;
revoke all on function public.careerforge_guard_profile_history() from public, anon, authenticated;
create trigger education_record_guard before insert or update on public.education_records for each row execute function public.careerforge_guard_profile_history();
create trigger experience_record_guard before insert or update on public.experience_records for each row execute function public.careerforge_guard_profile_history();
notify pgrst, 'reload schema';
