# CareerForge implementation roadmap

Updated: 22 October 2026. Initial audited baseline: `6d63b9e`; subsequent
verified increments are recorded below.

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

### Quality guidance update — 22 October 2026

Reviewed all nine pages of
[`Codex_NextJS_Production_Quality_Workflow.pdf`](../helper/Codex_NextJS_Production_Quality_Workflow.pdf)
and the owner's accompanying senior engineering/product instructions. Root
`AGENTS.md` now preserves their operational standards. This was a documentation
review, not a new code audit or verification of the software engineering report.

The owner's full-product priorities are M1 profile/onboarding, M2 career/skill
analysis, M3 academic/course planning, M4 job/skill matching, M5 personalized
learning/project recommendations, and M6 CV analysis/portfolio building. Existing
profile summaries, deterministic skill matching and fictional jobs cover only
parts of this scope. Normalized profile records, AI career analysis, academic
planning, adaptive learning roadmaps, secure CV parsing and portfolio publication
remain future work. Preserve the implemented tracker; course-failure simulation
and the AI assistant remain stretch goals. The current release boundary below
is unchanged; automated applications are not part of M1–M6 completion.

The newer instructions name Flutter while the older helper plan names Expo.
Resolve this against the actual report before scheduling mobile implementation.
Likewise verify the report's exact data/API contracts before implementing each
future module; this guidance review does not establish report-wide conformance.

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
future scope, outside the current release. P2.3 onboarding is complete. P2.1/P2.2 recovery interfaces are implemented;
real inbox journeys and remaining session cases require verification.

| ID | Capability | Status | Evidence and remaining boundary |
| --- | --- | --- | --- |
| D01 | npm/Next.js/TypeScript foundation | Done | Existing app, lockfile, lint/types/tests/build scripts; no monorepo conversion needed. |
| D02 | CI definition | Partial | `.github/workflows/ci.yml` defines generation, lint, types, unit tests, build and six offline desktop/mobile production smoke cases. Local smoke passed; latest commits need pushing and exact remote CI verification. |
| D03 | Development database connectivity | Done | Supabase Auth settings and SQL connection verified previously; direct hostname failed, session-pooler connection worked. Environment health is not guaranteed permanently. |
| D04 | Profile migrations and ownership | Done | Transaction/checksum migration runner, profile trigger, RLS, restricted writable columns, rollback-based two-user tests. |
| D05 | Registration/login/logout | Partial | SSR HttpOnly sessions, origin validation, safe API errors, private account screen. Real signup/reset email delivery and callback require owner verification; recovery/resend routes are implemented. |
| D06 | Private profile editing | Done | Validated profile summaries/skills, save/reload, error recovery and cross-user isolation tested. This is not full normalized experience/education CRUD. |
| D07 | Account-aware workspace | Done | Server verifies session and reads owner profile; dashboard, skill ranking and role gaps use saved data. `/profile` leads signed-in users to `/account`; read failures do not substitute demo data. |
| D08 | Jobs and transparent matching | Partial | Six database-seeded fictional roles for accounts; static guest catalog, search/work-mode/saved filters, detail dialog and transparent skill gaps. Catalog administration remains deferred. |
| D09 | Saved roles and manual tracker | Done | Signed-in save/remove/status updates persist in Supabase across sessions/devices with revision conflicts and recovery. Guest tracker stays local; older account-local saves remain unimported. |
| D10 | Guest demo | Done | Browser-local editable sample profile/tracker, reset, malformed-storage recovery, no sample upload into accounts. |
| D11 | Shared responsive design | Done | Graphite/chartreuse system, branded SVGs, sidebar collapse preference, mobile drawer, private profile identity and dark auth forms. Further release audit remains required. |
| D12 | Motion hero | Done | Enhanced original local film with aurora ribbons, orbital trails, forge pulses and sparks; continuous playback while scrolling, hidden-tab pause, playback control, reduced-motion/save-data and poster fallback. |
| D13 | Automated verification | Partial | 27 local tests; auth/recovery/navigation/demo/film browser coverage; live cross-browser tracker, two-account and RLS scripts. No comprehensive production, physical-device or performance validation. |
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

**P1.2 - Add tables, constraints, seed and RLS. Done.**

Implemented in `202610220002_job_tracker.sql`, with Prisma mappings and
`verify-tracker-rls.mjs` called by `npm.cmd run test:rls`. Applied to development;
repeat migration skipped both recorded files. Ownership/constraint checks passed
and rolled back; no temporary users or tracker rows retained.

Add an additive checksum-tracked migration and update Prisma mappings. Catalog
reads expose the intended active fictional jobs; students cannot write catalog
rows. Tracker reads/writes require the verified owner; user/role fields cannot
be reassigned. Seed idempotently. Preserve tracker history if a role becomes
inactive. Extend two-user/anonymous/direct-write RLS tests. Apply reviewed SQL
to development only; never edit applied migrations or reset shared data.

Acceptance: constraints reject unknown jobs/statuses/duplicates; both users are
isolated for every operation; repeated migration/seed runs preserve data.

**P1.3 - Add APIs and connect the UI. Done.**

Authenticated jobs/applications routes, revision-conditional writes, account UI
integration, pending controls, refresh/error/conflict recovery and route loading
are implemented. Cross-browser/phone persistence, two-user isolation, duplicate
saves, failed writes/refresh recovery and removal passed live development tests.

Authenticated list/save/remove/status endpoints use existing validation,
same-origin mutation checks, no-store responses and safe errors. Derive owner
from the session. Use server tracker data on dashboard/jobs/applications;
retain the local guest flow. Show loading/pending/error/retry states. Failed
writes must not show success, lose the last saved state or duplicate entries.

Acceptance: save -> reload -> change status -> second browser/device -> remove
works; counts and saved-only filters agree; rapid clicks, network failure,
expired sessions, unknown roles and cross-user injection are covered.

### P2 - Complete account journeys

**P2.1 - Real confirmation and session recovery. Partial.**

Callback review delivered: classify provider expiry query errors and reject
ambiguous/oversized PKCE inputs before exchange. All 29 local tests, four
desktop/mobile recovery cases, lint, TypeScript and production build passed.
Tests send no real email; the owner checklist is in ACCOUNT_RECOVERY.md.
Public Auth settings responded
200: email enabled, signup enabled, confirmation required. This public endpoint
does not establish redirect allowlists, SMTP configuration or inbox delivery.

Implemented safe confirmation resend with local/provider cooldown, login error
distinctions, callback recovery messages and isolated PKCE flow forwarding.
See [ACCOUNT_RECOVERY.md](ACCOUNT_RECOVERY.md). Actual fresh signup -> inbox ->
callback, resend delivery, allowlists and full expiry/back/account-switch cases
still need owner/environment verification.

Owner checks signup using their own email and browser; verify delivery, allowed
local/phone/hosted callback URLs, expired/reused confirmation links and useful
recovery messages. No automated signup mail. Add safe confirmation resend with
cooldown/provider limit handling. Verify expiry/refresh, back navigation,
logout and account switching do not display another user's cached UI/data.

Acceptance: fresh signup -> confirmation -> private profile works; failed
confirmation and expired sessions offer a working recovery path.

**P2.2 - Password recovery. Partial.**

Forgot/reset routes, verified-owner password updates, fixed recovery redirects,
password confirmation and safe errors are implemented. Real password changes
and old/new password login behavior were tested with temporary accounts.
Email delivery and actual emailed recovery callback remain owner checks; UI
email tests are mocked and must not be treated as delivery verification.

Implement forgot/reset password, validated callback/session flow, expired-link
handling, accessible form states and generic responses. Respect provider rate
limits; do not reveal whether an email has an account. Test successful reset
and denial of unauthorized password changes.

**P2.3 - Coherent onboarding and account navigation. Done.**

Implemented saved-profile setup guidance, field anchors, save-to-matches action,
empty-skill guidance and one signed-in profile navigation entry. Unsaved edits
are labeled and protected for same-tab links/sign-out and native beforeunload
where supported. Browser Back limitations are explicit. Details:
[PROFILE_ONBOARDING.md](PROFILE_ONBOARDING.md).

Keep `/profile` compatibility but make the signed-in destination and current
navigation state clear. Guide an empty account to useful skills and a project;
offer a path from save confirmation to updated matches. Define unsaved-edit
behavior. Check duplicate account/profile destinations before adding screens.

Acceptance: a new user can complete the core flow without instructions;
blank accounts never inherit Alex Morgan's data or guest tracker entries.

### P3 - Polish the complete experience

**P3.1 - Interaction and accessibility audit. Partial. Depends on P1/P2 flows.**

First pass fixes form focus outlines, small job/notification targets, skip-target
focus, role-dialog initial/return focus and live filter counts. Narrow public
route checks and keyboard/dialog cases are covered by browser tests. Remaining
complex-background/non-text contrast, screen-reader, actual zoom, additional private-state and physical-device checks
are tracked in [ACCESSIBILITY_REVIEW.md](ACCESSIBILITY_REVIEW.md).

Review every route and state using the quality matrix below. Fix observed
problems first. Include keyboard-only operation, drawer/dialog focus restoration,
screen-reader names/status messages, visible focus, text contrast, 200% zoom,
touch targets and reduced motion. Target WCAG 2.2 AA; do not claim compliance
without an actual audit. Verify a physical phone in addition to emulation.

**P3.2 - Visual refinement and performance. Open.**

Local production performance baseline recorded in
[PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md), with a repeatable
`npm.cmd run audit:performance` command. Five anonymous mobile lab scenarios
returned 200 without uncaught page errors: observed LCP 0.656–1.732s and windowed
CLS 0. Reduced-motion overview fetched no video (200 KB versus 1,488 KB normal).
These are single local samples, not hosted/field results; INP and authenticated
performance remain unmeasured. No speculative rendering/video changes were made.
Lint, TypeScript, script syntax and whitespace checks passed; the measured
production build passed in the preceding increment. P3.2 remains open for the
wider visual audit and hosted performance work.

Missing-page increment implemented: branded recovery page with overview and
opportunity links. Desktop browser verification passed for direct 404 status,
noindex, visible keyboard focus, both recovery destinations and 320px reflow.
The narrow screenshot was reviewed. Both desktop and phone browser cases passed,
as did lint, TypeScript and production build. No backend changes or new
dependencies. This does not complete the wider P3.2 performance/visual audit.

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

Headers/diagnostics increment delivered: baseline anti-framing, MIME/referrer
and permission headers; narrowly scoped CSP without untested script restrictions.
Disable public production database probes before any privileged query while
preserving local diagnostics and the lightweight public application health route.
Verified production headers, video playback/pause, login hydration and no-query
denial regressions. Lint, TypeScript, 45 tests and production build passed; Edge
reported no observed CSP violations or uncaught errors in those two page flows.
Production database diagnostics return 404, lightweight app health remains 200.
Strict script CSP, HSTS/HTTPS deployment verification and other release gates
remain open. No emails, account writes, new services or dependencies.

Private-write controls delivered: process-local budgets keyed to server-verified
user IDs, profile 30/minute and tracker mutations 60/minute. Validate first, deny
before storage writes, preserve read access and existing ownership/CAS rules.
Verified no writes on 429, Retry-After/no-store, independent users/scopes,
and normal request regressions. Lint, TypeScript, 43 tests and production build
passed. Live DB/UI checks were not rerun for this increment. Distributed controls remain
a deployment gate; no additional service or migration is required for this pass.

Supplementary abuse-control increment delivered: process-local per-email login
(10/10 minutes) and registration (3/hour) budgets; existing recovery cooldown
now rejects new keys at capacity without evicting active protection. Limited
requests return no-store 429/Retry-After before provider calls; logout remains
available. Lint, TypeScript, 40 local tests and production build passed. No real
auth attempts/mail sent. Distributed/edge controls and private-write limits
remain required; process-local limits reset on restart and differ per instance.
See SECURITY_REVIEW.md for capacity and denial-of-service limitations.

Bounded-body increment delivered: shared streaming JSON reader for credential,
recovery, profile and tracker payloads enforces byte limits without Content-Length,
cancels early on overflow and rejects invalid/truncated input safely. Existing
schema validation and normal operations are preserved. Auth/recovery/tracker:
2 KiB; profile: 32 KiB for Unicode/escaped maximum-length fields. Lint, TypeScript,
36 local tests and production build passed. Real HTTP chunked oversized requests
to all five credential/recovery endpoints returned safe no-store 400 errors.
No mail sent or account writes performed. Distributed rate/slow-body controls
remain open; this increment only bounds application JSON buffering.

Trusted-origin increment delivered: production authentication requires a
server-only HTTPS `APP_ORIGIN`; callback/email destinations cannot be selected by
Host or forwarded headers. Reject unknown hosts before code exchange or mutation
authorization; unconfigured localhost/LAN development behavior is preserved.
Lint, TypeScript, 31 local tests and production build passed. Production HTTP
smoke verified forged-host rejection, fixed HTTPS callback destination despite
forwarded-header spoofing, foreign mutation 403 and trusted anonymous mutation
401. No mail sent. Set `APP_ORIGIN` and the corresponding Supabase redirect URL
before production auth use; no real deployment configuration was changed.

First focused review delivered; evidence and remaining gates are in
[SECURITY_REVIEW.md](SECURITY_REVIEW.md). Foreign browser mutations without Origin
are denied using Fetch Metadata, and the proxy applies no-store after session
refresh on account-aware pages/API/callbacks. Lint, TypeScript, 30 local tests and
production build passed. Production HTTP smoke verified no-store on six pages
and profile API, anonymous 401, foreign mutations 403 and preserved media caching.
Production dependency audit reported zero advisories. Owner-scoped providers/RLS
migrations were inspected; live DB isolation was not rerun. Host trust, distributed
abuse controls, headers/CSP and operational/privacy gates remain open.

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

Offline smoke increment delivered: run existing guest workspace, navigation and
404 cases against a dedicated production server on port 3200, desktop and mobile.
Build/run with public Supabase configuration empty in CI; never reuse the owner's
development server. Keep failures visible (no retries), retain failure artifacts
seven days, and install only Chromium. All six local Windows Edge cases, lint,
TypeScript and whitespace checks passed against the preceding verified production
build. No new app code/dependencies, live emails or database writes. Details:
[CI_VERIFICATION.md](CI_VERIFICATION.md). Remote CI is not
verified until the exact commit is pushed and its workflow result inspected.

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
| Next implementation | P1 and P2.3 complete; verify remaining P2.1/P2.2 inbox/session cases and begin P3.1 accessibility/interaction audit independently. |
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

P1.1/P1.2: tracker contract committed as `03dcfd5`; additive jobs/tracker
migration applied to development with six unchanged fictional catalog IDs.
Lint, Prisma generation, typecheck, 15 local tests, production build and expanded
RLS checks passed. Migration rerun skipped recorded files. RLS tests covered
owner CRUD, both directions of isolation, catalog/column grants, defaults and
constraints, stale revisions, inactive history, restricted catalog deletion and
account-deletion cascade; the full test transaction rolled back. No UI/API
tracker persistence is claimed: P1.3 remains open. No paid services/dependencies.

P1.3 delivery: authenticated `/api/v1/jobs` and `/api/v1/applications`
list/save/status/remove routes now back the account workspace. Owner IDs are
server-derived, duplicate saves preserve status, revision conditions prevent
stale edits/deletes, and database errors are sanitized. Account pages load
server data; the client refreshes after writes and tab focus, supports explicit
refresh, blocks pending/uncertain edits and retains last confirmed data on
failures. Guests remain local; previous account-local keys are preserved without
automatic import. Inactive roles hidden by RLS return 404 without privileged
existence checks, documented in TRACKER_CONTRACT.md.

Verification: lint, types, 20 local tests and production build passed; four
desktop/mobile guest/navigation cases passed; live tests proved two independent
account sessions share tracker state, phone status persistence/reload/removal,
duplicate-save preservation, stale edit/delete conflicts, cross-user denial,
failed write/refresh recovery and anonymous denial after logout. Temporary
identities/profiles/tracker rows were removed. Desktop/mobile tracker screenshots
were inspected. Existing RLS checks were previously verified in P1.2; no schema
changes or paid services/dependencies in this increment. Real signup email,
physical-phone verification and remote CI/deployment remain unverified.

Account-access recovery increment: a read-only check of confirmation/sign-in
flags established that the existing development email was already confirmed.
No email addresses, passwords or tokens were printed or changed by diagnostics.
Added password reset/resend pages and APIs, safe callback routing/recovery,
local/provider cooldowns and hydration-safe POST auth forms. Details and
verification boundaries are in ACCOUNT_RECOVERY.md. Live temporary-account
tests verified password mismatch handling, actual password change, rejection
of the old password and login with the new one; temporary data was removed.
No test emails were sent. Actual owner inbox/callback success remains pending.

Recovery verification: lint, typecheck, 27 local tests and production build
passed. Four final desktop/mobile recovery cases passed after fixing a test
navigation race (the old login form shared the Email address label). Existing
authentication cases passed in the earlier run. Live profile/tracker/session
regressions and temporary-account password-change/new-login checks passed;
all temporary identities were removed. No email-delivery success is claimed.

P2.3 delivery: private profile setup now links introduction, skills and project
foundations to the corresponding inputs and reflects saved data only. Saving
exposes a matches action. Signed-in navigation has one direct My profile entry
with correct selected state; guest profile/account destinations stay separate.
Profile fields wait for hydration, disable during saves, and retain unsaved
edits on failure. Same-tab navigation/sign-out prompt before discarding drafts;
native unload protection is best effort and browser Back limits are documented.

Verification: lint, typecheck, 27 local tests and production build passed. Four
desktop/mobile guest/navigation cases passed. The real temporary-account test
passed blank setup/save states, private navigation, save CTA visibility, failed
save draft preservation and canceled unsaved navigation, alongside profile,
tracker, ownership, password-change and logout regressions. A decorative-arrow
link selector was corrected before the successful rerun. Temporary identities
were removed and desktop/mobile profile screenshots reviewed. No schema changes,
new dependencies or paid services. CV/portfolio/AI modules remain deferred.

P3.1 first-pass delivery: preserved keyboard form outlines, increased tracker
remove/bookmark/notification targets, enlarged compact coarse-pointer actions,
made main content focusable for skip/return focus, and announced filter counts.
Role dialogs now open after their named content mounts and return focus to
the original trigger or main content if removal deleted that trigger. The
initial browser reproduction measured a 36px tracker remove target; the
expanded tests also caught the dialog initial-focus timing issue.

Verification: lint, typecheck, 27 local tests and final production build
passed. Four final desktop/mobile accessibility cases passed, covering nine
public routes at 320/360/640 CSS-pixel widths, keyboard field/skip focus, dialog
opening/reopening/Escape, 44px removal targets and focus after trigger deletion.
The existing desktop/mobile navigation cases also passed in the earlier run.
No new dependencies, paid services or database changes. P3.1 remains partial;
actual zoom, contrast inventory, assistive technology, private-state layouts
and physical-phone checks remain in ACCESSIBILITY_REVIEW.md.

P3.1 second pass: fixed horizontal overflow from maximum-length profile skills
and identity metadata. Live temporary-account checks now cover 40 long skills
and maximum-length profile fields at 320/768/1440 CSS pixels, including clipped
identity/skill text. The fixture is restored and temporary identities removed.
A repeatable solid-background contrast sampler checked 151 public text/control/
placeholder instances with zero failures; complex surfaces are explicitly skipped.
Four desktop/mobile contrast regression cases, lint, TypeScript, 27 local tests,
production build and the live account suite passed. No new dependencies, paid
services or database changes. P3.1 stays partial pending the manual and complex
surface checks recorded in ACCESSIBILITY_REVIEW.md.
