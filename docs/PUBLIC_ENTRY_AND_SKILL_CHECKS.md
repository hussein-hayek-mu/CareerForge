# Public entry, workspace navigation and CV skill checks

Owner-directed UI/access change, 23 October 2026. Public homepage organization
was informed by the requested [MuGate reference](https://mugate.org/); CareerForge
keeps its own identity and original motion assets.

Guests see the homepage with sign-in/create-account actions. Profile, jobs,
applications, CV and skill checks require authentication, including direct URL
navigation. Login, registration and recovery pages remain accessible to allow
entry. Browser-local demonstration state grants no access. The former editable
guest workspace is no longer exposed; older demo-test evidence is historical.

Signed-in navigation now has a dedicated My CV entry under Documents and Skill
checks in the workspace. CV keeps the shared sidebar; print hides application
chrome. Future AI/academic features should receive distinct navigation entries
when functional, rather than empty links or implied working integrations.

## Assessment pilot

React and SQL each have a versioned five-question fundamentals check; pass mark
4/5. There is no time limit. Profile skills remain self-reported. Only a selected
skill with a passing current supported check enters the generated CV skills list.
Unsupported skills stay excluded rather than receiving a false verification badge.
Retaking unsuccessfully does not revoke an earlier pass of the same version.

This is evidence of correct quiz answers, not proof of identity, independent
performance, professional proficiency or mastery. The pilot bank is small and
its SQL is in the repository; it is not designed as an anti-cheating boundary.
Practical tasks, reviewed rubrics, broader skill coverage, expiry/revocation and
appeals remain future assessment work. Never relabel these results issuer-verified.

SQL migration `202610230001_skill_checks.sql` stores private attempts and private
grading banks. Authenticated users can read only their own attempts and cannot
insert/update results. Hardened RPC functions return questions without answer
keys, validate answers, grade and persist against auth.uid(). The grading function
serializes submissions per user and enforces one submission per minute in the
database, across app instances. No client-supplied score, pass or owner is trusted.
The API additionally enforces session, origin, bounded JSON and strict validation.
CV reads fail closed if results cannot be loaded; it never falls back to all skills.

The additive migration was applied to the existing development database only.
Review/apply it explicitly to any other target before enabling these pages.
Prisma reflects the public attempts table; private implementation banks remain
outside its public schema. No LLM, paid service, email or external assessment
provider is used.

## Verification scope

Unit tests cover CV inclusion, unsupported/stale/failed checks, result/owner
injection and answer-key exposure. `npm.cmd run test:skill-checks` verifies real
DB grading, pass/fail, owner RLS, result forgery denial, malformed answers,
hidden banks, anonymous denial and durable cooldown in a rolled-back transaction.
The live-account suite takes the React quiz in the UI and confirms that only
React appears in CV/PDF, API forgery/rapid retry are rejected, private navigation
works and profile/tracker/password flows still work. Temporary users are deleted.
Private dialog/focus/target checks moved into this authenticated suite when guest
access was removed. Public tests cover homepage actions, direct-route denial,
login/recovery, keyboard/reflow, contrast, missing pages and film preferences.

Recorded results: 53 local tests, lint, TypeScript and production build passed.
Real database skill checks and the final temporary-account suite passed; all
temporary records were rolled back/deleted. Homepage desktop/mobile and the CV
sidebar screenshots were reviewed. The first 28-case browser run passed 23 and
caught five obsolete test assumptions (redirected reflow contexts, old demo-text
sample minimum and a decorative CTA arrow in the accessible name). Corrected
public-surface tests and the decorative icon then passed all five affected
desktop/mobile cases. Private dialog focus/44px target checks passed in the live
authenticated suite. This is combined targeted evidence, not a claim that an
unchanged full suite passed in its first run. No real email, LLM or paid service
was used. Latest changes are not yet verified on hosted CI or a production site.
