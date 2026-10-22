# Jobs and manual tracker contract

P1.1 decision record. Scope: seeded fictional jobs and owner-only manual
tracking. No AI, employer contact, automatic submission or paid integration.

## Storage and ownership

`job_postings` uses text IDs `1` through `6` for the existing fictional roles.
Never recycle an ID for a different role. Mirror the current Job fields with
snake_case columns: id, title, company, initials, location, work_mode,
employment_type, skills (text array), description, color. Add is_active and
is_fictional (true for every MVP seed), plus created_at/updated_at timestamps.
Bound text/array lengths and validate mode/type/color values. Seed the exact
existing catalog once in a versioned migration; later changes use new migrations.
No profile or user data is seeded. Migration reruns skip recorded checksums.

Authenticated users can read active jobs and inactive jobs they already track.
No authenticated client, including a client that supplies an admin flag, can
write the catalog. Catalog administration is deferred; privileged reviewed
migrations maintain it for this release. Guests keep the existing static catalog.

`saved_jobs` stores user_id (UUID FK auth.users, cascade on user deletion),
job_id (text FK job_postings, restrict job deletion), status, revision (UUID),
created_at and updated_at. Composite primary key: (user_id, job_id).
The database generates timestamps/revisions and refreshes revision on updates.
Grant clients insert only on user_id/job_id, update only on status, and owner
select/delete. RLS enforces auth.uid() = user_id for every operation.
Thus a direct authenticated Data API call cannot change owner, job reference,
timestamps or revision. APIs still derive the owner from verified authentication.

Default status: Saved. Allowed statuses: Saved, Applied, Interview, Offer,
Rejected. Every status can be changed to any of these values: this is a manual
record, and users can correct a mistake. Applied never proves submission.
Removal deletes the tracking row; it does not withdraw an employer application.
New saves require an active job (database-enforced). Existing inactive entries
remain readable/editable/removable; an inactive role is never presented as active.

## API contract for P1.3

All account endpoints verify authentication; mutations verify same origin.
Responses use Cache-Control: no-store and existing safe error envelopes
`{ error: { code, message } }`. Do not expose SQL/provider errors.
Strictly validate path/query/body fields; reject owner/role/catalog injection.

| Endpoint | Input | Result |
| --- | --- | --- |
| GET /api/v1/jobs | Optional bounded search/mode filters | `{ jobs: Job[] }`, active catalog only; client uses the current profile for transparent deterministic ranking. |
| GET /api/v1/applications | No owner parameter | `{ applications: TrackerEntry[] }` including joined inactive job details for existing entries. |
| POST /api/v1/applications | `{ jobId }` only | Create Saved once (201), or return unchanged existing entry (200). Never reset Applied/Interview/etc. |
| PATCH /api/v1/applications/[jobId] | `{ status, revision }` | Atomic owner+job+revision conditional update; return updated entry/new revision (200). |
| DELETE /api/v1/applications/[jobId] | `{ revision }` | Atomic conditional delete (204); missing owner entry is already removed (204); changed/recreated entry returns conflict (409). |

TrackerEntry: `{ jobId, status, revision, createdAt, updatedAt, job: Job }`.
Catalog Job adds `isActive` and `isFictional` to current UI fields. Do not send
user_id to clients unless a feature requires it. Unknown job identifiers return
404, malformed payloads 400, anonymous requests 401, inactive new saves 409,
stale revisions 409 and unavailable storage 503. A missing PATCH target is 404.
Cross-user guesses behave like missing owner entries, never reveal another row.

Create with insert-on-conflict-do-nothing, then read the owner's row; never
upsert status. If a concurrent removal leaves no row, return 409 and refresh.
Database constraints/active-job guard remain authoritative if catalog state
changes between API validation and insert.

Updates use compare-and-swap in the SQL update condition, not a separate
read-then-unconditional-write. UUID revisions change even for same-status edits.
Concurrent requests with one old revision can change the entry only once;
other requests refresh and present a conflict rather than silently overwrite.
Delete/re-save generates a new revision, so delayed edits cannot change a
recreated entry. On a lost response, refetch before retrying; do not blindly
retry state-changing requests. No agent lifecycle/event history is implied.

## UI and migration behavior

Signed-in overview/jobs/tracker load the authenticated catalog/tracker. An
unavailable service shows a useful retry state, never browser/demo substitution.
Reuse current saved-only filtering, counts, detail dialog and manual status UI.
Disable pending controls per job; show success only after server confirmation.
On failure retain the last confirmed state, explain the error and allow retry.
On conflict refetch, show current status, then let the user choose again.
Revalidate after mutations and when returning to the page so another device's
changes appear. No realtime subscription is required for the MVP.

Guest profile/tracker remain local and independent. Existing per-account local
keys are left intact but are not automatically copied to Supabase. On first
server-backed use, explain that the online tracker starts empty and old local
entries were not imported. An explicit import can be a later task; it must
validate active IDs and preserve existing server statuses. Do not remove old
local keys until an explicit user decision. Store no private profile locally.

## Verification required by P1.2 / P1.3

- Migration/seed rerun preserves catalog IDs and all user data; row constraints
  reject unknown jobs, invalid statuses and duplicate owner/job pairs.
- Two users can independently save the same role; neither can select, insert,
  edit or remove the other's entries. Anonymous catalog/tracker writes/reads
  are denied. Client catalog writes and protected-column changes are denied.
- Direct insert defaults to Saved; inactive new save is rejected; an owner's
  inactive history remains accessible; another user cannot discover that role.
- Revision changes, stale writes/deletes affect zero rows, delete/re-save
  rejects old revisions; user deletion cascades and catalog deletion is restricted.
- API validation, safe failure responses, duplicate save without status reset,
  forged owners, expired sessions and two-device conflicts are exercised.
- UI save/reload/status/remove works across two sessions for the same account;
  a different account and guest remain isolated. Failure/pending/filter/count
  behavior works on desktop and phone. Tests leave no retained identities.

P1.1 is a contract, not implemented persistence. P1.2 implements the schema/RLS;
P1.3 implements endpoints and UI. Future application-agent tables must migrate
this state deliberately rather than silently reinterpret manual statuses.
