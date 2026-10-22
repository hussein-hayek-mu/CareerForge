create table public.job_postings (
  id text primary key check (char_length(id) between 1 and 100),
  title text not null check (char_length(title) between 1 and 160),
  company text not null check (char_length(company) between 1 and 160),
  initials text not null check (char_length(initials) between 1 and 8),
  location text not null check (char_length(location) between 1 and 160),
  work_mode text not null check (work_mode in ('Remote', 'Hybrid', 'On-site')),
  employment_type text not null check (employment_type in ('Full-time', 'Internship')),
  skills text[] not null check (cardinality(skills) between 1 and 40 and array_position(skills, null) is null and char_length(array_to_string(skills, ',')) <= 2400),
  description text not null check (char_length(description) between 1 and 4000),
  color text not null check (color in ('peach', 'lilac', 'mint', 'sand', 'blue', 'pink')),
  is_active boolean not null default true,
  is_fictional boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id text not null references public.job_postings(id) on delete restrict,
  status text not null default 'Saved' check (status in ('Saved', 'Applied', 'Interview', 'Offer', 'Rejected')),
  revision uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, job_id)
);
create index saved_jobs_job_id_idx on public.saved_jobs(job_id);

alter table public.job_postings enable row level security;
alter table public.saved_jobs enable row level security;
revoke all on public.job_postings, public.saved_jobs from public, anon, authenticated;
grant select on public.job_postings to authenticated;
grant select, delete on public.saved_jobs to authenticated;
grant insert (user_id, job_id) on public.saved_jobs to authenticated;
grant update (status) on public.saved_jobs to authenticated;

create policy saved_jobs_owner_select on public.saved_jobs for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_jobs_owner_insert on public.saved_jobs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_jobs_owner_update on public.saved_jobs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_jobs_owner_delete on public.saved_jobs for delete to authenticated using ((select auth.uid()) = user_id);
create policy job_postings_visible on public.job_postings for select to authenticated using (
  is_active or exists (select 1 from public.saved_jobs s where s.job_id = job_postings.id and s.user_id = (select auth.uid()))
);

create function public.careerforge_guard_saved_job()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.job_postings j where j.id = new.job_id and j.is_active) then
    raise exception 'Job is unavailable for saving' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.careerforge_guard_saved_job() from public, anon, authenticated;
create trigger careerforge_saved_job_guard before insert on public.saved_jobs
for each row execute function public.careerforge_guard_saved_job();

create function public.careerforge_touch_saved_job()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.revision = gen_random_uuid();
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
revoke all on function public.careerforge_touch_saved_job() from public, anon, authenticated;
create trigger careerforge_saved_job_touch before update on public.saved_jobs
for each row execute function public.careerforge_touch_saved_job();

-- Versioned fictional seeds follow. Existing guest IDs remain unchanged.

insert into public.job_postings (id,title,company,initials,location,work_mode,employment_type,skills,description,color) values
('1', 'Junior Frontend Developer', 'Forma Studio', 'F', 'Beirut, Lebanon', 'Hybrid', 'Full-time', ARRAY['React', 'TypeScript', 'CSS', 'Git'], 'Build thoughtful, accessible interfaces with a small product team. Collaborate with designers and turn early ideas into useful web experiences.', 'peach'),
('2', 'Software Engineering Intern', 'Orbit Labs', 'O', 'Remote', 'Remote', 'Internship', ARRAY['JavaScript', 'Git', 'Python'], 'Learn by shipping. Work alongside experienced engineers on internal tools, write tests, and get regular feedback on your code.', 'lilac'),
('3', 'Junior Full Stack Developer', 'Cedar Digital', 'C', 'Beirut, Lebanon', 'On-site', 'Full-time', ARRAY['React', 'TypeScript', 'SQL', 'Node.js', 'Git'], 'Help a growing team build reliable web applications, from customer-facing pages to database-backed services.', 'mint'),
('4', 'Data Analyst Intern', 'Metric House', 'M', 'Remote', 'Remote', 'Internship', ARRAY['Python', 'SQL', 'Excel'], 'Explore datasets, prepare clear visual reports, and help teams answer practical questions with evidence.', 'sand'),
('5', 'UI Developer', 'Outline', '↗', 'Dubai, UAE', 'Hybrid', 'Full-time', ARRAY['CSS', 'JavaScript', 'React', 'Figma'], 'Bring a design system to life through reusable components, responsive layouts, and careful attention to interaction details.', 'blue'),
('6', 'Backend Developer Intern', 'Patchwork', 'P', 'Remote', 'Remote', 'Internship', ARRAY['Node.js', 'SQL', 'Git', 'Docker'], 'Develop APIs and learn how dependable backend services are designed, tested, and maintained.', 'pink');
notify pgrst, 'reload schema';
