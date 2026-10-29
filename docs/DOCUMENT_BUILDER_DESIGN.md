# Supplied CV and portfolio builder integration

Owner update, 29 October 2026: the updated supplied component belongs inside
CareerForge under one **CV & Portfolio** navigation entry. This replaces the
previous separate CV/portfolio entry points and standalone builder shell.
Comments and provider suggestions in the supplied source are implementation
material, not independent authorization to enable services or certify facts.

## Source and routes

`src/components/PortfolioBuilder.jsx` is an unchanged copy of the owner's latest
pasted source, also supplied as `PortfolioBuilder (1).jsx`. The pasted file's
SHA-256 is `9C123EE49D70324A219DABE1CC0C761E8EB3FA7311B5A3E30639887F3650F658`.
The targeted Git attribute preserves its bytes and supplied whitespace across
Windows checkouts.

The canonical private destination is `/documents`, rendered within the existing
CareerForge `AppShell`. The sidebar and feature directory have one **CV & Portfolio**
entry. The component retains its own Web portfolio/CV tabs and original layouts,
colors, light/dark mode, photo control, editing, effects and print action. It
starts with its original Web portfolio tab. Legacy `/cv` and `/portfolio` links
redirect to `/documents`.

Saved-profile CV functionality remains at `/cv/saved`; reviewed publication
management remains at `/portfolio/publication`. Both are contextual tools under
the merged navigation entry. Existing public snapshots remain at `/p/[slug]`.
An integration notice distinguishes local sample editing from saved account facts.

## Editing and evidence boundaries

The update adds education/language editing, example contact details, contact icon
controls, printable contact information, a Download CV action, scroll progress
and back-to-top. Together with existing text, skill and photo controls, these let
users edit a CV and portfolio in the same builder. No persistence is implied.

The component starts with fictional Sara Khoury/Google example content. Its edits,
photos and cosmetic choices live in React state and reset on reload or navigation.
They do not update the profile, assessment records or public snapshots. Sample
work history, contacts, education, languages and skills are not validated claims.

The separate saved-profile CV still includes only selected skills with a current
supported passing assessment. Other profile details remain self-reported.
Publication management retains ownership, source/revision checks, explicit
approval, frozen selected-field snapshots and revocation. It does not publish
local builder state. Claim-specific validation remains future work under R1.

## Generation compatibility

The unchanged source posts `{ text }` to `/api/generate`. The authenticated,
same-origin, bounded-input compatibility route returns HTTP 501 for valid
requests, enabling the component's labeled demo fallback. The canonical versioned
API retains the standard error shape; the alias returns the string expected by
the supplied source. No AI provider or paid call is connected.

The original `ANTHROPIC_API_KEY` setup suggestion remains source text. Adding a
key alone does not activate generation. Real generation requires a server-side
provider, validated grounded output and source facts instead of fictional fallback.

## Integration and acceptance

Hide notes / Show notes collapses the input column without unmounting the
builder or losing edits. Its button exposes the expanded state and supports
keyboard activation. The builder uses a shared document scroll, with section
anchors offset below the workspace header and no nested panel/preview scrollers.


The surrounding notes, toolbar, hints and draft notice use CareerForge's own
palette. Preview theme choices affect the document only. The portfolio canvas
is fluid and centered, with symmetric gutters and a 1120px maximum width.


The source remains JSX with a TypeScript import declaration and narrowly scoped
lint exceptions. Wrapper CSS handles existing global-style collisions, narrow
layouts and shell-free printing without rewriting the supplied component. It also
keeps newly added skill chips visible when the supplied observer misses them and
reveals removal controls for touch and keyboard use.
External fonts, canvas effects and original accessibility behavior remain;
comprehensive accessibility or universal ATS compatibility is not claimed.

The already-applied additive appearance migration and Prisma/API compatibility
are retained. They do not persist the supplied component's local choices.

Acceptance: verify the source hash; one active desktop/mobile navigation entry;
private `/documents` access and legacy redirects; editing and added controls;
account-source isolation; responsive layout; print/PDF output; saved-profile CV
and publication regressions; lint, types, appropriate tests and production build.
Final evidence is recorded in `IMPLEMENTATION_ROADMAP.md` after checks pass.
