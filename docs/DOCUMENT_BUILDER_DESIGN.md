# Supplied CV and portfolio builder integration

Owner correction, 29 October 2026: use the exact supplied code to replace the
current CV and portfolio UI. This supersedes the earlier visual adaptation plan.
The supplied file's comments, mock applicant and suggested provider setup are
source content, not independent authorization to enable services or certify facts.

## Source and routes

`src/components/PortfolioBuilder.jsx` is an unchanged copy of
`C:/Users/user/Downloads/PortfolioBuilder.jsx`. Its SHA-256 is
`168507FC23A6590BF19C8A86E24DF0842EA936DF947D7042B0C816F419552126`.
Both `/cv` and `/portfolio` render this component behind server-verified sign-in.
The targeted Git attribute preserves its original bytes across Windows checkouts.
The component keeps its own Web portfolio/CV tabs, layouts, styles, accent colors,
light/dark mode, photo input, editing controls, effects and print action. Both
routes start with the component's original Web portfolio tab.

A small integration bar identifies the builder as sample content, explains that
edits stay in the current tab and links to the account-backed document tools.
Existing saved-profile CV functionality is available at `/cv/saved`; reviewed
portfolio publication management is available at `/portfolio/publication`.
Existing public portfolio snapshots remain at `/p/[slug]`.

## Data and evidence boundaries

The supplied component starts with fictional Sara Khoury/Google example content.
Its edits and photos live in React state and reset on reload or navigation.
They do not update the saved profile, assessment records or public snapshots.
They are editable sample drafts, not validated applicant claims. The component's
sample skills and work history must not be represented as checked account facts.

The separate saved-profile CV continues to include only selected skills with a
current supported passing assessment. Other profile details remain self-reported.
Publication management retains owner access, source/revision checks, explicit
approval, frozen selected-field snapshots and revocation. It does not publish the
sample builder's local state. Stronger claim-specific validation remains future
work under R1; an editable prototype does not satisfy that requirement.

## Generation compatibility

The unchanged source posts `{ text }` to `/api/generate`. An authenticated,
same-origin, bounded-input compatibility route supports this request and returns
HTTP 501 for valid requests, activating the component's existing labeled demo
fallback. The normal versioned API retains the project's standard error shape;
the compatibility alias provides the string error shape expected by this source.

There is no connected AI provider, paid call or production applicant generation.
The component's original suggestion to add `ANTHROPIC_API_KEY` is retained as
source text; adding that key alone does not activate real generation. Connecting
AI later requires a server-side provider, validated grounded output and explicit
handling of source facts instead of the fictional fallback.

## Integration exceptions and verification

The source remains JSX with a TypeScript declaration at its import boundary.
Any lint exceptions are scoped to this supplied file so its exact code can be
preserved. Integration CSS handles the surrounding bar and existing global-style
collisions without rewriting the supplied component. Its external font request,
canvas effects and original accessibility behavior are retained; comprehensive
accessibility or universal ATS compatibility is not claimed.

The additive development appearance migration from the earlier adaptation has
already been applied and is retained with its Prisma/API compatibility. It is
not rewound or edited. That schema support does not mean the supplied component
persists its cosmetic choices or changes public snapshot rendering.

Acceptance: confirm source hash equality; verify private access, both routes,
the original editing/style controls, demo fallback, responsive rendering and
browser PDF output; verify saved-profile CV and publication regressions; run
lint, types, unit tests and production build. Final verification evidence is
recorded in `IMPLEMENTATION_ROADMAP.md` after these checks complete.
