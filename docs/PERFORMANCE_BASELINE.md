# Local production performance baseline

Recorded 22 October 2026 against the production build of `2dd2de2`, using
Edge 155.0.4283.62 on this Windows development computer. No application code
was changed: the observed costs did not justify speculative optimization.

## Reproduce

1. Run `npm.cmd run build`.
2. In a separate terminal, run `npm.cmd run start -- --port 3100`.
3. Run `npm.cmd run audit:performance`.

The script defaults to `http://localhost:3100`; override with
`PLAYWRIGHT_BASE_URL` only for an appropriate test environment. Use a production
server, not the development server. The audit opens anonymous guest contexts,
does not sign in or write account records, and saves its detailed resource list
to ignored `test-results/performance-audit.json`.

Requested CDP conditions: 390×844 CSS pixels, touch/mobile emulation, device
scale 1, 4× CPU slowdown, 150ms latency, 200,000 bytes/second download and
93,750 bytes/second upload. Browser cache is disabled; each scenario has a fresh
context. The local server/OS caches are not reset. Observe ten seconds after
the load event. These settings approximate constrained browsing; they do not
reproduce a physical phone, cellular network or hosted server latency.

## Observations

One sample per scenario; decimal KB, rounded. These are lab observations, not
percentiles, Lighthouse scores, or release guarantees.

| Guest route | Motion | LCP | Windowed CLS | Transferred | Video requests |
| --- | --- | --- | --- | --- | --- |
| Overview | Normal | 1.732s | 0 | 1,488 KB | 1 |
| Overview | Reduced | 1.328s | 0 | 200 KB | 0 |
| Opportunities | Reduced | 0.656s | 0 | 172 KB | 0 |
| Profile | Reduced | 0.940s | 0 | 171 KB | 0 |
| Applications | Reduced | 0.872s | 0 | 172 KB | 0 |

All responses were 200 with no uncaught page errors. Script resource transfer
was approximately 149 KB on each cold route. Normal overview LCP was a video
element; reduced-motion overview LCP was the poster. The local video file is
1,287,178 bytes and dominates normal overview transfer. Reduced motion correctly
avoids requesting it. Preserve the existing playback controls, poster and
reduced-motion/save-data behavior rather than removing the requested visual.

LCP uses buffered browser entries; CLS is the maximum session window of shifts
without recent input (one-second gap, five-second maximum window). Resource
transfer is limited to entries completed by the observation point; ongoing media
and later interactions can cost more. No INP, scrolling/interaction performance,
long-session shifts, memory, battery or full console/server-log audit is claimed.
The script fails on non-200 pages, uncaught page errors, missing LCP or a video
request in reduced motion; it does not enforce timing budgets from one sample.

## Remaining release work

- Repeat samples on a hosted production build and document variability before
  optimizing server latency, image priority, chunks or rendering.
- Measure important interactions and authenticated/empty/error states; collect
  real-user INP and percentile data when deployment and traffic permit.
- Verify physical phones, save-data mode and slow-network playback controls.
- Complete the wider visual/accessibility audit in the implementation roadmap.

Verification for this increment: audit completed all five scenarios, ESLint,
TypeScript, Node syntax and Git whitespace checks passed. The production build
being measured had passed in the preceding increment; it was not rebuilt for
this script/documentation-only change. No dependencies, paid services or schema
changes were introduced.
