# AGENTS.md — CareerForge standing rules (read before every task)

You are building CareerForge from `docs/CareerForge_Software_Engineering_Report.pdf` (the spec) and `BUILD_PLAN.md` (the task order).

## Working rules
1. Do exactly ONE task from BUILD_PLAN.md per session. Do not start the next one.
2. Touch only files the task lists. If you think another file needs changing, STOP and say why instead of editing it.
3. Never add features, endpoints, tables, or dependencies not named in the task.
4. Before finishing: run `pnpm lint && pnpm typecheck && pnpm test`. All must pass. If something unrelated is already failing, report it; do not "fix" it silently.
5. Finish with a short report: files changed, commands run + results, anything you were unsure about.
6. If the spec and the task disagree, or something is ambiguous: STOP and ask. Never guess.

## Architecture rules (non-negotiable)
- Monorepo (pnpm): `apps/web` (Next.js + TS), `apps/mobile` (Expo), `packages/core` (pure TS logic), `packages/shared` (zod schemas + types), `prisma/`, `supabase/migrations/`.
- API: Next.js Route Handlers under `/api/v1/*` only. Mock ATS lives under `/api/mock-ats/*`.
- Every route: verify Supabase JWT -> role check -> zod-validate input -> handler -> standard error shape `{ error: { code, message } }`.
- **Deterministic vs LLM**: all scores, gap classification, degree progress, eligibility, duplicate detection, daily limit, tier routing = plain functions in `packages/core`. No I/O, no LLM, no `Date.now()` (pass time in). The LLM only explains scores and writes language (CV text, cover letters, roadmap/project text).
- LLM access ONLY through `apps/web/lib/ai/client.ts` (an interface with a real provider and a `FakeLlmProvider`). Tests always use the fake. Every LLM output is zod-validated; retry once; then return a clean error. Store `prompt_version` and `model_name` on every AI record.
- The Application Agent may only READ profile tables. It must have no code path writing to Profile, Education, Experience, Project, Certification, UserSkill.
- No generated CV/cover letter/answer is saved with `grounded_ok = true` unless the grounding validator passed.
- Secrets (LLM key, service-role key, DB URL) only in server code, env vars without `NEXT_PUBLIC_`. Never log tokens or CV content.
- Every user-owned table has RLS enabled + an owner policy + a test proving user A cannot read/write user B.
- Never scrape. Never bypass CAPTCHA/bot protection. Tier 1 = Mock ATS only (v1).

## Code rules
- TypeScript strict. No `any` (use `unknown` + zod). No default exports except Next.js pages/routes.
- Every new function in `packages/core` ships with unit tests in the same task, including edge cases (empty input, duplicates, case differences).
- Every new route ships with an integration test: 401 without token, 403 wrong role (if relevant), 400 bad input, 200/201 happy path, cannot touch another user's data.
- Migrations are SQL files in `supabase/migrations/` (including RLS). Prisma schema must match them. Never edit an already-committed migration; add a new one.
- Small commits: one task = one commit, message `task X.Y: <name>`.
