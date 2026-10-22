<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CareerForge delivery workflow

Read `docs/IMPLEMENTATION_ROADMAP.md` before starting project work. It is the
current status ledger and ordered queue; older increment plans are historical.
Follow the roadmap's work protocol: select a focused task, verify its acceptance
criteria, update its status/evidence and remaining limitations, then commit the
useful increment with a benefit-oriented message. Keep the existing npm web MVP
scope and preserve unrelated changes. User instructions take precedence.

## Product quality standards

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
  M6 CV analysis/portfolio building. Track missing work without expanding the
  current release silently. Preserve the already implemented application tracker.
- Mobile is separate from the web app. The owner's newer instructions describe
  Flutter; older helper plans describe Expo. Reconcile against the actual report
  before mobile implementation; neither requires changing the current web app.
- Inspect diffs, preserve unrelated work and commit coherent verified increments
  under the owner's standing authorization. Do not infer deployment or paid-service
  authorization from a workflow example.
