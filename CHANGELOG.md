# Changelog

All notable changes to Ayo Sudoku! are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Conventional Commits](https://www.conventionalcommits.org/).

## [1.0.5] — 2026-10-30

A full copy refresh. Every visible sentence was rewritten in both languages, in the same file and with every key kept.

### Changed

- **New wording across the app.** Home, game, daily, packs, learn, stats, achievements, settings, about, import, share, onboarding, toasts and the screen-reader announcements all use the refreshed EN and ID copy. Lesson steps and the crash-screen fallback were refreshed too.
- `src/i18n/copy.ts` was replaced wholesale, so the voice is consistent end to end. The supplied file kept all 466 keys and `{placeholders}` unchanged; the check now reports 467 after the Skyscraper label below.

### Fixed

- Settings rows keep their label readable on narrow screens: a wide segmented control, swatch row or select now wraps onto its own line instead of covering the words at 320px.
- Corrected wording that was mistranslated or misspelt in the supplied copy: "at most" in the swordfish tip, "Dua Bahasa", "orisinal", "Angka" for the number pad label, "Dari papan yang diketik", and the X-Wing elimination direction in Indonesian.
- The Skyscraper lesson no longer borrows the "pointing pair" label; it has its own `tech.skyscraper` entry in both languages.

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
