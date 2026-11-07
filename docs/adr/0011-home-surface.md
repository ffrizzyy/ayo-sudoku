# ADR 0011: Home keeps two actions

- **Status:** Accepted
- **Date:** 2026-11-07
- **Deciders:** ffrizzy

## Context

The landing page had grown a grid of four shortcut cards under the Play card: Daily puzzle, Puzzle packs, Mini 6×6 and Import. Each duplicated a path that already existed elsewhere. Daily and Packs are tabs, Mini is one option inside the Play sheet, and Import is a full screen. On a phone the cards pushed the footer and the tab bar apart and made the simplest screen in the app the busiest one.

## Decision

- **Home shows Play and Continue only.** The shortcut grid is removed, along with its styles and copy.
- **Daily and Packs stay in the tab bar.** They are destinations, not actions, so the persistent navigation keeps them one tap away.
- **Mini is a board size.** The Play sheet already offers 4×4, 6×6 and 9×9; a second entry point on Home was redundant.
- **Import moves to Settings → Puzzles.** It is an occasional, data-shaped action, and Settings already owns export, backup and reset. The row opens the same `#/import` screen.
- **Keep the composition.** Without a save the Play card spans the shared frame on desktop (`is-solo`); with a save, Play and Continue share a two-column row. The Continue label reads `type · tier · mode` and drops Classic, matching the game subline.

## Consequences

- Home has one primary action and one resume path, and it fits the shared page frame at every width.
- Import is one tap deeper, but it no longer competes with starting a game. Nothing else changed location.
- The quick-card styles and four copy keys are gone, so the translation surface shrinks instead of growing.
- Layout tests treat Home as a flex column again; the two-column composition lives inside the hero rather than on the page.
