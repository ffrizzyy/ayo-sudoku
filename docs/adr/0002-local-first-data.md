# ADR 0002: Local-first data in localStorage

- **Status:** Accepted
- **Date:** 2026-10-24
- **Deciders:** ffrizzy

## Context

The game must save progress, settings, results, daily history, pack stars and achievements, work offline, and require no account. The spec proposed IndexedDB (via Dexie) with a store per domain.

The realistic data volume is small: one save per mode (seven), a capped result history, one daily record per day, 24 pack entries and a handful of preferences. A save is a puzzle definition plus a command log; even a long game is well under a few hundred kilobytes.

## Decision

Persist everything in `localStorage` through `src/app/storage.ts`, using versioned JSON keys:

```text
ayo.settings.v1   ayo.saves.v1      ayo.results.v1   ayo.daily.v1
ayo.packs.v1      ayo.achievements.v1  ayo.meta.v1
ayo.theme         ayo.install.dismissed
```

- Reading is synchronous, which lets settings and the pre-paint theme bootstrap initialize without a loading state.
- Writes are wrapped in `try/catch`; quota or privacy-mode failures degrade to an in-memory session instead of crashing.
- Backups export the whole namespace as one JSON document with a schema version. Restore validates before replacing.
- Result history is capped when written so the total stays bounded.
- `navigator.storage.persist()` is requested once at startup where supported, to reduce eviction risk.

The save model is a command log plus a cursor, not a database of moves. The current board is stored as `CellSnapshot[]` (value, given, corner mask, center mask, color), and each `Command` stores before/after snapshots for undo and redo. This makes the persisted shape independent of UI state and easy to validate on load.

## Consequences

- Boot is instant and works in private windows (subject to browser storage rules).
- The whole namespace is visible to anyone with access to the browser profile. The app is explicit that data is local and unencrypted.
- `localStorage` is synchronous; a very large export/import could block briefly. History caps and small payloads keep this negligible.
- Cross-tab sync is not implemented. Two open tabs can overwrite each other's last write; a future version can add a `storage` event bridge.
- Moving to IndexedDB later is a storage-layer change: screens already consume functions from `storage.ts` and `data.tsx`, not raw keys. A migration can read `ayo.*`, write the new store, and keep the backup format.
- There is no server-side score verification, leaderboard or sync. Those features would require a backend and are out of scope for v1.
