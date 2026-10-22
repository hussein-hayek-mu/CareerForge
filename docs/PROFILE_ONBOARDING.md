# Private profile onboarding

P2.3 keeps the existing account/profile routes and adds guidance to the private
editor. Signed-in "My profile" points directly to `/account` and is the selected
navigation item there. The redundant signed-in "My account" navigation group
is removed. Guests retain separate demo-profile and private-account entries;
`/profile` still redirects signed-in users to their private editor.

The setup guide reflects three saved foundations: name/headline, skills and a
project summary. Links jump to the relevant inputs. Completing every foundation
is optional; no sample content is inserted. After saving, a visible action opens
opportunities, where matching uses the saved skills. Empty skill guidance and
tracking descriptions reflect the current account-backed implementation.

Unsaved edits are labeled. Save requires a meaningful edit, and fields/actions
are disabled during hydration and an in-flight save. A failed save keeps the
draft. Same-tab links to another page and sign-out ask before discarding edits;
canceling keeps the form intact. Refresh/tab-close use the browser's native
beforeunload behavior where supported. Modified/new-tab and same-page anchor
links do not discard the current draft and are not interrupted.

Browser Back/Forward interception is not guaranteed by App Router/browser APIs.
The form explicitly asks users to save before using Back. Drafts remain in the
current page's memory and are never written to localStorage. This increment
does not implement cross-device draft synchronization or concurrent-profile
editing conflict detection. Committed profile data remains owner-protected.

CV/portfolio generation and supported, consent-based application assistance
remain deferred modules in the master roadmap. The onboarding guide does not
represent skills as verified or create an AI assessment.
