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

- Private account and tracker states with long content at narrow widths/zoom.
- Real 200% browser zoom and text scaling, rather than only CSS viewport proxies.
- Full text/non-text contrast inventory and error/focus/state contrast review.
- Screen-reader review with NVDA or VoiceOver, including dynamic announcements,
  field errors, dialog descriptions and route transitions.
- Physical-phone testing and a complete touch-target inventory, including tablet
  navigation and all authentication/profile states.
- Recheck reduced motion and video controls as part of the final release audit;
  their earlier browser coverage is historical, not rerun by this first pass.

Keep P3.1 partial until the remaining checks are recorded. Public/inbox account
recovery, hosted performance and production readiness remain separate tasks.
