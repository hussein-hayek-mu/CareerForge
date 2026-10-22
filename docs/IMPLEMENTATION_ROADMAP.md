# CareerForge implementation roadmap

Updated: 22 October 2026. Code baseline: `6d63b9e`.

## Purpose and authority

This is the current delivery checklist and the starting point for every change.
It reconciles the implemented application with the requirements in
[`helper/CareerForge_Chat_Summary.md`](../helper/CareerForge_Chat_Summary.md)
and the larger [`helper/BUILD_PLAN.md`](../helper/BUILD_PLAN.md).
Earlier documents in this folder record individual increments; their old
"next" or "pending" sections are historical, not the current queue.

Follow the owner's instructions first, then applicable repository guidance.
The owner has authorized the existing npm web MVP and incremental delivery
instead of the original pnpm monorepo sequence. Preserve that decision.
This roadmap records future scope; it does not authorize paid services,
production migration, publishing, or automatic application submission.

Target: a polished, reliable product whose claims can be demonstrated. Passing
tests is evidence for the scenarios tested, not a promise of zero defects.
Do not label a task complete merely because its screen looks finished.

## Current release boundary

Deliver a responsive web application for students and early-career developers:
sign up, confirm email, sign in, edit a private profile, browse seeded fictional
jobs, understand skill matches and gaps, save roles, and manually track progress
across devices. Deploy a demonstrable version after release checks pass.

Keep AI, live job search, automatic applications, native mobile, workshops,
and the larger academic/career modules outside this first release.
Skills remain self-reported. Fictional jobs must stay clearly labeled.

## Status ledger

**Done** means implemented with recorded checks. **Partial** means usable but
with the stated gap. **Open** means work remains. **Deferred** means recorded
future scope, outside the current release. No work is currently in progress;
the next functional task is P1.2.

| ID | Capability | Status | Evidence and remaining boundary |
| --- | --- | --- | --- |
| D01 | npm/Next.js/TypeScript foundation | Done | Existing app, lockfile, lint/types/tests/build scripts; no monorepo conversion needed. |
| D02 | CI definition | Partial | `.github/workflows/ci.yml` runs generation, lint, types, unit tests, build. Latest local commits need pushing and remote CI verification. Browser checks are not in CI yet. |
| D03 | Development database connectivity | Done | Supabase Auth settings and SQL connection verified previously; direct hostname failed, session-pooler connection worked. Environment health is not guaranteed permanently. |
| D04 | Profile migrations and ownership | Done | Transaction/checksum migration runner, profile trigger, RLS, restricted writable columns, rollback-based two-user tests. |
| D05 | Registration/login/logout | Partial | SSR HttpOnly sessions, origin validation, safe API errors, private account screen. Real signup email delivery/callback requires owner verification; recovery flow missing. |
| D06 | Private profile editing | Done | Validated profile summaries/skills, save/reload, error recovery and cross-user isolation tested. This is not full normalized experience/education CRUD. |
| D07 | Account-aware workspace | Done | Server verifies session and reads owner profile; dashboard, skill ranking and role gaps use saved data. `/profile` leads signed-in users to `/account`; read failures do not substitute demo data. |
| D08 | Jobs and transparent matching | Partial | Six static fictional roles, search/work-mode/saved filters, detail dialog, normalized skill matching and missing skills. Database catalog/admin maintenance not implemented. |
| D09 | Saved roles and manual tracker | Partial | Functional local save/remove/status updates; per-account browser keys separate from guest demo. No server persistence or cross-device sync. |
| D10 | Guest demo | Done | Browser-local editable sample profile/tracker, reset, malformed-storage recovery, no sample upload into accounts. |
| D11 | Shared responsive design | Done | Graphite/chartreuse system, branded SVGs, sidebar collapse preference, mobile drawer, private profile identity and dark auth forms. Further release audit remains required. |
| D12 | Motion hero | Done | Enhanced original local film with aurora ribbons, orbital trails, forge pulses and sparks; continuous playback while scrolling, hidden-tab pause, playback control, reduced-motion/save-data and poster fallback. |
| D13 | Automated verification | Partial | 15 local tests; auth/navigation/demo/film browser coverage; live two-account and RLS scripts. No comprehensive production, physical-device or performance validation. |
| D14 | Hosting and release operations | Open | No verified hosted release, production environment, recovery drill or remote CI result for the latest work. |

Source map: UI in `src/components/`; static jobs/matching in
`src/lib/demo-workspace.ts`; account validation/handlers in `src/lib/account/`;
SSR clients in `src/lib/supabase/`; pages/API in `src/app/`; SQL in
`supabase/migrations/`; DB/browser scripts in `scripts/`; browser tests in
`tests/e2e/`. Prisma's direct connection does not inherit user RLS: account
data access uses the authenticated Supabase client.

## Ordered implementation queue

Complete one coherent item at a time. Dependencies below describe the order;
independent owner email checks can run alongside implementation. Review scope
again before each phase, rather than implementing the whole future backlog.

### P1 - Persist the current tracker

**P1.1 - Define the data contract. Done.**

Contract: [TRACKER_CONTRACT.md](TRACKER_CONTRACT.md). Stable catalog IDs,
owner-only storage, revision-based conflicts, idempotent save, API/UI behavior
and verification criteria are defined. Documentation consistency checked.

- Decide stable catalog identifiers before storing references. Keep existing
  fictional role IDs stable; use a small seeded `job_postings` catalog with
  database-enforced references for saved roles, not arbitrary client job data.
- Define owner-only tracker rows: user, job, manual status, creation/update
  timestamps; unique user/job pair. Preserve current labels: Saved, Applied,
  Interview, Offer, Rejected. These labels never prove submission occurred.
- Define allowed status edits and removal explicitly; defer the agent's
  richer lifecycle. Specify repeat-save/idempotency and concurrent-update
  behavior so retries cannot duplicate or silently regress entries.
- Preserve guest storage. Do not silently import local account/guest entries;
  offer a deliberate one-time import only if needed, validated against catalog.

Acceptance: migration, API/UI contracts and edge cases are written down before
implementation; no sample profile is inserted and no existing job ID breaks.

**P1.2 - Add tables, constraints, seed and RLS. Open. Depends on P1.1.**

Add an additive checksum-tracked migration and update Prisma mappings. Catalog
reads expose the intended active fictional jobs; students cannot write catalog
rows. Tracker reads/writes require the verified owner; user/role fields cannot
be reassigned. Seed idempotently. Preserve tracker history if a role becomes
inactive. Extend two-user/anonymous/direct-write RLS tests. Apply reviewed SQL
to development only; never edit applied migrations or reset shared data.

Acceptance: constraints reject unknown jobs/statuses/duplicates; both users are
isolated for every operation; repeated migration/seed runs preserve data.

**P1.3 - Add APIs and connect the UI. Open. Depends on P1.2.**

Authenticated list/save/remove/status endpoints use existing validation,
same-origin mutation checks, no-store responses and safe errors. Derive owner
from the session. Use server tracker data on dashboard/jobs/applications;
retain the local guest flow. Show loading/pending/error/retry states. Failed
writes must not show success, lose the last saved state or duplicate entries.

Acceptance: save -> reload -> change status -> second browser/device -> remove
works; counts and saved-only filters agree; rapid clicks, network failure,
expired sessions, unknown roles and cross-user injection are covered.

### P2 - Complete account journeys

**P2.1 - Real confirmation and session recovery. Open.**

Owner checks signup using their own email and browser; verify delivery, allowed
local/phone/hosted callback URLs, expired/reused confirmation links and useful
recovery messages. No automated signup mail. Add safe confirmation resend with
cooldown/provider limit handling. Verify expiry/refresh, back navigation,
logout and account switching do not display another user's cached UI/data.

Acceptance: fresh signup -> confirmation -> private profile works; failed
confirmation and expired sessions offer a working recovery path.

**P2.2 - Password recovery. Open.**

Implement forgot/reset password, validated callback/session flow, expired-link
handling, accessible form states and generic responses. Respect provider rate
limits; do not reveal whether an email has an account. Test successful reset
and denial of unauthorized password changes.

**P2.3 - Coherent onboarding and account navigation. Open.**

Keep `/profile` compatibility but make the signed-in destination and current
navigation state clear. Guide an empty account to useful skills and a project;
offer a path from save confirmation to updated matches. Define unsaved-edit
behavior. Check duplicate account/profile destinations before adding screens.

Acceptance: a new user can complete the core flow without instructions;
blank accounts never inherit Alex Morgan's data or guest tracker entries.

### P3 - Polish the complete experience

**P3.1 - Interaction and accessibility audit. Open. Depends on P1/P2 flows.**

Review every route and state using the quality matrix below. Fix observed
problems first. Include keyboard-only operation, drawer/dialog focus restoration,
screen-reader names/status messages, visible focus, text contrast, 200% zoom,
touch targets and reduced motion. Target WCAG 2.2 AA; do not claim compliance
without an actual audit. Verify a physical phone in addition to emulation.

**P3.2 - Visual refinement and performance. Open.**

Keep the GitHub-inspired navigation clarity, restrained spacing, and coherent
CareerForge identity. Standardize semantic color/type/spacing/component tokens
where they eliminate real inconsistency. Review forms/cards/dialogs, long names,
many skills and empty states. Avoid another stack of CSS overrides.

Measure hosted performance before optimizing. Targets: LCP <=2.5s, INP <=200ms,
CLS <=0.1 at the 75th percentile when sufficient field data exists. Before
launch use documented mobile lab conditions as a proxy, not claimed field data.
Inspect hero loading, slow networks, layout stability and unnecessary JS/API
requests; preserve poster-only reduced-motion/save-data behavior.

Acceptance: reviewed desktop/mobile screenshots of all critical states, no
unintended horizontal overflow, no clipped actions, legible content and a
recorded performance baseline with any exceptions explained.

### P4 - Release reliability and hosted demo

**P4.1 - Security, privacy and operational readiness. Open.**

- Review owner access, admin privileges, origin/callback host validation,
  redirects, session cookie/cache behavior, input bounds and dependency risks.
- Add abuse controls appropriate to exposed auth/mutation routes; provider
  rate-limit handling alone is not application-wide rate limiting.
- Add error visibility with redaction: never log passwords, tokens, raw private
  profiles or future CV contents. Review headers/CSP against video/auth needs.
- Separate development/production secrets and databases; validate configuration
  clearly while preserving the deliberately offline guest demo.
- Define data retention, user export/deletion, support contact and accurate
  privacy/demo wording before a wider public launch. Verify deletion cascades.
- Document migration application, backups/restore, deploy rollback and a failed
  migration recovery path. Do not assume a provider plan includes every backup.

**P4.2 - Reproducible checks and CI. Open.**

Push verified commits when authorized and inspect the actual CI result. Add
offline desktop/mobile browser smoke coverage to CI without production secrets.
Use isolated development/staging credentials for gated database checks; never
run temporary-user live tests on production. Improve slow Edge shutdown and
ensure test-account cleanup still runs when browsers fail or hang.

Acceptance: fresh checkout/setup works; remote checks pass for the release
commit; no abandoned test identities, secrets or debug artifacts.

**P4.3 - Deploy and demonstrate. Open. Depends on release gates.**

Prepare hosting/environment/callback configuration, reviewed production
migrations and fictional seeds, HTTPS and smoke-test instructions. Deploy when
authorized; verify signup/profile/matches/tracker/isolation on the hosted build
and phone. Record release commit, migration versions, known limitations and
rollback procedure. Prepare a short professor demo and acceptance checklist.
Tag a release only after the corresponding gate passes.

## Quality matrix and release gate

| Surface | Required scenarios before release |
| --- | --- |
| Overview | Guest, blank account, populated account, correct completion/counts, profile read failure, video fallback. |
| Profile/account | Validation, save/reload, unsaved changes, failed save retains edits, long content, logout/account switch. |
| Opportunities/detail | Search/mode/saved filters, no results, missing/empty skills, transparent score, dialog keyboard use, inactive role. |
| Applications | Empty/populated tracker, every status, repeat save, remove, refresh, second device, failed/conflicting update. |
| Auth | Signup confirmation, bad credentials, limits, expiry, reset, callback errors, private-route denial. |
| Navigation | Desktop expanded/collapsed, short viewport, mobile drawer, selected state, keyboard and focus. |
| Data | Anonymous and two-user denial for every table/API, forbidden owner/role changes, safe seed/migration reruns. |
| Devices | Narrow 360px phone, common phone/tablet/desktop, zoom, long text, physical phone, slow network and save-data. |

Release checklist (all open until a release-specific check is recorded):

- [ ] Real owner signup/confirmation and password recovery verified.
- [ ] Profile and tracker persist across reloads and devices with ownership tests.
- [ ] Fictional catalog reproducibly seeded; no misleading vacancy/verification claims.
- [ ] Core flows pass on desktop and phone; no unresolved critical/major defects.
- [ ] Accessibility and performance reviews recorded, with limitations explicit.
- [ ] CI green for exact release commit; database checks pass in isolated environment.
- [ ] Production config, HTTPS, privacy/support information and error visibility checked.
- [ ] Migration/backup/restore/rollback procedures reviewed and exercised appropriately.
- [ ] Hosted smoke test, demo script and release notes match shipped behavior.

## Full-product traceability: deferred, not forgotten

These requirements remain tracked from the helper plan and chat summary. Each
needs a separate implementation contract and evidence before becoming active.
References below map all original phases, not claims that their tasks are done.

| Future area | Helper reference | Remaining scope and prerequisites |
| --- | --- | --- |
| Architecture/environment | Phase 0 | Optional local Supabase setup, centralized environment validation; monorepo only if shared code/native work justifies migration. Current npm CI/Prisma foundation retained. |
| Rich profile/onboarding | Phase 1 | Normalized education, experience, projects, certifications, links, preferences and skill taxonomy/proficiency; owner CRUD/RLS; onboarding. Agent settings/audit belong with the agent phase. Preserve existing summaries through migration. |
| Deterministic domain core | Phase 2 | Versioned career/job/CV scores and factor breakdowns, partial/severity gaps, degree progress, eligibility/limits/exclusions, duplicate detection, routing and grounding. Current skill-percentage matcher is only a subset. |
| AI provider infrastructure | Phase 3 | Server-only provider interface, fixture fake, structured validation, bounded retry/timeout, versioned prompts/cache, quotas/budget and evaluation. Reconfirm provider choice/prices later; no paid calls now. |
| Career analysis | Phase 4 / M2 | Seeded careers/requirements, deterministic matches, grounded explanations, gap persistence, stale-profile invalidation and UI. Requires richer taxonomy/core. |
| Academic planner | Phase 5 / M3 | Degrees/courses/user-course records, course-skill links, progress/retakes and recommendations traceable to gaps; APIs/RLS/UI. |
| Expanded job management | Phase 6 / M4 | Admin catalog CRUD/audit, richer filters/requirements, expiry handling and dataset-labeled market statistics. P1 supplies a minimal catalog, not this full module. |
| Live job discovery | Chat summary | Authorized feeds/search integration, source links/terms, freshness, deduplication, geography/preferences and cost limits. Listing access never implies submission permission. |
| Learning/projects | Phase 7 / M5 | Gap-based roadmaps, priorities/time allocation/progress, course/project recommendations with traceable skills, persistence/UI; optional grounded AI descriptions. |
| CV and portfolio | Phase 8 / M6 | Private PDF/DOCX upload/parsing, limits/storage policies/signed URLs, versioning, deterministic analysis, truthful feedback, editable portfolio with explicit publication/visibility. |
| Assisted/automatic applications | Phase 9 / M7 | Application/event/attempt records, mock ATS first, eligibility and live consent, grounded tailored CV/letter, sensitive-field review, tier routing, idempotency, no blind retries, review queue, outcomes, orchestrator/limits/scheduler and approval UI. Unsupported sites remain manual. Current manual tracker is only a subset. |
| Administration | Phase 10 | Role-enforced taxonomy/source/job management, analytics/audit and web UI; student denial at API and database levels. |
| Native mobile | Phase 11 | Expo, secure sessions, stable API-backed feature screens, document picker, optional push/offline reads. Responsive web comes first. |
| Advanced hardening | Phase 12 | Full failure/consent/duplicate matrix, AI grounding evaluations in CI, redacted observability, measured load and API abuse/security review. MVP hardening starts in P4, not after AI. |
| Full-product deployment | Phase 13 | Production environments/migrations, supported integrations/mock ATS, report acceptance and release checklist. MVP deployment is P4; the larger release has its own gate. |
| Claim assessment | Chat summary | Timed/practical tasks, rubrics, executable coding checks, evidence provenance, question/scoring evaluation, accessibility and appeals. Degrees need issuer/document evidence; timing/paste signals do not prove cheating or mastery. |
| Interview preparation | Chat summary | Practice questions, grounded coaching, appropriate evaluation and privacy; never imply employer decisions. |
| Workshops/certificates | Chat summary | Trainer/admin workflows, attendance/completion records and accurately scoped certificates; stronger verification needs an appropriate process. |

Do not assume the original report's acceptance sections were satisfied or
reviewed merely because the helper plan mentions them. Locate and review the
actual report before claiming report-wide coverage or committing to its fields.

## Work protocol: use on every task

1. Read this roadmap and applicable `AGENTS.md`; inspect the affected code and
   installed Next.js guides before framework changes. Check `git status` and
   preserve unrelated work. Read only relevant historical detail to save tokens.
2. Select one ID and mark it **In progress** with its scope/dependencies. Define
   observable acceptance criteria before editing. Settle schema/API behavior
   before UI integration; write a short decision note for material tradeoffs.
3. Implement the smallest complete useful increment. Reuse current dependencies,
   native visuals and deterministic fixtures. Avoid broad rewrites, speculative
   scaffolding, paid calls and repeated testing without a reason.
4. Verify changes against the criteria. Default code checks: `npm.cmd run lint`,
   `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`. Run relevant
   `test:e2e` scenarios for UI flows, `test:rls` for policies/schema, and
   `test:account:live` for account integration against development only.
   Generate Prisma after schema changes. For docs-only edits check links,
   consistency and `git diff --check`; do not rerun unrelated app tests.
5. Update this ledger in the same useful commit: status, evidence, remaining
   limitations and next task. Distinguish implemented, locally tested,
   remotely verified and deployed. Failed checks stay visible and unresolved.
6. Commit each useful increment with a message describing its benefit. Report
   commit ID, verification and limitations; state local/pushed/deployed precisely.
   Never assume a commit is pushed or a deployment is live.

For each item keep a short record:

```text
ID / status / owner:
Scope and dependencies:
Acceptance criteria:
Evidence (commands, scenarios, result):
Commit / pushed or local / deployment:
Known limitations and next task:
```

## Decision and blocker register

| Item | Current decision / resolution path |
| --- | --- |
| MVP architecture | npm single Next.js app; no separate backend or early native app. |
| Data boundary | Verified server session + Supabase RLS for private data; guest demo stays explicit. |
| Next implementation | P1.1 contract complete; P1.2 migration/RLS next, then P1.3 integration. |
| Real email flow | Owner verification outstanding; no passwords requested in chat. |
| Database environment | Use working development connection; recheck direct-host availability only when needed. No secrets in documentation. |
| Remote release | Latest feature commits are local at this baseline; push/CI/hosting remain separate steps. |
| Professor's exact acceptance/deadline | Confirm before final scope/release sign-off; do not block independent core MVP work. |
| Design quality | Preserve coherent visual direction; measure accessibility/performance/usability rather than continually adding decoration. |
| Future services | Provider/source/region/assessment reviewer choices remain deferred; research current capabilities and terms when implementation is scheduled. |

## Recorded evidence baseline

At `6d63b9e`, lint, TypeScript, 15 local tests and production build passed.
Four targeted desktop/mobile demo/navigation cases passed; live tests verified
saved profile -> workspace -> matches, account isolation, profile routing,
phone layout, error recovery and logout. Temporary identities were removed.
Earlier increments recorded the film/auth browser scenarios and profile RLS
checks. These are historical local results, not a fresh full-suite run or proof
of hosted CI, physical-phone validation, email delivery or production readiness.

Owner-requested D12 enhancement: removed scroll-based pausing and regenerated
the original film with more layered motion effects (~1.3 MB video, ~25 KB
poster). Lint, types, 15 local tests and production build passed; eight motion
browser cases passed, then two desktop/mobile playback-and-screenshot cases
passed against the final asset. Desktop/mobile hero screenshots were reviewed.
The first local render stalled; software rendering and timer-driven frames
completed regeneration. No dependencies or paid services were added. This
presentation increment does not change the pending tracker-persistence work.
