# Navigation and readability refresh

Direction: GitHub/Primer navigation structure, restrained Apple-inspired spacing,
and flow-level references from Mobbin. Keep CareerForge's olive identity.
This is an interface-only increment in the existing local Next.js application.

- One shared shell for the demo pages and private account editor.
- Desktop: grouped navigation, current-page indicator, collapsible icon rail,
  remembered sidebar preference, account access at the bottom.
- Mobile: compact header and native modal navigation drawer with focus handling,
  Escape/backdrop dismissal, and navigation closing after selection.
- Consistent SVG navigation icons, readable type sizes, stronger secondary text,
  comfortable form inputs/touch targets, reduced decorative dashboard area.
- Keep demo/account boundaries visible. No changes to authentication, database
  policies, or profile/job persistence contracts.

Verify existing flows, navigation/collapse/drawer keyboard behavior, overflow at
desktop and phone widths, lint, types, tests, and production build. Reuse the
existing browser tools and dependencies. Commit the verified change.

Verification: 15 local tests and eight desktop/mobile browser tests passed.
Browser coverage includes collapse persistence, current-page state, native drawer
focus/keyboard dismissal, account navigation, demo save/reload/matching/tracking,
and overflow checks from 360px to 1440px. The real two-account browser test also
passed profile save/reload, isolation, mobile account navigation, failed-save
recovery, and logout. Temporary test identities were removed. Desktop and mobile
screenshots were inspected. No dependencies, paid services, or schema changes.
