# CareerForge motion background

The overview hero uses an original, locally rendered 12-second 1280x720 WebM.
The sequence connects a profile, skill/code nodes, CareerForge's upward-path
mark, and an opportunity icon. It is an AI-inspired visual metaphor for the
career workflow, not a claim that the current MVP has AI functionality.

Assets: `public/media/careerforge-neural-forge.webm` (~1.6 MB) and its WebP
poster (~20 KB). No stock footage, remote embeds, or paid generation services.
The source renderer is `scripts/render-career-film.mjs`; run it with Node using
the project's existing Playwright/browser installation to regenerate assets.

Playback is muted, inline, looping, and decorative. A visible control pauses or
resumes it. Reduced-motion and data-saving preferences show the poster without
loading video until the visitor explicitly chooses playback. Unsupported video
also retains the poster. Text remains HTML above a contrast scrim.
Playback pauses off-screen and in hidden browser tabs to reduce battery use.

The sidebar scrollbar is visually hidden while scrolling remains available.
The collapse button has a bordered panel-chevron icon that reverses direction
when the sidebar is collapsed. Keyboard labels and navigation behavior remain.

Verified: 15 local tests and the 16-case desktop/mobile browser suite passed.
The final motion checks also verified real looping, manual pause/resume,
off-screen pause/resume, reduced-motion opt-in, data-saving behavior, and a
blocked-video poster fallback. Short-window navigation remains reachable with
the scrollbar hidden. The video loop starts and ends on matching scene states.
