# Email confirmation and account recovery

The app now offers recovery instead of asking users to recreate accounts.

## User flow

- `/login` distinguishes invalid credentials from a provider-reported
  unconfirmed email, with links to password reset and confirmation resend.
- `/forgot-password` requests a password reset email. Use the newest link in
  the same browser, device and origin used to request it; keep the app running.
- `/confirm-email` requests a fresh signup confirmation for eligible accounts.
  Already-confirmed or unknown accounts receive the same generic response.
- `/auth/callback` exchanges a PKCE code, forwards `sb_flow_id` when present,
  and routes a successful recovery exchange to `/reset-password`. Other
  successful exchanges go to `/account`. Failed/expired links return to login
  with safe recovery guidance; arbitrary `next` parameters are ignored.
- `/reset-password` shows a new-password form only after the server verifies
  the session. An anonymous visitor is offered a fresh reset link. Password
  updates require verified authentication and same origin at the API as well.
  A signed-in owner may also use this page to change their own password.

Keep `http://localhost:3000/auth/callback` in Supabase's allowed redirect URLs.
For a phone, request the link from the computer's LAN origin and allow that
origin's `/auth/callback` too. Production uses the HTTPS equivalent. The reset
flow reuses the existing callback path. Do not paste email tokens into chat.

## Guarantees and limits

Email requests use a bounded process-local 60-second hashed-email cooldown
plus Supabase's own provider limits. HTTP 429 includes Retry-After and the UI
shows a countdown. This is not a distributed production abuse limiter.
Input is bounded/strict, mutation origins are checked, responses are no-store,
and callback redirects use no-referrer. Auth forms wait for hydration and use
POST fallback to avoid putting credentials into URL query strings.

No API returns access tokens, private provider errors or account eligibility.
Email success means an eligible account can receive a message, not proof of
delivery. Sender configuration, spam filtering, expiration and callback
allowlists still require a real inbox check. No service-role key, database
password override, user deletion or disabled confirmation is needed.

## Callback review and owner checklist

On 22 October 2026, a read-only public Auth settings request returned 200:
email authentication enabled, signup enabled, and email confirmation required.
No credentials were printed and no emails were requested. This endpoint does
not expose the redirect allowlist or establish SMTP delivery health.

Callbacks now reject duplicate codes/flow IDs and oversized flow IDs before
contacting Auth. Provider query errors `otp_expired` and `flow_state_expired`
lead to specific expired-link guidance; descriptions are never echoed. Successful
redirects still depend on a real exchange, never on query-supplied recovery type.
URL fragments are not sent to the server; a fragment-only provider failure gets
generic missing-code guidance rather than a specific expiry diagnosis.

Complete the remaining owner check without sharing passwords or email links:

1. Keep the app running at one origin. In Supabase Authentication URL
   Configuration, check that this origin's `/auth/callback` is allowed and the
   Site URL points to the intended environment. The public settings check above
   cannot verify these dashboard values.
2. Request a fresh confirmation from `/confirm-email`, then open the newest
   email link in the same browser/device/origin that requested it. Check that
   `/account` loads, a profile edit persists after refresh, and sign-out removes
   private access. Use a fresh signup if a genuinely new confirmation is needed;
   an already-confirmed account may not receive another confirmation.
3. From `/forgot-password`, request a reset for your account and open the newest
   link in that same browser. Expect `/reset-password`; set a new password, sign
   out, then verify the new password works and the previous password fails.
4. Reuse the consumed link: expect recovery guidance, without a fresh session
   created by the consumed code. An already signed-in owner can still access
   their own account; that alone does not prove link reuse succeeded.
5. Report only the final route and visible message if it fails. Do not paste
   the full callback URL, codes, tokens, cookies or password into chat.

PKCE browser requirements and redirect configuration are documented in
[Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow) and
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Verification

- Unit/API tests cover validation, origin rejection, generic email responses,
  cooldown/provider limits, sanitized failures, anonymous password denial,
  fixed callback destinations, PKCE flow forwarding and expired callbacks.
- Browser tests mock all email requests, check login/confirmation guidance,
  reset/resend cooldowns and anonymous reset behavior on desktop/phone. Wait
  for navigation before filling similarly named fields on the next page.
- The live development test changes a temporary account's password through
  the real UI/API, verifies mismatch handling, rejects its old password and
  accepts the new password. Exact temporary identities are deleted afterward.
  It sends no confirmation or password-reset emails.
- Actual inbox delivery -> callback -> password update still needs an owner
  check. Do not mark the full P2.1/P2.2 journeys verified from mocked email tests.

References: [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords),
[PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[confirmation resend](https://supabase.com/docs/reference/javascript/auth-resend).
