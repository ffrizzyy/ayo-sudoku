/**
 * Shared engine types. The engine is pure TypeScript: no React, DOM or storage.
 */

export type Size = 4 | 6 | 9;
export type Variant = "classic" | "diagonal";
export type Tier = "cozy" | "easy" | "medium" | "hard" | "expert" | "master";
export type Difficulty = Tier;

export const TIERS: readonly Tier[] = ["cozy", "easy", "medium", "hard", "expert", "master"];

export interface BoardSpec {
  size: Size;
  boxRows: number;
  boxCols: number;
  variant: Variant;
}

export interface PuzzleDef {
  id: string;
  spec: BoardSpec;
  /** size * size characters, '0' or '.' for empty */
  givens: string;
  /** size * size digits, no zero */
  solution: string;
  tier: Tier;
  gradeScore: number;
  techniques: Record<string, number>;
  seed?: string;
  source: "generated" | "handcrafted" | "imported";
  author?: string;
  title?: string;
}

export const BOX_DIMS: Record<Size, { boxRows: number; boxCols: number }> = {
  4: { boxRows: 2, boxCols: 2 },
  6: { boxRows: 2, boxCols: 3 },
  9: { boxRows: 3, boxCols: 3 },
};

export function makeSpec(size: Size, variant: Variant = "classic"): BoardSpec {
  return { size, variant, ...BOX_DIMS[size] };
}
