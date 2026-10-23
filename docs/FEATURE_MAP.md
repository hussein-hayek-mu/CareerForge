# CareerForge feature and page map

Updated 23 October 2026. This maps the actual software engineering report to
student-facing pages. A page's existence does **not** establish module completion.

## Report review and decisions

Reviewed the actual `helper/CareerForge_Software_Engineering_Report (7) (1).pdf`,
sections 3–5 (module scope, functional requirements, module acceptance criteria),
against the current routes and the previously reviewed architecture/security
sections. This is requirements traceability, not a claim of full report conformance.
The attached product design brief informs layout, hierarchy, spacing and states;
its generic logos, metrics, testimonials and trial claims are not product facts.

- M1–M7 and the Admin Dashboard are required by the report. M8/M9 are stretch.
- M5 has separate learning and project destinations. M6 has separate CV,
  analysis and portfolio destinations. M7 separates preparation, tracking and
  outcome insights. Buttons and internal pipeline services belong within those
  pages rather than multiplying top-level navigation entries.
- CV tailoring, cover letters, field mapping, eligibility, exclusions, limits,
  duplicate prevention and review/submission belong to the Application Agent.
  Version retrieval belongs to My CV; degree progress belongs to Academic Planner;
  skill gaps belong to Career Analysis. These are remaining requirements, not
  implemented by the planned pages.
- The owner's newer instruction requires approval of each specific application
  and its contents before submission; this overrides older global auto-submit text.
- Admin tools remain separate from student navigation. `/admin` is reserved in
  this plan, **not implemented**. Before exposing it, enforce verified server-side
  admin roles and database permissions; hiding links is not authorization.
- Mock ATS is a required controlled integration for the report's M7 demonstration;
  no real submission integration is claimed. Expo remains the report's mobile stack.

## Page ownership

Every route below has its own `src/app/<route>/page.tsx` entry (root uses
`src/app/page.tsx`). New planned pages reuse `FeatureWorkspace` for server-auth
and `PlannedFeaturePage` for consistent scope disclosure. Their content and status
live in `src/lib/features.ts`; replace the page's planned view with its real
implementation when its acceptance criteria pass. Navigation and the directory
read the same registry. Shared UI is not duplicated between modules.

| Feature | Page | Report / scope | Current implementation and remaining work |
| --- | --- | --- | --- |
| Overview | `/` | Shared workspace | Saved-account summary; guests receive public homepage. |
| Profile | `/account` (`/profile` alias) | M1 / FR-1.1–1.9 | Private summary editing works; normalized education, work/projects, proficiency, certifications, goals and application preferences remain. |
| Career analysis | `/career-analysis` | M2 / FR-2.1–2.4 | Planned: career taxonomy, deterministic ranking, target career, prioritized gaps, persistence and grounded explanation. |
| Skill checks | `/skill-checks` | Owner assessment extension | React/SQL basics pilot; broader assessment, bank governance and stronger evidence remain. Passing is not proof of mastery. |
| Academic planner | `/academic-planner` | M3 / FR-3.1–3.3 | Planned: courses, grades/semesters, credits and career-linked prioritization. |
| Find opportunities | `/jobs` | M4 / FR-4.1–4.5 | Fictional jobs and simple skill matching work; active/expiry rules, richer scoring, persisted reasoning and dataset demand remain. |
| Learning roadmap | `/learning-roadmap` | M5 / FR-5.1–5.2 | Planned: persisted gap-linked monthly plan, completion and adaptive ordering. |
| Project ideas | `/projects` | M5 / FR-5.3 | Planned: multi-gap project recommendations with rationale; personal project editing belongs in Profile. |
| My CV | `/cv` | M6 / FR-6.6 baseline slice | Saved-profile preview and browser PDF work; baseline/tailored version storage and exact application version retrieval remain. |
| CV analysis | `/cv-analysis` | M6 / FR-6.1–6.3 | Planned: private PDF/DOCX storage/parsing, deterministic job comparison, section feedback. |
| My portfolio | `/portfolio` | M6 / FR-6.4–6.5 | Planned: source-grounded templates, preview, explicit visibility and publication controls. |
| Application agent | `/application-agent` | M7 / FR-7.1–7.5, 7.9–7.10, 7.12–7.14 | Planned: policy/grounding gates, materials, form mapping, approval, idempotent permitted submission and Mock ATS. |
| Applications | `/applications` | M7 / FR-7.6–7.7 | Private manual tracker works; exact document/channel references, full status event history and integrations remain. |
| Application insights | `/application-insights` | M7 / FR-7.8, 7.11 | Planned: factual outcome rates, timestamps, explanations and recommendation feedback. |
| Graduation simulator | `/graduation-simulator` | M8 / FR-8.1 | Stretch: prerequisite graph and validated scenario propagation. |
| AI assistant | `/career-assistant` | M9 / FR-9.1 | Stretch: owner-scoped context, grounded conversations and service limits. |
| Admin dashboard | Reserved `/admin` | Admin / FR-A.1–A.5 | Not implemented: role-restricted job CRUD, skill/career/course taxonomy, source tiers, real platform statistics and audited actions. |
| Feature directory | `/features` | Navigation, owner design request | Available: grouped tools, truthful status and direct destinations. |

## Design and acceptance boundary

The workspace uses graphite surfaces, a single chartreuse accent, consistent line
icons, readable type, bordered cards, a grouped sidebar and focused page headers.
Logo/account controls stay fixed while navigation scrolls without a visible
scrollbar. Collapsed links retain accessible names; mobile uses the existing
keyboard-accessible native dialog. Planned sidebar links disable speculative
prefetch, avoiding unnecessary auth/profile requests for unused modules.

Acceptance for this increment: all student features have stable destinations;
working routes remain usable; planned/stretch pages disclose their scope and
offer a real next action; guests cannot access them; private responses are
no-store/noindex; active navigation, collapse persistence, last-item mobile
navigation and narrow reflow work. No AI generation, uploads, publishing or
application submission is implemented by a visual scope page.

Light theme, full module interfaces, comprehensive screen-reader/contrast checks
and physical-device review remain separate work. Continue the existing roadmap's
core implementation sequence; do not count these design destinations as feature
completion or restart previously completed audits without a concrete reason.

## Verification evidence for this increment

- Lint, TypeScript, all 53 local tests and the production build passed.
- Four targeted desktop/mobile guest/navigation cases passed, including direct
  entry to every registered private feature with misleading local demo data.
- The development temporary-account suite passed existing profile, matching,
  skill-check/CV, tracker isolation, password and logout checks plus all ten new
  planned destinations. Verified active links, no-store/noindex, collapsed-state
  persistence, mobile last-item navigation, Escape/focus return and narrow reflow.
  Identities were removed afterward; no mail was sent.
- Reviewed directory and mobile scope-page screenshots. Fixed a mobile step-number
  wrap and verified the marker at 320px in a focused browser check. The new marker
  assertion is retained in the live verifier for subsequent runs.
- Initial sandboxed `npm test` could not read Windows user information; the same
  suite passed outside that restriction. This was an environment failure.
- No deployment, production migrations, AI calls or latest remote CI result.
