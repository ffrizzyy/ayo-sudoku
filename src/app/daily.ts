import type { Tier } from "../engine/types";

/**
 * Daily puzzles are deterministic: the same UTC date gives every player the
 * same seed and difficulty. Sunday is index 0, matching Date#getUTCDay().
 */
const SCHEDULE: readonly Tier[] = ["cozy", "easy", "medium", "medium", "hard", "expert", "medium"];

/**
 * The first daily puzzle the app ever published. The archive starts here so the
 * calendar cannot scroll back into dates that never had a puzzle.
 */
export const DAILY_EPOCH = "2026-10-26";

export function dailyDate(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function dailySeed(timestamp = Date.now()): string {
  return `ayo-daily-${dailyDate(timestamp)}`;
}

export function dailyTier(timestamp = Date.now()): Tier {
  return SCHEDULE[new Date(timestamp).getUTCDay()] ?? "medium";
}
