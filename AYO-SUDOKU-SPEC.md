# Ayo Sudoku: product and engineering specification

Created by {{AUTHOR_NAME}} ({{AUTHOR_URL}})

Document version 1.0.0, written 23 October 2026. This file is the single source of truth for building Ayo Sudoku. An AI coding agent or a human developer can start from section 1 and work down.

## Contents

1. How to use this document
2. Product overview
3. Feature specification
4. Tech stack
5. Architecture and project structure
6. Algorithms
7. Data schema
8. Design system
9. Motion system
10. Screens and flows
11. Internationalization
12. Audio and haptics
13. Security and privacy
14. Accessibility
15. Performance budgets
16. Testing and quality
17. Developer experience
18. Game development stages
19. Release and live operations
20. Risks and open decisions
21. Appendices

---

## 1. How to use this document

### 1.1 Credit rules (mandatory)

The owner's name and link are stored as placeholders and must appear in every place listed below. The agent must not invent a name. If `{{AUTHOR_NAME}}` has not been replaced when the build starts, the agent keeps the literal placeholder in `src/config/credits.ts`, tells the owner in its first message, and replaces it everywhere once the owner answers.

Credit placement:

- `src/config/credits.ts` is the only file that holds the author string. Every other place imports from it.
- Home screen footer: "Made by {{AUTHOR_NAME}}".
- About screen with a Credits section (author, inspirations, open source licenses).
- Win screen footer, small text.
- HTML `<meta name="author">`, Open Graph tags, and `manifest.webmanifest` `author` field.
- `package.json` `author`, `LICENSE` copyright line, `README.md` header, `CITATION.cff`.
- Console banner printed once on load in production builds.
- Credit line on every shared puzzle card image and share link preview: "Ayo Sudoku by {{AUTHOR_NAME}}".

### 1.2 Reference credits

Ayo Sudoku takes inspiration from the following. None of them are affiliated with this project, and the app must say so on the About screen.

- Cracking the Cryptic and its Classic Sudoku app, for the idea of handcrafted puzzles, star based progression, and a solver friendly interface with pencil marks and logic tools. Do not copy their puzzles, name, logo, or screenshots.
- Apple Human Interface Guidelines, for the visual language. Do not use Apple logos, and do not bundle SF fonts (the license limits them to Apple platforms).
- Emil Kowalski's design engineering philosophy and animation guidance (animations.dev, Sonner, Vaul), for the motion rules in section 9.

### 1.3 Rules for the building agent

1. Work phase by phase using section 18. Do not start a phase before the previous exit criteria pass.
2. Before each phase, restate the plan in five lines or fewer, then build.
3. Commit after every checklist item. Use Conventional Commits.
4. Run `pnpm check` (lint, typecheck, unit tests) before every commit. Run end to end tests at the end of every phase.
5. Check each library's current documentation before using it. Versions named in this file are ranges to start from, not pinned facts. Record the versions chosen in `docs/adr/0001-stack.md`.
6. When this file is ambiguous, pick the simpler option, write the decision in `docs/adr/`, and continue. Ask the owner only when the choice changes scope or credit.
7. Keep the engine in `src/engine` free of React, DOM, and storage imports. A lint rule enforces this.
8. Do not add analytics, ads, accounts, or network calls unless a phase asks for them.
9. Every user facing string goes through i18n from the first commit. No hard coded UI text.
10. Every animation follows section 9. If an animation has no stated purpose, remove it.

### 1.4 Starting prompt for the agent

```text
Read AYO-SUDOKU-SPEC.md fully. Start Phase 0 from section 18.
Create the repo, tooling, CI, docs skeleton, and credits config.
Report what you built, the library versions you chose, and any open
decisions from section 20 that block Phase 1.
```

---

## 2. Product overview

### 2.1 Vision

Ayo means "let's go" in Indonesian. Ayo Sudoku is a friendly, polished Sudoku game for the browser that feels like a native iOS app. It is playable offline, works well on phones, and is useful for beginners and experienced solvers.

### 2.2 Audience

- Casual players who want a calm five minute puzzle.
- Learners who want to understand why a move is correct.
- Experienced solvers who want fast pencil marking, color marking, and hard puzzles.
- Indonesian and English speakers first, with more languages after.

### 2.3 Design principles

1. Clarity first. The grid is always the biggest element and always readable.
2. Fast input. Solvers should never wait for the interface.
3. Playful, not noisy. Bubbly motion appears on rare and meaningful moments, and stays small on frequent ones.
4. Explain, don't just reveal. Hints teach the technique.
5. Private by default. No tracking, no accounts needed.
6. Everyone can play. Accessibility is a launch requirement.

### 2.4 Reference app and planned upgrades

| Reference behavior (Classic Sudoku by Cracking the Cryptic) | Ayo Sudoku approach |
|---|---|
| Handcrafted, human play tested puzzles | Handcrafted packs in the same JSON format as generated puzzles, plus an unlimited generator with human style difficulty grading |
| Stars earned from solving, which unlock more puzzles | Stars (1 to 3 per puzzle) unlock packs and cosmetic themes |
| Pencil marks and logic tools | Corner marks, center marks, color marks, multi select by drag, auto candidates, conflict highlight |
| Fixed puzzle collection | Daily puzzle, endless mode, packs, shareable puzzle codes |
| Solve only | Interactive Learn section with technique lessons and a hint system that explains the logic |
| Standard 9x9 | Board engine supports 4x4, 6x6, 9x9, and the diagonal rule variant |
| Single look | Light, dark, auto, and color themes, many languages, accessibility palettes |

### 2.5 Scope

In scope for v1.0: everything marked "v1" in section 3. Out of scope for v1.0: user accounts, real time multiplayer, native app store builds, user generated puzzle uploads to a server.

---

## 3. Feature specification

Priority tags: v1 (launch), v1.1 (first update), later.

### 3.1 Game modes (mode switching)

| Mode | Description | Priority |
|---|---|---|
| Classic | Pick a difficulty, play a generated puzzle. Timer optional. | v1 |
| Daily | One puzzle per UTC day, same for everyone, with a calendar and streak. | v1 |
| Zen | No timer, no mistake counting, no scoring. Gentle sounds. | v1 |
| Speed | Countdown timer, bonus time for correct entries, ends when time hits zero. | v1.1 |
| Challenge | Limited mistakes (3 lives). Game over on the third. | v1 |
| Packs | Handcrafted collections unlocked by stars. | v1 |
| Learn | Interactive lessons for each technique with practice puzzles. | v1 |
| Mini | 6x6 board for short sessions. | v1 |
| Kids | 4x4 board with symbol mode and larger touch targets. | v1.1 |
| Diagonal | 9x9 with both main diagonals required to hold 1 to 9. | v1.1 |
| Import | Paste an 81 character string or share code to play any puzzle. | v1 |

Mode switching behavior:

- A segmented control on the Home screen switches between Classic, Daily, Zen, and Challenge. The thumb slides with a spring and the content below cross fades with a short blur bridge.
- Switching mode mid game asks for confirmation if progress would be lost, and offers to save the current game.
- Each mode keeps its own saved game slot, so switching never destroys progress.

### 3.2 Difficulty tiers

Cozy, Easy, Medium, Hard, Expert, Master. Details of the grader are in section 6.3. Difficulty names are translated and the internal ids stay stable (`cozy`, `easy`, `medium`, `hard`, `expert`, `master`).

### 3.3 Board interaction (v1)

- Select one cell by tap or click. Select many by drag, by shift click, or by holding the multi select toggle on touch.
- Input modes: Value, Corner marks, Center marks, Color. Switch by the segmented control, the keys `V`, `C`, `X`, `B` (see appendix A), or by holding a modifier while typing.
- Number pad with remaining count per digit. A digit with all nine placed dims and shows a checkmark.
- Tap a digit on the pad with no cell selected to highlight every cell holding that digit, and every cell where it is a candidate.
- Erase, undo, redo. History is unlimited within a game, stored as a list of compact commands.
- Conflict highlight: duplicate digits in a row, column, or box are marked with color and a small badge so color is not the only signal.
- Keyboard: arrows, WASD, digits 1 to 9, backspace, space to cycle input mode, Ctrl or Cmd with Z and Shift Z for undo and redo.
- Long press on a cell on touch opens a small menu to clear marks or set a color.

### 3.4 Assistance

- Auto candidates: fills all legal candidates on request. A setting can keep them updated as the player places digits.
- Mistake checking, three levels: Off, On entry (cell turns red immediately when it contradicts the solution), On request (a Check button).
- Hints in three steps: nudge (which region or technique to look at), pointer (the cells involved), reveal (the move and the explanation). Each step counts toward the hint tally.
- Highlight options: same digit, row and column, box, candidates of the selected digit.
- Smart cleanup: when a digit is placed, matching candidates in its peers are removed automatically if the setting is on.

### 3.5 Progression and rewards

- Stars per puzzle: 1 for finishing, 2 for finishing with at most two mistakes and no reveal hints, 3 for also finishing under the par time for that difficulty.
- Packs unlock at star thresholds.
- Daily streak with a freeze token earned every 7 days.
- Stats: games played, win rate, best time and average time per difficulty, current and best streak, hints used, accuracy. Presented with simple native charts.
- Achievements (list in appendix B).
- Optional adaptive difficulty suggestion on Home ("Try Hard today?") based on the last ten results.

### 3.6 Sharing and import

- Share code: a short URL-safe string that encodes variant, size, givens, and difficulty (format in section 7.5).
- Share card: an image generated on a canvas with the puzzle, difficulty, time, and credit line, shared through the Web Share API with a download fallback.
- Import from clipboard: accepts a share code or an 81 character string using digits and `.` or `0` for blanks.
- Export and import of the full save data as one JSON file for backup.

### 3.7 Settings

Language, theme (Auto, Light, Dark), accent color, board style, digit style (numerals, letters, shapes, emoji), highlight options, mistake checking level, auto candidates, timer visibility, sound on or off with volume, haptics, reduced motion override, high contrast, color vision palette, large text, left handed layout, keep screen awake, data export and import, reset data, About.

### 3.8 Learn

Lessons in order: Rules, Naked single, Hidden single, Pointing and claiming, Naked pairs and triples, Hidden pairs, X-Wing, Skyscraper, XY-Wing, Swordfish. Each lesson has a short text explanation, a small interactive board where the player finds the move, and a practice puzzle that requires the technique. Lessons use the same technique detectors as the hint system.

### 3.9 Onboarding

Three screens at most: language choice, a five step interactive tutorial on a 4x4 board, and the privacy statement. Skippable at any time and reachable again from Settings.

---

## 4. Tech stack

Choices favor a small bundle, strong typing, and a long maintenance life. Use the current stable major of each tool at scaffold time.

### 4.1 Core browser platform

| Area | Choice | Reason |
|---|---|---|
| Language | TypeScript, strict mode | Catches grid indexing and state bugs early |
| Rendering | DOM and CSS for the board, SVG for icons and marks, Canvas 2D for confetti and share cards | 81 cells is far below the point where a canvas or WebGL engine helps, and DOM gives free accessibility and text rendering |
| Concurrency | Web Workers through Comlink | Keeps puzzle generation off the main thread |
| Offline | Service Worker and Web App Manifest (PWA) | Installable and playable without a connection |
| Storage | IndexedDB through Dexie, `localStorage` for tiny preferences | Structured saves with versioned migrations |
| Audio | Web Audio API with a small built in synth | No audio files to download |
| Haptics | Vibration API where available | Feedback on Android and desktop devices that support it |
| Sharing | Web Share API, Clipboard API, Canvas `toBlob` | Native share sheet |
| Layout | CSS Grid, container queries, logical properties, `dvh` units | One layout for phone, tablet, desktop, and RTL languages |
| Color | CSS custom properties with `color-mix()` and `light-dark()` | Theme switching without rebuilding styles |

### 4.2 Frameworks and libraries

| Area | Choice | Notes |
|---|---|---|
| UI framework | React (current stable) | Large ecosystem and strong tooling |
| Build tool | Vite | Fast dev server, worker and PWA plugins |
| Styling | Tailwind CSS (v4) plus CSS variables from the design tokens | Tokens live in `src/styles/tokens.css`; Tailwind reads them |
| Components | Radix UI primitives, wrapped in `src/ui` | Dialog, Popover, ToggleGroup, Switch, Slider, Tabs with correct focus handling |
| Motion | `motion` (formerly Framer Motion) for springs and shared layout animation, CSS transitions for simple states | See section 9 |
| State | Zustand with a small history module | The game store has no React dependency in its logic |
| Validation | Zod | Validates saves, share codes, pack files, and settings |
| i18n | i18next with react-i18next, ICU message format plugin | Lazy loaded locale files |
| Routing | A minimal hash or history router (for example Wouter) | Few screens, small bundle |
| Icons | Lucide or a custom SVG set drawn on the same 24px grid | Rounded stroke ends match the bubbly style |
| Fonts | System UI stack first, Nunito (variable, self hosted) as the rounded fallback | See section 8.3 |
| Confetti | Custom canvas particle code (about 2 KB) or `canvas-confetti` | Pick the smaller result |
| PWA | `vite-plugin-pwa` (Workbox) | Precache the shell, runtime cache for locale chunks |

### 4.3 Game engine decision

No third party game engine is used. Phaser, PixiJS, and Godot web exports add hundreds of kilobytes, break native text selection and screen reader support, and solve problems this game does not have (sprites, physics, scene graphs). The "engine" in this project means the pure TypeScript logic in `src/engine`: board model, rules, solver, generator, grader, hints. If a future mode needs heavy particles or 3D, add a lazy loaded canvas layer behind a feature flag rather than changing the stack.

### 4.4 Tools

| Area | Choice |
|---|---|
| Package manager | pnpm |
| Lint and format | Biome (or ESLint with Prettier if the team prefers) |
| Unit tests | Vitest |
| Property tests | fast-check (solver and generator invariants) |
| Component tests | Testing Library |
| End to end | Playwright (Chromium, WebKit, Firefox, mobile viewports) |
| Accessibility checks | axe-core through Playwright and Vitest |
| Visual checks | Playwright screenshots, compared per theme and locale |
| Component workbench | Storybook (optional) |
| CI | GitHub Actions |
| Performance | Lighthouse CI and `size-limit` |
| Dependency updates | Renovate or Dependabot |
| Git hooks | Lefthook or Husky with lint-staged |
| Error reporting (optional, off by default) | Self hosted Sentry or none |
| Hosting | Cloudflare Pages, Vercel, Netlify, or GitHub Pages (static) |

### 4.5 Algorithms in use

Bitmask candidate sets, constraint propagation, Dancing Links (Algorithm X) for exact cover and uniqueness counting, minimum remaining values backtracking, randomized generation with a seeded PRNG, human technique solver for grading and hints, symmetric clue removal, and a compact share code encoder. Details are in section 6.

---

## 5. Architecture and project structure

### 5.1 Layers

```text
UI (React components, screens)
  |
Application state (Zustand stores, hooks, services)
  |
Engine (pure TypeScript: board, rules, solver, generator, grader, hints)
  |
Platform adapters (storage, audio, haptics, share, clock)
```

Rules: the UI calls the application layer. The application layer calls the engine and the adapters. The engine imports nothing from the layers above it. Adapters are injected so tests can replace them.

### 5.2 Folder structure

```text
ayo-sudoku/
  AGENTS.md                  Short guide for AI agents (links to this spec)
  AYO-SUDOKU-SPEC.md         This file
  README.md
  CONTRIBUTING.md
  CHANGELOG.md
  CITATION.cff
  LICENSE
  docs/
    architecture.md
    adr/                     Architecture decision records
    design/                  Exported tokens, screenshots
    puzzle-pack-format.md
  public/
    icons/                   PWA icons, maskable icon, favicon
    locales/                 en/, id/, ...
    _headers                 Security headers (Cloudflare or Netlify)
  src/
    config/
      credits.ts             Author, URLs, license text (single source)
      flags.ts               Feature flags
    engine/
      board.ts               Geometry, peers, units for any variant
      bitset.ts              Candidate bitmask helpers
      rules.ts               Conflicts, completion checks
      solver/
        dlx.ts               Exact cover solver
        propagate.ts         Singles and elimination
        techniques/          One file per technique detector
        grade.ts             Difficulty scoring
      generator/
        prng.ts              Seeded PRNG
        fill.ts              Complete grid creation
        carve.ts             Clue removal with uniqueness checks
        generate.worker.ts   Worker entry
      hints.ts               Hint planner and explanations
      share.ts               Encode and decode share codes
      index.ts
    app/
      stores/                game, settings, stats, daily, packs
      services/              save, audio, haptics, share, clock, i18n
      hooks/
    ui/
      primitives/            Button, Sheet, Toggle, Segmented, Toast, StatusPill
      board/                 Board, Cell, Marks, NumberPad, ModeBar
      screens/               Home, Game, Daily, Packs, Learn, Stats, Settings, About
      effects/               Confetti, Bubbles, Ripple
    styles/
      tokens.css             Design tokens (section 8)
      motion.css             Easing and duration tokens (section 9)
      base.css
    i18n/                    i18n setup, key types, plural rules
    data/
      packs/                 Handcrafted puzzle packs (JSON)
      lessons/               Learn content
    sw/                      Service worker customizations
    main.tsx
  tests/
    unit/  e2e/  fixtures/
  .github/workflows/         ci.yml, release.yml
  .devcontainer/
```

### 5.3 State management

- `gameStore`: current game (`GameState`, section 7.1), selection, input mode, history cursor. All mutations go through `applyCommand(command)` so undo and redo work from one place.
- `settingsStore`: persisted preferences. Theme is applied before first paint by a small external script in `<head>` that reads `localStorage`.
- `statsStore`, `dailyStore`, `packStore`: derived from IndexedDB, updated when a game ends.
- Autosave runs after every command with a 250 ms debounce, and on `visibilitychange` and `pagehide`.

### 5.4 Command model

Every board change is a command. Commands are small objects (`SetValue`, `ClearCell`, `ToggleCorner`, `ToggleCenter`, `SetColor`, `AutoCandidates`, `Batch`). Each command stores the information needed to reverse it. History is an array plus a cursor. A `Batch` groups multi cell operations into one undo step.

---

## 6. Algorithms

### 6.1 Board model

A board is described by `BoardSpec { size, boxRows, boxCols, diagonal }`. Cells are indexed `0..size*size-1`. The module precomputes, once per spec, the row, column, and box index of every cell, the list of units (rows, columns, boxes, and diagonals if enabled), and the peer list of every cell. Candidates are stored as integer bitmasks, bit `d-1` for digit `d`. Use `Uint16Array` for 16 digits or fewer.

### 6.2 Solver

1. Constraint propagation: naked singles and hidden singles, repeated to a fixed point.
2. Search: choose the cell with the fewest candidates (minimum remaining values), try each digit, propagate, recurse.
3. Exact cover: for uniqueness checks, convert the grid to an exact cover matrix (for 9x9: 729 rows, 324 columns) and run Dancing Links with Algorithm X. Stop after finding two solutions.

Public API:

```ts
solve(grid: Grid, spec: BoardSpec): Grid | null
countSolutions(grid: Grid, spec: BoardSpec, limit = 2): number
```

### 6.3 Difficulty grader (human technique solver)

The grader solves the puzzle the way a person would, always choosing the easiest available technique, and records which techniques were needed and how many times.

Technique order and base weights:

| Order | Technique | Weight |
|---|---|---|
| 1 | Naked single | 1 |
| 2 | Hidden single | 2 |
| 3 | Pointing pair or triple, box line reduction | 4 |
| 4 | Naked pair | 6 |
| 5 | Hidden pair | 8 |
| 6 | Naked triple, hidden triple | 11 |
| 7 | X-Wing | 16 |
| 8 | Skyscraper, two string kite | 20 |
| 9 | XY-Wing | 24 |
| 10 | Swordfish | 30 |

Score is the sum of weights of every step plus a bonus for the hardest technique used. Tier boundaries below are starting values. Tune them by playtesting and store them in `src/engine/solver/tiers.ts`.

| Tier | Hardest technique allowed | Typical clue count (9x9) |
|---|---|---|
| Cozy | Naked single | 40 to 46 |
| Easy | Hidden single | 34 to 40 |
| Medium | Pointing and claiming, naked pair | 30 to 35 |
| Hard | Hidden pair, naked triple, X-Wing | 26 to 32 |
| Expert | Skyscraper, XY-Wing | 23 to 29 |
| Master | Swordfish and beyond | 22 to 27 |

No tier may require guessing (trial and error). If the human solver gets stuck, the puzzle is rejected.

### 6.4 Generator

1. Create a seeded PRNG (`sfc32`, seed from a `cyrb128` hash of the seed string).
2. Fill the three diagonal boxes with shuffled digits, then complete the grid with randomized backtracking. This produces a uniformly varied full solution quickly.
3. Choose the removal order. Remove clues in symmetric pairs by default (rotational symmetry looks tidy), with an option for asymmetric puzzles.
4. After each removal, call `countSolutions(limit = 2)`. Keep the removal only if the count is exactly 1.
5. Stop when the target clue count is reached or no removal keeps uniqueness.
6. Grade the result. If the tier does not match the request, restart with the next seed from the same stream, up to a time budget (default 1500 ms for Cozy to Hard, 4000 ms for Expert and Master). If the budget is exceeded, serve a puzzle from a pre generated reserve for that tier.
7. Run in a Web Worker. Keep a small queue of ready puzzles per tier in IndexedDB so "New game" is instant.

Daily puzzle: seed is `ayo-daily-YYYY-MM-DD` using the UTC date. Every player gets the same puzzle. Show the reset time in the player's local time zone.

### 6.5 Hint planner

1. Run the human technique solver on the current player state (filled values and the player's candidates ignored, using true candidates).
2. Take the first step found. Convert it into three messages: a nudge (for example "Look at box 5"), a pointer (cells highlighted), and a reveal (the move and a plain language reason).
3. If the player has a wrong entry, the first hint points to the conflict instead.

Explanations are written as i18n templates with parameters (digit, cells, unit), so they translate cleanly.

### 6.6 Share code

Binary layout, then Base64url:

```text
byte 0      format version (1)
byte 1      variant bits (size, diagonal)
byte 2      difficulty id
bytes 3..   givens packed as 4 bit digits (0 = empty), padded
last 2      CRC16 of the preceding bytes
```

A 9x9 code is about 56 characters. Decoding validates the length, CRC, board spec, and that the puzzle has exactly one solution (checked in the worker) before play starts.

### 6.7 Par times and scoring

Par time per tier is derived from the grader score: `par = base[tier] + score * k`. Starting values: base 120 s for Cozy up to 900 s for Master, and `k = 1.2 s` per weight point. Tune after playtesting.

---

## 7. Data schema

All persisted data has a `schemaVersion`. Zod schemas in `src/app/schema/` are the source of types, and all reads from storage or imports pass through them.

### 7.1 TypeScript types

```ts
type Variant = 'classic' | 'diagonal';
type Tier = 'cozy' | 'easy' | 'medium' | 'hard' | 'expert' | 'master';
type GameMode = 'classic' | 'daily' | 'zen' | 'speed' | 'challenge' | 'pack' | 'learn' | 'import';
type InputMode = 'value' | 'corner' | 'center' | 'color';

interface BoardSpec {
  size: 4 | 6 | 9;
  boxRows: number;
  boxCols: number;
  variant: Variant;
}

interface PuzzleDef {
  id: string;                 // stable id, for example "gen:cozy:8f3a..." or "pack:starter:012"
  spec: BoardSpec;
  givens: string;             // length size*size, '0' or '.' for empty
  solution: string;           // same length, all digits
  tier: Tier;
  gradeScore: number;
  techniques: Record<string, number>;
  seed?: string;
  source: 'generated' | 'handcrafted' | 'imported';
  author?: string;            // credit for handcrafted puzzles
  title?: string;
}

interface CellState {
  value: number;              // 0 when empty
  given: boolean;
  corner: number;             // bitmask of corner marks
  center: number;             // bitmask of center marks
  color: number;              // 0 none, 1..9 palette index
}

interface GameState {
  schemaVersion: 1;
  id: string;                 // uuid
  mode: GameMode;
  puzzle: PuzzleDef;
  cells: CellState[];
  history: Command[];
  cursor: number;             // number of applied commands
  elapsedMs: number;
  mistakes: number;
  hintsUsed: { nudge: number; pointer: number; reveal: number };
  livesLeft?: number;         // challenge mode
  timeLeftMs?: number;        // speed mode
  startedAt: number;
  updatedAt: number;
  status: 'playing' | 'paused' | 'won' | 'lost';
}
```

### 7.2 IndexedDB tables (Dexie)

| Table | Key | Fields | Purpose |
|---|---|---|---|
| `saves` | `slot` (mode id) | `GameState` | One active game per mode |
| `results` | auto id | `puzzleId, mode, tier, timeMs, mistakes, hints, stars, finishedAt` | History and stats |
| `daily` | `date` (YYYY-MM-DD) | `puzzleId, status, timeMs, stars` | Calendar and streak |
| `packProgress` | `packId` | `solved: string[], stars: number` | Pack unlocks |
| `reserve` | auto id | `tier, spec, puzzle` | Pre generated puzzles |
| `achievements` | `id` | `unlockedAt, progress` | Achievements |
| `meta` | `key` | `value` | Install id (random, local only), schema version |

### 7.3 Settings (`localStorage`, key `ayo.settings.v1`)

```ts
interface Settings {
  schemaVersion: 1;
  locale: string;                       // BCP 47, for example "id" or "en"
  theme: 'auto' | 'light' | 'dark';
  accent: 'blue' | 'pink' | 'green' | 'orange' | 'purple' | 'teal';
  digitStyle: 'numerals' | 'letters' | 'shapes' | 'emoji';
  mistakeCheck: 'off' | 'onEntry' | 'onRequest';
  autoCandidates: boolean;
  smartCleanup: boolean;
  highlight: { sameDigit: boolean; peers: boolean; candidates: boolean };
  showTimer: boolean;
  sound: { on: boolean; volume: number };
  haptics: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  highContrast: boolean;
  colorVision: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  largeText: boolean;
  leftHanded: boolean;
  keepAwake: boolean;
  onboardingDone: boolean;
}
```

### 7.4 Handcrafted pack file (JSON, validated by Zod and JSON Schema)

```json
{
  "schemaVersion": 1,
  "id": "starter",
  "title": { "en": "Starter pack", "id": "Paket pemula" },
  "author": "{{AUTHOR_NAME}}",
  "unlockStars": 0,
  "puzzles": [
    {
      "id": "pack:starter:001",
      "title": { "en": "First steps", "id": "Langkah pertama" },
      "size": 9,
      "variant": "classic",
      "givens": "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79",
      "tier": "cozy",
      "notes": { "en": "Singles only.", "id": "Hanya angka tunggal." }
    }
  ]
}
```

The loader computes `solution`, verifies uniqueness, and grades each puzzle at build time. A pack with a non unique puzzle fails the build.

### 7.5 Migration

Each store has a `migrations` array. On load, if `schemaVersion` is lower than current, run migrations in order, write back, and keep a copy of the old record under `meta` for one release. Corrupt records are moved to a `quarantine` table and the player is told, with an option to export them.

### 7.6 Backup file

`ayo-sudoku-backup-YYYYMMDD.json` holds `{ app, version, exportedAt, settings, saves, results, daily, packProgress, achievements }`. Import validates with Zod, shows a summary, and merges by timestamp after confirmation.

---

## 8. Design system

The look follows Apple's iOS design language: large rounded shapes, soft translucent materials, clear hierarchy, and system colors. Bubbly character comes from generous corner radii, glossy highlights, and spring motion.

### 8.1 Design tokens

Tokens are CSS custom properties in `src/styles/tokens.css`. Light and dark values use `light-dark()` with `color-scheme` set from the theme.

```css
:root {
  color-scheme: light dark;

  /* System colors (iOS values) */
  --blue:    light-dark(#007AFF, #0A84FF);
  --green:   light-dark(#34C759, #30D158);
  --red:     light-dark(#FF3B30, #FF453A);
  --orange:  light-dark(#FF9500, #FF9F0A);
  --yellow:  light-dark(#FFCC00, #FFD60A);
  --pink:    light-dark(#FF2D55, #FF375F);
  --purple:  light-dark(#AF52DE, #BF5AF2);
  --teal:    light-dark(#5AC8FA, #64D2FF);
  --indigo:  light-dark(#5856D6, #5E5CE6);

  --accent: var(--blue);

  /* Surfaces */
  --bg:            light-dark(#F2F2F7, #000000);
  --surface:       light-dark(#FFFFFF, #1C1C1E);
  --surface-2:     light-dark(#F2F2F7, #2C2C2E);
  --surface-3:     light-dark(#E5E5EA, #3A3A3C);
  --separator:     light-dark(rgb(60 60 67 / 0.18), rgb(84 84 88 / 0.45));

  /* Labels */
  --label:         light-dark(#000000, #FFFFFF);
  --label-2:       light-dark(rgb(60 60 67 / 0.60), rgb(235 235 245 / 0.60));
  --label-3:       light-dark(rgb(60 60 67 / 0.30), rgb(235 235 245 / 0.30));

  /* Board */
  --cell-bg:       var(--surface);
  --cell-given:    var(--label);
  --cell-entry:    var(--accent);
  --cell-selected: color-mix(in oklab, var(--accent) 22%, transparent);
  --cell-peer:     color-mix(in oklab, var(--accent) 8%, transparent);
  --cell-same:     color-mix(in oklab, var(--accent) 30%, transparent);
  --cell-conflict: color-mix(in oklab, var(--red) 28%, transparent);

  /* Materials */
  --material-blur: blur(24px) saturate(180%);
  --material-bg:   light-dark(rgb(255 255 255 / 0.72), rgb(28 28 30 / 0.72));

  /* Radii */
  --r-xs: 8px;  --r-sm: 12px;  --r-md: 16px;  --r-lg: 24px;  --r-xl: 32px;  --r-pill: 999px;

  /* Spacing, 4 pt grid */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px;
  --s-6: 24px; --s-8: 32px; --s-10: 40px; --s-12: 48px;

  /* Shadows (soft, layered) */
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.06), 0 1px 1px rgb(0 0 0 / 0.04);
  --shadow-2: 0 4px 12px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.06);
  --shadow-3: 0 12px 32px rgb(0 0 0 / 0.14), 0 2px 6px rgb(0 0 0 / 0.08);

  /* Glossy bubble highlight for primary buttons and tiles */
  --gloss: linear-gradient(180deg, rgb(255 255 255 / 0.38), rgb(255 255 255 / 0) 55%);

  /* Hit area */
  --hit-min: 44px;
}
```

Corner shape: use `corner-shape: squircle` as a progressive enhancement where supported, with plain `border-radius` as the fallback. Never rely on it for layout.

Mark colors (nine, used for cell color marking) are the system colors above at 35 percent opacity, with a pattern overlay (dots, stripes, checks) option for color vision accessibility.

### 8.2 Color themes

Accent options: Blue (default), Pink, Green, Orange, Purple, Teal. Extra cosmetic themes unlock with stars (for example Sunset, Mint, Midnight). Every theme must meet the contrast targets in section 14.

### 8.3 Typography

Apple's SF fonts cannot be bundled on the web, so the stack uses the system fonts on Apple devices and a rounded fallback elsewhere.

```css
--font-ui: ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont,
           "Nunito", system-ui, "Segoe UI", Roboto, sans-serif;
--font-digits: ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif;
```

Use tabular figures (`font-variant-numeric: tabular-nums`) for the timer and stats. Scale (Apple text styles as a base, sizes in px at default text size):

| Style | Size / line height | Weight |
|---|---|---|
| Large title | 34 / 41 | 700 |
| Title 1 | 28 / 34 | 700 |
| Title 2 | 22 / 28 | 700 |
| Title 3 | 20 / 25 | 600 |
| Headline | 17 / 22 | 600 |
| Body | 17 / 22 | 400 |
| Callout | 16 / 21 | 400 |
| Subhead | 15 / 20 | 400 |
| Footnote | 13 / 18 | 400 |
| Caption | 12 / 16 | 400 |

Sizes use `rem` so the browser and the "large text" setting scale them.

### 8.4 Layout

- Mobile portrait: board fills the width minus 16 px margins, number pad and tool row below, status pill at the top.
- Mobile landscape and tablet: board on one side, controls on the other, mirrored when left handed or RTL.
- Desktop: centered board with a side panel for tools and stats, keyboard hints visible.
- Safe areas: respect `env(safe-area-inset-*)`.
- Board size: `min(100vw - 32px, 100dvh - header - controls, 640px)`, kept square with `aspect-ratio: 1`.

### 8.5 Board anatomy

```text
+-----------------------------------+
|  Board card (r-xl, shadow-2)      |
|  +--------+--------+--------+     |
|  | box    | box    | box    |     |   boxes are tiles with a 6 px gap
|  | 3x3    | 3x3    | 3x3    |     |   cells inside have a 2 px gap
|  +--------+--------+--------+     |   cell radius r-xs, box radius r-md
|  | ...                      |     |
+-----------------------------------+
```

- Givens: `--cell-given`, weight 600. Player entries: `--cell-entry`, weight 500.
- Corner marks: 9 small positions around the cell edge. Center marks: one centered line of small digits that wraps to two lines if needed.
- Selected cell: accent ring (2 px) plus tinted fill. Multi selection merges rings into one outline.
- Conflicts: red tint plus a small badge in the corner and a `aria-invalid` flag.
- Completed row, column, or box: a soft ripple (section 9.6) and a faint green tint that fades after 600 ms.

### 8.6 Components

Build each as a primitive in `src/ui/primitives` with variants, states (rest, hover, pressed, focus, disabled), and a story.

- Button: filled (accent with gloss), tinted, plain, destructive. 50 px tall, pill or `r-md` shape. Pressed state `scale(0.97)`.
- Segmented control: sliding thumb, used for mode switching and input modes.
- Sheet: bottom sheet on mobile, centered dialog on desktop, drag to dismiss, `r-xl` top corners.
- Toast: small pill, swipe to dismiss, stack of up to three (Sonner style).
- Status pill: a Dynamic Island style capsule at the top of the game screen. It shows the timer and mistakes, expands on tap to show hints used and the current mode, and morphs between states with a shared layout animation.
- Number pad key: large rounded key with the digit and a remaining count badge.
- Switch, Slider, Stepper, List row (grouped inset list like iOS Settings), Tab bar (Home, Daily, Learn, Stats, Settings).
- Card for packs and achievements with a glossy header.
- Empty states with a friendly illustration built from SVG circles ("bubbles").

### 8.7 Iconography and illustration

Rounded 2 px stroke icons on a 24 px grid. Illustrations use circles, blobs, and soft gradients so they match the bubble motif. All assets are vector and under 2 KB each when possible.

### 8.8 Bubbly background

Behind the home and win screens, three to five large blurred blobs drift slowly (transform only, 30 to 60 s loops). They pause when the tab is hidden, when reduced motion is on, and in battery saver mode. The game screen background is flat to protect focus.

---

## 9. Motion system

Motion follows Emil Kowalski's design engineering rules, adapted for a game. The aim is a bubbly feel without slowing the player down.

### 9.1 Decision framework

Before adding any animation, answer in order:

1. How often will the player see it? Many times per minute means almost no animation. A few times per session means a short animation. Rarely means expressive animation.
2. What is the purpose? Allowed purposes are feedback (the app heard me), orientation (where did that come from), delight on rare milestones, and continuity between states. Decoration alone is not a purpose.
3. Which easing? Never use the default CSS `ease` or `linear` for movement.
4. How fast? UI animation stays under 300 ms. Most are 120 to 220 ms.

### 9.2 Tokens

```css
:root {
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);     /* default for entrances and feedback */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* movement already on screen */
  --ease-sheet:  cubic-bezier(0.32, 0.72, 0, 1);     /* iOS style sheets and drawers */

  --dur-instant: 80ms;
  --dur-fast:   140ms;
  --dur-base:   200ms;
  --dur-slow:   280ms;
}
```

Check curve values on easing.dev when tuning. Springs for `motion`:

```ts
export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 1 },
  bubble: { type: 'spring', stiffness: 420, damping: 20, mass: 1 }, // slight overshoot
  sheet:  { type: 'spring', stiffness: 380, damping: 40, mass: 1 },
} as const;
```

### 9.3 Rules

1. Animate only `transform`, `opacity`, `filter` (for short blur bridges), and `clip-path`. Never animate width, height, top, left, or box shadow size on the board.
2. Nothing enters from `scale(0)`. Start at `scale(0.95)` with opacity 0.
3. Pressed state on every tappable element: `scale(0.97)` in 80 to 100 ms with `--ease-out`.
4. Popovers and menus scale from their trigger (`transform-origin` set to the trigger), not from the center.
5. Every interaction animation can be interrupted. A new tap during an animation retargets it from the current value.
6. Use a short blur (2 to 4 px) to bridge a cross fade between two states of different content, such as switching game mode.
7. Keyboard driven actions (arrow navigation, typing digits with a keyboard) have no movement animation for selection. Selection changes instantly. Typing a digit may show the 140 ms value pop described below.
8. Use `will-change: transform` only on elements that are animating right now.
9. Respect `prefers-reduced-motion`. Reduced motion removes movement, scale, and parallax and keeps opacity fades and color changes. It does not remove all feedback.
10. Pause every looping animation when the tab is hidden.

### 9.4 Animation catalogue

| Event | Frequency | Animation | Duration and easing |
|---|---|---|---|
| Move selection (tap) | Very high | Ring appears instantly, tiny `scale(1.03)` bubble on tap only | 120 ms, `spring.snappy` |
| Move selection (keyboard) | Very high | None | 0 |
| Place a digit | Very high | Digit pops from `scale(0.85)` to 1 | 140 ms, `spring.bubble` |
| Toggle a mark | Very high | Opacity fade only | 80 ms |
| Erase | High | Opacity fade out | 100 ms |
| Number pad press | Very high | Press scale 0.97 | 90 ms, `--ease-out` |
| Conflict appears | Medium | Tint fades in, cell nudges 2 px left and right once | 240 ms, `--ease-out` |
| Undo or redo | High | Affected cells fade between states | 100 ms |
| Hint highlight | Low | Cells pulse softly twice | 2 x 400 ms, `--ease-in-out` |
| Row, column, or box completed | Medium | Ripple wave across the unit, 24 ms stagger per cell | 360 ms total |
| Mode switch (segmented control) | Low | Thumb slides with `spring.snappy`, content cross fades with 3 px blur bridge | 200 ms |
| Sheet open and close | Low | Slide and fade, `--ease-sheet`, drag to dismiss with velocity | 280 ms |
| Toast | Low | Slide up from below with opacity | 200 ms |
| Status pill expand | Low | Shared layout morph | 240 ms, `spring.sheet` |
| Page transition | Low | Fade and 8 px shift | 180 ms, `--ease-out` |
| Win | Rare | Wave across the grid from the last cell, stars pop in sequence (120 ms stagger, `spring.bubble`), bubble confetti rises and pops (about 1.5 s) | Expressive allowed, still interruptible by tap |
| Game over (challenge) | Rare | Grid dims, lives bubbles pop one by one | 600 ms |
| New daily streak | Rare | Flame bubble bounces, count rolls up | 500 ms |

Win sequence is skippable with one tap, and the results panel is usable immediately.

### 9.5 Haptic and sound pairing

Each animation event with feedback pairs with a sound and a haptic tick from section 12, fired on the same frame, so the three channels feel like one event.

### 9.6 Performance checks

- Animate with the Web Animations API or `motion` transforms so work stays on the compositor.
- Test on a mid range Android phone with 4x CPU throttle. Frames above 16.7 ms during any animation fail the review.
- The board is split into memoized `Cell` components, and a cell re-renders only when its own state or its highlight flags change.

---

## 10. Screens and flows

### 10.1 Screen list

Splash, Onboarding, Home, Mode picker (part of Home), Game, Pause sheet, Hint sheet, Win, Game over, Daily calendar, Packs, Pack detail, Learn list, Lesson, Stats, Achievements, Settings, About and Credits, Import, Install prompt.

### 10.2 Home

```text
+-------------------------------+
| Ayo Sudoku              [gear]|
|                               |
|  [ Classic | Daily | Zen | Challenge ]
|                               |
|  Continue  (card: mode, tier, time, progress ring)
|                               |
|  New game   Difficulty: [Cozy Easy Medium Hard Expert Master]
|  [        Ayo, mulai!        ]  (primary button, localized)
|                               |
|  Daily puzzle   streak: 5     |
|  Packs         stars: 42      |
|                               |
|  Made by {{AUTHOR_NAME}}      |
+-------------------------------+
| Home  Daily  Learn  Stats  Settings |
+-------------------------------+
```

### 10.3 Game

```text
+-------------------------------+
| [back]  (status pill: 03:42 | 1 mistake)  [pause] |
|                               |
|            9x9 board          |
|                               |
| [Value][Corner][Center][Color]|
| [Undo][Redo][Erase][Hint][Auto]|
|  1  2  3  4  5  6  7  8  9    |
+-------------------------------+
```

### 10.4 Core flows

1. First launch: Splash, Onboarding (language, tutorial, privacy), Home.
2. New game: Home, choose mode and tier, generate in worker (skeleton board shown if it takes over 150 ms), Game.
3. Finish: last correct digit, win animation, Win screen with stars, time, share, next puzzle.
4. Interrupt: leaving the tab or app pauses the timer and autosaves. Returning shows the Pause sheet.
5. Daily: Daily tab, calendar shows solved days, tap today, play, streak updates.
6. Import: Settings or Home menu, paste, validate, preview, play.
7. Update: a new service worker is waiting, a toast offers "Update now". Never reload in the middle of a game.

### 10.5 Empty, loading, and error states

Every list and screen needs all three. Errors use plain language and offer a retry. A failed generation falls back to the reserve puzzle silently and logs a dev only warning.

---

## 11. Internationalization

### 11.1 Requirements

- Launch languages: English (`en`) and Indonesian (`id`). Architecture supports any language by adding a folder in `public/locales/<code>/`.
- Planned next: Spanish, French, German, Portuguese (Brazil), Japanese, Simplified Chinese, Arabic (RTL), Hindi.
- Language detection order: saved setting, `navigator.languages`, fallback `en`. The language picker lives in onboarding and Settings, shows each language in its own name, and switches instantly without a reload.
- Locale files load lazily, one JSON namespace per area (`common`, `game`, `learn`, `settings`, `hints`).
- Use ICU message format for plurals and gender neutral phrasing. Never concatenate translated fragments.
- Dates, numbers, and durations use `Intl` APIs with the active locale.
- RTL: use logical CSS properties (`margin-inline-start`, `inset-inline-end`) everywhere. The board itself keeps left to right digit order. Directional icons mirror.
- Digit style option supports locale numerals (for example Arabic-Indic) on the board, with a setting to turn it off.
- Text expands: layouts must survive 40 percent longer strings and long compound words.
- A script `pnpm i18n:check` fails CI when a key is missing in any locale, unused, or has mismatched placeholders. A pseudo locale (`en-XA`) is available in development to expose hard coded strings.

### 11.2 Key naming

`area.component.element`, for example `game.pad.erase`, `hints.nakedSingle.reveal`. Keys are typed from the English file so the compiler catches typos.

### 11.3 Sample strings

| Key | English | Indonesian |
|---|---|---|
| `home.start` | Let's go! | Ayo, mulai! |
| `home.continue` | Continue | Lanjutkan |
| `home.newGame` | New game | Permainan baru |
| `mode.classic` | Classic | Klasik |
| `mode.daily` | Daily | Harian |
| `mode.zen` | Zen | Santai |
| `mode.challenge` | Challenge | Tantangan |
| `tier.cozy` | Cozy | Santai sekali |
| `tier.easy` | Easy | Mudah |
| `tier.medium` | Medium | Sedang |
| `tier.hard` | Hard | Sulit |
| `tier.expert` | Expert | Ahli |
| `tier.master` | Master | Master |
| `game.undo` | Undo | Urungkan |
| `game.redo` | Redo | Ulangi |
| `game.erase` | Erase | Hapus |
| `game.hint` | Hint | Petunjuk |
| `game.pause` | Pause | Jeda |
| `win.title` | Well done! | Mantap! |
| `settings.title` | Settings | Pengaturan |
| `settings.language` | Language | Bahasa |
| `credits.madeBy` | Made by {name} | Dibuat oleh {name} |

Indonesian strings need a review by a native speaker before release.

---

## 12. Audio and haptics

- Sounds are synthesized with Web Audio (sine and triangle oscillators with short envelopes): tap, place, erase, error, hint, section complete, win, game over. Each stays under 250 ms except win (about 1.2 s).
- Sound is off until the player turns it on during onboarding or in Settings, because browsers cannot read the phone's silent switch. Volume is a slider. The audio context starts on the first user gesture.
- Haptics use `navigator.vibrate` with short patterns (10 ms tap, 20 ms error, a three pulse win). Where unsupported, the setting is hidden.
- Mute automatically when the tab is hidden.

---

## 13. Security and privacy

Ayo Sudoku v1.0 is a static client app with no accounts and no server side state, which keeps the attack surface small. Standards to follow: OWASP ASVS Level 1 for the client, OWASP Top 10 awareness, WCAG 2.2 AA, and Indonesia's Personal Data Protection Law (UU PDP No. 27 of 2022) and GDPR principles for any data handling.

### 13.1 Data handling

- No personal data is collected in v1.0. The install id is a random UUID kept in IndexedDB and never sent anywhere.
- No third party scripts, fonts, or trackers at runtime. Self host everything.
- A plain language privacy page lists what is stored on the device and how to delete it ("Reset all data" in Settings).
- If analytics are ever added, use a privacy friendly tool, require opt in, store no identifiers, and update the privacy page first.

### 13.2 HTTP headers

Set through `public/_headers` or the host's config.

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
```

The CSP forbids inline scripts, so the theme bootstrap script is an external file in `<head>`. Setting styles through the CSSOM (as React does) is allowed under `style-src 'self'`. Test the CSP in report only mode in Phase 4 before enforcing.

### 13.3 Application security checklist

- Never use `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`. A lint rule enforces it.
- Validate every external input with Zod: imported files, pasted codes, URL parameters, pack JSON. Enforce size limits (for example imports under 2 MB, share codes under 256 characters) before parsing.
- Parse JSON with a reviver or schema that drops `__proto__`, `constructor`, and `prototype` keys.
- Translations are plain text with ICU placeholders. Placeholders are escaped, and rich text uses a fixed set of tags rendered through `<Trans>` components.
- Share links carry the puzzle in the URL fragment (`#`), which is never sent to a server.
- Service worker: versioned caches, scope limited to `/`, update flow that never swaps code mid game, no caching of unknown origins.
- Subresource Integrity is unnecessary when everything is self hosted. If a CDN is ever used, add SRI hashes.
- Web Share and Clipboard calls are triggered only by user gestures.

### 13.4 Supply chain

- Commit the lockfile, install with `pnpm install --frozen-lockfile` in CI.
- Dependabot or Renovate with a weekly schedule, grouped minor updates.
- `pnpm audit` and `osv-scanner` in CI, failing on high severity.
- Keep the dependency count small. Each new dependency needs a one line reason in the pull request.
- Publish builds with provenance where the host supports it. Enable two factor authentication and branch protection on the repository.
- Add a `SECURITY.md` with a contact address and a disclosure policy.

### 13.5 If a backend is added later (Phase 7 option)

Leaderboards and sync need a server. Requirements before building it: passkeys (WebAuthn) as the main login, password hashing with Argon2id if passwords exist, short lived tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies, CSRF protection, rate limiting, schema validation on every endpoint, and server side score verification. For Daily leaderboards the client submits the move log, and the server replays it against the known puzzle to confirm the solution and a plausible time. No client reported score is trusted.

---

## 14. Accessibility

Target WCAG 2.2 AA. Accessibility checks are part of CI.

- Board semantics: `role="grid"` with rows and cells, roving `tabindex`, one tab stop for the board. Each cell has an accessible name such as "Row 3, column 5, 7, given" or "Row 3, column 5, empty, candidates 2 4 9".
- Announcements through a polite live region: placed digit, conflict, hint text, unit completed, win.
- Contrast: text 4.5:1, large text and UI components 3:1 against their background, in every theme and in both color schemes. A high contrast setting raises these further.
- Conflicts and selection never rely on color alone: badges, outlines, and patterns accompany color.
- Color vision palettes remap the nine mark colors and the accent. The pattern overlay option distinguishes marks without color.
- Touch targets at least 44 by 44 px. Cells are at least 36 px on the smallest supported viewport (320 px wide), and the number pad compensates with larger keys.
- Focus: visible focus ring (2 px accent plus 2 px offset) on every control. Focus returns to the trigger when sheets close.
- Text scaling to 200 percent without loss of content. Large text setting adds a further step.
- Reduced motion, reduced transparency (replaces blur materials with solid fills), and forced colors mode are supported.
- Symbol digit styles (letters, shapes, emoji) help players who confuse digits, with a hover or long press reveal of the numeric value.
- Provide a plain text board description on request for screen reader users.
- No time pressure in Classic and Zen. Timers can be hidden, and Speed mode is clearly marked.

---

## 15. Performance budgets

| Metric | Target |
|---|---|
| First load JS (gzip), home screen | 120 KB or less |
| Total JS after lazy chunks (gzip) | 300 KB or less |
| CSS (gzip) | 25 KB or less |
| Largest Contentful Paint (mid range phone, 4G) | under 1.5 s |
| Interaction to Next Paint | under 100 ms |
| Cumulative Layout Shift | under 0.02 |
| Lighthouse (Performance, Accessibility, Best Practices, SEO, PWA) | 95 or higher each |
| Frame rate during animations | 60 fps (no frame over 16.7 ms on test device) |
| Generation time, Cozy to Hard | under 300 ms median, under 1500 ms worst case |
| Generation time, Expert and Master | under 1500 ms median, under 4000 ms worst case |
| Memory after 30 minutes of play | no growth trend |

`size-limit` enforces bundle budgets in CI. Lazy load: Learn, Stats charts, Settings, Confetti, locale files other than the active one, and the generator worker.

---

## 16. Testing and quality

### 16.1 Unit and property tests

- Board geometry: units, peers, and indices for every supported spec.
- Solver: known puzzles with known solutions, empty grid, invalid grids, multi solution grids. Property: `solve` returns a grid that satisfies every unit.
- Generator: for 500 seeds per tier, the puzzle has exactly one solution, matches the requested tier, and is reproducible from its seed.
- Grader: each technique detector has fixtures that require it and fixtures that must not trigger it.
- Hints: applying the revealed move never contradicts the solution.
- Share codes: round trip for random puzzles, rejection of corrupted codes (CRC), truncated input, and oversize input.
- Command history: any random sequence of commands followed by full undo returns the initial state.
- Schema migrations: fixtures for every older version.

### 16.2 Component and end to end tests

- Component tests for Board, Cell, NumberPad, SegmentedControl, and Sheet, covering keyboard and pointer input.
- Playwright flows: onboarding, new game in each mode, play to a win using the seeded solution, pause and resume, reload mid game and recover, change language and theme, offline play, import and export, install prompt, update toast.
- Run on Chromium, WebKit, Firefox, plus mobile emulation (iPhone 14 class, Pixel class).
- Accessibility: axe on every screen in light, dark, high contrast, and RTL.
- Visual regression on the board and win screen per theme and per locale.

### 16.3 Manual checks before each release

Play one puzzle per tier on a real phone. Check airplane mode, rotation, text zoom, VoiceOver or TalkBack for the main flow, and a slow device.

### 16.4 Definition of done (every task)

Code reviewed or self reviewed against the checklist, tests added, no lint or type errors, strings translated or marked for translation, accessibility checked, animation reviewed against section 9, docs updated.

---

## 17. Developer experience

- One command setup: `pnpm install && pnpm dev`. A Dev Container and `.nvmrc` pin the toolchain.
- Scripts: `dev`, `build`, `preview`, `check` (lint, typecheck, unit tests), `test:e2e`, `i18n:check`, `packs:build` (validate and grade packs), `gen:reserve` (fill the puzzle reserve), `analyze` (bundle report).
- A dev only debug panel (toggle with `Ctrl+Shift+D`): set seed, force tier, show solution, show candidates, step the human solver with explanations, simulate slow generation, toggle reduced motion, FPS meter, clear storage.
- Storybook (or Ladle) for primitives and board states.
- `AGENTS.md` at the repo root gives AI agents the commands, structure, and rules from section 1.3 in under 80 lines.
- Documentation: `README.md` (what, run, build, deploy, credits), `CONTRIBUTING.md` (workflow, commit style, review checklist), `docs/architecture.md` (diagram from section 5), `docs/puzzle-pack-format.md`, ADRs for each major choice, a `CHANGELOG.md` kept with Conventional Commits and a release tool.
- Code style: small modules, named exports, no default exports except pages, comments explain why. The engine has JSDoc on every public function.
- Feature flags in `src/config/flags.ts` for unfinished modes, so main stays releasable.
- Error boundaries per screen, with a friendly fallback and a button to copy diagnostics.

---

## 18. Game development stages

Stages follow a standard game production path: pre production, prototype, vertical slice, alpha, beta, release, and live operations. Each stage lists goals, tasks, deliverables, and exit criteria. Work stays in order. Estimates are relative sizes (S, M, L), not dates.

### Phase 0: Pre production and foundations (S)

Goal: a repo anyone can run, with decisions recorded.

Tasks:
- [ ] Create the repo, license, README, `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CITATION.cff`.
- [ ] Set up Vite, React, TypeScript strict, Tailwind, Biome, Vitest, Playwright, Storybook.
- [ ] Create `src/config/credits.ts` and show the credit on a placeholder home page.
- [ ] Set up CI (lint, typecheck, unit, build, size-limit) and a preview deploy.
- [ ] Write ADRs for stack, state, i18n, storage.
- [ ] Add the design tokens file and a theme switcher test page.
- [ ] Set up i18n with `en` and `id` and the `i18n:check` script.

Exit criteria: `pnpm check` and CI pass, preview URL loads, credit visible, tokens render in light and dark.

### Phase 1: Engine prototype (M)

Goal: a correct, tested puzzle engine with no UI.

Tasks:
- [ ] Board model and bitmask helpers for 4x4, 6x6, 9x9, diagonal.
- [ ] Propagation solver, backtracking solver, DLX uniqueness counter.
- [ ] Seeded PRNG and generator with symmetric carving.
- [ ] Human technique detectors for the first six techniques, then the rest, and the grader.
- [ ] Hint planner with explanation templates.
- [ ] Share code encode and decode.
- [ ] Worker wrapper with Comlink and a reserve queue.
- [ ] Property tests and benchmarks (report generation times per tier).

Exit criteria: all tests pass, 500 seed generation check passes per tier, performance targets in section 15 met on a laptop, no UI imports in the engine.

### Phase 2: Playable core and vertical slice (L)

Goal: one mode (Classic) that feels finished.

Tasks:
- [ ] Game store, command model, undo and redo, autosave and resume.
- [ ] Board component with all four input modes, multi select, highlights, conflicts.
- [ ] Number pad, tool row, status pill, pause sheet.
- [ ] Home screen with mode control, tier picker, continue card.
- [ ] Motion system tokens and the animations marked "Very high" and "High" in section 9.4.
- [ ] Win screen with stars and the full win animation.
- [ ] Keyboard and touch input polish, haptics and sound engine.
- [ ] Light and dark themes at final quality for the game screens.

Exit criteria: a player can start, play, pause, reload, resume, and win a Classic game on phone and desktop. Animations pass the section 9 review. Playtest with at least five people and fix the top five issues.

### Phase 3: Alpha, all features in (L)

Goal: every v1 feature exists, even if rough.

Tasks:
- [ ] Zen, Challenge, Daily (with calendar and streak), Mini 6x6, Import.
- [ ] Packs system with the loader, build time validator, and a starter pack of at least 20 handcrafted puzzles (credited to their authors).
- [ ] Hints UI with three steps and explanations.
- [ ] Learn section with the first six lessons.
- [ ] Stats, achievements, adaptive difficulty suggestion.
- [ ] Settings screen with every option in section 3.7.
- [ ] Share card and share links, backup export and import.
- [ ] PWA: manifest, icons, offline shell, update toast, install prompt.
- [ ] Onboarding and tutorial.

Exit criteria: all v1 items in section 3 are reachable, feature flags are on for v1 items, no known data loss bugs, end to end suite covers each mode.

### Phase 4: Beta, polish and hardening (L)

Goal: quality and confidence.

Tasks:
- [ ] Full i18n pass, native review of Indonesian, RTL layout check with a pseudo RTL locale.
- [ ] Accessibility audit (axe, keyboard, VoiceOver, TalkBack), fix findings.
- [ ] Color vision palettes, high contrast, reduced motion, reduced transparency.
- [ ] Performance pass against section 15, bundle trimming, lazy loading.
- [ ] Security pass: CSP in report only mode, then enforce, dependency audit, input fuzzing on import and share code.
- [ ] Difficulty calibration with playtest data, adjust `tiers.ts` and par times.
- [ ] Remaining animations from section 9.4, mid range device profiling.
- [ ] Empty, loading, and error states on every screen.
- [ ] Learn lessons 7 to 10, Speed mode if time allows (otherwise v1.1).
- [ ] Documentation complete, screenshots for README and store listings.

Exit criteria: Lighthouse and axe targets met, zero open high severity bugs, CSP enforced without violations, beta testers report no blocking issues across two consecutive builds.

### Phase 5: Release candidate and launch (S)

Tasks:
- [ ] Freeze features, fix only blocking bugs.
- [ ] Final credits and license audit (fonts, icons, libraries, puzzle authors).
- [ ] Verify the About screen disclaimers (not affiliated with Apple or Cracking the Cryptic).
- [ ] Production build, header check on the live domain, PWA install test on iOS Safari, Android Chrome, desktop.
- [ ] Tag `v1.0.0`, publish the changelog, deploy.
- [ ] Monitor the first 72 hours (host logs, user reports).

Exit criteria: live site passes the release checklist in `docs/release-checklist.md`.

### Phase 6: Live operations and v1.1 (ongoing)

- Weekly: dependency updates, Daily puzzle health check (the generator must keep a 30 day reserve ahead of today).
- Monthly: new pack, review of player feedback, translation updates.
- v1.1 scope: Speed mode, Kids 4x4, Diagonal variant, more languages, more cosmetic themes, extra lessons.
- Later: killer, thermo, and arrow variants through a generic constraint layer on the engine, puzzle creator tool, optional backend for leaderboards (section 13.5), native wrappers (Capacitor) if demand exists.

---

## 19. Release and live operations

- Versioning: Semantic Versioning. Tags trigger the release workflow.
- Branching: trunk based with short lived branches and pull requests. Preview deploys per pull request.
- Environments: preview, production. No secrets exist in v1.0, and `.env.example` documents any future ones.
- Rollback: the host keeps previous deploys. The service worker supports a kill switch file (`/sw-kill.json`) that unregisters it on next load.
- Support: an in app Feedback link opens a prefilled issue or email draft with the app version, locale, and device class, and nothing else.
- Content updates: new packs ship as JSON in a normal release. Pack files are versioned and validated at build time.

---

## 20. Risks and open decisions

| Risk or decision | Mitigation or default |
|---|---|
| Generated puzzles feel mechanical compared with handcrafted ones | Human style grader, rejection of guess dependent puzzles, handcrafted packs, a "Feels good" rating hook for playtests |
| Difficulty tiers feel off | Calibrate with playtest data in Phase 4, keep thresholds in one file |
| Heavy animation hurts low end phones | Section 9.6 profiling, battery saver mode, reduced motion |
| iOS Safari PWA limits (no vibration API, storage eviction) | Hide haptics when unsupported, request persistent storage, offer backup export |
| Name and brand conflicts | Check "Ayo Sudoku" for trademark and store name conflicts before launch |
| Owner credit placeholder | Replace `{{AUTHOR_NAME}}` and `{{AUTHOR_URL}}` in Phase 0 |
| License choice | Default MIT for code with the owner's copyright line. Handcrafted puzzles keep a separate license note per author |
| Default language on first launch | Detect from the browser, show the picker in onboarding |
| Sound default | Off until the player opts in |
| Daily reset time | UTC midnight, with local time shown. Revisit if players in one region object |

Questions for the owner before Phase 0 ends: author name and link, domain name, preferred hosting, preferred accent color for the brand, any handcrafted puzzle authors to credit, and whether leaderboards matter for the first release.

---

## 21. Appendices

### Appendix A: Keyboard shortcuts

| Key | Action |
|---|---|
| Arrow keys or WASD | Move selection |
| 1 to 9 | Enter digit in the current input mode |
| Backspace or Delete | Erase selected cells |
| V, C, X, B | Switch to Value, Corner, Center, Color input |
| Space | Cycle input mode |
| Ctrl or Cmd + Z | Undo |
| Ctrl or Cmd + Shift + Z, or Ctrl + Y | Redo |
| Shift + arrow or Shift + click | Extend selection |
| Ctrl or Cmd + A | Select all cells |
| H | Hint |
| P or Esc | Pause |
| N | New game (with confirmation) |
| ? | Show shortcut list |

### Appendix B: Achievements (starter list)

First win, ten wins, one hundred wins, win without hints, win without mistakes, win a Hard puzzle, win a Master puzzle, seven day streak, thirty day streak, complete a pack, finish a Cozy puzzle in under two minutes, use every input mode in one game, finish the Learn section, share a puzzle, play in three languages, solve a puzzle in Challenge mode with all lives left.

### Appendix C: Glossary

- Given: a digit printed in the puzzle.
- Candidate: a digit that could still go in a cell.
- Corner mark and center mark: two styles of pencil marks.
- Peer: a cell sharing a row, column, or box with another cell.
- Unit: a row, column, box, or (in the diagonal variant) a diagonal.
- Naked single: a cell with exactly one candidate.
- Hidden single: a digit with only one possible cell in a unit.
- DLX: Dancing Links, a data structure used by Algorithm X for exact cover problems.
- PWA: progressive web app, a website that can be installed and used offline.

### Appendix D: Credits block for the About screen

```text
Ayo Sudoku
Created by {{AUTHOR_NAME}}  {{AUTHOR_URL}}
Version {{APP_VERSION}}

Inspired by Classic Sudoku from Cracking the Cryptic.
Visual language inspired by Apple's Human Interface Guidelines.
Motion principles inspired by Emil Kowalski's design engineering work.

Ayo Sudoku is an independent project. It is not affiliated with,
endorsed by, or sponsored by Apple Inc. or Cracking the Cryptic.

Open source licenses: see the Licenses page.
Handcrafted puzzles: credited to their authors on each puzzle.
```

End of specification.
