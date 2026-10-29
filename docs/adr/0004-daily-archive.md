# ADR 0004: Past dailies are saved per date

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** ffrizzy

## Context

A daily puzzle is deterministic: `ayo-daily-YYYY-MM-DD` is the seed, so any past date can be regenerated exactly. The first release kept only one daily save slot, which meant starting a new day discarded the unfinished board from the day before and the UI had no way to reach earlier puzzles.

Players asked to catch up on dailies they missed. The archive must work offline, survive a restart and stay small; it must also not invent dates before the app existed.

## Decision

- Store each daily save in `ayo.saves.v1` under `daily:<YYYY-MM-DD>`. Non-daily modes keep their single slot key (`classic`, `zen`, …).
- Migrate the legacy `daily` slot onto its date the first time saves are read. Backups merge saves by their resolved key, so old and new formats can be restored side by side.
- Offer the archive on the Daily screen: a month grid with previous/next navigation, clickable past days, a solved star and an in-progress dot. Tapping a day resumes its save when one exists; otherwise it starts the deterministic puzzle for that date.
- Set `DAILY_EPOCH = 2026-10-26` (the 1.0.0 release). Navigation cannot go before that month, and earlier days are disabled.
- Drop the save when a daily is finished. The completion is recorded in `ayo.daily.v1` and in the result history, so the archive does not keep a whole puzzle log per solved day.
- A finished daily can be replayed. `recordResult` keeps the better record (more stars, then faster time), so a replay cannot lower an existing result.

## Consequences

- The Daily screen reads and writes one key per date without touching the puzzle engine.
- Catch-up completions count toward the current streak and toward achievements. This is intentional for a local single-player game: a player who fills a gap is not penalised for missing a day.
- Storage grows with unfinished past dailies only. Finished boards are pruned automatically.
- The archive is a view over local data, so it works offline and needs no server or account.
- If the epoch ever needs to move, past days before it stay unplayable rather than being generated retroactively.
