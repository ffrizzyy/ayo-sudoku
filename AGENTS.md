# AGENTS.md

Ayo Sudoku! is a local-first Sudoku PWA. This file is the short operating manual for AI agents. Human contributors should read `CONTRIBUTING.md`.

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # typecheck + unit tests + EN/ID key parity
pnpm test         # Vitest only
pnpm build        # typecheck + production build into dist/
pnpm preview      # serve dist/
pnpm gen:pack     # regenerate src/data/packs.json
```

Run `pnpm check` before every commit and `pnpm build` before every push. This repository uses Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

## Layout

- `src/engine/` — pure TypeScript puzzle engine. **Never import React, DOM or storage here.**
- `src/app/` — persistence, settings, stats, achievements, audio, packs, lessons, generator hook.
- `src/screens/` — one component per route.
- `src/ui/` — board, number pad, sheets, icons, primitives.
- `src/i18n/copy.ts` — every user-facing string: the EN and ID dictionaries, lesson steps and the crash-screen fallback.
- `src/i18n/index.tsx` — the `useI18n()` hook, lookup/interpolation and formatters.
- `src/styles/` — tokens, base, components, screens. Plain CSS; no Tailwind.
- `src/config/credits.ts` — the only source of the author string.
- `public/` — manifest, icons, service worker, theme bootstrap, headers.
- `docs/adr/` — decisions and deliberate spec deviations.

## Rules

1. **Credit:** the app is by `ffrizzy` (https://ffrizzy.vercel.app/). Import `CREDITS`; do not hard-code the name in new UI. The name must stay in the footer, About, win sheet, metadata, manifest, package.json, LICENSE, README and CITATION.
2. **i18n:** every user-facing string goes through `src/i18n/copy.ts`. Add the key to both `en` and `id`, then run `pnpm i18n:check`. Never ship English-only UI, and never leave copy in a screen.
3. **Engine purity:** engine modules are deterministic, framework-free and unit tested. Add a test for every bug fix.
4. **Storage:** keys are versioned (`ayo.*.v1`). Change the schema version and migrate when the shape changes. Never send local data to a server.
5. **PWA:** bump the cache version in `public/sw.js` when changing shell assets. Keep `theme.js` external; the CSP forbids inline scripts.
6. **Accessibility:** keep focus visible, labels real, keyboard paths working, and preserve reduced-motion and high-contrast behavior.
7. **No new dependencies without a reason.** Prefer the existing primitives and CSS tokens.
8. **Scope:** no analytics, ads, accounts or runtime network calls.

## Gotchas

- The router is hash-based (`#/daily`), so new screens need a branch in `src/App.tsx` and, if useful, a tab.
- A puzzle is deterministic from its seed. Daily seeds are `ayo-daily-YYYY-MM-DD` in UTC.
- `SavedGame` is a command log plus a cursor. Board mutations must produce reversible `CellChange[]`.
- The service worker registers in production only; test offline behavior with `pnpm build && pnpm preview`.
- Win/lose recording lives in `src/screens/Game.tsx`; stats and achievements are derived in `src/app/data.tsx`.
