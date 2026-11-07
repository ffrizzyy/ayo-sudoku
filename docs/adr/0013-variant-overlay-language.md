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
