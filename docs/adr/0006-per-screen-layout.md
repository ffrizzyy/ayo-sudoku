# ADR 0006: A page width and a composition per screen

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** ffrizzy

## Context

Every screen except Home was built from the same two pieces: a `.screen-header` capped at `--maxw` (1180px) and a body pinned at 880px — 780px for Settings, 760px for Import and 700px for About. On a laptop the title therefore started at the page gutter while the first card started up to 100px further right, and the heading could be wider than the content it described. Below 900px the mismatch disappeared, so it read as "desktop only, everything looks the same and slightly off".

Each screen also stacked one column from 390px to 1440px, so Daily, Packs, Learn, Stats, Settings, About and Import had identical silhouettes and a lot of unused width.

## Decision

- Each screen sets `--screen-w` on its root element. `.screen-header` and the screen body both use `width: min(100%, var(--screen-w, 880px))`, so the gutter and the text edge always agree. `.about-hero` follows the same rule even though it is not a `.screen-header`.
- From `min-width: 900px` each screen gets a composition that fits its content rather than a shared stack:
  - Daily: today's card, streak and Learn link on the left; the archive panel spans the right.
  - Packs: a shelf, two up at 900px and three up at 1080px with the art as a banner.
  - Learn: two-column curriculum, with the summary spanning both.
  - Stats: six tiles across, chart beside tier summary, achievements full width (three columns at 900px, four at 1080px), recent games beside the streak.
  - Settings: two-column CSS masonry (`columns: 2`, `break-inside: avoid`) so cards pack instead of stretching to the tallest row.
  - About: story on the left, reference cards on the right, credit block and actions full width.
  - Import: paste box on the left, live preview and help stacked on the right.
- Below 900px nothing changes: one column, same order as before.

## Consequences

- A new screen must set `--screen-w` or it inherits 880px, and its header must be the shared `.screen-header` for the alignment to hold.
- A wide-screen composition is CSS only; the React tree keeps one order in the DOM, so tab order and screen readers are unaffected.
- `layout.mjs` in the QA suite asserts that header and content edges match at 1280px, that each screen has a distinct computed signature, and that 390px and 430px still have no horizontal scroll.
- Writing an image-only layout later (for example a pack detail hero) means adding a breakpoint rule to `src/styles/screens.css`, not a second component.
