# CareerForge

CareerForge is a two-person university capstone project. The Next.js web MVP
includes a browsable demo and real Supabase email/password accounts with private
profile persistence. AI, live job discovery, and automatic applications are out
of scope for this increment.

## Prerequisites

- Node.js 20.9 or newer (Node.js 22 is used for this workspace)
- npm 10 or newer
- Git
- Access to the shared Supabase development project when authentication or
  database work begins

## Install and run

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The four demo pages and
<http://localhost:3000/api/v1/health> work without Supabase credentials.
After configuring `DATABASE_URL`, check the database connection at
<http://localhost:3000/api/v1/health/database>.

Available checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Local environment and Supabase

Each teammate creates their own untracked `.env.local` from `.env.example`.
Use the shared Supabase development project, not production, while developing.
The public URL and publishable key are available in the Supabase dashboard under
**Project Settings → API**. The PostgreSQL connection strings are under
**Project Settings → Database → Connection string**.

Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the SSR clients. Set `DATABASE_URL`
to the pooled connection string for runtime Prisma queries and `DIRECT_URL` to
the direct/session connection string for Prisma migrations. Prisma 7 reads
`DIRECT_URL` through `prisma.config.ts`, which explicitly loads `.env` via
`dotenv/config`; Next.js loads `.env.local` automatically. Do not commit either
local environment file, passwords, service-role keys, or other secrets.

For real accounts, configure the public Supabase values and apply the reviewed
profile migration once to the shared **development** database:

```bash
npm run db:migrate
npm run prisma:generate
npm run test:rls
```

The transaction-based migration runner uses `DATABASE_URL` (falling back to
`DIRECT_URL`) and records migration checksums. Use the working session pooler
URL when the direct hostname is unavailable. Never edit an applied SQL migration.

Visit `/register` to create your own account, `/login` to sign in, and `/account`
to edit your private profile. The real account never imports sample profile data.
Demo jobs, saved roles, and application statuses remain browser-local examples.

In Supabase **Authentication → URL Configuration**, allow
`http://localhost:3000/auth/callback` for email confirmation. For testing signup
from a phone, also allow `http://<your-computer-IP>:3000/auth/callback`. Confirm
email in the browser used to register; PKCE confirmation is browser-bound. Use
HTTPS URLs for deployment. The real email-delivery/confirmation flow is not part
of automated browser tests; those tests mock registration to avoid sending mail.

To view from a phone on the same Wi-Fi, run:

```bash
npm run dev -- --hostname 0.0.0.0
```

Open `http://<your-computer-IP>:3000`. The dev config permits this computer's LAN
addresses for live updates; account mutations still enforce same-origin checks.

## Collaboration workflow

Create a feature branch from the latest `main`:

```bash
git pull origin main
git switch -c feature/short-description
```

Make a focused change, then run the checks above. Commit with a concise
message, push the branch, and open a GitHub pull request for review:

```bash
git add .
git commit -m "Add short description"
git push -u origin feature/short-description
```

After a teammate merges a pull request, update your local branch before
starting the next task:

```bash
git switch main
git pull origin main
npm ci
```

Run `npm ci` after cloning and whenever `package-lock.json` changes. Keep one
`package-lock.json` and use npm only.

## Database coordination

Review and commit SQL migrations in `supabase/migrations`, including RLS and
column grants. Keep the Prisma model in sync. Use `npm run db:migrate` rather
than `prisma db push` or database resets. Coordinate with the team before
applying schema changes to the shared database. Account APIs use a verified
Supabase session and an authenticated Data API client so RLS stays active;
Prisma's direct connection is only used for infrastructure diagnostics here.

Additional verification commands:

```bash
npm run test:e2e
npm run test:rls
npm run test:account:live
```

Browser tests use installed Edge on Windows. On Linux, install Chromium once
with `npx playwright install --with-deps chromium`. The normal browser suite
covers the demo, anonymous account protection, login errors, and a mocked signup
confirmation screen at desktop and phone widths. It reuses a running dev server.

`test:rls` uses a rolled-back database transaction. `test:account:live` requires
the dev server and development database; it creates two temporary confirmed
`@careerforge.invalid` identities, verifies real login, cookie flags, persistence,
isolation, and logout, then deletes those identities and their profile data.
Never run this live test against production. No test signup emails are sent.

## Pending

- Confirm real signup email delivery and callback allowlists for each teammate.
- Connect demo matching and tracking to authenticated account data in a later
  increment; currently the account and demo are explicitly separate.
- Expand education/project summaries into normalized records when their editing
  contracts are agreed. Skills remain self-reported.
- Add password recovery and deployment configuration before a public release.
