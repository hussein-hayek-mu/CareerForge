# Portfolio delivery contract

Implemented 28 October 2026; verification recorded below. Actual report reviewed: section 5.6 FR-6.4/FR-6.5,
section 5.11 M6 acceptance, section 9 Portfolio entity, UC-5 and GET/PUT
`/api/v1/portfolio`. These require composition from existing profile facts,
templates and visibility controls. The full M6 also requires CV parsing,
analysis and versioning; this increment cannot establish full M6 completion.

## Acceptance and data boundary

- An authenticated owner can preview two templates, select About, Education,
  Featured project and Skills, and save those choices across devices.
- Content comes from saved profile facts; unsupported experience/certification/
  contact records are omitted. No AI or fabricated biography is introduced.
- Skills come only from selected React/SQL skills with a current supported
  passing basics result. Present them as limited assessment evidence, not mastery.
- New portfolios are private. Publish requires a specific action after preview;
  a source token prevents publishing changed profile facts without review.
- Published content is a selected-field snapshot. Profile/draft edits do not
  silently change it; an explicit publish update replaces it. Unpublish clears
  public access immediately on subsequent uncached reads.
- Private records use owner RLS. Server RPCs derive owner and generate content;
  direct student writes cannot forge facts or publish arbitrary JSON. Revision
  checks prevent stale updates. Public reads expose only the approved snapshot
  via an unlisted UUID path, never private settings, user ID, email or hidden fields.
- `/p/[slug]` returns the same 404 for unknown/private/malformed links; no directory
  or indexing. Public links can be shared by anyone who knows the URL while public.
- UI includes empty, pending, failure, unsaved and conflict states, keyboard labels
  and 320px reflow. Actual external publication is controlled by the owner in-app;
  this development session will publish only temporary fictional test accounts.

## Schema/API

`portfolios`: unique owner, template, section choices, revision, unlisted UUID,
visibility, approved snapshot and timestamps. RLS permits owner SELECT only;
reviewed RPCs perform writes and public snapshot retrieval with fixed search paths.
`GET /api/v1/portfolio` returns owner settings and current profile-derived source.
`PUT` accepts action save/publish/unpublish, settings, expected revision and
reviewed source token. No owner IDs or user-authored applicant facts are accepted.

## Verification plan

Unit checks for validation, grounding and API authorization/error paths;
rolled-back DB checks for owner/anonymous isolation, direct-write denial,
source/revision conflicts, private defaults, snapshots and unpublication;
temporary-account browser checks for templates, save/reload, publishing/revocation,
selected-field privacy and narrow layouts. Record outcomes before completion.

## Decisions and verified evidence

The report's `published_url` is derived from the unlisted UUID and current app
origin, avoiding a stored development hostname. Public content is a snapshot,
so explicit source review remains valid when profiles change. Source tokens are
owner-only change detectors; public reads never expose them. Education/project
statements remain self-reported; no credential verification is implied.

The portfolio migration and complete DB verifier passed together inside a
rolled-back development transaction before application. The checksum runner then
applied `202610280002_portfolios.sql`; Prisma generation and the applied-schema
verifier passed. All 76 unit/render tests passed, including source whitelist,
escaping, input injection, ownership/limits, conflict handling and public guard.
Lint, TypeScript and production builds passed; final evidence is in the roadmap.

Focused development browser checks passed template persistence, consent-gated
publication, selected-field/assessed-skill privacy, no-store/noindex, changed
source and stale revision rejection, retained choices on failed saves, narrow
320/768/1440 layouts and actual public 404 after revocation. Temporary fictional
test publications were revoked and identities removed. Public/mobile screenshots
were reviewed. No real person's portfolio was published by this session.

The first browser run exposed an existing configuration defect: root `proxy.ts`
was ignored because routes live under `src/app`. Moving it to `src/proxy.ts`
activates the intended session refresh/no-store policy, confirmed by build output.
The public guard also runs before the global streaming loading boundary so
private/unknown/malformed links return the same actual 404; otherwise Next can
render not-found UI with status 200 after streaming begins. The guard and page
each perform an uncached, bounded public RPC read; this additional lookup favors
revocation correctness in this pilot. Hosted latency has not been measured.

Public RPCs have ten-second timeouts and a safe unavailable/retry UI. Existing
users must restart an older dev server if framework file-discovery changes do
not reload; the current server picked up the corrected location automatically.
No AI, production migration, deployment or report-wide completion is claimed.

The final full account suite and four desktop/mobile public-entry/guest-guard
cases passed with the corrected proxy active. This source increment is local;
push, remote CI and hosting remain separate verification steps. Existing local
development configuration and the owner's IDE settings were preserved.
