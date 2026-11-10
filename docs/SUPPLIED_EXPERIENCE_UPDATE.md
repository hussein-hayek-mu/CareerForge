# Supplied experience update

## Navbar visibility correction — 30 October 2026

The navbar was only mounted for guests: the root route previously switched to
the private overview whenever an authenticated account was found. This made the
reference landing/nav disappear for signed-in visitors.

`/` now always renders the supplied public homepage. The existing private overview
is at `/dashboard`; sidebar/palette Overview entries, retry links and authenticated
test destinations follow that route. The island's Sign in links and hero workspace
action target the guarded dashboard, allowing valid existing sessions to open their
workspace directly while guests are redirected to login. Workspace branding links
back to `/`, making the supplied homepage reachable without signing out.

The public root bypasses Auth refresh/profile reads and is statically rendered.
Private pages retain their existing authorization; `/dashboard` is no-store and
noindex. New regression coverage keeps the floating navbar visible with an `sb-*`
fixture cookie in the offline browser suite, checks its position after scrolling,
and asserts the root proxy never contacts Auth or changes session cookies.

Verified: production build/TypeScript, targeted ESLint, 85 unit tests and 22 selected
desktop/mobile browser cases. Guest denial covers `/dashboard` through the feature
registry. These cookie fixtures demonstrate landing independence from session state;
they do not constitute a new live-account authentication or database test. No deployment.

## Performance and reference fidelity — owner follow-up, 30 October 2026

The supplied components remain the replacement. The owner's top/scrolled island
screenshots guide the layout, typography, lime/mint/lilac palette and card grid;
there is no substitute homepage or new design system. The brand mark and favicon
now use the reference's F/ monogram. The final card surfaces are slightly more
opaque so animation does not interfere with their text.

Performance fixes preserve the supplied renderer and interactions:

- Seed complete particle trails directly instead of running 240 synchronous
  simulation steps during hydration or paused resizing.
- Limit decorative rendering to about 30fps and a bounded pixel budget, adapting
  density/resolution to measured work and using a smaller initial mobile scene.
- Cache scroll position in a passive listener and document height on resize;
  the drawing loop no longer asks the browser for layout measurements.
- Keep the island glass effect; remove redundant blur on mostly opaque cards,
  marquee and CTA surfaces. Use static headline/CTA highlights instead of
  continuous background-position, conic-gradient and shadow repainting.
- Batch spotlight/island pointer work once per frame, measure before writing
  styles, update only the hovered card and remove magnetic CTA feedback.
- Freeze ambient canvas/CSS while a native dialog is open, lock the underlying
  page's scroll position and focus the mobile menu's Close button.

Verification: the final production build (including TypeScript) and targeted
ESLint checks passed. All 20 selected desktop/mobile browser cases passed,
including new menu scroll-position/motion and high-DPI pixel-budget checks.
Desktop top/scrolled and mobile homepage/menu captures were visually compared
with the references; spotlight coordinates and runtime errors were checked.
The final opacity-only card adjustment also passed a production rebuild.

`node scripts/audit-experience.mjs <output-path>` repeats a five-second scripted
scroll/pointer scenario at 1440x900 DPR1, 1440x900 DPR2 with 4x CPU slowdown,
and 390x844 DPR3 with 4x slowdown in local headless Edge. Samples and caveats are
recorded below. These are lab observations, not a promise about every device,
field INP or a full accessibility audit. Intermediate samples varied substantially;
an isolated CPU profile identified repeated scroll reads/style flushing as a
hotspot. No paid service, database change, external publication or deployment.

Final five-second samples (Edge 156.0.4314.50; intermediate runs varied):

| Scenario | Before / final p95 UI frame interval | Before / final canvas pixels | Before / final blocking time |
| --- | --- | --- | --- |
| Desktop, DPR1 | 83 / 7 ms | 1,296,000 / 1,296,000 | 0 / 0 ms |
| Desktop, DPR2, 4x CPU | 234 / 21 ms | 5,184,000 / 1,299,242 | 527 / 0 ms |
| Mobile, DPR3, 4x CPU | 100 / 14 ms | 1,316,640 / 455,328 | 394 / 0 ms |

Final background cadence measured about 30fps in each scenario. Main-thread task
duration did not fall uniformly across scenarios; the bounded decoration and
shorter observed frame intervals are narrower evidence than a universal speedup.
Raw samples are stored in ignored `test-results/experience-performance-*.json`.

## Initial integration

30 October 2026. Applied all eight owner-provided files from Downloads to the
existing Next.js application. This is a local source update; no deployment,
external publication, database migration or new dependency was performed.

## Integration

- `experience.css` is the final global experience layer in `src/app`.
- `layout.tsx` mounts the shared ambient background and adds the supplied metadata.
- `app-shell.tsx` and `app-icons.tsx` provide the supplied workspace navigation,
  sidebar controls and expanded icon set.
- `command-palette.tsx` provides searchable destinations/actions with keyboard
  selection, empty results and native dialog focus management.
- `landing-nav.tsx`, `public-home.tsx` and `ambient-background.tsx` provide the
  supplied public homepage, responsive island menu and canvas background.

Adjusted the background import to the component directory and added the missing
`Spotlight` component used by the supplied homepage. Preserved document workspace
classes, contextual document navigation, root hydration tolerance and existing
local profile-history styles/navigation. A pre-existing GPA formatter call in the
unfinished profile-history editor was corrected to pass its record argument.

Palette destinations render real anchors and keyboard selection activates those
anchors, allowing the existing unsaved-profile guard to cancel navigation before
the router runs. Re-exported icons keep existing component imports compatible.
Authentication and feature-status enforcement remain in the existing server routes.

## Acceptance and verification

- Production build and TypeScript compilation passed.
- All 84 existing unit tests passed; targeted ESLint checks passed for the updated
  components, browser tests and CI configuration.
- All 16 selected desktop/mobile browser cases passed across the initial run and
  the targeted mobile navigation rerun. Coverage includes public entry, private
  route denial, keyboard/skip focus, responsive menus, narrow reflow, background
  pause/resume persistence, live reduced-motion changes and unavailable canvas.
  The new mobile test now waits for the expected responsive control after
  navigation and uses the supplied menu's numbered accessible link names.
- The development hydration regression script passed: extension attributes on
  html/body are tolerated, application-descendant diagnostics remain enabled,
  and mocked login submissions confirm the form hydrates.
- An isolated browser harness using the actual shell, palette and unsaved-profile
  guard passed keyboard/mouse cancellation, accepted navigation, focus restoration,
  nested active routes, document content classes, sidebar preferences/actions and
  mobile drawer/reflow at 320/390/768/1440px. Only Next navigation/Link were mocked;
  this is frontend evidence, not authenticated backend verification.
- Desktop/mobile homepage screenshots and isolated shell screenshots were reviewed;
  the desktop spotlight coordinates updated correctly on pointer movement.

Replaced obsolete homepage-video tests with ambient-background tests and included
those plus the existing public accessibility suite in the offline CI configuration.
No new live-account, database, physical-device, full screen-reader or complex-surface
contrast audit is claimed.
