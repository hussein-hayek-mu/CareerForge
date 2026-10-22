# CareerForge motion background

The overview hero uses an original, locally rendered 12-second 1280x720 WebM.
The sequence connects a profile, skill/code nodes, CareerForge's upward-path
mark, and an opportunity icon. Aurora ribbons, luminous node trails, rotating
orbital arcs, expanding forge pulses and radial sparks add depth and movement.
It is an AI-inspired visual metaphor for the
career workflow, not a claim that the current MVP has AI functionality.

Assets: `public/media/careerforge-neural-forge.webm` (~1.3 MB) and its WebP
poster (~25 KB). No stock footage, remote embeds, or paid generation services.
The source renderer is `scripts/render-career-film.mjs`; run it with Node using
the project's existing Playwright/browser installation to regenerate assets.
The renderer uses software rendering and timer-driven frames to avoid Windows
GPU/animation-frame stalls, with bounded encoder failure handling.

Playback is muted, inline, looping, and decorative. A visible control pauses or
resumes it. Reduced-motion and data-saving preferences show the poster without
loading video until the visitor explicitly chooses playback. Unsupported video
also retains the poster. Text remains HTML above a contrast scrim.
Playback continues when the hero scrolls out of view, so returning to the hero
shows the running sequence. It still pauses in hidden browser tabs and respects
manual pause. The enhanced effects are baked into the local video rather than
running a canvas or particle engine on each visitor's device.

The sidebar scrollbar is visually hidden while scrolling remains available.
The collapse button has a bordered panel-chevron icon that reverses direction
when the sidebar is collapsed. Keyboard labels and navigation behavior remain.

Earlier baseline: 15 local tests and the 16-case desktop/mobile browser suite passed.
The enhanced-film increment passed lint, types, 15 local tests and production
build, eight motion cases, and a final two-case desktop/mobile playback check
with screenshot review against the regenerated asset. Motion checks verify real looping, manual pause/resume,
continuous playback while scrolling, reduced-motion opt-in, data-saving behavior, and a
blocked-video poster fallback. Short-window navigation remains reachable with
the scrollbar hidden. The video loop starts and ends on matching scene states.
