# Preview release preparation — 30 October 2026

The owner authorized the preview deployment plan with "do them". Work is on
`preview/careerforge-20261030`; the original `main` branch and unrelated IDE
settings are preserved. No deployment has occurred.

## Prepared source

- Commit `e335f16` contains the supplied experience, public navbar/dashboard
  correction, performance fixes and the expanded offline test setup.
- Release commit `55a9be2` includes the remaining validated source and deployment
  preparation. It was pushed to the preview branch on the approved GitHub remote;
  a separate remote-ref read confirmed that exact commit.
- The release snapshot includes the existing education/work-history source and
  migration, with validated API handlers and database constraints, so it retains
  the locally integrated profile/CV work.
- Node is pinned to `22.x` in package/lock metadata, matching local and CI tests.
  Vercel supports the `engines.node` override:
  https://vercel.com/docs/functions/runtimes/node-js/node-js-versions.
- CI now runs for `preview/**` branches as well as `main` and pull requests.
- Prisma generation, full lint, TypeScript/build and all 97 unit tests passed.
  The existing 34-case desktop/mobile offline browser suite also passed.
- GitHub CI on `55a9be2` and documentation-only `3a9df45` passed dependency
  installation, Prisma generation, lint, type checking, unit tests, production
  build and Chromium installation. The browser smoke step failed. Public check
  metadata exposed no failing assertion, and detailed logs require sign-in.
  Playwright's GitHub reporter then exposed the two failing assertions: anonymous
  profile requests expected 401 but received 503 without a configured Auth provider;
  the other 32 cases passed. Local `.env` public values had been frozen into the
  earlier local build, masking the clean-CI difference.
- `npm run build:offline` now explicitly blanks public Auth/origin configuration
  before compilation, and CI uses the same command. The offline test checks the
  intended `503 / PROFILE_UNAVAILABLE` response, no private profile and no-store;
  configured anonymous denial remains covered separately. Product authorization
  was not changed. Explicit offline build/TypeScript, targeted lint and all 34
  desktop/mobile browser cases passed locally. Verify the actual GitHub run after
  publishing this correction before deployment.

## Database check

A read-only check of the database configured in the local environment found the
first six SQL migrations applied with matching checksums and RLS enabled on their
tables. `202610290001_profile_history.sql` is pending.

`node scripts/test-profile-history-db.mjs --development-rollback` then validated
that SQL and owner CRUD, two-user and anonymous isolation, revision conflicts,
retry uniqueness, precise GPA/date constraints, the education record limit and
account-deletion cascade. The SQL and fixture users were all rolled back. No
schema, records or migration ledger entries were retained.

The actual isolated preview database still needs to be selected through an
authenticated Supabase account. Apply the reviewed migrations only to that
confirmed non-production target, then rerun its owner/authenticated API checks.

## Access and publication state

Vercel and Supabase integrations were discoverable but were not installed or
connected when checked. No Vercel project/session exists locally, and no Supabase
management session is configured. Install and connect both to continue resource
creation, exact domain/environment setup and callback configuration. Credentials
must be entered through the provider connection, not committed or pasted into
source files.

Git remote: `git@github.com:hussein-hayek-mu/CareerForge.git`.
GitHub SSH authentication succeeds as `izodox`; this does not establish ownership
or permission to publish into the configured remote's account.

Automatic approval review initially rejected the push to
`https://github.com/hussein-hayek-mu/CareerForge` because the exact destination and
source/history upload were not explicitly approved. The owner then answered
"yes i approve" to that specific repository and preview-branch payload. The push
succeeded after that approval, and the remote commit was independently verified.
A limited local check found no configured database/secret values in the candidate
source files or unpublished patch history; this is not a universal credential
scan. Private environment files and unrelated IDE settings were excluded.

## Remaining hosted work

Create the Vercel preview project; confirm its stable HTTPS domain; set the five
variables documented in `DEPLOYMENT.md`; configure Supabase Site URL and the exact
`/auth/callback` redirect; apply pending migrations to the confirmed preview DB;
deploy the verified commit and inspect the actual CI/deployment result. Then verify
health/security responses and real signup/login, saved profile/history/tracker,
two-user isolation and password recovery on the hosted build. None of those hosted
successes is claimed yet. No production resources or paid plan were created.
