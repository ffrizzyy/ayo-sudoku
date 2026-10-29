# ADR 0005: One file for every user-facing string

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** ffrizzy

## Context

The EN and ID dictionaries lived in `src/i18n/index.tsx`, between the React imports and the provider. Lesson steps were in `src/app/lessons.ts`, the crash screen had its own inline bilingual strings, and the share sheet carried one hard-coded sentence. Editing copy meant knowing which of four files to open, and it was easy to add a string that only existed in English.

## Decision

`src/i18n/copy.ts` is the only file for user-facing copy. It exports:

- `en` and `id`, the two dictionaries, with `Dictionary = typeof en` and `dictionaries`.
- `LESSON_STEPS`, the step lists used by `src/app/lessons.ts`.
- `FALLBACK_COPY`, the crash-screen strings that render before the i18n provider mounts.

`src/i18n/index.tsx` keeps the provider, lookup, interpolation and formatters, and re-exports the dictionaries so imports such as `{ en, id }` keep working. `scripts/check-i18n.ts` now also checks that lesson steps and fallback copy exist in both languages.

Shell metadata that a browser or store reads directly (`index.html`, `public/manifest.webmanifest`) stays with those files.

## Consequences

- Adding or changing copy is a single-file edit, with both languages in view.
- A screen that hard-codes a string is a review error, not a documentation detail; `AGENTS.md` says so explicitly.
- The provider code is separate from the words, so the copy file can be diffed and translated without touching React.
- Lesson content remains typed against `LocalizedList`, so a missing language fails the build rather than the check.
