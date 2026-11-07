# ADR 0012: Home shares the page frame and routes animate

- **Status:** Accepted
- **Date:** 2026-11-07
- **Deciders:** ffrizzy

## Context

Home was the last screen outside the shared frame. It used a large brand mark, a smaller title than every other screen, a vertically centred body and a shorter minimum height. Switching tabs therefore moved the title, the eyebrow and sometimes the fixed tab bar, even though the five primary tabs claim to be one shell. The tab bar jumped sideways whenever a longer screen added a classic scrollbar, and a long list could leave the next screen scrolled halfway down.

The shell also changed with no motion at all, which made the jumps feel like layout bugs rather than navigation.

## Decision

- Home uses the same `.screen-header` contract as Daily, Packs, Learn, Stats, Settings, About and Import: a `nav.home` eyebrow, the app name as the `h1`, the language, install and settings chips on the right, and body content that begins below the header (see the 1.4.4 amendment for the centred hero). The brand mark is removed from the header.
- `--shell-gutter` (tab height + safe-area bottom + 26px) is the one bottom inset. `.app-shell.has-tabs` pads by it and every tabbed screen subtracts it from `100dvh`, so short screens fill the viewport without growing a scrollbar.
- `html` reserves the scrollbar lane with `scrollbar-gutter: stable`. The fixed tab bar is centred in the same lane on every screen.
- A route change scrolls to the top in a layout effect, before paint.
- `.route-stage` wraps the routed screen and is keyed by path. Tab moves use a short horizontal slide in the direction of the tab order; deeper screens (Settings, About, Import, pack, lesson, game) use a small bubbly lift. The first paint has no animation. The existing reduced-motion rules collapse every transition to an instant change.

## Consequences

- Home is now one of the tabbed screens for layout purposes, while keeping its two-action composition. ADR 0006's note that Home sits outside the frame is superseded.
- Layout tests can compare Home's inner edges with the other screens; the QA suite also checks that the tab bar keeps the same rectangle before and after a tab move, and that a scroll change resets to the top.
- A new routed screen inherits the frame, the gutter and the transition without extra wiring. Only the tab-order map in `src/App.tsx` needs a new branch if it should slide rather than pop.
- Transforming the route stage creates a containing block for its fixed children during the animation. The decorative bubble backdrop is the only such child and is full-height, so the brief re-anchor is not visible; keep new fixed chrome outside `.route-stage`.

## Amendment (1.4.4): the hero returns to the centre

The shared header, page width and tab-bar contract stay exactly as decided above. The body of Home is a landing hero again:

- The hero is vertically centred in the space between the header and the footer, so Play sits around the middle of the viewport instead of directly under the title. `justify-content: safe center` falls back to top alignment when the hero is taller than the available space, so a short phone with large text can still scroll to the top of the mark.
- The 52px brand tile returns in the body, not in the header. It sits above the Play card and shares the `.about-mark`/`.welcome-mark` tile style.
- On desktop the hero is a two-column grid (`1.1fr 0.9fr`). The mark is placed in the first column above Play, so it centres over the action it belongs to rather than floating between Play and Continue. When there is no save, Play spans both columns and the mark centres over the full row.
- Header and footer keep the full `--screen-w` width, so the title, action chips and footer still line up with the other tabs. Only the hero column is centred.
