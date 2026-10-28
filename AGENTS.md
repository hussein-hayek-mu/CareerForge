<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CareerForge delivery workflow

Read `helper/OWNER_WORKING_STANDARDS_AND_REQUIREMENTS.md` for the owner's
28 October standing engineering/UX instructions and claim-validation, live-job,
roadmap.sh and trainer/certificate requirements. Continue useful coherent work
autonomously; historical helper one-task/session and pnpm rules are superseded.
The owner's 28 October reminder prioritizes substantive core workflows over
cosmetics and requires commits for major changes. Commit each verified milestone
before expanding scope; preserve unrelated IDE settings.

Read `docs/IMPLEMENTATION_ROADMAP.md` before starting project work. It is the
current status ledger and ordered queue; older increment plans are historical.
Follow the roadmap's work protocol: select a focused task, verify its acceptance
criteria, update its status/evidence and remaining limitations, then commit the
useful increment with a benefit-oriented message. Keep the existing npm web MVP
scope and preserve unrelated changes. User instructions take precedence.

## Product quality standards

Owner UI/access contract (23 October): guests see the public homepage and auth/
recovery entry only; feature pages require server-verified authentication. My CV
has its own sidebar entry. Only selected skills with a current supported passing
check enter CV skills. React/SQL basics checks are limited assessment evidence,
not proof of mastery. The owner's newer design request gives each report feature
a dedicated destination. Unbuilt modules may appear as explicitly Planned or
Stretch scope pages; never imply those pages implement the underlying feature.

Apply the owner's senior engineering/product instructions and
`helper/Codex_NextJS_Production_Quality_Workflow.pdf` incrementally:
- Inspect the relevant implementation before editing; preserve the existing
  npm/Next.js/React/TypeScript/Supabase/Prisma architecture and working features.
- Prioritize correctness, ownership/privacy, clear UX, accessibility and measured
  performance. Reuse components/tokens; avoid decorative clutter and dependencies
  without a demonstrated benefit.
- Define acceptance criteria for meaningful changes. Verify success/failure
  paths and ownership where relevant; report checks passed, failed or not run.
  Never claim untested functionality, full accessibility or production readiness.
- Keep private records private by default. Enforce validation/authorization on
  the server and RLS in the database; keep secrets and AI integrations server-side.
- Distinguish fictional seed data from live data. Do not fabricate AI results,
  analytics, submissions or successful operations.
- Full-product scope includes M1 profile/onboarding, M2 career/skill analysis,
  M3 academic planner, M4 job matching, M5 learning/project recommendations and
  M6 CV analysis/portfolio building, M7 Application Agent and the admin dashboard
  (confirmed in the actual report, sections 4/5.10). Track missing work without expanding the
  current release silently. Preserve the already implemented application tracker.
- Mobile is separate from the web app. The actual report sections 6/8/17/19
  specify React Native/Expo; prior Flutter wording is not the report's stack.
- Follow the owner's 23 October autonomous execution instructions: group coherent
  work, continue independent implementation when external services are blocked,
  prioritize security/core workflows over cosmetics, and avoid repeat audits or
  recommendation-only turns. Do not promise unmeasured completion dates.
- Generated applicant facts must trace to source profile/CV data; deterministic
  code computes scores. Require approval of each specific application and its
  contents before any supported submission, regardless of older auto-submit text.
- Inspect diffs, preserve unrelated work and commit coherent verified increments
  under the owner's standing authorization. Do not infer deployment or paid-service
  authorization from a workflow example.
