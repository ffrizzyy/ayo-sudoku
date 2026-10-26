# Changelog

All notable changes to Ayo Sudoku! are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Conventional Commits](https://www.conventionalcommits.org/).

## [1.0.0] — 2026-10-26

The first public release, made by [ffrizzy](https://ffrizzy.vercel.app/).

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
- **PWA**: installable manifest, maskable icons, offline service worker, update banner, install banner and `sw-kill.json` rollback switch.
- **Accessibility**: keyboard play, roving board focus, live announcements, reduced motion, high contrast and visible focus.
- **Security headers** for Vercel, Netlify and Cloudflare Pages, with a strict CSP.
- Documentation: README, architecture notes, ADRs, pack format, contributing guide, security policy and citation metadata.

### Engine

- Pure TypeScript geometry and bitmask helpers for 4x4, 6x6, 9x9 and diagonal variants.
- Backtracking solver with constraint propagation and a uniqueness counter.
- Seeded PRNG, symmetric clue carving and human-style difficulty grading.
- Deterministic daily generation and a Web Worker wrapper.
- 18 unit tests covering geometry, solving, uniqueness, generation, grading, hints, share codes and imports.

[1.0.0]: https://github.com/ffrizzyy/ayo-sudoku/releases/tag/v1.0.0
