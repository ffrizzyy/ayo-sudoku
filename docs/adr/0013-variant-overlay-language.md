# ADR 0013: Variant overlays stay subordinate to the board

- **Status:** Accepted
- **Date:** 2026-11-07
- **Deciders:** ffrizzy

## Context

The four variant renderers each solved their own problem: X-Sudoku had to show two diagonals, Windoku four extra windows, Killer a cage partition with sums, and Thermo rising lines. The first visual pass made every clue loud enough to be obvious in isolation — per-cell inset outlines on the diagonals, 2px floating frames around each window, 2px rounded cage walls with a heavy sum, and 9px round-capped thermo lines with a 22-unit bulb.

On a real board those layers read as a second interface stacked on the grid. The frames floated through the gutters, the cage walls and the box rules competed, and the thermo bulbs and caps made every line look like a pipe with joints. Worse, the overlays fought the states the player actually needs: selection, peers, conflicts and pencil marks.

## Decision

Every variant clue is now drawn with the quietest shape that still names the region:

- **X-Sudoku** is fill only. Diagonal cells get a 10% accent wash over the cell colour (12% over a given) and no outline. The two paths read as two long regions, and no cell gains a border that could be mistaken for a selection.
- **Windoku** uses the same fill language, at 8% (10% over a given), plus one hairline per window: 1px at 26% accent with a small radius. Four windows read as four regions rather than four floating frames.
- **Killer** keeps walls in the gutters but makes them 1.5px, square-joined and 64% of `--cage-rule`. Sums are smaller (0.18 cell) and lighter (750) than a digit, so the cage is the structure and the sum is a label.
- **Thermo** draws a 7% stroke with butt caps, a 16-unit bulb at 48% fill, and gutter links of exactly the same width. The line reads as one path from bulb to tip, with no rounded joints or oversized blobs.
- **High contrast** keeps every shape identical and strengthens only the overlay: 20%/16% tints, a 2px window border and full-strength cage walls. The geometry does not change between themes.
- **Share card** uses the same weights and the clay `--thermo-rule` tokens, so the exported image is the board the player saw.

## Consequences

- The clue layer is always under the digit and pencil-mark layer, and cell states (given, selected, peer, conflict) still override the diagonal and window washes. A player can always tell what the app is asking them to look at.
- Region geometry stays derived from `--box-w`, `--cell-w`, `--box-pitch` and `--cell-pitch`; no renderer measures the DOM, so the overlays scale with the board at every breakpoint.
- A future variant should start from these weights: a wash for a region, a hairline for a boundary, a gutter rule for a partition, and a single-width stroke for a path. Adding a second outline or a shadow is a regression, not an emphasis.
- High-contrast behaviour is part of the contract, not an afterthought: a 10% wash is not a reliable cue for a low-vision player.

## Amendment (1.4.6): overlays follow the cells, not the box grid

The 1.4.3 pass tuned weights but kept three geometric shortcuts that did not survive real boards.

- **Windoku windows cross a box gutter.** Each window spans three cells but only two cell gaps: the third step is the 8px box gutter, so sizing the frame from `--box-w` (three cells plus two cell gaps) left it ~5px short and cut through the window's last row and column. The frame is now measured from the first cell's left/top edge to the last cell's right/bottom edge, so it wraps the tinted block exactly. The hairline rises to 30% accent and keeps the cell radius.
- **Killer walls are opaque.** At 64% alpha a wall changed apparent weight between the 3px cell gap and the 8px box gutter, and collinear or T-junction segments darkened where they overlapped. Walls now use `--cage-rule` at full opacity; the token itself is retuned (light `#b2b2c4`, dark `#5c5c72`) so the line stays quiet. Geometry is unchanged at 1.5px.
- **Thermo is painted into the cell.** The clay line read as a second colour system. Thermo now uses the accent at 24% over the cell (34% dark) with a 40% bulb (52% dark), an 8% stroke and round caps. The line and bulb stay under the digit and marks, so the clue looks embedded in the cell background. High contrast keeps the geometry and raises the mixes to 56%/76% light and 66%/86% dark. Tokens stay opaque because slices and gutter links overlap by a hairline; alpha would show those seams.
- **Completion is an accent pulse, not a state.** A completed row, column, box or digit flashes `--complete-flash` (accent at 26% light, 36% dark, stronger under high contrast) and fades back out in an overlay above the cell's own state colour. A cell never keeps a completion fill after the animation.

The share card reads the same tokens and therefore follows automatically.
