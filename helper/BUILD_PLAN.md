# CareerForge — Block-by-Block Build Plan

## How to use this (you, the human)
For every task, in order:
1. Open a fresh Codex session. Paste the **Prompt template** (bottom) with the task ID filled in.
2. Let Codex finish. Run the task's **Verify** commands yourself.
3. Pass -> `git commit`, `git tag task-X.Y`, move on. Fail -> paste the error back to Codex in the same session, fix, re-verify. Never start the next task on a red build.
4. Never skip or reorder. Later tasks assume earlier ones exist.

Legend: **Build** = what to create. **Verify** = what must be true before moving on.

---

## 0. Decisions locked up front (the report leaves these open — do not let Codex improvise)

| Gap in the report | Decision |
|---|---|
| `auth.users` is Supabase-managed | Prisma does NOT model it. App tables reference it via SQL FKs in migrations. `profiles.id` = `auth.users.id`. |
| Report says "Profile"/"profiles" | Table names are snake_case plural: `profiles`, `education`, `experiences`, `projects`, `certifications`, `skills`, `user_skills`, `courses`, `user_courses`, etc. |
| No table for career requirements | Add `careers` (id, title, category) and `career_skills` (career_id, skill_id, weight, importance). Seeded by admin/seed script. |
| No degree requirements table | Add `degree_programs` (id, name, required_credits) and `profiles.degree_program_id`. |
| Skill-gap not persisted | Add `skill_gaps` (career_match_id, skill_id, status have/partial/missing, severity critical/important/optional). |
| CV analysis not a table | Add `cv_analyses` (cv_id, job_posting_id nullable, score, breakdown json, explanation, prompt_version, model_name). |
| Preferences duplicated in Profile and ApplicationAgentSettings | `profiles` keeps preferences (location, work_mode, etc.). `application_agent_settings` keeps ONLY agent controls (enabled, require_review, minimum_match_score, maximum_daily_applications, excluded_*). |
| `career_category` indexed on `job_postings` but not in fields | Add `career_category` column to `job_postings`. |
| Scoring weights | Live in `packages/core/src/config.ts` as a versioned const (`SCORING_VERSION`). Never from the LLM. |
| Skill name matching | Normalized (lowercase, trim, alias map e.g. "js"->"javascript") by one function `normalizeSkill()`. Used everywhere. |
| Time/"today" | Passed as a parameter to core functions. |
| LLM provider | Behind interface `LlmProvider`. Real = Anthropic. Tests = `FakeLlmProvider` returning fixtures. |
| Tier 1 integration | Mock ATS only, inside this app at `/api/mock-ats/*`. |
| Mobile | Built last (Phase 11), against stable API. |

---

## Phase 0 — Foundation

**0.1 Monorepo skeleton**
Build: pnpm workspace; `apps/web` (create-next-app, TS, Tailwind, App Router), `packages/core`, `packages/shared` (both TS libs with vitest), root scripts `lint`, `typecheck`, `test`, `build`. Add `AGENTS.md`, `BUILD_PLAN.md`, report PDF under `docs/`.
Verify: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass; `pnpm --filter web dev` serves a page.

**0.2 Env handling**
Build: `.env.example` (all vars listed, no values), `apps/web/lib/env.ts` validating env with zod (server vars separate from public vars). `.gitignore` covers `.env*`.
Verify: app fails fast with a clear message if a required server var is missing; unit test for the env parser.

**0.3 CI**
Build: `.github/workflows/ci.yml`: install -> lint -> typecheck -> test -> build on PR.
Verify: push a branch, workflow is green.

**0.4 Local Supabase**
Build: `supabase init`, `supabase/config.toml`, README section "run local DB" (`supabase start`). Do not write tables yet.
Verify: `supabase start` runs; `supabase status` shows DB URL; add that URL to `.env.local`.

**0.5 Prisma connection**
Build: `prisma/schema.prisma` with datasource only (`DATABASE_URL`, `DIRECT_URL`), `apps/web/lib/db.ts` singleton client.
Verify: `pnpm prisma validate` passes; a script `pnpm db:ping` runs `SELECT 1`.

---

## Phase 1 — M1 Profile & Onboarding

**1.1 Profile tables + RLS (migration)**
Build: migration creating `profiles` (id FK auth.users ON DELETE CASCADE, role default 'student', full_name, bio, career_goal, location, phone, professional_email, linkedin_url, github_url, portfolio_url, preferred_locations text[], work_mode, employment_type, experience_level, salary_preference, work_authorization, availability, degree_program_id nullable), `education`, `experiences`, `projects`, `certifications` (all with user_id FK CASCADE). RLS on all + owner policies (select/insert/update/delete `auth.uid() = user_id`). Trigger: on new auth user insert a `profiles` row. Then `prisma db pull` + review schema.
Verify: `supabase db reset` succeeds; Prisma generates.

**1.2 RLS test harness**
Build: SQL/pgTAP or script test seeding user A + B; asserts A cannot select/insert/update/delete B's rows in every table from 1.1. Wire into `pnpm test:rls`.
Verify: `pnpm test:rls` green. (This harness is reused every time a table is added.)

**1.3 API foundation**
Build: `apps/web/lib/api/handler.ts`: wrapper that (a) extracts Bearer token, (b) verifies via Supabase, (c) loads role from `profiles`, (d) zod-validates body/query, (e) returns standard error shape. Helpers `requireUser`, `requireAdmin`. No business routes yet except `GET /api/v1/health`.
Verify: tests: no token -> 401; bad token -> 401; valid token -> 200 on health.

**1.4 Auth UI + sessions**
Build: register/login/logout pages using `@supabase/ssr` with httpOnly cookies; middleware redirecting unauthenticated users from `/app/*`. Routes `POST /api/v1/auth/register` and `/login` (proxy to Supabase) per report.
Verify: manual: register -> lands on dashboard; logout; protected page redirects. Playwright smoke test of that flow.

**1.5 Profile API**
Build: shared zod schemas in `packages/shared`; `GET/PUT /api/v1/profile`.
Verify: integration tests (401, 400, happy path, cannot read another user).

**1.6 Education / Experience / Projects / Certifications API**
Build: `GET/POST/PUT/DELETE` for each under `/api/v1/*` with ownership enforced.
Verify: per-route integration tests incl. cross-user attempt returns 404/403.

**1.7 Skills**
Build: migration `skills` (global taxonomy: name unique normalized, category), `user_skills` (user_id, skill_id, proficiency 1-5, verified default false) + RLS (skills readable by all authenticated, writable by admin only). `normalizeSkill()` in `packages/core` with alias map + tests. `GET/POST/DELETE /api/v1/skills`.
Verify: adding "JS" and "javascript" resolves to the same skill; tests green; `test:rls` extended.

**1.8 Preferences + agent settings + audit log**
Build: migration `application_agent_settings` (1:1, CHECKs per report 9.4), `audit_log` (user_id ON DELETE SET NULL). `audit(action, entity, ...)` helper. `GET/PUT /api/v1/profile/preferences`, `GET/PATCH /api/v1/settings/application-agent`. Changing `enabled` writes an audit row (consent timestamp).
Verify: CHECK constraints reject minimum_match_score 140 and daily limit 0 (DB-level test); consent change creates audit row.

**1.9 Profile UI**
Build: onboarding wizard pages calling the APIs above (profile, education, experience, projects, certs, skills, preferences, agent settings).
Verify: Playwright: complete onboarding end-to-end. **M1 acceptance (report 5.11) all true.**

---

## Phase 2 — Deterministic core (`packages/core`, no I/O)

Each task: pure functions + exhaustive unit tests + fixtures. No DB, no LLM.

**2.1 Config + types**
Build: `config.ts` (`SCORING_VERSION`, weights, severity thresholds), domain types (`ProfileSnapshot`, `JobRequirements`, `CareerRequirements`).
Verify: typecheck; snapshot test of config.

**2.2 Skill gap**
Build: `computeSkillGap(profileSkills, requiredSkills)` -> per skill have/partial/missing + severity critical/important/optional (by weight/importance).
Verify: tests: exact, alias, proficiency below threshold = partial, empty profile, empty requirements, deterministic repeat.

**2.3 Career match**
Build: `scoreCareer(profile, career)` -> 0–100 + factor breakdown array (name, weight, contribution).
Verify: same input -> identical output (run 100x); score always in [0,100]; breakdown sums to score.

**2.4 Job match**
Build: `scoreJob(profile, job)` -> 0–100, `Apply`/`Not yet` by threshold, missing skills + missing experience list. Treat expired jobs as ineligible via `now` param.
Verify: tests for experience-level mismatch, no required skills listed, expired job.

**2.5 CV-to-job score**
Build: `scoreCv(parsedCv, job)` over skills/experience/projects/keywords/education with weights from config.
Verify: reproducible; missing sections score 0 for that part without crashing.

**2.6 Degree progress**
Build: `degreeProgress(userCourses, requiredCredits)` (only passed/completed count; in-progress separate).
Verify: tests incl. failed course, retake, zero required credits (no divide-by-zero).

**2.7 Eligibility + limits + exclusions**
Build: `checkEligibility({job, settings, appliedJobs, todaysSubmissionCount, matchScore, now})` -> `{eligible:boolean, reasons:[...]}`. Covers: disabled, below threshold, excluded company/job type/location (case-insensitive), daily limit, job inactive/expired, duplicate.
Verify: one test per reason + combinations; reasons are stable string codes.

**2.8 Duplicate detection**
Build: `isDuplicate(newJob, existingApplications)` — same (source, external_job_id) OR same normalized company+title+location within 30 days; ignore withdrawn.
Verify: tests incl. withdrawn allowed, near-identical titles.

**2.9 Tier routing**
Build: `routeSubmission({tier, settings, matchScore, consentEnabled})` -> `tier1_auto | tier2_assisted | tier3_manual`.
Verify: Tier 2/3 NEVER returns auto; Tier 1 returns auto only if enabled && score>=threshold.

**2.10 Grounding validator**
Build: `validateGrounding(generatedDoc, profileSnapshot, jobPosting)` -> `{ok, violations[]}`. Extracts claims (skills, employers, titles, dates, degrees, project names, certs, numbers/metrics) and checks each against sources. Company/title/requirements from job allowed.
Verify: fixtures: clean doc passes; invented skill, employer, certification, metric ("increased sales 40%") each fail with a clear violation; reordered/reworded facts pass. This is the most important test file in the project.

---

## Phase 3 — AI integration layer

**3.1 LLM interface**
Build: `lib/ai/client.ts`: `LlmProvider` interface, `AnthropicProvider`, `FakeLlmProvider` (fixture-keyed). Server-only import guard.
Verify: tests use the fake only; build fails if client code imports this module.

**3.2 Validated generation**
Build: `generateStructured(schema, prompt)` — zod parse, one stricter retry, then typed error.
Verify: tests: valid, invalid-then-valid, invalid-twice -> error, timeout -> error.

**3.3 Versioning + cache**
Build: `prompts/` folder with versioned prompt files; content-hash helper; cache keyed by hash+prompt_version; helper returning `{prompt_version, model_name}`.
Verify: same input hits cache; changed profile misses.

**3.4 Rate limiting**
Build: sliding-window limiter (Postgres table fallback) applied in the handler wrapper: CRUD 60/min/user, AI 10/hour/user, auth 5/min/IP; 429 + Retry-After.
Verify: tests for each class.

---

## Phase 4 — M2 Career & Skill Analysis

**4.1 Tables + seed**
Build: migration `careers`, `career_skills`, `career_matches` (user_id, career_id, match_pct CHECK 0–100, reasoning, breakdown json, profile_hash, scoring_version, prompt_version, model_name, generated_at), `skill_gaps`. RLS (careers public-read; matches owner-only). Seed ~8 careers with skills.
Verify: `supabase db reset` loads seed; `test:rls` extended.

**4.2 Career match endpoint**
Build: `GET /api/v1/careers/match`: loads profile -> core scorer -> LLM explanation (grounded on breakdown) -> persist -> return. Uses cache by profile_hash.
Verify: same profile twice = same numbers and 1 LLM call; LLM failure returns scores with `explanation:null` + retry flag.

**4.3 Gap endpoint**
Build: `GET /api/v1/careers/:id/gap` from core `computeSkillGap`, persisted to `skill_gaps`.
Verify: Critical/Important/Optional present; persisted.

**4.4 Recompute on profile change**
Build: profile hash comparison; stale matches flagged.
Verify: editing a skill changes hash; unchanged edit does not.

**4.5 M2 UI**
Build: career list with % and "why", gap table.
Verify: Playwright flow. **M2 acceptance true.**

---

## Phase 5 — M3 Academic Planner

**5.1** Migration `degree_programs`, `courses`, `user_courses` (status, grade, semester) + RLS. Seed. Verify: `test:rls`.
**5.2** `GET/POST /api/v1/courses`, user-course CRUD. Verify: integration tests.
**5.3** `GET /api/v1/courses/plan`: progress via core + recommended courses mapped from M2 gap skills (`course_skills` join table). Verify: recommendations only come from gap skills.
**5.4** UI. Verify: **M3 acceptance true.**

---

## Phase 6 — M4 Job Discovery & Matching

**6.1 job_postings migration**
Build: all fields from report 9.3 + `career_category`; UNIQUE(source, external_job_id); INDEX(career_category, source, is_active). RLS: authenticated read of active jobs; write admin only.
Verify: duplicate insert rejected.

**6.2 Admin jobs API**
Build: `POST/PUT/DELETE /api/v1/admin/jobs` (admin only, audit-logged). Seed 30 demo jobs (mixed tiers, some expired).
Verify: student token -> 403 (API) AND RLS blocks direct write.

**6.3 Jobs browse**
Build: `GET /api/v1/jobs` with filters; computes `scoreJob` per posting; excludes/flags stale (FR-4.5); "Not yet" shown with reasons.
Verify: expired job never returned as active match; same pair -> same score.

**6.4 Market stats**
Build: `GET /api/v1/jobs/market` skill frequency % for career+filters, labelled as dataset statistic.
Verify: hand-computed fixture matches.

**6.5 UI** Verify: **M4 acceptance true.**

---

## Phase 7 — M5 Roadmap & Projects

**7.1** Migration `learning_roadmaps`, `roadmap_items` + RLS.
**7.2** Core `buildRoadmap(gaps, monthsAvailable)` (deterministic ordering by severity, month assignment). Tests: every item traces to a gap skill.
**7.3** `GET /api/v1/roadmap` (generate/fetch; LLM only for item descriptions). `PATCH /api/v1/roadmap/:itemId` marks done and re-adapts without full regeneration.
**7.4** `GET /api/v1/projects/recommendations` (LLM, schema-validated, each recommendation lists the gap skills it covers; reject any naming skills not in gap).
**7.5** UI. Verify: **M5 acceptance true.**

---

## Phase 8 — M6 CV Analyzer + Portfolio

**8.1** Migration `cvs` (file_url, parsed_data, version_number, is_baseline), `cv_analyses`, `portfolios` + private storage bucket + RLS (storage policies too).
**8.2** CV parser util (PDF + DOCX -> structured sections). Tests on 3 fixture CVs.
**8.3** `POST /api/v1/cv`: upload, parse, core `scoreCv`, LLM feedback, persist, version increment. Verify: file never publicly accessible; signed URL only.
**8.4** CV versions list/retrieve (FR-6.6).
**8.5** Portfolio generator (`GET/PUT /api/v1/portfolio`), public page `/p/[slug]` rendering only profile data with visibility toggle. Verify: private portfolio returns 404 to anonymous.
**8.6** UI. Verify: **M6 acceptance true.**

---

## Phase 9 — M7 AI Application Agent (strictly in this order)

**9.1 Tables** `tailored_cvs`, `cover_letters`, `applications` (UNIQUE(user_id, job_posting_id) WHERE status<>'withdrawn'), `application_events`, `application_attempts` (+ `idempotency_key` UNIQUE) + RLS + CASCADE rules (report 9.4). Verify: `test:rls`; duplicate insert fails at DB.

**9.2 Mock ATS** `/api/mock-ats/jobs/:id/form` (returns field schema) and `POST /api/mock-ats/applications` (requires API key header, dedupes on idempotency key, returns application ID, supports forced-failure mode via header for tests). Verify: same key twice -> one application.

**9.3 Eligibility service** thin DB wrapper around core `checkEligibility`. Verify: integration tests for each rejection reason, using real DB rows.

**9.4 Policy engine** re-reads settings at call time (consent check). Verify: disabling auto-apply mid-queue blocks the next submission.

**9.5 CV tailoring service** `POST /api/v1/applications/:jobId/tailor`: LLM given ONLY profile fields + job; output schema-validated. Does not persist yet.
Verify: with fake LLM fixtures.

**9.6 Grounding gate** Wire core `validateGrounding` after generation; failure -> discard, write audit `grounding_failed`, return `needs_review`; pass -> persist with `grounded_ok=true`, prompt_version, model_name. Verify: a fake LLM that invents a skill can NEVER produce a stored `grounded_ok=true` row.

**9.7 Cover letter** same pipeline + same gate; only if posting requires one.

**9.8 Form mapper** `POST /api/v1/applications/:jobId/autofill`: map Mock ATS fields from profile; sensitive/ambiguous fields (work authorization, sponsorship, salary, demographics, relocation, availability) left as `needs_user_input`. Verify: those fields are never auto-filled unless explicitly present in verified profile.

**9.9 Submission router** DB wrapper around core `routeSubmission`; tier read from job source.

**9.10 Tier 1 submit** `POST /api/v1/applications/:id/submit`: idempotency key, writes `application_attempts` (success or failure), no automatic retry loop, failure -> `review_queue` status. Tier 2/3 -> only marks sent after explicit user call. Verify: forced Mock ATS failure records attempt and does NOT retry; double-click submit -> one submission.

**9.11 Tracker** `GET/POST /api/v1/applications`, `PATCH /api/v1/applications/:id/status` (lifecycle transitions validated: draft->submitted->viewed->interview->offer/rejected, withdrawn). Writes `application_events`. Verify: illegal transition -> 400.

**9.12 Outcome analysis** core metrics (response, interview, offer, rejection rates, avg time to response) + likely-reason hints; feeds *recommendation prioritization only*. Verify: scoring weights in config unchanged by any code path (test asserts).

**9.13 Orchestrator** `runAgentForJob(userId, jobId)`: eligibility -> match re-score -> policy -> tailor -> grounding -> cover letter -> autofill -> route -> submit/stage -> track. One function, each step already tested. Verify: Mock ATS end-to-end integration test, plus a test per early-exit.

**9.14 Agent trigger** manual "Run agent" endpoint + scheduled run (cron route protected by secret) that respects daily limit. Verify: limit stops it at N; resumes next day (time injected).

**9.15 Agent UI** settings page, review/approve screen (UC-8: view/edit CV, letter, answers; confirm/decline), tracker page (UC-9), consent toggle, audit view.
Verify: Playwright full demo: find job -> tailor -> ground -> fill -> submit to Mock ATS -> appears in tracker. **M7 acceptance (report 5.11) all true.**

---

## Phase 10 — Admin Dashboard
**10.1** `/api/v1/admin/taxonomy` (skills, careers, courses, experience levels).
**10.2** `/api/v1/admin/sources` (source -> tier).
**10.3** `/api/v1/admin/analytics`, `/api/v1/admin/audit-log`.
**10.4** Admin UI (web only).
Verify each: student token -> 403; RLS blocks direct access; admin actions audit-logged. **Admin acceptance true.**

---

## Phase 11 — Mobile (only after Phases 1–9 APIs are stable)
**11.1** Expo app + navigation (bottom tabs, nested stacks) + SecureStore session.
**11.2** Auth + profile screens.
**11.3** Careers + gap screens.
**11.4** Jobs list/detail.
**11.5** Roadmap.
**11.6** CV upload (`expo-document-picker`) + portfolio link.
**11.7** Application review/approve + tracker.
**11.8** Push notifications (opt-in) + offline cache for read screens.
Verify each: runs on simulator against local API; no mobile-specific backend route added.

---

## Phase 12 — Hardening
**12.1** Run full test matrix from report 18.1; fill any missing tests (consent, daily limit, duplicates, unsupported platform, failure).
**12.2** AI eval harness + grounding fixtures in CI (grounding = hard gate).
**12.3** Sentry (no CV content in logs). **12.4** k6 load check vs. p95 targets. **12.5** OWASP API Top 10 pass (BOLA, excessive data exposure, rate limits).

## Phase 13 — Deploy
**13.1** Production Supabase + migrations run as reviewed step. **13.2** Vercel deploy with env vars. **13.3** Mock ATS deployed. **13.4** Walk the 12-item production checklist (report 18.8). **13.5** Tag `v1.0.0` only when all pass.

---

## Prompt template (paste per task)

```
Read AGENTS.md and BUILD_PLAN.md. Implement ONLY task <ID> from BUILD_PLAN.md.
Spec reference: docs/CareerForge_Software_Engineering_Report.pdf (sections cited in the task).
Rules: touch only files this task needs; no extra features or dependencies; if anything is ambiguous, stop and ask me.
When done: run `pnpm lint && pnpm typecheck && pnpm test` (plus any command in the task's Verify), and report files changed, results, and doubts.
Do not start any other task.
```

## If Codex goes wrong
- It edited unrelated files -> `git checkout` those files, re-run with "Revert changes outside the task scope."
- It invented a table/field -> point to Section 0 decisions and require a migration fix.
- Tests pass but behavior is wrong -> add a failing test first, then fix.
- Anything touching grounding, consent, limits, or RLS: read the diff yourself before committing.
