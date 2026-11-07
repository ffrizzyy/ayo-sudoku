import { allMask, popcount } from "./bitset";
import { getGeometry, type Geometry } from "./board";
import { shuffle, type Rng } from "./prng";
import type { BoardSpec, Cage, Thermo } from "./types";

interface MaskState {
  units: Int32Array;
  fullMask: number;
}

/**
 * Killer cages add two constraints on top of the unit masks: no repeated digit
 * inside a cage, and the remaining cells must still add up to the cage total.
 * `index` maps a cell to its cage (-1 when the cell is not caged).
 */
interface CageState {
  index: Int16Array;
  remaining: Int32Array;
  used: Int32Array;
  empty: Int32Array;
  cells: number[][];
}

/**
 * Thermo thermometers: each cell knows its line and position, so a cell mask
 * can read the digits already placed at the other positions and bound itself
 * between them. Strict increase also means no digit repeats inside a line.
 */
interface ThermoState {
  lines: number[][];
  /** cell -> line index, -1 when the cell carries no thermometer. */
  lineOf: Int16Array;
  /** cell -> position along its line. */
  position: Int16Array;
}

function makeThermoState(
  geom: Geometry,
  thermos: readonly Thermo[],
  values: readonly number[],
): ThermoState | null {
  const lineOf = new Int16Array(geom.cellCount).fill(-1);
  const position = new Int16Array(geom.cellCount).fill(-1);
  const lines: number[][] = [];

  for (let lineIndex = 0; lineIndex < thermos.length; lineIndex++) {
    const line = thermos[lineIndex];
    if (line.length < 2 || line.length > geom.size) return null;
    const local = new Set<number>();
    for (let index = 0; index < line.length; index++) {
      const cell = line[index];
      if (cell < 0 || cell >= geom.cellCount || local.has(cell)) return null;
      local.add(cell);
      // A cell may only carry one thermometer; overlapping clues would make
      // the drawn path ambiguous and the share payload larger.
      if (lineOf[cell] !== -1) return null;
      lineOf[cell] = lineIndex;
      position[cell] = index;
    }
    // Assigned cells must already respect the ordering.
    for (let a = 0; a < line.length; a++) {
      const first = values[line[a]];
      if (!first) continue;
      for (let b = a + 1; b < line.length; b++) {
        const second = values[line[b]];
        if (second && second < first + (b - a)) return null;
      }
    }
    lines.push([...line]);
  }

  return { lines, lineOf, position };
}

/** Bits for the digits between `low` and `high` inclusive. */
function rangeMask(low: number, high: number, size: number): number {
  const from = Math.max(1, low);
  const to = Math.min(size, high);
  if (from > to) return 0;
  return ((1 << to) - 1) & ~((1 << (from - 1)) - 1);
}

/** Restricts thermo cells to digits that can still sit in increasing order. */
function narrowThermoMasks(
  thermo: ThermoState,
  values: readonly number[],
  masks: Int32Array | Uint16Array,
  size: number,
): boolean {
  for (const line of thermo.lines) {
    // Forward: a cell must be larger than the smallest digit the cell before
    // it can still take, so whole runs of candidates fall away.
    let low = 1;
    for (const cell of line) {
      const value = values[cell];
      if (value) {
        low = value + 1;
        continue;
      }
      const allowed = masks[cell] & rangeMask(low, size, size);
      if (!allowed) return false;
      masks[cell] = allowed;
      low = 32 - Math.clz32(allowed & -allowed) + 1;
    }
    // Backward: the same bound from the tip.
    let high = size;
    for (let index = line.length - 1; index >= 0; index--) {
      const cell = line[index];
      const value = values[cell];
      if (value) {
        high = value - 1;
        continue;
      }
      const allowed = masks[cell] & rangeMask(1, high, size);
      if (!allowed) return false;
      masks[cell] = allowed;
      high = 32 - Math.clz32(allowed) - 1;
    }
  }
  return true;
}

function makeState(geom: Geometry, values: readonly number[]): MaskState | null {
  const state: MaskState = {
    units: new Int32Array(geom.units.length),
    fullMask: allMask(geom.size),
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

function makeCageState(
  geom: Geometry,
  cages: readonly Cage[],
  values: readonly number[],
): CageState | null {
  const index = new Int16Array(geom.cellCount).fill(-1);
  const remaining = new Int32Array(cages.length);
  const used = new Int32Array(cages.length);
  const empty = new Int32Array(cages.length);
  const cells: number[][] = [];

  for (let cageIndex = 0; cageIndex < cages.length; cageIndex++) {
    const cage = cages[cageIndex];
    if (!cage.cells.length) return null;
    let total = cage.sum;
    for (const cell of cage.cells) {
      if (cell < 0 || cell >= geom.cellCount || index[cell] !== -1) return null;
      index[cell] = cageIndex;
      const value = values[cell];
      if (!value) {
        empty[cageIndex]++;
        continue;
      }
      if (value > geom.size) return null;
      const bit = 1 << (value - 1);
      if (used[cageIndex] & bit) return null;
      used[cageIndex] |= bit;
      total -= value;
    }
    // A fully filled cage must match its total, and an empty one must still be
    // large enough to hold distinct digits.
    if (empty[cageIndex] === 0) {
      if (total !== 0) return null;
    } else if (total < minSum(empty[cageIndex])) {
      return null;
    }
    remaining[cageIndex] = total;
    cells.push([...cage.cells]);
  }

  return { index, remaining, used, empty, cells };
}

function minSum(count: number): number {
  return (count * (count + 1)) / 2;
}

/** Smallest and largest sum of `count` distinct digits from `mask`. */
function sumRange(mask: number, count: number, size: number): { min: number; max: number } | null {
  if (count <= 0) return { min: 0, max: 0 };
  let min = 0;
  let taken = 0;
  for (let digit = 1; digit <= size && taken < count; digit++) {
    if (mask & (1 << (digit - 1))) {
      min += digit;
      taken++;
    }
  }
  if (taken < count) return null;
  let max = 0;
  taken = 0;
  for (let digit = size; digit >= 1 && taken < count; digit--) {
    if (mask & (1 << (digit - 1))) {
      max += digit;
      taken++;
    }
  }
  return { min, max };
}

function cellMask(
  cell: number,
  geom: Geometry,
  state: MaskState,
  cages: CageState | null,
  thermo: ThermoState | null,
  values: readonly number[],
): number {
  let mask = allMask(geom.size);
  for (const unitIndex of geom.cellUnits[cell]) mask &= ~state.units[unitIndex];

  if (thermo) {
    const lineIndex = thermo.lineOf[cell];
    if (lineIndex >= 0) {
      const line = thermo.lines[lineIndex];
      const at = thermo.position[cell];
      // A line of length L needs room for the digits around this cell: at
      // least `at` digits below it and `L - 1 - at` above it.
      let low = at + 1;
      let high = geom.size - (line.length - 1 - at);
      for (let index = 0; index < line.length; index++) {
        if (index === at) continue;
        const value = values[line[index]];
        if (!value) continue;
        if (index < at) low = Math.max(low, value + (at - index));
        else high = Math.min(high, value - (index - at));
      }
      mask &= rangeMask(low, high, geom.size);
      if (!mask) return 0;
    }
  }

  if (!cages) return mask;

  const cageIndex = cages.index[cell];
  if (cageIndex < 0) return mask;

  mask &= ~cages.used[cageIndex];
  const total = cages.remaining[cageIndex];
  const left = cages.empty[cageIndex];
  if (left <= 1) {
    // The last cell of a cage must be exactly the remaining total.
    if (left === 1 && total >= 1 && total <= geom.size) {
      return mask & (1 << (total - 1));
    }
    return 0;
  }

  let allowed = 0;
  for (let digit = 1; digit <= geom.size; digit++) {
    const bit = 1 << (digit - 1);
    if (!(mask & bit)) continue;
    const rest = total - digit;
    const available = allMask(geom.size) & ~cages.used[cageIndex] & ~bit;
    const range = sumRange(available, left - 1, geom.size);
    if (range && rest >= range.min && rest <= range.max) allowed |= bit;
  }
  return allowed;
}

function place(
  cell: number,
  digit: number,
  geom: Geometry,
  state: MaskState,
  cages: CageState | null,
  values: number[],
): void {
  const bit = 1 << (digit - 1);
  values[cell] = digit;
  for (const unitIndex of geom.cellUnits[cell]) state.units[unitIndex] |= bit;
  if (cages) {
    const cageIndex = cages.index[cell];
    if (cageIndex >= 0) {
      cages.remaining[cageIndex] -= digit;
      cages.used[cageIndex] |= bit;
      cages.empty[cageIndex]--;
    }
  }
}

function unplace(
  cell: number,
  digit: number,
  geom: Geometry,
  state: MaskState,
  cages: CageState | null,
  values: number[],
): void {
  const bit = 1 << (digit - 1);
  values[cell] = 0;
  for (const unitIndex of geom.cellUnits[cell]) state.units[unitIndex] &= ~bit;
  if (cages) {
    const cageIndex = cages.index[cell];
    if (cageIndex >= 0) {
      cages.remaining[cageIndex] += digit;
      cages.used[cageIndex] &= ~bit;
      cages.empty[cageIndex]++;
    }
  }
}

interface Search {
  geom: Geometry;
  state: MaskState;
  cages: CageState | null;
  thermo: ThermoState | null;
  values: number[];
  /** Reused per frame: candidate masks for every empty cell. */
  masks: Int32Array;
  /** Reused per frame: union of the candidate masks in each unit. */
  unitUnion: Int32Array;
  /** Reused per frame: how many cells in a unit can still hold each digit. */
  unitCount: Int32Array;
  /** Assignments made by propagation, undone by the caller after its branch. */
  stackCells: Int32Array;
  stackDigits: Int32Array;
  stackSize: number;
  /** Reused per frame by the cage matching test. */
  owner: Int32Array;
  seen: Uint8Array;
}

const STATUS_DEAD = 0;
const STATUS_DONE = 1;
const STATUS_OPEN = 2;

const COMBO_CACHE = new Map<number, number[]>();

/**
 * Every set of `count` distinct digits that adds up to `total`. A cage can only
 * ever hold one of these sets, which is a far stronger guide than the minimum
 * and maximum sum alone.
 */
function combosFor(count: number, total: number, size: number): number[] {
  const key = (size << 16) | (count << 8) | total;
  const cached = COMBO_CACHE.get(key);
  if (cached) return cached;
  const combos: number[] = [];
  const limit = 1 << size;
  for (let mask = 0; mask < limit; mask++) {
    if (popcount(mask) !== count) continue;
    let sum = 0;
    for (let digit = 1; digit <= size; digit++) {
      if (mask & (1 << (digit - 1))) sum += digit;
    }
    if (sum === total) combos.push(mask);
  }
  COMBO_CACHE.set(key, combos);
  return combos;
}

/**
 * Whether the digits of `combo` can be handed to `cells` without a cell taking a
 * digit its own mask forbids. This is a small bipartite matching, so it never
 * rejects a cage that a real solution could still fill.
 */
function canAssign(
  combo: number,
  masks: readonly number[],
  owner: Int32Array,
  seen: Uint8Array,
): boolean {
  const digits: number[] = [];
  for (let digit = 1; digit <= 9; digit++) {
    if (combo & (1 << (digit - 1))) digits.push(digit);
  }
  const count = masks.length;
  owner.fill(-1, 0, count);

  const assign = (digitIndex: number): boolean => {
    const bit = 1 << (digits[digitIndex] - 1);
    for (let cell = 0; cell < count; cell++) {
      if (seen[cell] || !(masks[cell] & bit)) continue;
      seen[cell] = 1;
      if (owner[cell] === -1 || assign(owner[cell])) {
        owner[cell] = digitIndex;
        return true;
      }
    }
    return false;
  };

  for (let digitIndex = 0; digitIndex < digits.length; digitIndex++) {
    seen.fill(0, 0, count);
    if (!assign(digitIndex)) return false;
  }
  return true;
}

/**
 * Restricts every cage cell to the digits that some still-fillable cage combo
 * allows. Returns false when a cage can no longer reach its sum, which kills
 * the branch. Large cages are what make Killer search expensive, and this is
 * what keeps generation in milliseconds.
 */
function propagateCages(search: Search): boolean {
  const { cages, values, masks, owner, seen, geom } = search;
  if (!cages) return true;
  const scratch: number[] = [];

  for (let cageIndex = 0; cageIndex < cages.cells.length; cageIndex++) {
    const left = cages.empty[cageIndex];
    if (left < 2) continue;
    const total = cages.remaining[cageIndex];
    const usedMask = cages.used[cageIndex];

    scratch.length = 0;
    for (const cell of cages.cells[cageIndex]) {
      if (!values[cell]) scratch.push(masks[cell]);
    }
    if (scratch.length !== left) continue;

    let allowed = 0;
    const combos = combosFor(left, total, geom.size);
    for (const combo of combos) {
      if (combo & usedMask) continue;
      if (!canAssign(combo, scratch, owner, seen)) continue;
      allowed |= combo;
    }
    if (!allowed) return false;

    for (const cell of cages.cells[cageIndex]) {
      if (values[cell]) continue;
      const next = masks[cell] & allowed;
      if (!next) return false;
      masks[cell] = next;
    }
  }
  return true;
}

/**
 * Propagation to a fixpoint: refresh the candidate masks, narrow the cages, then
 * assign every naked and hidden single. Each assignment goes on the shared
 * stack so the caller can undo the whole batch after its branch.
 *
 * Returns STATUS_DEAD (no answer below this node), STATUS_DONE (grid complete),
 * or STATUS_OPEN with the most constrained remaining cell in `best`.
 */
function narrow(search: Search, best: { cell: number; mask: number }): number {
  const {
    geom,
    state,
    cages,
    thermo,
    values,
    masks,
    unitUnion,
    unitCount,
    stackCells,
    stackDigits,
  } = search;

  for (let round = 0; round < 64; round++) {
    unitUnion.fill(0);
    unitCount.fill(0);

    let empty = 0;
    for (let cell = 0; cell < geom.cellCount; cell++) {
      if (values[cell]) {
        masks[cell] = 0;
        continue;
      }
      const mask = cellMask(cell, geom, state, cages, thermo, values);
      if (!mask) return STATUS_DEAD;
      masks[cell] = mask;
      empty++;
      for (const unitIndex of geom.cellUnits[cell]) {
        unitUnion[unitIndex] |= mask;
        const base = unitIndex * geom.size;
        for (let digit = 1; digit <= geom.size; digit++) {
          if (mask & (1 << (digit - 1))) unitCount[base + digit - 1]++;
        }
      }
    }
    if (!empty) return STATUS_DONE;

    if (cages && !propagateCages(search)) return STATUS_DEAD;
    if (thermo && !narrowThermoMasks(thermo, values, masks, geom.size)) return STATUS_DEAD;

    // A digit that no cell in a unit can hold means this branch is already lost;
    // a digit only one cell can hold is a placement, and placing it early keeps
    // the search tree small. Masks go stale as cells are filled, so each
    // placement re-checks the live candidates of its own cell.
    let placed = false;
    for (let unitIndex = 0; unitIndex < geom.units.length; unitIndex++) {
      const missing = state.fullMask & ~state.units[unitIndex];
      if (missing & ~unitUnion[unitIndex]) return STATUS_DEAD;
      const base = unitIndex * geom.size;
      for (let digit = 1; digit <= geom.size; digit++) {
        if (!(missing & (1 << (digit - 1)))) continue;
        if (unitCount[base + digit - 1] !== 1) continue;
        const bit = 1 << (digit - 1);
        const cell = geom.units[unitIndex].find(
          (candidate) => !values[candidate] && masks[candidate] & bit,
        );
        if (cell === undefined) return STATUS_DEAD;
        const live = cellMask(cell, geom, state, cages, thermo, values);
        if (!(live & bit)) return STATUS_DEAD;
        stackCells[search.stackSize] = cell;
        stackDigits[search.stackSize] = digit;
        search.stackSize++;
        place(cell, digit, geom, state, cages, values);
        placed = true;
        break;
      }
    }

    // Naked singles. A mask with one bit can only shrink to nothing as peers
    // fill in, so re-reading it is enough to stay correct.
    for (let cell = 0; cell < geom.cellCount; cell++) {
      if (values[cell]) continue;
      const mask = cellMask(cell, geom, state, cages, thermo, values);
      if (!mask) return STATUS_DEAD;
      if (mask & (mask - 1)) continue;
      const digit = 32 - Math.clz32(mask);
      stackCells[search.stackSize] = cell;
      stackDigits[search.stackSize] = digit;
      search.stackSize++;
      place(cell, digit, geom, state, cages, values);
      placed = true;
    }

    if (!placed) break;
  }

  let bestCell = -1;
  let bestMask = 0;
  let bestCount = geom.size + 1;
  for (let cell = 0; cell < geom.cellCount; cell++) {
    if (values[cell]) continue;
    const mask = cellMask(cell, geom, state, cages, thermo, values);
    if (!mask) return STATUS_DEAD;
    const count = popcount(mask);
    if (count < bestCount) {
      bestCount = count;
      bestCell = cell;
      bestMask = mask;
    }
  }
  if (bestCell === -1) return STATUS_DONE;

  best.cell = bestCell;
  best.mask = bestMask;
  return STATUS_OPEN;
}

/** Builds a fresh search context, or null when the puzzle is already invalid. */
function openSearch(
  input: readonly number[],
  spec: BoardSpec,
  cages?: readonly Cage[],
  thermos?: readonly Thermo[],
): Search | null {
  const geom = getGeometry(spec);
  const values = [...input];
  if (values.length !== geom.cellCount) return null;
  const state = makeState(geom, values);
  if (!state) return null;
  const cageState = cages?.length ? makeCageState(geom, cages, values) : null;
  if (cages?.length && !cageState) return null;
  const thermoState = thermos?.length ? makeThermoState(geom, thermos, values) : null;
  if (thermos?.length && !thermoState) return null;
  return {
    geom,
    state,
    cages: cageState,
    thermo: thermoState,
    values,
    masks: new Int32Array(geom.cellCount),
    unitUnion: new Int32Array(geom.units.length),
    unitCount: new Int32Array(geom.units.length * geom.size),
    stackCells: new Int32Array(geom.cellCount),
    stackDigits: new Int32Array(geom.cellCount),
    stackSize: 0,
    owner: new Int32Array(geom.size),
    seen: new Uint8Array(geom.size),
  };
}

/** Undoes every propagation assignment made since `mark`. */
function unwind(search: Search, mark: number): void {
  const { geom, state, cages, values, stackCells, stackDigits } = search;
  for (let index = search.stackSize - 1; index >= mark; index--) {
    unplace(stackCells[index], stackDigits[index], geom, state, cages, values);
  }
  search.stackSize = mark;
}

function countDfs(search: Search, limit: number): number {
  const slot = { cell: -1, mask: 0 };
  const mark = search.stackSize;
  const status = narrow(search, slot);
  if (status === STATUS_DEAD) {
    unwind(search, mark);
    return 0;
  }
  if (status === STATUS_DONE) {
    unwind(search, mark);
    return 1;
  }

  const { geom, state, cages, values } = search;
  let total = 0;
  let mask = slot.mask;
  while (mask) {
    const bit = mask & -mask;
    mask &= mask - 1;
    const digit = 32 - Math.clz32(bit);
    place(slot.cell, digit, geom, state, cages, values);
    total += countDfs(search, limit - total);
    unplace(slot.cell, digit, geom, state, cages, values);
    if (total >= limit) break;
  }
  unwind(search, mark);
  return total;
}

/** Counts solutions up to `limit` (default 2). Returns 0 for invalid puzzles. */
export function countSolutions(
  input: readonly number[],
  spec: BoardSpec,
  limit = 2,
  cages?: readonly Cage[],
  thermos?: readonly Thermo[],
): number {
  const search = openSearch(input, spec, cages, thermos);
  if (!search) return 0;
  return countDfs(search, limit);
}

/**
 * Collects up to `limit` solutions. Used by the Killer generator: comparing the
 * first two answers shows exactly which cell still has room to move, so a
 * single given can remove the ambiguity instead of dozens of random ones.
 */
export function findSolutions(
  input: readonly number[],
  spec: BoardSpec,
  limit = 2,
  cages?: readonly Cage[],
  thermos?: readonly Thermo[],
): number[][] {
  const search = openSearch(input, spec, cages, thermos);
  if (!search) return [];
  const found: number[][] = [];
  const slot = { cell: -1, mask: 0 };

  const walk = (): boolean => {
    const mark = search.stackSize;
    const status = narrow(search, slot);
    if (status === STATUS_DEAD) {
      unwind(search, mark);
      return found.length >= limit;
    }
    if (status === STATUS_DONE) {
      found.push([...search.values]);
      unwind(search, mark);
      return found.length >= limit;
    }

    const { geom, state, cages: cageState, values } = search;
    const cell = slot.cell;
    let mask = slot.mask;
    while (mask) {
      const bit = mask & -mask;
      mask &= mask - 1;
      const digit = 32 - Math.clz32(bit);
      place(cell, digit, geom, state, cageState, values);
      const stop = walk();
      unplace(cell, digit, geom, state, cageState, values);
      if (stop) {
        unwind(search, mark);
        return true;
      }
    }
    unwind(search, mark);
    return false;
  };

  walk();
  return found;
}

/** Returns the first solution, or null. */
export function solve(
  input: readonly number[],
  spec: BoardSpec,
  cages?: readonly Cage[],
  thermos?: readonly Thermo[],
): number[] | null {
  const search = openSearch(input, spec, cages, thermos);
  if (!search) return null;
  const slot = { cell: -1, mask: 0 };
  let answer: number[] | null = null;

  const walk = (): boolean => {
    const mark = search.stackSize;
    const status = narrow(search, slot);
    if (status === STATUS_DEAD) {
      unwind(search, mark);
      return false;
    }
    if (status === STATUS_DONE) {
      // The answer is only complete because propagation filled the rest, so it
      // has to be read before the forced placements are undone.
      answer = [...search.values];
      unwind(search, mark);
      return true;
    }

    const { geom, state, cages: cageState, values } = search;
    const cell = slot.cell;
    let mask = slot.mask;
    while (mask) {
      const bit = mask & -mask;
      mask &= mask - 1;
      const digit = 32 - Math.clz32(bit);
      place(cell, digit, geom, state, cageState, values);
      if (walk()) {
        unwind(search, mark);
        return true;
      }
      unplace(cell, digit, geom, state, cageState, values);
    }
    unwind(search, mark);
    return false;
  };

  return walk() ? answer : null;
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
      geom.boxes[boxIndex].forEach((cell, i) => place(cell, digits[i], geom, state, null, values));
    }
  }

  const search = (): boolean => {
    let bestCell = -1;
    let bestMask = 0;
    let bestCount = geom.size + 1;
    for (let cell = 0; cell < geom.cellCount; cell++) {
      if (values[cell]) continue;
      const mask = cellMask(cell, geom, state, null, null, values);
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
      place(bestCell, digit, geom, state, null, values);
      if (search()) return true;
      unplace(bestCell, digit, geom, state, null, values);
    }
    return false;
  };

  return search() ? values : null;
}

export function buildCandidates(
  values: readonly number[],
  geom: Geometry,
  cages?: readonly Cage[],
  thermos?: readonly Thermo[],
): Uint16Array {
  const candidates = new Uint16Array(geom.cellCount);
  const full = allMask(geom.size);
  const cageOf = new Int16Array(geom.cellCount).fill(-1);
  if (cages?.length) {
    cages.forEach((cage, cageIndex) => {
      for (const cell of cage.cells) cageOf[cell] = cageIndex;
    });
  }
  const cageUsed = new Int32Array(cages?.length ?? 0);
  if (cages?.length) {
    for (let cell = 0; cell < geom.cellCount; cell++) {
      const value = values[cell];
      const cageIndex = cageOf[cell];
      if (value && cageIndex >= 0) cageUsed[cageIndex] |= 1 << (value - 1);
    }
  }
  const thermo = thermos?.length ? makeThermoState(geom, thermos, values) : null;
  for (let cell = 0; cell < geom.cellCount; cell++) {
    if (values[cell]) continue;
    let mask = full;
    for (const peer of geom.peers[cell]) {
      const value = values[peer];
      if (value) mask &= ~(1 << (value - 1));
    }
    const cageIndex = cageOf[cell];
    if (cageIndex >= 0) mask &= ~cageUsed[cageIndex];
    if (thermo) {
      const lineIndex = thermo.lineOf[cell];
      if (lineIndex >= 0) {
        const line = thermo.lines[lineIndex];
        const at = thermo.position[cell];
        let low = at + 1;
        let high = geom.size - (line.length - 1 - at);
        for (let index = 0; index < line.length; index++) {
          if (index === at) continue;
          const value = values[line[index]];
          if (!value) continue;
          if (index < at) low = Math.max(low, value + (at - index));
          else high = Math.min(high, value - (index - at));
        }
        mask &= rangeMask(low, high, geom.size);
      }
    }
    candidates[cell] = mask;
  }
  if (thermo) {
    // Candidate-based bounds between cells need the whole line, so they run
    // over the array after the per-cell masks exist. A dead line leaves the
    // offending cells empty, which is exactly what a dead puzzle looks like.
    narrowThermoMasks(thermo, values, candidates, geom.size);
  }
  return candidates;
}