# Timed assessment lifecycle contract

R1 lifecycle slice delivered 28 October 2026. This extends the limited React/SQL fundamentals
pilot; it does not establish mastery, identity, issuer verification or fraud.

## Acceptance criteria

- The server creates an owner-scoped attempt before showing questions. Allowed
  timing modes are standard (10 minutes) and extended (100 minutes, ten times
  the default). Choose before starting; both use the same limited rubric.
- Refresh/repeated start resumes the same active attempt and deadline, without
  creating an extra attempt or restarting time. One active attempt per owner.
- The database clock determines expiry after acquiring locks. Browser clocks
  and countdowns have no authority over grading. Never auto-submit incomplete
  answers. Announce expiry without announcing every second.
- Submit accepts only a session ID and answers; owner, skill, version and timing
  are derived on the server. Expired/cancelled sessions cannot create results.
  Successful retries return the original result without duplicate grading.
- Students can read only their own metadata/results and cannot directly write
  sessions or grades. Revoke the old untimed grading RPC to close bypasses.
- Starting/cancelling are limited; cancellation creates no failing grade. Old
  passing result history is preserved. A later failed/expired retake does not
  erase an earlier supported pass under the existing CV policy.
- Answers remain in page memory and are lost on reload. Warn before leaving an
  answered form. The deadline continues while away. Resume makes this explicit.
- Back to checks discards local answers after confirmation but preserves the
  server attempt and timer. End attempt terminates it without a new grade. The
  list continues tracking expiry and unlocks timing/skill choice for a new attempt.
- Question versions must match the server bank at grading; a changed version
  ends the old attempt without a fabricated failure. Answer keys remain private.

## Interface contract

`POST /api/v1/skill-checks/sessions`: start `{action:"start",skill,version:1,
timingMode:"standard"|"extended"}` or cancel `{action:"cancel",sessionId}`.
Start returns safe metadata with server time; cancel returns confirmation.
`POST /api/v1/skill-checks`: `{sessionId,answers}` returns a validated grade,
or an explicit expired/unavailable/changed/limited response. All mutations use
verified authentication, same-origin checks, bounded JSON and no-store responses.

Database RPCs: `current_skill_check_session`, `start_skill_check`,
`cancel_skill_check`, `submit_timed_skill_check`. All mutations derive auth.uid;
the new session table grants authenticated owner SELECT only. Session result FK
links to the existing immutable grade table. SQL and Prisma stay in sync.

## Verification evidence

All 67 unit/render tests, lint, TypeScript and production build passed. The
additive development migration was first exercised with the rewritten verifier
inside a rolled-back transaction, then applied through the checksum runner;
Prisma generation and the applied-schema verifier passed. Checks include owner
and anonymous denial, direct writes/legacy bypass, immutable deadlines/modes,
resume/conflict, expired/cancelled no-grade states, bank changes, cooldown,
malformed answers and duplicate submissions without extra result rows.

The full development-account suite passed real timed start/resume/reload,
idempotent retry with changed answers returning the original grade, CV/PDF,
profile/tracker/learning/navigation/isolation/password/logout regressions. A
focused rerun also passed a clearly mocked UI clock fixture for expiry while
on the check list, extended-time selection and ending the fixture attempt.
That fixture does not create grades or replace the real database expiry checks.
All temporary identities were deleted; DB policy tests rolled back. No mail,
AI calls, production migration, deployment or remote CI verification occurred.

Initial browser starts hit a stale development-module export (the new schema
was undefined in the long-running server). Unit/build and direct Data API checks
isolated it; restarting the owned dev server resolved it. Temporary diagnostics
were removed. Timing metadata and question banks remain limited evidence;
practical checks, question governance and claim-specific credential review remain.

For a faster targeted regression run, use
`npm run test:account:live -- --assessment-only` against development only.
