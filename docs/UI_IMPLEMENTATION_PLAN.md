# Browsable web MVP

This focused UI increment follows the first-month, no-AI scope in
`helper/CareerForge_Chat_Summary.md`. The owner requested visible UI/UX before
the remaining full-product build-plan phases on 22 October 2026.

1. Build a shared responsive shell and dashboard.
2. Add demo profile editing, searchable example jobs, transparent skill matches,
   saved jobs, and manual application tracking.
3. Persist demo edits in this browser, with clear demo labels and reset support.
4. Test matching and malformed saved data; run lint, typecheck, tests, and build.
5. Commit the focused increment. Preserve unrelated existing changes.

Files: `src/components/career-workspace.tsx`, `src/lib/demo-workspace.ts` and its
tests, the four page entry points, global styles, and the npm test script.
No dependencies, paid APIs, AI calls, remote writes, migrations, or deployment.

Demo jobs are fictional. Scores are the percentage of listed required skills
present in the self-reported profile; they are not hiring predictions. Browser
storage is not an authenticated account or Supabase persistence. The next
backend increment needs login/session flows, owner-protected profile tables,
RLS checks, and API integration before this can hold real user accounts.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`: pass (six tests).
- `npm run build`: pass; all four UI pages are generated.
- Production HTTP checks: `/`, `/jobs`, `/profile`, `/applications` return 200
  and contain the expected page heading and demo label.
- Browser visual and interaction testing was unavailable in this session.

To view locally, run `npm run dev` and open `http://localhost:3000`.
Try editing profile skills, filtering jobs, opening role details, saving a role,
and changing its status in Applications. Refresh to check browser persistence.
