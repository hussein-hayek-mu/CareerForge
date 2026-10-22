create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'admin')),
  full_name text not null default '' check (char_length(full_name) <= 100),
  headline text not null default '' check (char_length(headline) <= 160),
  location text not null default '' check (char_length(location) <= 120),
  bio text not null default '' check (char_length(bio) <= 1000),
  education_summary text not null default '' check (char_length(education_summary) <= 240),
  project_summary text not null default '' check (char_length(project_summary) <= 1000),
  self_reported_skills text[] not null default '{}' check (cardinality(self_reported_skills) <= 40),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, delete on public.profiles to authenticated;
grant insert (id, full_name, headline, location, bio, education_summary, project_summary, self_reported_skills) on public.profiles to authenticated;
grant update (full_name, headline, location, bio, education_summary, project_summary, self_reported_skills) on public.profiles to authenticated;

create policy profiles_owner_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_owner_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_owner_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_owner_delete on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create function public.careerforge_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function public.careerforge_create_profile() from public, anon, authenticated;
create trigger careerforge_auth_user_profile after insert on auth.users
for each row execute function public.careerforge_create_profile();

insert into public.profiles (id) select id from auth.users;
notify pgrst, 'reload schema';
