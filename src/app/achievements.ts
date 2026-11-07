import type { GameResult, Meta, PackProgress, Totals } from "./storage";
import type { Variant } from "../engine/types";
import { LESSONS } from "./lessons";
import { PACKS } from "./packs";
import { VARIANTS } from "./variants";

/**
 * Unlock order used by the Stats grid. Ids match the keys under `achievements`
 * in `src/i18n/copy.ts`.
 */
export const ACHIEVEMENTS = [
  "firstWin",
  "tenWins",
  "hundredWins",
  "noHints",
  "noMistakes",
  "hardWin",
  "masterWin",
  "streak7",
  "streak30",
  "packComplete",
  "cozyFast",
  "allModes",
  "learnComplete",
  "shared",
  "threeLanguages",
  "challengePerfect",
  "diagonalWin",
  "windokuWin",
  "killerWin",
  "thermoWin",
  "miniWin",
  "allVariants",
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number];

/** Results recorded before variants existed are Classic puzzles. */
export function resultVariant(result: GameResult): Variant {
  return result.variant ?? "classic";
}

/**
 * Pure rule set for every achievement. `recordResult` appends the result, then
 * asks which ids are now earned; the caller stores the new ones.
 */
export function newlyUnlocked(
  results: GameResult[],
  packs: PackProgress,
  meta: Meta,
  totals: Totals,
  bestStreak: number,
): AchievementId[] {
  const ids: AchievementId[] = [];
  const wins = results.filter((result) => result.won);
  const variantsWon = new Set(wins.map(resultVariant));

  if (totals.wins >= 1) ids.push("firstWin");
  if (totals.wins >= 10) ids.push("tenWins");
  if (totals.wins >= 100) ids.push("hundredWins");
  if (wins.some((result) => result.hints === 0)) ids.push("noHints");
  if (wins.some((result) => result.mistakes === 0)) ids.push("noMistakes");
  if (wins.some((result) => ["hard", "expert", "master"].includes(result.tier))) ids.push("hardWin");
  if (wins.some((result) => result.tier === "master")) ids.push("masterWin");
  if (bestStreak >= 7) ids.push("streak7");
  if (bestStreak >= 30) ids.push("streak30");
  if (PACKS.some((pack) => pack.puzzles.every((puzzle) => packs[puzzle.id]))) ids.push("packComplete");
  if (wins.some((result) => result.tier === "cozy" && result.timeMs < 120000)) ids.push("cozyFast");
  if (meta.modesUsed && meta.modesUsed.length >= 4) ids.push("allModes");
  if (meta.lessonsLearned.length >= LESSONS.length) ids.push("learnComplete");
  if (meta.shared) ids.push("shared");
  if (meta.languagesPlayed.length >= 2) ids.push("threeLanguages");
  if (wins.some((result) => result.mode === "challenge" && (result.livesLeft ?? 0) === 3)) {
    ids.push("challengePerfect");
  }
  if (variantsWon.has("diagonal")) ids.push("diagonalWin");
  if (variantsWon.has("windoku")) ids.push("windokuWin");
  if (variantsWon.has("killer")) ids.push("killerWin");
  if (variantsWon.has("thermo")) ids.push("thermoWin");
  if (wins.some((result) => result.size < 9)) ids.push("miniWin");
  if (VARIANTS.every((variant) => variantsWon.has(variant))) ids.push("allVariants");
  return ids;
}
