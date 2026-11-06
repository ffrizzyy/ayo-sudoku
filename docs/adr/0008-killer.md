# ADR 0008: Killer Sudoku with cage sums

- **Status:** Accepted
- **Date:** 2026-11-07
- **Deciders:** ffrizzy

## Context

ADR 0007 shipped the three variants whose regions come from the grid itself (Classic, X-Sudoku, Windoku) and deferred every type that needs extra clue data. Killer is the first of those: each puzzle is partitioned into cages, every cage carries a sum, and the digits in a cage must add up to it without repeating.

Killer therefore needs three things the app did not have: a cage model in `PuzzleDef`, a solver that understands cage sums, and a generation strategy that produces cages from a solution instead of carving givens. It also needs a share format that carries the cages, and a board renderer that draws them without hiding digits or pencil marks.

## Decision

- **Model.** `Variant` gains `"killer"`. `PuzzleDef` gains `cages?: Cage[]` where `Cage` is `{ cells: number[]; sum: number }`. `makeSpec(size, variant)` falls back to classic for Killer on any size other than 9×9, matching Windoku. `puzzleFromValues` refuses a killer spec without cages and cages on a non-killer spec.
- **Cages.** Generation starts from a complete solution and grows each cage from a random unassigned cell, adding orthogonal neighbours while the cage is below its size target and the neighbour's solution digit is not already in the cage. The digit rule is not cosmetic: a cage that repeats a digit can never be satisfied. Every cell ends up in exactly one cage.
- **Size caps.** A cage of five or more cells barely constrains its cells (the sum admits many digit sets), and the uniqueness search then explores for tens of seconds. Benchmarks over 15 seeds per tier settled on 2–3 cells for cozy/easy, 2–4 for medium/hard/expert and 3–4 for master. With those ranges, generation medians are 1–127 ms and the slowest observed run is ~0.8 s, inside the worker's 6 s budget.
- **Uniqueness.** After building cages, the generator starts from the full solution, asks `findSolutions(..., 2)` for the first two answers, and adds a given at a cell where they differ, repeating until the puzzle is unique. If that loop does not converge in its attempt budget, a fallback starts from the fully revealed solution and removes clues while uniqueness holds. Both paths end with exactly one solution.
- **Solver.** Cage constraints live beside the row/column/box masks: per cage the solver tracks the remaining sum, the digits already used and the empty cells. `propagateCages` narrows every empty cage cell to digits that appear in some still-feasible combination, and a bipartite matching test rejects a cage whose cells cannot cover all of its remaining digits. `narrow` runs to a fixpoint, assigning naked and hidden singles, and each `Search` node unwinds the forced placements after its branch.
- **Difficulty.** The technique grader has no cage knowledge, so it cannot grade Killer. Tiers differ by cage size and by the number of extra givens (12/9/7/5/3/2 from cozy to master). `gradeScore` for a killer puzzle is its average cage size; it only feeds the par-time estimate.
- **Hints.** `planHint` gets the cages. It first looks for a cage-aware naked single; when there is none it reveals the next solution cell, because the technique engine cannot reason about cages.
- **Share codes.** Version 2 appends a cage payload (count, one sum per cage, one cage id per cell) after the packed givens, and `MAX_CODE_LENGTH` grows to 512. Version 1 codes decode exactly as before; a killer code is rejected if its cages are missing or malformed.
- **Board.** Cages are drawn as an absolutely positioned overlay of thin wall segments centred in the existing cell gutters, computed from `--box-w`, `--cell-w`, `--box-pitch` and `--cell-pitch` rather than measured from the DOM. Each wall is drawn once by the cell to its left or above it and extends half a gap past the cell at both ends, so corners join. The sum of a cage sits in the top-left of its first cell; killer boards reserve that corner in every empty cell so pencil marks stay aligned.
- **Geometry fix.** `--box-w` used to subtract `(box-cols + 1)` gaps even though the board padding already accounts for the outer two, so every derived length was ~4% too small. It now subtracts only the gaps between boxes, which also aligns the Windoku window outlines exactly to the cell grid.

## Consequences

- Killer ships as a 9×9 type with no new dependency and no runtime data: cages are generated from the seed like every other puzzle, and a killer puzzle is fully described by `PuzzleDef`.
- Every killer puzzle from the generator is checked to have exactly one solution, and the tests assert cage coverage, sums and the no-repeat rule.
- Killer codes are longer than classic codes (roughly 200 characters for an easy puzzle) but still fit a single share link.
- Cage walls are a visual layer, not part of the cell DOM, so selection, hints, conflicts and pencil marks keep working unchanged.
- Future data-heavy types can follow the same pattern: an optional payload on `PuzzleDef`, a solver constraint that is skipped when the payload is absent, a generator path that starts from a solution, and a share version bump.
