# Private education and work history

This M1 increment adds owner-managed education and work-experience records to
My profile. It is a foundation for source-grounded documents, not independent
credential verification or full M1/M6 completion.

## Report traceability

The actual `helper/CareerForge_Software_Engineering_Report (7) (1).pdf` specifies:

- PDF page 7, section 5.1, FR-1.3: education add/edit/delete with institution,
  degree, dates and GPA. FR-1.5 requires work-experience and project management.
- PDF page 15, section 9.1: Education owns institution, degree, start/end dates
  and GPA; Experience owns company, role and start/end dates. Both have an owner
  FK to Supabase's `auth.users.id`.
- PDF page 16, section 9.4: deleting the account cascades to these owned rows.
- PDF page 26, section 13: `/api/v1/education` and `/api/v1/experience` are the
  named collection APIs. Editing is required by FR-1.3/1.5; the helper plan's
  task 1.6 specifies PUT for updates.
- PDF page 9, section 5.11: M1 requires cross-user RLS isolation and a complete
  profile/preferences journey. This increment covers education/experience only.
- PDF page 8, FR-6.4, and page 18, UC-5: generated portfolios must reuse saved
  profile facts. Private CV consumption is an initial downstream integration;
  broader public-snapshot support remains separate.

## Scope and ownership

`/account/history` is a private contextual destination under My profile.
Existing profile summaries remain editable at `/account`. They are never parsed
into records, silently overwritten, or upgraded to verified evidence.

The collection endpoints support GET and POST. Item endpoints
`/api/v1/education/[id]` and `/api/v1/experience/[id]` support PUT and DELETE.
Authentication derives the owner; client-supplied owner, evidence and metadata
fields are rejected. Mutations validate origin and bounded input. API errors use
the existing `{ error: { code, message } }` shape and private responses use
no-store. Another user's record is not exposed through an item operation.

Records carry IDs, revision tokens and creation/update timestamps. Updates and
deletes require the reviewed revision, so stale tabs cannot silently replace
newer work. POST uses an owner-scoped request ID to avoid duplicate records when
a create request is retried after an uncertain network result. The database
enforces ownership, constraints and account deletion; the authenticated
Supabase client preserves RLS in request paths.

## Explicit engineering decisions

The report does not define all field limits, date precision, current-state
semantics, a GPA scale, description text, revisions or idempotency. This increment
defines them as follows:

- At most 20 education and 50 experience records per owner.
- Dates are optional calendar-valid ISO `YYYY-MM-DD` values in 1900–2100.
  When both exist, the end cannot precede the start. Current status is an
  explicit boolean and requires an empty end date.
- GPA is either absent as a pair or supplied with its scale:
  `0 <= GPA <= scale <= 100`, with `scale > 0`. The saved and displayed values
  retain that scale; no universal 4-point scale or conversion is inferred.
- Work descriptions are optional, bounded to 2,000 characters and escaped when
  rendered. They are owner-entered source text, not generated achievements.
- Evidence status is server-owned `self_reported`. Student input cannot claim
  issuer confirmation, a verified degree or independently confirmed employment.

Other input fields are bounded and validated by the shared schemas and database
constraints. Dates, numbers and ownership are validated on the server; browser
validation alone is not authority.

## Saved-profile CV integration

`/cv/saved` reads the verified owner's current history alongside the existing
profile and assessment results. A failed or malformed history read makes the
preview unavailable; it does not substitute empty history or fictional data.

Saved education and experience render as explicitly self-reported sections.
Existing education and project summaries remain separate, named summaries.
Only selected skills with a current supported passing assessment enter the CV
skills list. Adding work or education does not alter assessment results.

The private preview uses deterministic English month labels and UTC date-only
handling. Missing dates remain unknown; an omitted end date never means Present.
Only an explicitly current record receives Present. GPA includes its entered
scale, and text is escaped. Print/PDF uses the same saved records and labels.

The owner's supplied CV/portfolio builder remains unchanged, with its existing
local draft and demo behavior. This increment does not add these records to a
public snapshot, publish applicant data, connect a paid AI provider, parse uploaded
CVs, or persist versioned baseline CVs.

## Verification and remaining work

Acceptance includes schema/handler tests, date/GPA formatting and safe-render
tests, two-user and anonymous database isolation, direct constraint checks,
revision conflicts, create retries, failed-write draft preservation, save/reload,
private CV source fidelity, responsive layouts and PDF output.

Release-preparation verification on 30 October 2026: local lint, Prisma generation,
TypeScript/build and all 97 unit tests passed. New handler tests cover anonymous/
foreign-origin denial, owner/evidence injection, malformed/oversized bodies,
revision contracts, retry responses, rate limits and sanitized failures.
The pending SQL passed owner CRUD, two-user/anonymous isolation, date/GPA constraints,
stale revisions, retry uniqueness, the education limit and account-deletion cascade
inside a development transaction that was fully rolled back. It is still pending
in the configured development database; no persistent migration was applied.
Actual editor submission/focus was previously checked with mocked API responses.
Hosted authenticated CRUD, physical-device checks and PDF output with live history
remain unverified. See `PREVIEW_RELEASE_2026_10_30.md` for the deployment handoff.
Projects, certifications,
skills/proficiency normalization, goals/preferences, issuer review, full CV
versioning and public portfolio history remain future work.
