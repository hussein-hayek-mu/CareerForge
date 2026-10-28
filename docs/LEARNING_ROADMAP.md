# Gap-based learning pilot

Implemented 28 October 2026 at `/learning-roadmap`. This is an M5/R3 slice;
career taxonomy, persisted progress and adaptive monthly scheduling remain planned.

## Behavior

The server verifies the session and reads the owner's profile and active catalog
through the authenticated Supabase client and existing RLS. Guests redirect to
login. Failed reads show retry, never sample data or an invented successful plan.
The private page uses the existing no-store/noindex policy.

The user explicitly selects a fictional catalog role. A GET form stores only
its ID in the URL; profile data stays out of the URL. Reload preserves the target
and uses the latest saved profile. Unknown, repeated and oversized parameters
cannot select arbitrary data or trigger external fetches. No career is inferred.

`buildLearningRoadmap` reuses skill normalization/matching. Each missing
requirement gets an original exercise: topics, practical task, review criterion
and explanation. Steps follow requirement order, without invented priority,
demand or time estimates. Self-reported coverage is distinguished from assessed
proficiency. Learning does not modify assessments or CV eligibility.

## Source links

Original roadmap.sh links were checked on 28 October 2026. Content and progress
are not imported, no affiliation is claimed, and no profile data is sent.
New-tab links have accessible labels and `noopener noreferrer`.

- [Frontend](https://roadmap.sh/frontend)
- [JavaScript](https://roadmap.sh/javascript)
- [TypeScript](https://roadmap.sh/typescript)
- [React](https://roadmap.sh/react)
- [SQL](https://roadmap.sh/sql)
- [Node.js](https://roadmap.sh/nodejs)
- [Python](https://roadmap.sh/python)
- [Git and GitHub](https://roadmap.sh/git-github)
- [Docker](https://roadmap.sh/docker)
- [Data analyst](https://roadmap.sh/data-analyst)

Figma has an original exercise without a reviewed external link. Unknown skills
get an original fallback exercise, never a fabricated URL. Link availability can
change. The exercise text is CareerForge material, not copied roadmap content.

## Verification and next work

Unit/render coverage includes aliases, duplicates, requirement order, exact gaps,
all seeded skills, unknown skills, missing/invalid targets, empty/covered plans,
safe external links and evidence disclosures. The live development verifier
checks exact owner-profile gaps, no-store/noindex, target selection/reload,
unknown/repeated targets and 320/768/1440px reflow. Execution results are recorded
in the implementation roadmap.

No AI, migration, completion checkboxes or new tables are introduced. Next:
define target/step versions and completion semantics, then add owner-only
storage/API/RLS before enabling cross-device progress and adaptive scheduling.
