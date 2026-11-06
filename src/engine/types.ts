/**
 * Shared engine types. The engine is pure TypeScript: no React, DOM or storage.
 */

export type Size = 4 | 6 | 9;
export type Variant = "classic" | "diagonal" | "windoku" | "killer";
export type Tier = "cozy" | "easy" | "medium" | "hard" | "expert" | "master";
export type Difficulty = Tier;

export const TIERS: readonly Tier[] = ["cozy", "easy", "medium", "hard", "expert", "master"];

export interface BoardSpec {
  size: Size;
  boxRows: number;
  boxCols: number;
  variant: Variant;
}

/**
 * Killer Sudoku cage: the cells add up to `sum` and hold no repeated digit.
 * Cages are orthogonally connected and never overlap.
 */
export interface Cage {
  cells: number[];
  sum: number;
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
  /** Killer only: every cage, in display order. */
  cages?: Cage[];
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
  // Windoku and Killer are defined on the 9x9 grid: Windoku needs the four
  // extra 3x3 windows, Killer needs cages on a full-size board. Smaller boards
  // fall back to classic instead of producing a puzzle that cannot follow the
  // rules it advertises.
  const resolved: Variant =
    (variant === "windoku" || variant === "killer") && size !== 9 ? "classic" : variant;
  return { size, variant: resolved, ...BOX_DIMS[size] };
}
