# Accounts and profile persistence

This owner-authorized increment continues the no-AI web MVP. Keep fictional
jobs and browser-local demo tracking; do not upload the sample profile.

1. Exercise demo editing, matching, tracking, reloads, and phone widths in a real
   browser; fix observed issues and keep reproducible browser tests.
2. Add email/password login, registration, and logout using Supabase Auth.
   Sessions use HttpOnly, SameSite cookies; private responses are never cached.
3. Add a separate protected `/account` editor and authenticated profile API.
   The user ID always comes from verified authentication, never submitted data.
4. Add an additive `profiles` migration and Prisma mapping. This first profile
   record stores headline, bio, location, education/project summaries, and
   self-reported skills. Normalized education/project/taxonomy records from the
   full-product report remain future work; summaries are not verified evidence.
5. Enforce RLS on the table, restrict writable columns, and prove owner-only
   select/insert/update/delete using two synthetic users in a rolled-back test.
6. Verify API behavior, desktop/mobile UI, lint, types, build, and database RLS;
   commit focused changes with benefit-oriented messages.

Scope: account/profile components and routes, server auth helpers, validation,
SQL migration and runner, Prisma schema, tests, scripts/config, and documentation.
No AI, live search, automatic submissions, or production deployment. Existing
public demo routes remain available. The account editor must never silently
fall back to a demo on auth or database failure.

Migration application must be transactional, checksum-tracked, and fail rather
than replace an existing conflicting table. No database resets or dropped data.
RLS tests leave no users or profile rows behind. Browser tests never send signup
emails automatically. A first real signup is performed by the account owner.

## Verification and boundaries

- Desktop and phone demo tests: edit skills, save, reload, check match score,
  open role details, save a role, update status, reload, and remove the role.
- Real development-account browser test: login, HttpOnly/SameSite cookies,
  account profile save/reload, two-user isolation, rejected owner injection,
  rejected cross-origin mutation, mobile overflow check, failed-save recovery,
  logout, and anonymous denial. Temporary identities are deleted afterward.
- Database RLS test: owner CRUD, two-way cross-user denial, blocked role/id
  changes, and anonymous denial. Entire test transaction is rolled back.
- Registration UI confirmation state is mocked; real email delivery and the
  provider's redirect allowlist must be checked with the owner's own signup.
- No test proves rendering on a physical phone; browser tests emulate its size.

The shared dev database migration was applied on 22 October 2026. `DIRECT_URL`
did not resolve from this machine; the configured `DATABASE_URL` session-pooler
connection worked. No environment secrets were changed or committed.

The generated `next-env.d.ts` is ignored, following the installed Next.js
documentation. `typecheck` runs `next typegen` first, so clean CI checkouts can
generate their own route types without committing dev/build-specific paths.

Final checks on 22 October 2026: lint (no warnings), typecheck, 15 local
unit/API tests, six desktop/mobile browser tests, the real two-account test,
RLS tests, Prisma validation/generation, and production build all passed.
Re-running the migration safely skipped the recorded migration. The production
dependency audit reported zero vulnerabilities. Tests used the existing Edge
installation, so no extra browser download was needed.

Public Supabase settings confirm that email signup is enabled and email
confirmation is required. Check real email delivery and the callback allowlist
before treating signup as end-to-end verified.
