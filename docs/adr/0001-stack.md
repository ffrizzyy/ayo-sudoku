# ADR 0001: Stack and tooling

- **Status:** Accepted (the dictionary file moved; see ADR 0005)
- **Date:** 2026-10-24
- **Deciders:** ffrizzy

## Context

Ayo Sudoku! is a v1 browser game that must feel native, work offline, ship as a static build, and stay maintainable by one author. The source spec suggested React, TypeScript, Vite, Tailwind, Biome, Playwright, Storybook, Comlink and IndexedDB. That is a reasonable production stack, but several of those tools add configuration and dependency surface without changing what a player can do in v1.

## Decision

Use the smallest stack that delivers the product:

| Concern | Decision |
| --- | --- |
| UI | React 19.3 with TypeScript 5.9 in strict mode |
| Build | Vite 7.3 with `@vitejs/plugin-react` 5.2 |
| Styling | Handwritten CSS split into tokens, base, components and screens |
| Routing | A ~20-line hash router in `src/App.tsx` |
| i18n | A typed dictionary and provider in `src/i18n/index.tsx` |
| State | React context providers plus explicit functions in `src/app` |
| Persistence | Versioned `localStorage` |
| Generation | Pure TypeScript engine in a module Web Worker |
| Tests | Vitest 3.2 |
| Package manager | pnpm 12 |

Exact resolved versions are recorded in `pnpm-lock.yaml`. The app has no runtime dependency beyond React and React DOM.

### Why not Tailwind?

The design relies on semantic tokens (surfaces, board states, accents, accessibility overrides) and component-level layout. Plain CSS with custom properties keeps dark mode, accents, high contrast and color-vision palettes in one place and avoids a build-time class layer. The CSS is small enough to read end to end.

### Why not a routing library?

There are ten routes, no nested layouts that need route data, and the build is static. A hash router avoids host rewrite configuration and gives shareable deep links on any static host. If the app grows server-rendered routes or loaders, adopt a router then.

### Why not i18next?

The app needs two locales, nested keys, interpolation and compile-time key checking, not plural rules, lazy namespaces or a plugin ecosystem. A custom dictionary keeps the bundle small and lets `scripts/check-i18n.ts` compare both trees exactly. The trade-off is that adding a third language requires touching the dictionary type and the check script.

### Why not Biome, Playwright or Storybook?

- TypeScript strict mode plus `noUnusedLocals`/`noUnusedParameters` covers the highest-value static checks. A formatter/linter can be added without changing app code.
- The critical logic lives in the pure engine and is unit tested. The UI is covered by manual QA across the game flows; a Playwright suite is the next quality investment, not a v1 blocker.
- The UI primitives are few and are exercised in the real screens. Storybook would be a second app to maintain for a solo project.

These are deliberate scope choices, not claims that the tools are unnecessary at a larger scale.

### Why a Web Worker without Comlink?

`useGenerator` needs one request/response channel with cancellation. A tiny message protocol with request ids is less code than a proxy layer, and it keeps the worker boundary explicit. A main-thread fallback covers browsers or test environments where workers are unavailable.

## Consequences

- Setup is `pnpm install && pnpm dev`; there is no native toolchain and no backend.
- The production bundle is roughly 132 kB gzipped for the app plus 16 kB gzipped CSS, generated locally.
- Contributors must know CSS and React rather than a utility framework.
- Deep links use `#/...`, which is less pretty than path routing but portable.
- Adding linting, e2e tests or a component workshop later is additive; none of these decisions block it.
- The engine stays portable: it can be reused by a CLI, a test harness or a future native wrapper.
