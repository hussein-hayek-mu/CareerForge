# CareerForge

CareerForge is a two-person university capstone project. The current foundation
is a Next.js web MVP without AI. Later increments will cover profiles, visual
career roadmaps, job listings, deterministic skill matching, saved jobs, and
application tracking.

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

Open <http://localhost:3000>. The starter page and
<http://localhost:3000/api/v1/health> work without Supabase credentials.

Available checks:

```bash
npm run lint
npm run typecheck
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

No Supabase project is connected by this scaffold. Authentication and database
operations should be added only after the team agrees on their contracts.

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

Do not run migrations, `prisma db push`, resets, or remote table creation as
part of this foundation. When the agreed application models are ready, store
generated Prisma migrations in `prisma/migrations` and commit them. Coordinate
with the team so each migration is reviewed and applied exactly once to the
shared development database. Prisma does not automatically apply Supabase
Auth RLS to direct database connections; server endpoints must enforce access
explicitly.

## Pending

- Copy real shared-development values into each teammate's `.env.local`.
- Agree on and add the application data model; no dummy Prisma model is
  included.
- Add authentication UI and authorization checks.
- Add the MVP pages and server contracts incrementally.
- Connect and migrate the shared Supabase database only after review.
