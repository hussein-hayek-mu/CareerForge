# Hosted MVP runbook

This prepares the current web MVP, not full report completion. No site has been
deployed by this increment. Hosting account access/domain and remaining release
gates must be resolved before promotion. Do not enable an automatic production
integration until deploying the reviewed commit is authorized.

## Configure and build

Use the existing repository root, Next.js preset, Node 22 and npm lockfile.
`vercel.json` selects `npm run build:deploy`: redacted configuration checks,
Prisma generation, then Next production build. Ordinary `npm run build` remains
available for local builds. `npm run build:offline` explicitly blanks Auth/origin
configuration before compilation for the offline CI fixture. No build runs migrations.

Set each environment explicitly in Vercel:

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact HTTPS origin users will open, without path/credentials. Auth rejects other hosts. |
| `NEXT_PUBLIC_SUPABASE_URL` | Target Supabase HTTPS origin, set before build. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/legacy anon key; never service-role/secret. |
| `DATABASE_URL` | Server-only target runtime PostgreSQL connection. |
| `DIRECT_URL` | Server-only connection needed by Prisma config/generation and reviewed DB tooling. |

Use a separate non-production Supabase project for preview/testing. Do not copy
production credentials into previews. No LLM or service-role key is required by
the present MVP. Configure a stable preview alias/domain as `APP_ORIGIN`; random
preview URLs will fail auth unless they match. Do not guess the final domain or
derive trust from request headers.

Run `npm.cmd run check:deployment` locally with the intended environment to check
configuration shape. It performs no network/DB calls and never prints values.
It cannot establish credential validity, project alignment or deployment safety.
The validator rejects unsafe origins, missing/placeholders and known secret-bearing
public variable names. It is not a complete secret scanner or JWT verifier.

In Supabase, allow exactly `<APP_ORIGIN>/auth/callback`, set the intended Site URL
and verify confirmation/reset templates and delivery. Each PKCE flow must start
and finish at the same origin/browser. Rebuild after changing public variables;
they are compiled into the client. See [Vercel environments](https://vercel.com/docs/environment-variables).

## Database and release gate

The committed SQL in `supabase/migrations/` and its checksum runner are the current
migration mechanism. Do not substitute Prisma migration commands from generic
examples. Review the exact target, pending migrations, backup/restore capability
and rollback plan before an explicitly authorized production migration. Confirm
owner RLS, grants, trigger and six clearly fictional job seeds in that target.
Do not run temporary-user live tests against production.

Before deployment: green CI on the selected app commit; reviewed environment and
domain; verified backups/restore procedure; host/HTTPS and abuse controls; accurate
privacy/retention/support wording. Process-local throttles are supplementary and
do not satisfy distributed abuse prevention. Outstanding manual accessibility,
phone and account/session checks remain in the roadmap.

## Hosted smoke and rollback

After an authorized preview deployment, record commit, URL, environment and applied
migration versions. Check app health (200); production DB-health endpoint should
be 404. Verify response headers and anonymous private-API 401. Then on desktop and
a phone: signup/confirmation, login, profile save/reload, matching explanations,
save/status/remove across reloads, password reset, logout and two-user isolation
in the isolated preview project. Jobs must remain labeled fictional. Check network
failures, reduced motion, video control and no private data in logs. These steps
are unverified until actually executed on the hosted build.

If a release fails: stop promotion, preserve diagnostics without secrets, and
restore the previously verified deployment using the hosting dashboard. Recheck
its matching environment and schema compatibility: code rollback does not roll
back database migrations or changed secrets. Never drop tables or reverse data
migrations as an improvised rollback. Use the reviewed recovery plan/backup only
with authorization. Record the incident and exact recovered commit before retrying.

Local development remains `npm.cmd run dev` at localhost:3000. To test a configured
production build locally use an appropriate HTTPS environment matching APP_ORIGIN;
the offline suite instead uses `npm.cmd run build:offline` followed by
`npm.cmd run test:e2e:ci`. Runtime overrides alone cannot remove public variables
compiled from a developer's `.env`. Never set production secrets just to satisfy
a local smoke test.
