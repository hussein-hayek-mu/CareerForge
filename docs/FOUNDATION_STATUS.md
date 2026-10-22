# Foundation verification

The current deliverable is the npm-based Next.js web MVP described in the
README and helper chat summary. Retain that structure for now; the full-product
pnpm monorepo in `helper/BUILD_PLAN.md` is a later architecture decision.
The project owner authorized this choice on 22 October 2026.

This increment adapts build-plan task 0.3 (CI) to the existing npm project.
It adds the missing test command using Node's test runner and the installed
`tsx` package, without adding dependencies.

Run these checks before committing:

```sh
npm run prisma:generate
npm run lint
npm run typecheck
npm test
npm run build
```

Prisma generation needs `DIRECT_URL` to parse its configuration but does not
connect to a database. CI supplies a local placeholder, requires no secrets,
and does not run migrations or contact the shared Supabase database.

Tests cover the public health response and the middleware's offline behavior
when Supabase configuration is absent or incomplete. They do not establish
that database connectivity or authenticated sessions work. Authentication,
authorization, profile models, and business functionality remain pending.

The scaffold permits requests without Supabase configuration. Protected routes
must explicitly enforce authentication when those routes are implemented.
