# Contributing to Ayo Sudoku!

Thanks for helping. Ayo Sudoku! is a local-first browser game made by [ffrizzy](https://ffrizzy.vercel.app/). Small, focused changes are easiest to review.

## Setup

```bash
pnpm install
pnpm dev
```

Requirements: Node.js 22.12+ and pnpm 12+. The app has no backend and no environment variables.

Before opening a pull request:

```bash
pnpm check
pnpm build
```

## Workflow

1. Open an issue for anything larger than a typo or a one-line fix.
2. Keep pull requests small and scoped. One concern per PR.
3. Add or update tests for engine behavior. UI changes should include a short manual test note.
4. Update `CHANGELOG.md` when the change is user-visible.
5. Use Conventional Commits:
   - `feat: add diagonal variant to challenge mode`
   - `fix: keep corner marks when undo restores a cell`
   - `docs: explain the pack schema`
   - `chore: bump vite`

## Code conventions

- TypeScript strict mode is on. No `any` unless it is contained and explained.
- Named exports, except screen components where a named export is still preferred.
- The engine (`src/engine`) must remain pure: no React, DOM, storage, network or timers.
- Every board mutation goes through `applyCommand`-style reversible changes so undo and redo stay correct.
- Every user-facing string belongs in both `src/i18n` dictionaries. Run `pnpm i18n:check`.
- Import the author from `src/config/credits.ts`; never duplicate the credit string.
- Use the CSS custom properties in `src/styles/tokens.css` instead of hard-coded colors or spacing.
- Motion must be purposeful and must respect `data-reduced-motion`.
- Do not add analytics, ads, accounts or runtime network calls.

## Adding a translation

1. Add the key to the `en` object in `src/i18n/index.tsx`.
2. Add the same key to `id` with a natural Indonesian translation (not machine output pasted unedited).
3. Run `pnpm i18n:check`.
4. Check the layout at the longest string; Indonesian labels are often longer than English.

## Adding a puzzle pack

See [docs/puzzle-pack-format.md](docs/puzzle-pack-format.md). Packs must be uniquely solvable and graded by the engine. Do not copy puzzles from another app.

## Review checklist

- [ ] `pnpm check` and `pnpm build` pass.
- [ ] The change works with keyboard only and at 320 px width.
- [ ] Light, dark, high-contrast and reduced-motion modes still look right.
- [ ] Both English and Indonesian strings exist.
- [ ] Saves from before the change still load, or a migration is included.
- [ ] Credits to ffrizzy remain intact.
- [ ] No new runtime network request.
