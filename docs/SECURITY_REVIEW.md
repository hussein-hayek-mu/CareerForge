# MVP security review

First focused pass, 22 October 2026. This is implementation evidence and a list
of remaining release gates, not a penetration test or security certification.

## Boundaries inspected

- Profile and tracker providers verify identity with Supabase `getUser()` and
  use the authenticated client, not a privileged Prisma connection. Queries
  scope user-owned rows to the verified ID; tracker writes also compare revisions.
- Committed profile/tracker migrations enable owner RLS, restrict writable
  columns and define account-deletion cascades. This pass inspected source;
  historical live isolation tests are not represented as freshly rerun DB tests.
- APIs use no-store JSON responses and sanitized errors. Callback destinations
  are fixed, PKCE input is bounded, and arbitrary `next` redirects are ignored.
- Auth cookies are HttpOnly, SameSite=Lax and Secure in production. Server
  session refresh can replace the response object, so proxy response policy must
  be applied after refresh.

## Changes

`isSameOrigin` now rejects browser `Sec-Fetch-Site: cross-site` and `same-site`
mutation requests even without Origin. Same-site sibling origins are not trusted
as the application origin. Existing exact Origin checks, local/LAN behavior and
non-browser callers without either header remain supported. This is additional
browser request protection, not authentication or a distributed abuse limiter.
See [MDN Fetch Metadata](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Site).

The proxy explicitly applies `private, no-store` after session refresh for
account-aware pages, password reset, API v1 and the auth callback. This covers
page/RSC requests; image/video resources retain their caching behavior. Browser
history and Next client-router state are separate from HTTP shared-cache policy
and still need the release account-switch/back-navigation checks.

## Dependency snapshot

`npm.cmd audit --omit=dev --json` completed successfully with zero reported
production dependency advisories. The ignored report is
`test-results/dependency-audit.json`. This reflects the registry snapshot at the
time, excludes development dependencies and is not proof that dependencies have
no vulnerabilities. No automatic package upgrades were applied.

## Remaining P4.1 gates

Verification: ESLint, TypeScript, all 30 local tests and production build passed.
Production HTTP checks on a separate local server confirmed no-store for six
account-aware pages and the profile API, anonymous profile 401, foreign-site
mutation 403, and video HEAD 200 without no-store. Unit coverage also checks
no-store for callback/API paths and unchanged LAN-origin behavior. No emails,
private-account writes, schema changes or dependency additions were needed.

- `requestOrigin` currently derives the host/protocol from request/proxy headers
  for local/LAN compatibility. Before hosting, verify the deployment rejects
  unknown Host values and overwrites forwarded protocol; define a canonical
  production origin/allowlist if those assumptions cannot be established.
- Distributed auth/mutation abuse controls, bounded request streaming and a
  complete public health-endpoint exposure review remain open.
- Review security headers/CSP with actual auth/video flows and redacted error
  visibility; do not ship an untested strict policy that breaks the app.
- Complete live session-expiry/account-switch/history checks on the hosted build,
  confirm RLS in the target database, and exercise deletion cascades there in an
  isolated test environment.
- Production secret separation, privacy/retention/export/deletion/support terms,
  backups/restore/migration rollback and hosted verification remain release work.

The owner's earlier “done” is recorded as reported completion of an email check,
not explicit evidence that both confirmation and password recovery succeeded.
Do not repeatedly block independent development on this ambiguity.
