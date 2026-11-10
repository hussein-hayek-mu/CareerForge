# Offline browser verification

P4.2 adds `npm run test:e2e:ci` using `playwright.ci.config.ts`. It selects the
existing workspace, navigation and missing-page tests, for six desktop/mobile
cases. Following the owner's homepage-only guest requirement, they now cover
public navigation, responsive entry, direct private-route denial despite stored
demo data, sign-in/registration links and missing-page recovery. Private profile,
matching and tracker operations are covered by the authenticated live suite.
They do not verify live accounts, email, RLS or database migrations.

The configuration starts a production server at `127.0.0.1:3200`, refuses to
reuse an existing server and clears public Supabase configuration for that child.
The CI job also clears those values before build. It uses the existing dummy
Prisma configuration only for generation; no database service or secrets are
required. Tests run with reduced motion, one worker and no retries. Existing
development browser configuration and the owner's server remain separate.

The GitHub workflow installs Chromium with its Linux dependencies, then runs
the smoke command after lint, types, local tests and production build. Failure
reports/traces/screenshots are retained for seven days. These scenarios contain
only fictional guest data; never add authenticated live tests to this artifact
job. See [Playwright CI guidance](https://playwright.dev/docs/ci).

To reproduce from a fresh checkout: install dependencies, generate Prisma,
build with public Supabase values unset/empty, install the platform's Playwright
browser and run `npm run test:e2e:ci`. On Windows the shared configuration uses
installed Edge; Linux CI uses Playwright Chromium. A local Windows pass is not
proof of a GitHub Linux pass. Keep port 3200 free. Existing test-results and
playwright-report output directories are ignored and should not be shared by
simultaneous test-runner invocations.

Remote acceptance remains: push the verified commit, inspect that exact workflow
run, and record its result. No remote run or hosted readiness is claimed by
adding this configuration.

Local evidence, 22 October 2026: all six Windows Edge desktop/mobile cases passed
against the preceding verified production build. ESLint, TypeScript and Git
whitespace checks passed. Workflow YAML was reviewed as text; no installed YAML
parser was available. No app source changed, so local unit tests/build were not
repeated solely for the configuration; the workflow will run both on its exact
commit. No live accounts, email requests, dependencies or database writes were
introduced.

The first GitHub run for `e9594b9` passed install/generation/lint/types/unit/build
but failed the two navigation cases: the truly unconfigured build correctly
displayed `/account` unavailable rather than redirecting to login. The earlier
local build contained configured public values and did not reproduce that state.
The subsequent fix explicitly asserted that offline state and its sign-in link.
The owner's later homepage-only guest requirement supersedes that contract:
cookie-free account navigation now redirects directly to sign-in even offline.
The old offlineAuth metadata flag is removed. Verify with a freshly built
unconfigured production app, not only child-server environment overrides.

Correction verification: rebuilt with both public Supabase variables explicitly
empty in the build process; all six desktop/mobile smoke cases then passed.
Lint, TypeScript and production build also passed. No app behavior was changed
or assertion removed: the offline account state and sign-in recovery are now
tested explicitly. GitHub run
[39800105467](https://github.com/hussein-hayek-mu/CareerForge/actions/runs/39800105467)
completed successfully for exact pushed commit
`2fabbd52b0dcfc359779fa6adffe383a3d463d39`. This closes the failed offline
navigation regression and establishes a Linux CI baseline, not hosted readiness.
