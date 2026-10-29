import rawPacks from "../data/packs.json";
import type { PuzzleDef, Tier } from "../engine/types";
import { makeSpec } from "../engine/types";

export interface PackPuzzleContent {
  id: string;
  title: LocalizedText;
  givens: string;
  solution: string;
  tier: Tier;
  gradeScore: number;
  techniques: Record<string, number>;
  notes: LocalizedText;
}

export interface PackContent {
  schemaVersion: number;
  id: string;
  title: LocalizedText;
  author: string;
  unlockStars: number;
  accent: string;
  description: LocalizedText;
  puzzles: PackPuzzleContent[];
}

export interface LocalizedText {
  en: string;
  id: string;
  [locale: string]: string;
}

export const PACKS = rawPacks as PackContent[];

export function packPuzzleToPuzzle(pack: PackContent, content: PackPuzzleContent): PuzzleDef {
  return {
    id: content.id,
    spec: makeSpec(9),
    givens: content.givens,
    solution: content.solution,
    tier: content.tier,
    gradeScore: content.gradeScore,
    techniques: content.techniques,
    source: "handcrafted",
    author: pack.author,
    title: content.title.en,
  };
}

export function localize(text: LocalizedText, locale: string): string {
  return text[locale] ?? text.en;
}

export function packStars(
  pack: PackContent,
  solved: Record<string, { stars: number }>,
): number {
  return pack.puzzles.reduce((sum, puzzle) => sum + (solved[puzzle.id]?.stars ?? 0), 0);
}

export function isPackUnlocked(pack: PackContent, totalStars: number): boolean {
  return totalStars >= pack.unlockStars;
}
