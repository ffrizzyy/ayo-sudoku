# Changelog

All notable changes to Ayo Sudoku! are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Conventional Commits](https://www.conventionalcommits.org/).

## [1.4.6] — 2026-11-08

### Changed

- **Variant clues now sit inside the cells.** Windoku measures each window from its first cell's top-left to its last cell's bottom-right, so the hairline wraps the four tinted 3×3 blocks instead of cutting through a row and column. Killer cage walls are fully opaque, so a wall keeps the same weight over the 3px cell gap and the wider box gutter and no longer darkens where two walls meet. Thermo drops the clay colour for a soft accent wash: an 8% line with round caps and a translucent bulb, painted under the digits.
- **Completion flashes the accent, then clears.** A finished row, column, box or digit pulses the player's accent and fades back to the cell, instead of holding a green (and, in dark mode, muddy brown) fill. A second completion inside the first flash no longer cancels the clear timer and leaves cells tinted.

### Fixed

- A completion ripple whose timer was cleared by the next completion now always ends; the stale cleanup effect is gone.

## [1.4.5] — 2026-11-07

### Changed

- **The brand mark sits beside the Home title.** The 52px tile (46px on phones) forms a lockup with the eyebrow and `h1` instead of floating above the Play card, so the title reads as one block and the hero is Play alone again. When the language, install and settings chips cannot share the title row on narrow phones, they wrap to a second row that stays flush with the right edge instead of hanging under the logo.

## [1.4.4] — 2026-11-07

### Changed

- **Home is a landing page again.** Play sits in the middle of the space between the header and the footer, and the 52px brand tile returns above it — centred over the Play card on desktop, or over the row when Play is alone. The header, page width, title size and tab bar stay on the shared frame, and `safe center` keeps a tall hero reachable on short screens.

## [1.4.3] — 2026-11-07

### Changed

- **Variant clues now read as part of the board.** X-Sudoku marks its diagonals with a soft wash instead of a border on every cell. Windoku tints its four windows and draws one hairline per window instead of a floating frame. Killer cage walls are 1.5px with square joins and smaller, lighter sums. Thermo lines are thinner with butt caps and smaller bulbs, and the gutter links match the stroke exactly, so nothing looks like a pipe with joints.
- **High contrast strengthens the clue, not the layout.** Diagonals and windows use a stronger wash, windows a 2px hairline, and cage walls their full rule colour; the geometry is unchanged.
- **The share card uses the same weights and the clay thermo colour**, so the exported image matches what is on screen.

## [1.4.2] — 2026-11-07

### Changed

- **Home joins the shared page frame.** Its header now uses the same eyebrow, title size, gutters and action height as every other screen, the Play card is sized like the rest of the cards, and content starts at the same top edge instead of floating in the middle of the viewport. The oversized brand mark is gone.
- **The tab bar no longer moves between screens.** The root reserves the scrollbar lane, every tabbed screen subtracts the same bottom shell gutter, and a route change returns the page to the top. Home and the content screens now keep the bar in exactly the same place.
- **Page transitions.** Moving between tabs slides the new screen in from the direction of travel; opening Settings, About, Import, a pack, a lesson or a game arrives with a short bubbly pop. The first paint stays still, and the existing reduced-motion switch keeps the change instant.

## [1.4.1] — 2026-11-07

### Changed

- The Home Continue card always names the puzzle type, so a classic save reads `Classic · Hard` instead of a bare tier. The in-game subline still omits Classic.

## [1.4.0] — 2026-11-07

Every puzzle type gets its own trophy, Stats learns to count types as well as tiers, and Home settles into a single Play card.

### Added

- **Variant achievements.** Six new trophies bring the list to 22: “Both ways” (X-Sudoku), “Extra windows” (Windoku), “Cage breaker” (Killer), “Rising line” (Thermo), “Small world” (a 4×4 or 6×6 win) and “Every flavour” (win all five types). Results now remember their variant, and results stored before this release count as Classic because the type was never recorded.
- **Achievement rules module.** `src/app/achievements.ts` owns the ordered list and the pure `newlyUnlocked` rules, with unit tests covering variant, legacy-result, loss and mini-board cases. On launch the app also backfills anything the stored results already prove, so earlier 4×4 and 6×6 wins unlock “Small world” straight away.
- **By puzzle type on Stats.** A second breakdown beside “By difficulty” lists games and best time for Classic, X-Sudoku, Windoku, Killer and Thermo. Recent games name the type first (`Killer · Medium`) and the mode underneath.
- **Puzzles card in Settings.** The importer now opens from Settings → Puzzles, keeping one obvious entry point after leaving Home.

### Changed

- **Home keeps only Play and Continue.** The Daily, Packs, Mini and Import shortcut cards are gone; Daily and Packs remain tabs, Mini is a board size in the Play sheet, and Import moved to Settings. With no save, the Play card spans the shared frame on desktop.
- The Continue card names the saved puzzle as `type · tier · mode`, omitting Classic and the plain classic mode.
- Stats gives the two breakdowns their own column beside a chart that now stretches to match, and widens the row label column on phones so `X-Sudoku` stays on one line.
- The shared `VARIANTS` and `NINE_ONLY` lists live in `src/app/variants.ts`, used by both Home and Stats.

### Removed

- The Home quick-card styles (`.home-links`, `.quick-*`) and the `home.dailyCard`, `home.packsCard`, `home.miniTitle` and `home.continueSubtitle` copy keys in English and Indonesian.

## [1.3.0] — 2026-11-07

Thermo Sudoku arrives: rising lines with a bulb at one end, a line-aware solver and generation that starts from a solution.

### Added

- **Thermo Sudoku.** Lines of cells must strictly increase from the bulb to the tip. Thermo is 9×9 only; 6×6 and 4×4 are disabled while it is selected.
- **Line-aware engine.** The solver validates every line, bounds each cell between the digits already placed on the line, and runs a forward and backward candidate pass so impossible runs fall away early. `buildCandidates` applies the same bounds for hints and auto marks.
- **Thermo generation.** Lines grow along rising runs on a complete solution, then the generator compares the first two solutions and adds a given where they differ until the puzzle is unique. A full-reveal fallback handles the rare attempt that does not converge.
- **Thermo share codes.** Version 3 codes carry the line count and, per line, its length and cells; decoding checks adjacency, overlap and the version pairing. The share card and its downloadable image draw the same lines and bulbs.
- Thermo hints use line-aware candidates for a naked single and otherwise reveal the next solution cell.

### Changed

- The puzzle type picker now has five entries (Classic, X-Sudoku, Windoku, Killer, Thermo). The chips wrap into a balanced grid on narrow phones instead of overlapping; 3+2 at 390–430px, 2+2+1 at 320px, one row on a desktop sheet.
- Thermo lines are drawn inside the cells as SVG slices plus gutter connectors. The slice sits under the digit and pencil marks, and the bulb is translucent and larger than the glyph so it stays visible on a given cell without hiding it.

## [1.2.0] — 2026-11-07

Killer Sudoku arrives: cages with sums, a cage-aware solver and generation that starts from a solution.

### Added

- **Killer Sudoku.** The board is split into cages, each with a printed sum that its digits must reach without repeating. Killer is 9×9 only; 6×6 and 4×4 are disabled while it is selected.
- **Cage-aware engine.** The solver tracks each cage's remaining sum and used digits, narrows cells with the combinations that can still fit, and rejects cages whose cells cannot cover the remaining digits. `findSolutions` exposes the first N answers so the generator can peel ambiguity.
- **Killer generation.** Cages grow from a complete solution, then the generator compares the first two solutions and adds a given where they differ until the puzzle is unique. Cages stay at 2–4 cells so a phone generates a puzzle in well under a second.
- **Killer share codes.** Version 2 codes carry the cages (count, sums, one cage id per cell); version 1 codes keep decoding exactly as before. The share card and its downloadable image now show cage sums and walls, and name the puzzle type.
- Killer hints use cage-aware candidates for a naked single and otherwise reveal the next solution cell, because the technique engine does not reason about cages.

### Changed

- The puzzle type picker now has four entries (Classic, X-Sudoku, Windoku, Killer) and sits above the board size instead of beside it, so the row still fits a phone.
- `--box-w` was one gap pair too narrow, which shrank every derived length by about 4%. Windoku window outlines and Killer walls now sit exactly on the cell grid.

### Fixed

- A Killer cage never repeats a digit, so it can always reach its sum; generation rejects a neighbour whose solution digit is already in the cage.

## [1.1.1] — 2026-11-04

Home becomes a landing page: one Play button, and the setup sheet only appears when you press it.

### Changed

- **Home only shows the Play button and shortcuts.** Mode, puzzle type, board size and difficulty moved into a bottom sheet that opens from the Play card. The card names what will start (`Classic · Medium`), so the choice is visible without opening the sheet.
- **Home joins the shared page frame.** It now uses `--screen-w` (1080px) and the same header/content edges as Daily, Packs, Learn, Stats, Settings, About and Import; the old 760px column is gone. At 900px and up the Play card sits on the left with Continue under it, and the four shortcuts fill the right column; the block is centred vertically. On phones everything stays in one centred column with the footer above the tab bar.
- **The suggested tier is preselected** instead of being marked with a “Suggested for you” chip on the difficulty grid, which overlapped the tier names on narrow screens.
- Home drops the brand tagline and the empty “no game in progress” card; Continue appears only when a save exists.

### Removed

- `.mode-description`, `.home-suggestion`, `.quick-copy small`, `.continue-empty`, `.tier-suggest`, `.quick-grid`, and the `home.suggested` copy key (EN and ID).

## [1.1.0] — 2026-11-04

Three Sudoku types and three board sizes, and a quieter interface: menus and headers no longer carry taglines.

### Added

- **X-Sudoku.** The two main diagonals must also hold 1–9. Diagonal cells are tinted so the extra rule is visible on the board.
- **Windoku.** Four extra 3×3 windows (rows and columns 2–4 and 6–8) must each hold 1–9 as well. The windows are outlined on the board. Windoku is 9×9 only; the other sizes are disabled while it is selected.
- A puzzle type picker (Classic / X-Sudoku / Windoku) and a board size picker (9×9 / 6×6 / 4×4) on Home. The game subline names the type, and the choice survives “Next puzzle”.
- Share codes carry the variant in bit 3 of the header byte, so X-Sudoku and Windoku links reopen as the same type. Existing codes decode exactly as before.

### Changed

- **Less copy in menus.** Home loses the mode description, the adaptive suggestion line and the secondary line under every quick card. Daily, Packs, Learn, Stats, Settings and Import lose their header subtitles; functional help text stays.
- The engine's solver state is now built from every unit (rows, columns, boxes, windows, diagonals) instead of a fixed row/column/box set. Generation, grading and hints use the same code path for all variants.
- Hints label a Windoku window as “window N” instead of “the grid”.

## [1.0.7] — 2026-10-30

Every screen now lives inside the same page frame, so the title and cards no longer jump left or right when you change tabs.

### Changed

- **One page frame for every screen.** `--screen-w` in `src/styles/tokens.css` is now a single 1080px value shared by Daily, Packs, Learn, the lesson pages, Stats, Settings, About and Import. Headers, bodies and the lesson top bar all resolve to it, so the inner edge sits at the same place on every page at every width. Previously each screen picked its own width (1080 down to 760), which made navigation feel like the layout shifted.
- Lesson pages join the frame and gain a composition: at 900px and up the steps and warning sit in the left column, with practice, actions and the next-lesson card on the right. On phones the lesson still stacks in one column.
- Home keeps its landing-page treatment (brand header, narrow hero column); it is not one of the tabbed content screens.

## [1.0.6] — 2026-10-30

Every screen has a shape of its own on a desktop, and pencil marks stop lighting up in slots that hold no number.

### Fixed

- **Empty pencil-mark slots no longer highlight.** Selecting a cell's digit, or tapping a digit on the pad, tinted every corner slot for that digit — including the empty ones, which made a blank cell look half-pencilled. A slot now lights only when the digit is active *and* actually written in that cell. The rule is `isMarkHit()` in `src/ui/marks.ts`, covered by `tests/marks.test.ts`.

### Changed

- **One layout per screen instead of one layout for all.** The title bar sat at 1180px while every body was pinned at 880px (700–780 for About, Import and Settings), so headings never lined up with the cards below them. Each screen now carries a `--screen-w` that drives both, and from 900px up the pages compose differently: Daily keeps today's card beside the archive panel, Packs becomes a shelf (two-up at 900px, three-up at 1080px), Learn shows the curriculum in two columns, Stats leads with six tiles over a chart/summary row and a full-width achievement grid, Settings reads as a two-column masonry, About puts the story beside the reference cards, and Import shows the live preview next to the paste box. Phones keep the single-column stack.

## [1.0.5] — 2026-10-30

A full copy refresh. Every visible sentence was rewritten in both languages, in the same file and with every key kept.

### Changed

- **New wording across the app.** Home, game, daily, packs, learn, stats, achievements, settings, about, import, share, onboarding, toasts and the screen-reader announcements all use the refreshed EN and ID copy. Lesson steps and the crash-screen fallback were refreshed too.
- `src/i18n/copy.ts` was replaced wholesale, so the voice is consistent end to end. The supplied file kept all 466 keys and `{placeholders}` unchanged; the check now reports 467 after the Skyscraper label below.

### Fixed

- Settings rows keep their label readable on narrow screens: a wide segmented control, swatch row or select now wraps onto its own line instead of covering the words at 320px.
- Corrected wording that was mistranslated or misspelt in the supplied copy: "at most" in the swordfish tip, "Dua Bahasa", "orisinal", "Angka" for the number pad label, "Dari papan yang diketik", and the X-Wing elimination direction in Indonesian.
- The Skyscraper lesson no longer borrows the "pointing pair" label; it has its own `tech.skyscraper` entry in both languages.
- The onboarding language step shows each language's own sample phrase ("Let's play!" and "Mulai bermain!") instead of the Indonesian phrase on both cards, and reads it from `home.start` rather than a literal.

## [1.0.4] — 2026-10-29

The grids are easier to read, and every word in the app now lives in one file.

### Added

- **Clear 3×3 blocks.** The board paints a dedicated separator between the nine boxes: a wider gutter in a tone that sits between the cells and the frame. The rule follows the theme (a dark line on light, a light line on dark), strengthens in high contrast, and works the same on 6×6 and 4×4 boards.
- `src/i18n/copy.ts` holds every user-facing string: the EN and ID dictionaries, the ten lesson step lists, the share-sheet note and the crash-screen fallback. Edit copy there and run `pnpm i18n:check`.

### Changed

- The crash screen and the share sheet no longer carry their own bilingual literals; both read from the copy file, and the crash screen uses `CREDITS` for the author line.
- `pnpm i18n:check` now also verifies that every lesson exists in both languages with the same number of steps, and that the fallback copy has no missing keys.

## [1.0.3] — 2026-10-29

A player-requested release: past daily puzzles are playable again, and the
pencil marks of the digit you are looking at stand out.

### Added

- **Daily archive.** The Daily screen is now a month calendar with previous and next navigation. Every day since the 1.0.0 release is playable: tap a past day to start its deterministic puzzle, or to resume it if you left it unfinished. Solved days show a star and can be replayed; an in-progress day shows a dot and a legend, and future days stay disabled.
- Daily saves are stored one per date in `ayo.saves.v1` under `daily:YYYY-MM-DD`, so an unfinished board no longer disappears when the next day starts. A legacy single daily slot is migrated onto its date the first time saves are read.
- Backups merge and replace saves by their resolved date key instead of the raw slot name.

### Changed

- **Matching pencil marks are emphasised.** Selecting a cell (or tapping a digit on the pad) now also bolds the same digit inside other cells' corner and center marks. The emphasis is a full black/white luminance chip plus weight 900, so it reads without colour. It follows the existing Candidates highlight setting.
- Replaying a solved daily records the better result (more stars, then a faster time), so a replay cannot lower a stored day.

### Fixed

- Finished daily boards are pruned from the save log once the completion is recorded, so the archive does not keep a full command history per solved day.
- The Daily calendar announces each day's state to screen readers (play, solved, in progress, today, not out yet, unavailable).

## [1.0.2] — 2026-10-28

A maintenance release: progress totals that cannot shrink, a real choice when
restoring a backup, and a first offline visit that works.

### Added

- **Merge or replace on import.** Restoring a backup now asks how to treat the data. Merge keeps both histories and picks the better entry where they overlap; Replace makes the backup the whole truth and clears anything it does not carry.

### Changed

- **Lifetime totals.** Games, wins and best stars are kept in `ayo.totals.v1` instead of being recalculated from the capped result history, so the star count no longer drops when older results fall off the 600-game cap. Existing installs are migrated from their current history on first load.
- Backups are exported with a `totals` section and a format version of 2; version 1 backups still import.

### Fixed

- The service worker precaches the hashed bundle and stylesheet it finds in `index.html`, so the very first visit after install already works offline instead of relying on a previous network fetch to warm the runtime cache.
- The "Everything bagel" achievement now says what it actually checks: all four input modes, at any time.
- The loss screen shows "Try again" instead of the raw key `game.tryAgain`.
- Removed 112 unused translation keys and 27 dead exports, including duplicate helpers in the engine, the unused long-duration formatter and the unused share-URL builder.

## [1.0.1] — 2026-10-27

A polish release focused on clarity for colourblind players, a permanent install entry point, and safer backups.

### Added

- **Install any time.** A download chip in the Home header and an App card in Settings open the browser install prompt, with manual instructions when the prompt is unavailable. Both disappear once the app runs standalone.
- **Digit completion.** Placing the last copy of a digit now flashes every cell of that digit, marks the number-pad key as done with a check, and announces it to screen readers.
- **Backup validation.** Imports check the shape of every section and refuse corrupt saves, results, daily records, packs, achievements or meta instead of writing them.

### Changed

- **Same-digit highlight** is far stronger: a denser fill, a 2px inset ring and heavier type, so it reads by luminance and shape rather than hue alone.
- **Quieter chrome.** The bottom tabs are icon-only with accessible names and tooltips, the install card and banner use shorter copy, and the floating bar is a little slimmer.
- The number pad now counts only solution-correct placements and shows how many copies of each digit are left.

### Fixed

- The service worker checks the `sw-kill.json` rollback switch on navigation, at most once an hour, instead of only on activation.
- A daily replay only overwrites the stored result when it earns more stars or a faster time.
- The Home weekday now follows the same UTC day as the daily puzzle.
- Sheet focus trapping also covers non-dismissible sheets, and the decisive Close control is localised.
- The confetti loop cancels its frame on unmount.
- Removed a settings toggle that did nothing; the Auto marks tool is unchanged.

## [1.0.0] — 2026-10-26

The first public release, made by [ffrizzy](https://ffrizzy.vercel.app/). Play it at <https://ayosudoku.vercel.app/>.

### Added

- **Classic mode** across cozy, easy, medium, hard, expert and master tiers, with 4x4, 6x6 and 9x9 boards.
- **Daily mode** with a deterministic UTC puzzle, a weekday difficulty schedule, streaks and a calendar.
- **Zen and Challenge** modes with their own pacing and hint rules.
- **Three handcrafted puzzle packs** (24 puzzles) with star-gated progression.
- **Ten Learn lessons** with worked examples, techniques and practice puzzles.
- **Full game board**: values, corner and center pencil marks, color marks, peers, matching digits, conflicts and multi-select.
- **Undo and redo**, pause, timer, autosave, resume, restart and quit flows.
- **Hint planner** with nudges, pointers, reveals and plain-language explanations.
- **Share codes** with CRC validation, share cards and grid import.
- **Stats, records, stars, streaks and achievements** derived from local play history.
- **Settings**: theme, accent, digit style, input behavior, sound, haptics, left-handed layout, large text, high contrast, color-vision palette, reduced motion, language and data backup.
- **Onboarding** for language, privacy and the first puzzle.
- **English and Indonesian** UI with complete key parity.
- **PWA**: installable manifest, maskable icons, offline service worker, update banner, install banner and a JSON `sw-kill.json` rollback switch.
- **Accessibility**: keyboard play, roving board focus, live announcements, reduced motion, high contrast and visible focus.
- **Security headers** for Vercel, Netlify and Cloudflare Pages, with a strict CSP.
- Documentation: README, architecture notes, ADRs, pack format, contributing guide, security policy and citation metadata.

### Engine

- Pure TypeScript geometry and bitmask helpers for 4x4, 6x6, 9x9 and diagonal variants.
- Backtracking solver with constraint propagation and a uniqueness counter.
- Seeded PRNG, symmetric clue carving and human-style difficulty grading.
- Clue targets scale by board area, so 4x4 and 6x6 puzzles are carved instead of arriving filled.
- Deterministic daily generation and a Web Worker wrapper.
- 22 unit tests covering geometry, solving, uniqueness, generation, grading, hints, share codes, imports and backups.

### Fixed

- Hints close their sheet, shade the board and keep the explanation in a dismissible banner, so the nudge stays visible.
- The service worker only honours `/sw-kill.json` when it returns JSON with `kill: true`; a single page app answering unknown paths with `index.html` can no longer unregister it.
- Backups include and restore progress meta: lessons learned, modes and languages played, and the shared flag.
- "Back home" from an imported game returns to Home; pack and lesson games still return to their own screen.
- The motion setting reads "Reduce motion", matching what the on state does.
- Game and pause screens expose a level-one heading, and missing lesson or pack routes show translated copy instead of a raw key.
- Win, lose and pause exits are labelled by where they land: "Back home" for free play, "Done" when the game returns to a daily, pack or lesson screen.

[1.0.0]: https://github.com/ffrizzyy/ayo-sudoku/releases/tag/v1.0.0
