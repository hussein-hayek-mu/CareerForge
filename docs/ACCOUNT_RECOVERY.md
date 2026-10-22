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
