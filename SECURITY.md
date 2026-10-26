# Security policy

## Supported versions

Ayo Sudoku! is a static, local-first web app. Security fixes are applied to the latest release on `main`; older builds are not maintained.

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting on this repository:

<https://github.com/ffrizzyy/ayo-sudoku/security/advisories/new>

Include:

- A description of the issue and its impact.
- Steps to reproduce, ideally with a minimal share code or puzzle grid.
- The browser and version you tested.
- Any suggested fix, if you have one.

You can expect an initial acknowledgement within a few days. Once a fix is available, we will credit you in the release notes unless you prefer to stay anonymous.

## Scope and threat model

In scope:

- The share-code and grid importer (`src/engine/share.ts`), including malformed or hostile input.
- Stored-data handling and backup import (`src/app/storage.ts`, Settings → Data).
- Cross-site scripting through puzzle titles, lesson content or imported data.
- Service worker cache poisoning or an update path that serves stale code.
- Dependency vulnerabilities that affect the shipped bundle.

Out of scope:

- Denial of service through enormous local storage usage on a compromised device.
- Anyone with physical access to an unlocked browser reading `localStorage`. The app intentionally stores progress locally and unencrypted.
- Reports that require disabling the browser's same-origin policy.
- Social engineering.

## Design notes

- There is no backend, no account system and no telemetry.
- The app ships a strict Content-Security-Policy and related headers in `vercel.json` and `public/_headers`.
- Imported strings are rendered as text through React; they are never injected as HTML.
- Service worker updates require an explicit user action. `public/sw-kill.json` can retire a bad worker.
- All user data stays in `localStorage` under the `ayo.*` namespace and can be erased from Settings → Data.
