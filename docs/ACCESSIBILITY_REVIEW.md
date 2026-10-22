# Accessibility and interaction review

P3.1 first pass, 22 October 2026. This records specific fixes and verification;
it is not a WCAG compliance certification or a completed assistive-tech audit.

## Findings addressed

| Finding | Change |
| --- | --- |
| Form rules removed the global keyboard outline. | Preserve the visible outline while retaining field border/focus styling. |
| Tracker removal measured 36px wide in the browser. | Give tracker remove, bookmark and notification-dismiss buttons at least 44px targets. Expand compact role/text/reset actions on coarse pointers. |
| The skip destination could not reliably receive explicit focus. | Make the main content programmatically focusable without adding it to the normal Tab sequence. |
| Role content was inserted after showModal, missing its initial focus target. | Open the dialog after its title/content render, then focus the close control. |
| Removing a tracked role deleted the dialog's original focus-return button. | On close/Escape restore focus to a connected trigger, otherwise to main content. |
| Search/filter result totals were not a live update. | Announce the count politely without shifting focus or adding competing success-status elements. |

## Reproducible browser coverage

`tests/e2e/accessibility.spec.ts` exercises skip-link activation, keyboard field
focus outline, 44px tracker removal, dialog opening/closing/reopening, focus
after deleting its trigger, and horizontal reflow at 320/360/640 CSS pixels.
The layout matrix visits overview, demo profile, jobs, applications, login,
register, forgot-password, confirmation resend and anonymous reset-password.
It runs under desktop and phone browser profiles with no real email requests.

The keyboard test establishes its starting focus deliberately so it does not
race browser chrome or Next's initial route focus management. A half-width
desktop CSS viewport is a reflow proxy, not an actual browser-zoom measurement.
Existing navigation tests separately cover sidebar persistence, short windows,
mobile drawer focus, Escape and responsive navigation.

## Remaining audit work

- Long tracker content and additional private states at narrow widths/zoom.
- Real 200% browser zoom and text scaling, rather than only CSS viewport proxies.
- Complex-background text, non-text contrast and error/focus/state contrast review.
- Screen-reader review with NVDA or VoiceOver, including dynamic announcements,
  field errors, dialog descriptions and route transitions.
- Physical-phone testing and a complete touch-target inventory, including tablet
  navigation and all authentication/profile states.
- Recheck reduced motion and video controls as part of the final release audit;
  their earlier browser coverage is historical, not rerun by this first pass.

Keep P3.1 partial until the remaining checks are recorded. Public/inbox account
recovery, hosted performance and production readiness remain separate tasks.

## Second pass: contrast and long private profiles

On 22 October 2026, a live temporary-account fixture with maximum-length profile
fields and 40 long skills reproduced horizontal overflow at 320 CSS pixels.
Skill tags and identity metadata now wrap within their available width. The
live account suite verifies page width and unclipped identity/skill text at
320, 768 and 1440 pixels, restores the fixture profile, and deletes its temporary
accounts. This does not substitute for actual browser zoom or physical devices.

Run `npm.cmd run audit:contrast` against the running development server for a
JSON report in ignored `test-results/contrast-audit.json`. The recorded run
sampled 151 text/control/placeholder instances across nine public routes with
zero failures. The sampler uses the normal/large text thresholds described by
[W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).
Gradients, images/video, opacity and unsupported color formats are skipped;
pseudo-element decoration and non-text contrast require separate review.
Consequently this is a conservative sample, not a full contrast inventory.

Four desktop/mobile cases in `tests/e2e/contrast.spec.ts` passed. They verify
known passing/failing text and placeholders, uncertain-background exclusions,
and sampled public-route contrast. Lint, TypeScript, 27 local tests and the
production build passed. The live account suite also passed profile stress,
tracker persistence/isolation/error recovery, password update and logout checks.
No recovery email was sent; real inbox recovery remains unverified.
