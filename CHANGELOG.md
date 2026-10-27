# Changelog

All notable changes to Ayo Sudoku! are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Conventional Commits](https://www.conventionalcommits.org/).

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
