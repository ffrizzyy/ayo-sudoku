# ADR 0009: Thermo Sudoku with rising lines

- **Status:** Accepted
- **Date:** 2026-11-07
- **Deciders:** ffrizzy

## Context

Killer (ADR 0008) proved the pattern for data-heavy variants: an optional payload on `PuzzleDef`, a solver constraint that is skipped when the payload is absent, a generator that starts from a solution, and a share version. Thermo is the next type in that queue. It adds an ordering clue rather than an arithmetic one: a line of cells whose digits strictly increase from the bulb at one end to the tip at the other.

Ordering is easier to propagate than cage sums and needs much less search, so Thermo is the lowest-risk data-heavy variant left. It still needs its own model, solver bounds, generator, share payload and renderer, because the existing geometry only knows rows, columns, boxes, diagonals and windows.

## Decision

- **Model.** `Variant` gains `"thermo"`. `PuzzleDef` gains `thermos?: Thermo[]`, where `Thermo` is a `number[]` of cell indexes in path order: the bulb first, the tip last. Consecutive cells are orthogonally adjacent, every line has at least two cells, and a cell belongs to at most one line. `makeSpec(size, variant)` falls back to classic for Thermo on any size other than 9×9, matching Windoku and Killer. `puzzleFromValues` refuses a thermo spec without lines and lines on a non-thermo spec.
- **Solver state.** `makeThermoState` validates the lines (length, no repeated cell, no shared cell, orthogonal steps) and rejects a grid whose assigned digits already break the order. Each cell knows its line and its position on it, so `cellMask` can bound the cell between the values already placed before and after it: a cell at position `i` needs at least `i` smaller digits below it and enough room above it. `buildCandidates` applies the same bounds for hints and auto marks.
- **Propagation.** After the usual unit propagation, `narrowThermoMasks` walks every line forward and backward. A forward pass replaces each empty cell's mask with the digits above the smallest digit the previous position can still take; a backward pass does the same from the tip. The two passes meet in the middle, which removes long runs of impossible candidates and also guarantees that no digit repeats inside a line.
- **Generation.** `buildThermos` walks the finished solution along rising orthogonal neighbours, keeping every run that reaches the tier's minimum length and marking its cells as used. Up to four passes reclaim cells left over when a walk dies early, because a single pass leaves the harder tiers short of lines. `generateThermo` starts from the full solution, grows the lines, seeds a handful of extra givens, then asks `findSolutions(..., 2)` for the first two answers and adds a given at a differing cell until exactly one answer remains. A fallback starts from the fully revealed solution and removes clues while uniqueness holds. The generator rejects an attempt whose lines contradict the solution and retries within the attempt budget.
- **Difficulty.** `THERMO_SHAPES` controls line count and length per tier (22 lines of 2–4 cells at cozy down to 12 lines of 4–6 at master), and `THERMO_EXTRA_CLUES` (38/32/26/22/18/14) starts the peel. Longer, fewer lines leave more freedom, so the tiers land at roughly 38 clues (cozy) to 16 (master). The technique grader does not understand thermometers, so `gradeScore` is the average line length and only feeds the par-time estimate.
- **Hints.** `planHint` gets the thermometers and shares the clue-aware branch with Killer: a clue-aware naked single first, otherwise the next solution cell.
- **Share codes.** Version 3 appends a thermo payload after the packed givens: the line count, then a length and the cells for every line. Decoding checks the version pairing (v3 requires thermo, thermo requires v3), line length, in-range cells, adjacency and no shared cells. `MAX_CODE_LENGTH` grows to 768; a medium thermo code is roughly 150–165 characters.
- **Board.** Each cell draws its slice of every line that passes through it as an inline SVG in a 100×100 view box: a bulb circle at the start, and a path that enters and leaves through the cell edges. The slice sits at `z-index: 0`, under the digit (`z-index: 1`) and the pencil marks, so a clue can never hide a number. Short connectors in the cell and box gutters join the slices; they are positioned from the same cell geometry as the Windoku windows and Killer walls, and are overlapped by 1px at each end so a fractional layout cannot leave a hairline seam. The bulb is larger than the digit and translucent, so it stays visible on a given cell without reducing the contrast of the digit or the marks on top of it. A warm `--thermo-rule` token covers the light, dark and both high-contrast themes.
- **Share card.** The downloadable canvas card and the DOM mini board draw the same slices and bulbs before the givens, so the exported image matches the board.
- **Setup sheet.** Five puzzle types no longer fit the segmented control on a phone. The picker uses a wrapping grid (`repeat(auto-fit, minmax(88px, 1fr))`) with the active chip carrying its own pill; below the wrap point it lays out 3+2 at 390–430px and 2+2+1 at 320px, and one row on a desktop sheet. The sliding thumb is hidden only in that wrapping mode, because it cannot follow a wrapped grid.

## Consequences

- Thermo ships as a 9×9 type with no new dependency and no runtime data. A puzzle is fully described by `PuzzleDef`, and generation stays in the worker.
- Every generated thermo puzzle is checked to have exactly one solution; the tests assert line adjacency, strict increase along the solution, no shared cells and a share round-trip.
- Thermo codes are longer than classic codes but shorter than Killer codes, and still fit a single share link.
- The clue layer is drawing-only: selection, hints, conflicts, auto marks and pencil marks keep working because the SVG is inert and sits under the content.
- The wrapping picker is a general `Segmented` option (`wrap`), so later variants can use it without another layout change.
