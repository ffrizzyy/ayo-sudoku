# ADR 0007: Three Sudoku variants, sized by board

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** ffrizzy

## Context

Ayo Sudoku! shipped one rule set: rows, columns and 3×3 boxes on 9×9, with an optional hidden diagonal variant and 4×4/6×6 mini boards. Players coming from Sudoku-app guides expect named types (X-Sudoku, Windoku, Killer, Jigsaw, Arrow, Thermo, Samurai and more), and the Home screen offered only one way to start a puzzle: choose a difficulty.

Most of those types need data the app does not have. Killer needs cage sums, Arrow needs circle-and-arrow geometry, Thermo needs bulb positions, Jigsaw needs an irregular region map, Samurai needs five boards. Shipping them would mean either handcrafted puzzle sets or a new generator for every type, plus new import and share formats. That is a different release.

Three types need no extra clue data because their regions are derivable from the grid itself: Classic, X-Sudoku (both diagonals) and Windoku (four extra 3×3 windows). They can reuse the existing generator, grader and hint engine as long as those engines can accept an arbitrary list of units.

## Decision

- `Variant` is `"classic" | "diagonal" | "windoku"`. `BoardSpec` carries it, and `makeSpec(size, variant)` falls back to classic when Windoku is asked for on a board other than 9×9, since the windows are defined on the 3×3 box grid.
- `Geometry` gains `windows: number[][]`. Windoku builds four 3×3 windows at 0-based row/column starts 1 and 5. `units` is `rows + cols + boxes + windows + diagonals`, and `cellUnits` maps every cell to every unit it belongs to.
- The solver's mask state is a single `Int32Array` indexed by unit instead of four separate arrays. `makeState`, `cellMask`, `place` and `unplace` walk `geom.cellUnits`, so diagonals, windows and any future region type work without touching the solver.
- The classic "prefill the diagonal boxes" variety step only runs for `classic`. Windows and diagonals overlap those boxes, so a blind prefill could create a contradiction.
- Share codes keep version 1. The header byte still stores the size in bits 0–1 and the diagonal flag in bit 2; Windoku spends bit 3. Old codes decode as before, and a Windoku bit on a non-9×9 code is rejected.
- Home opens a setup sheet from a single Play card: the sheet holds the mode, puzzle-type and board-size segmented controls plus the difficulty grid. Windoku disables 6×6 and 4×4 and snaps the size back to 9×9. Daily ignores the type and size pickers because it is always a classic 9×9.
- Board visuals are additive: diagonal cells get a tinted background and inset ring; Windoku windows are absolutely positioned outlines over the existing box grid. `--box-w`, `--cell-w`, `--box-pitch` and `--cell-pitch` are computed in container units from the existing gap tokens, so the outlines track the grid at every width without DOM measurement.
- Home uses the shared `--screen-w` frame and header: a brand header, a Play card that opens the setup sheet, an optional Continue card and four shortcuts. There are no setup controls on the landing view, and the suggested difficulty is preselected rather than labelled.
- Hints can describe a window (`window N`) instead of falling back to "the grid".

## Consequences

- Three named types and three board sizes ship with no new puzzle data, no network calls and no new dependency.
- Data-heavy types (Killer, Arrow, Thermo, Jigsaw, Greater-Than, Consecutive, Skyscraper, Samurai, 16×16) stay out of scope. Each needs a new clue model in `PuzzleDef`, a renderer and an import/share format; they should arrive as a separate ADR rather than being folded into this one.
- The generator automatically respects the extra units: `countSolutions`, `solve`, `gradePuzzle` and `planHint` all read `geom.units`.
- A future region variant (for example Jigsaw) can be added by giving `Geometry` a region list and extending the variant union; the solver no longer needs new mask plumbing.
- Windoku generation is slower than classic at the same clue target because the windows prune more candidates. It stays within the existing generation budget in the test suite.
