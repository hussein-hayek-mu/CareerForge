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
- Distributed auth/mutation abuse controls remain open. Public production
  database probing is now disabled as recorded below.
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

## Supplementary auth attempt limits

Login allows ten validated attempts per normalized email in a ten-minute window;
registration allows three per hour. All attempts count, including successful
ones, because each invokes the provider. Login and registration have separate
scopes. Limits do not reveal whether an account exists. Invalid input and foreign
origins are rejected before consuming this budget; logout is not limited.

The existing shared resend/reset-email cooldown remains one request per minute.
All three controls now use bounded process-local stores with hashed keys (no
passwords or raw email addresses). Credential storage allows 5,000 active keys;
recovery allows 1,000. Full storage denies new keys until the earliest window
expires, rather than evicting a protected key and allowing email rotation to
erase its cooldown. Existing keys retain their own thresholds. Denials are
no-store 429 responses with Retry-After, before provider access.

These are deliberately supplementary controls, not distributed rate limiting.
Restarts clear them and multiple instances maintain independent budgets. A person
who knows another email can exhaust its local budget; do not treat this as an
account lock or identity proof. Unknown-email flooding can exhaust store capacity
and temporarily deny new keys. Deployment-level trusted-client/network limits,
bot controls where appropriate and provider limits are still needed before a
public launch. Private profile/tracker limits are recorded in the next section.

Verification: lint, TypeScript and production build passed; the expanded suite
passed all 40 tests. New tests cover exact policies, normalized keys, independent
scopes, time boundaries, saturation without eviction, provider-call denial,
Retry-After/no-store and unrestricted logout. No real auth attempts, emails,
database changes, new dependencies or paid services were required. Browser/UI
tests were not rerun for this server-side increment.

## Verified-user write budgets

The authenticated access objects now carry the verified server-side user ID.
Profile writes allow 30 validated attempts per minute, tracker save/update/remove
share 60 per minute. The shared bounded limiter hashes owner keys and separates
profile/tracker scopes. Request bodies cannot select a budget owner: existing
strict schemas reject injected user IDs. Each valid attempt counts, including
conflicts or storage failures, since it can perform database work.

Origin checks and authentication precede validation; valid input then consumes
the owner's budget before any data operation. Exhaustion returns no-store 429
with Retry-After. Reads remain available and are not charged. Owner RLS and CAS
checks are unchanged. The client receives the existing safe API error path.

These controls are process-local and do not limit direct authenticated Supabase
requests permitted by RLS. They supplement server mutation protection, not a
database-wide or distributed quota. Target-host edge limits, slow-body controls
and live account/history verification remain release gates.

Verification: lint, TypeScript, 43 local tests and production build passed.
Regressions cover denied profile/tracker writes without storage calls, verified
owner selection, Retry-After/no-store, reads during exhaustion, separate users
and scopes, and exact policy thresholds. Existing normal write, revision,
validation and anonymous-denial tests passed. No live database/UI tests were
rerun for this pass; no emails, schema changes or dependencies were introduced.

## Baseline headers and public diagnostics

Next configuration now disables X-Powered-By and sets nosniff, DENY framing,
no-referrer and camera/microphone/geolocation denial headers. The CSP restricts
base URLs to self, blocks object embeds and prevents framing. It deliberately
does not add script/style/default source restrictions; those require a separate
nonce/framework compatibility review. HTTPS/HSTS belongs to the verified target
deployment and is not enabled speculatively for local HTTP/LAN use.

`/api/v1/health/database` now returns no-store 404 in production before invoking
Prisma. Local development diagnostics still report connected/unavailable without
connection details. `/api/v1/health` remains a lightweight public liveness check;
it is not evidence of database readiness. Production operational DB checks need
a separately reviewed private mechanism rather than a public query endpoint.

Verification: lint, TypeScript, all 45 tests and production build passed. Unit
tests prove disabled diagnostics never invoke the checker and local failures are
sanitized. Real production HTTP checks confirmed headers on overview, login, API
and media, removed X-Powered-By, database 404/no-store and app-health 200. Edge
verified overview video playback/pause and hydrated login fields with no observed
CSP violations or uncaught page errors. This was not a complete authenticated or
cross-browser security-header audit. No emails, account writes, schema changes,
dependencies or paid services were introduced.
