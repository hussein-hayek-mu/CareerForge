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

- Production origin validation is now configured explicitly (see below). Verify
  the actual hosting domain/proxy behavior and HTTPS before deployment sign-off.
- Distributed auth/mutation abuse controls and a
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

## Trusted application origin

Production auth now requires server-only `APP_ORIGIN`, for example
`https://careerforge.example.com`. Use an exact HTTPS origin with no credentials,
path, query or fragment. Add its `/auth/callback` URL to Supabase's allowed
redirects. Previews need their own configured origin/allowlist entry. This does
not choose or deploy a hosting domain.

Auth origin resolution compares the incoming Host (or request URL host if no
Host exists) with the configured host/port, then uses the configured origin.
Forwarded host/protocol cannot change it. Wrong hosts or invalid/missing
production configuration deny mutations and return a no-store, no-referrer 503
callback response without exchanging the code or issuing a redirect. Mutation
denials use the existing generic 403. Public demo pages can still render.

Without `APP_ORIGIN`, non-production localhost/LAN operation retains its previous
behavior. If explicitly configured in development, the same strict origin policy
applies there. Public page access is not a global Host firewall; the deployment
must still enforce its domain routing and HTTPS. Alternate domains should redirect
at the hosting edge before auth starts, rather than be added as implicit trusted
origins. Switching origins mid-PKCE flow can lose browser verifier cookies.

Verification for this increment: lint, TypeScript, 31 local tests and production
build passed after correcting a test-cleanup TypeScript error caught by the
first run. Unit cases cover missing/invalid production configuration, credentials
or paths in origins, forged hosts/ports, fixed success redirects and no exchange
on rejected callbacks. A separate local production server with a temporary
example origin confirmed forged callback Host -> 503 without Location, trusted
Host -> configured HTTPS redirect despite spoofed forwarded headers, foreign
mutation -> 403 and trusted anonymous mutation -> 401. No mail, account writes,
new dependencies or real deployment configuration changes. UI browser tests were
not rerun for this server-only change; target-host verification remains open.

## Bounded JSON requests

Credential login/register, recovery and tracker payloads now use one streaming
JSON reader with a 2 KiB byte cap. Profile writes use 32 KiB, allowing the current
maximum fields/skills even with escaped Unicode while retaining strict field
limits. The previous profile 16,000-byte header check could reject legitimate
Unicode while failing to bound undeclared bodies. Logout does not parse a body.

The reader checks declared lengths, counts actual incoming bytes regardless of
the header, cancels on overflow and parses only bounded text. UTF-8 is decoded
across chunk boundaries; malformed encoding, JSON, truncated/broken streams and
oversized payloads follow existing no-store 400 validation responses. Rejected
streams do not reach data operations. Profile/tracker still authenticate before
reading a body; foreign-origin mutations are denied first.

This bounds application-level buffering, not upstream proxy buffers or the size
of a chunk already allocated by the runtime. Slow-body timeouts, connection limits
and distributed request-rate controls still require deployment-level review.

Verification: final lint, TypeScript, 36 tests and production build passed. The
first run caught a test-fixture header typing error, corrected before the final
run. New regressions cover exact-byte limits, split UTF-8, missing/false lengths,
early cancellation without reading later chunks, invalid encoding/JSON, transport
failure, maximum escaped-Unicode profile acceptance and all affected mutation
handlers denying oversized payloads without data operations. Production HTTP
checks sent chunked oversized bodies to login, register, forgot-password,
resend-confirmation and password: all returned no-store 400 INVALID_INPUT.
No email, account writes, new dependencies or schema changes. UI browser checks
were not rerun for this request-parser change.
