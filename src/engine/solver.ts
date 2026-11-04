import { allMask, popcount } from "./bitset";
import { getGeometry, type Geometry } from "./board";
import { shuffle, type Rng } from "./prng";
import type { BoardSpec } from "./types";

interface MaskState {
  units: Int32Array;
}

function makeState(geom: Geometry, values: readonly number[]): MaskState | null {
  const state: MaskState = {
    units: new Int32Array(geom.units.length),
  };
  for (let cell = 0; cell < geom.cellCount; cell++) {
    const value = values[cell];
    if (!value) continue;
    const bit = 1 << (value - 1);
    for (const unitIndex of geom.cellUnits[cell]) {
      if (state.units[unitIndex] & bit) return null;
      state.units[unitIndex] |= bit;
    }
  }
  return state;
}

function cellMask(cell: number, geom: Geometry, state: MaskState): number {
  let mask = allMask(geom.size);
  for (const unitIndex of geom.cellUnits[cell]) mask &= ~state.units[unitIndex];
  return mask;
}

function place(
  cell: number,
  digit: number,
  geom: Geometry,
  state: MaskState,
  values: number[],
): void {
  const bit = 1 << (digit - 1);
  values[cell] = digit;
  for (const unitIndex of geom.cellUnits[cell]) state.units[unitIndex] |= bit;
}

function unplace(
  cell: number,
  digit: number,
  geom: Geometry,
  state: MaskState,
  values: number[],
): void {
  const bit = 1 << (digit - 1);
  values[cell] = 0;
  for (const unitIndex of geom.cellUnits[cell]) state.units[unitIndex] &= ~bit;
}

function countDfs(
  geom: Geometry,
  state: MaskState,
  values: number[],
  limit: number,
): number {
  let bestCell = -1;
  let bestMask = 0;
  let bestCount = geom.size + 1;
  for (let cell = 0; cell < geom.cellCount; cell++) {
    if (values[cell]) continue;
    const mask = cellMask(cell, geom, state);
    const count = popcount(mask);
    if (count === 0) return 0;
    if (count < bestCount) {
      bestCount = count;
      bestCell = cell;
      bestMask = mask;
      if (count === 1) break;
    }
  }
  if (bestCell === -1) return 1;

  let total = 0;
  let mask = bestMask;
  while (mask) {
    const bit = mask & -mask;
    mask &= mask - 1;
    const digit = 32 - Math.clz32(bit);
    place(bestCell, digit, geom, state, values);
    total += countDfs(geom, state, values, limit - total);
    unplace(bestCell, digit, geom, state, values);
    if (total >= limit) break;
  }
  return total;
}

/** Counts solutions up to `limit` (default 2). Returns 0 for invalid puzzles. */
export function countSolutions(
  input: readonly number[],
  spec: BoardSpec,
  limit = 2,
): number {
  const geom = getGeometry(spec);
  const values = [...input];
  if (values.length !== geom.cellCount) return 0;
  const state = makeState(geom, values);
  if (!state) return 0;
  return countDfs(geom, state, values, limit);
}

/** Returns the first solution, or null. */
export function solve(input: readonly number[], spec: BoardSpec): number[] | null {
  const geom = getGeometry(spec);
  const values = [...input];
  if (values.length !== geom.cellCount) return null;
  const state = makeState(geom, values);
  if (!state) return null;

  const search = (): boolean => {
    let bestCell = -1;
    let bestMask = 0;
    let bestCount = geom.size + 1;
    for (let cell = 0; cell < geom.cellCount; cell++) {
      if (values[cell]) continue;
      const mask = cellMask(cell, geom, state);
      const count = popcount(mask);
      if (count === 0) return false;
      if (count < bestCount) {
        bestCount = count;
        bestCell = cell;
        bestMask = mask;
        if (count === 1) break;
      }
    }
    if (bestCell === -1) return true;

    let mask = bestMask;
    while (mask) {
      const bit = mask & -mask;
      mask &= mask - 1;
      const digit = 32 - Math.clz32(bit);
      place(bestCell, digit, geom, state, values);
      if (search()) return true;
      unplace(bestCell, digit, geom, state, values);
    }
    return false;
  };

  return search() ? values : null;
}

/**
 * Fills a grid with randomized backtracking. Diagonal boxes are seeded first
 * so the result looks varied rather than row ordered.
 */
export function randomSolution(spec: BoardSpec, rng: Rng): number[] | null {
  const geom = getGeometry(spec);
  const values = new Array<number>(geom.cellCount).fill(0);
  const state = makeState(geom, values);
  if (!state) return null;

  // Prefill diagonal boxes for variety. Classic only: extra units (diagonals,
  // Windoku windows) overlap those boxes, so a blind prefill could conflict.
  if (spec.variant === "classic") {
    const boxRowsCount = geom.size / geom.boxRows;
    const boxColsCount = geom.size / geom.boxCols;
    const diagonalBoxIndexes: number[] = [];
    for (let br = 0; br < boxRowsCount; br++) {
      for (let bc = 0; bc < boxColsCount; bc++) {
        if (br === bc) diagonalBoxIndexes.push(br * boxColsCount + bc);
      }
    }
    for (const boxIndex of diagonalBoxIndexes) {
      const digits = shuffle(Array.from({ length: geom.size }, (_, i) => i + 1), rng);
      geom.boxes[boxIndex].forEach((cell, i) => place(cell, digits[i], geom, state, values));
    }
  }

  const search = (): boolean => {
    let bestCell = -1;
    let bestMask = 0;
    let bestCount = geom.size + 1;
    for (let cell = 0; cell < geom.cellCount; cell++) {
      if (values[cell]) continue;
      const mask = cellMask(cell, geom, state);
      const count = popcount(mask);
      if (count === 0) return false;
      if (count < bestCount) {
        bestCount = count;
        bestCell = cell;
        bestMask = mask;
        if (count === 1) break;
      }
    }
    if (bestCell === -1) return true;
    const digits = shuffle(
      Array.from({ length: geom.size }, (_, i) => i + 1).filter((d) => bestMask & (1 << (d - 1))),
      rng,
    );
    for (const digit of digits) {
      place(bestCell, digit, geom, state, values);
      if (search()) return true;
      unplace(bestCell, digit, geom, state, values);
    }
    return false;
  };

  return search() ? values : null;
}

export function buildCandidates(values: readonly number[], geom: Geometry): Uint16Array {
  const candidates = new Uint16Array(geom.cellCount);
  const full = allMask(geom.size);
  for (let cell = 0; cell < geom.cellCount; cell++) {
    if (values[cell]) continue;
    let mask = full;
    for (const peer of geom.peers[cell]) {
      const value = values[peer];
      if (value) mask &= ~(1 << (value - 1));
    }
    candidates[cell] = mask;
  }
  return candidates;
}
