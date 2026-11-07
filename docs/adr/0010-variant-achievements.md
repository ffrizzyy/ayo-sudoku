# ADR 0010: Achievements per puzzle type

- **Status:** Accepted
- **Date:** 2026-11-07
- **Deciders:** ffrizzy

## Context

Since 1.0 the app has five rule sets (Classic, X-Sudoku, Windoku, Killer, Thermo) and three board sizes (4×4, 6×6, 9×9), but the achievement list only rewarded modes, tiers, streaks and pack progress. A player could finish every variant and still have nothing that says so.

Two pieces of data were missing. `GameResult` recorded mode, tier and size, but not the variant, and the achievement rules were an unexported function in `src/app/data.tsx`, reachable only through `recordResult`. That made the rules hard to test and impossible to re-evaluate against stored results.

## Decision

- **Additive result field.** `GameResult.variant?: Variant` is optional. The storage schema stays at version 1 because old entries still parse; `resultVariant()` maps a missing field to `classic`. Recording a type on every new result is a one-line change in `Game.tsx`.
- **Rules module.** `src/app/achievements.ts` exports the ordered `ACHIEVEMENTS`, the `AchievementId` union, `resultVariant()` and a pure `newlyUnlocked(results, packs, meta, totals, bestStreak)`. The previous rules moved there unchanged. The signature takes the best streak instead of the whole daily map, so the module has no dependency on the data provider.
- **Six new achievements.** One per variant that did not have one (`diagonalWin`, `windokuWin`, `killerWin`, `thermoWin`), one for small boards (`miniWin`, any win with `size < 9`) and one for breadth (`allVariants`, a win in all five types). The list grows from 16 to 22.
- **One-time backfill.** On launch the provider runs the same rules against stored results and unlocks anything already earned, guarded by a ref so the effect runs once. Earlier releases could not evaluate variant or mini rules, so a returning player would otherwise have to win again to be credited.
- **Stats follows the same list.** The screen renders `ACHIEVEMENTS` instead of a private copy, adds a “By puzzle type” card next to “By difficulty”, and shows `variant · tier` on recent rows. Home and Stats both read `VARIANTS` / `NINE_ONLY` from `src/app/variants.ts`.

## Consequences

- No storage migration and no new dependency. Achievements remain derivable from local results; the stored map only remembers when each id was first earned.
- Results from 1.3.0 and earlier cannot be credited to a variant, because the type was never written. They count as Classic, which is stated in the changelog.
- Backfill means a player can see several unlocks at once after updating. That is deliberate: they were earned, not new.
- A future variant only needs an entry in `VARIANTS`, a copy key and (if wanted) a new achievement id; `allVariants` and the Stats card pick it up automatically.
- The rules are now unit tested without React, storage or a browser.
