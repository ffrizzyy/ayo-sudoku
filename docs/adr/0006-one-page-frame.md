# ADR 0006: One page frame, a composition per screen

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** ffrizzy

## Context

Every screen except Home was built from the same two pieces: a `.screen-header` capped at `--maxw` (1180px) and a body pinned at 880px — 780px for Settings, 760px for Import and 700px for About. On a laptop the title therefore started at the page gutter while the first card started up to 100px further right, and the heading could be wider than the content it described. Below 900px the mismatch disappeared, so it read as "desktop only, everything looks the same and slightly off".

Each screen also stacked one column from 390px to 1440px, so Daily, Packs, Learn, Stats, Settings, About and Import had identical silhouettes and a lot of unused width.

A first attempt fixed the alignment by giving every screen its own width (`--screen-w`: 1080, 1000, 980, 940, 760) and its own composition. That lined up each header with its own body, but the left edge moved between screens, so changing tabs made the whole page shift sideways. Two different problems — a header that did not match its own body, and a frame that did not match across screens — can only be solved together.

## Decision

- `--screen-w: 1080px` lives once in `src/styles/tokens.css`. `.screen-header` and every screen body (`daily-main`, `packs-list`, `learn-list`, `stats-main`, `settings-main`, `about-main`, `import-main`), plus `.lesson-top` and `.lesson-main`, size themselves as `min(100%, var(--screen-w, 1080px))` with the same horizontal gutter. The About hero follows the same rule even though it is not a `.screen-header`.
- From `min-width: 900px` each screen keeps a composition that fits its content rather than the shared stack:
  - Daily: today's card, streak and Learn link on the left; the archive panel spans the right.
  - Packs: a shelf, two up at 900px and three up at 1080px with the art as a banner.
  - Learn: two-column curriculum, with the summary spanning both.
  - Lesson: steps and warning on the left, practice, actions and next-lesson card on the right.
  - Stats: six tiles across, chart beside tier summary, achievements full width (three columns at 900px, four at 1080px), recent games beside the streak.
  - Settings: two-column CSS masonry (`columns: 2`, `break-inside: avoid`) so cards pack instead of stretching to the tallest row.
  - About: story on the left, reference cards on the right, credit block and actions full width.
  - Import: paste box on the left, live preview and help stacked on the right.
- Below 900px nothing changes: one column, same order as before.
- Home is deliberately outside this frame. It is the landing page, with its own brand header and a narrow hero column; it is not one of the tabbed content screens.

## Consequences

- A new content screen inherits the frame automatically; if it needs a different body width, it is a composition rule, not a second frame.
- The frame is one token: changing the page width is a one-line edit rather than eight.
- A wide-screen composition is CSS only (plus small wrappers such as `.import-side` and `.lesson-body`), so DOM order, tab order and screen readers are unaffected.
- `layout.mjs` in the QA suite asserts that each header matches its body, that all eight screens share the same inner left and right edge at 1280px, that each screen has a distinct computed signature, and that 390px and 430px still have no horizontal scroll.
- Writing an image-only layout later (for example a pack detail hero) means adding a breakpoint rule to `src/styles/screens.css`, not a second component.
