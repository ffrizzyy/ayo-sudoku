import { digitMask, maskToDigits, popcount } from "./bitset";
import { getGeometry, type Geometry } from "./board";
import { buildCandidates } from "./solver";
import { TIERS, type BoardSpec, type Tier } from "./types";

export type TechniqueId =
  | "nakedSingle"
  | "hiddenSingle"
  | "pointing"
  | "nakedPair"
  | "hiddenPair"
  | "nakedTriple"
  | "xWing"
  | "xyWing"
  | "swordfish";

export const TECHNIQUE_WEIGHTS: Record<TechniqueId, number> = {
  nakedSingle: 1,
  hiddenSingle: 2,
  pointing: 4,
  nakedPair: 6,
  hiddenPair: 8,
  nakedTriple: 11,
  xWing: 16,
  xyWing: 24,
  swordfish: 30,
};

export const TECHNIQUE_TIER: Record<TechniqueId, Tier> = {
  nakedSingle: "cozy",
  hiddenSingle: "easy",
  pointing: "medium",
  nakedPair: "medium",
  hiddenPair: "hard",
  nakedTriple: "hard",
  xWing: "expert",
  xyWing: "master",
  swordfish: "master",
};

export interface Placement {
  cell: number;
  digit: number;
}

export interface Elimination {
  cell: number;
  digits: number[];
}

export interface LogicalStep {
  technique: TechniqueId;
  placements: Placement[];
  eliminations: Elimination[];
  /** cells the player should look at */
  cells: number[];
  /** unit cells to shade */
  unitCells: number[];
  digit?: number;
  weight: number;
}

interface SearchContext {
  values: number[];
  candidates: Uint16Array;
  geom: Geometry;
}

function step(
  technique: TechniqueId,
  data: Partial<Omit<LogicalStep, "technique" | "weight">> = {},
): LogicalStep {
  return {
    technique,
    placements: data.placements ?? [],
    eliminations: data.eliminations ?? [],
    cells: data.cells ?? [],
    unitCells: data.unitCells ?? [],
    digit: data.digit,
    weight: TECHNIQUE_WEIGHTS[technique],
  };
}

function unitHasDigit(unit: readonly number[], values: readonly number[], digit: number): boolean {
  return unit.some((cell) => values[cell] === digit);
}

function cellsWith(unit: readonly number[], candidates: Uint16Array, digit: number): number[] {
  const bit = digitMask(digit);
  return unit.filter((cell) => (candidates[cell] & bit) !== 0);
}

function findNakedSingle({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (let cell = 0; cell < geom.cellCount; cell++) {
    if (values[cell]) continue;
    const mask = candidates[cell];
    if (mask && popcount(mask) === 1) {
      const digit = maskToDigits(mask)[0];
      return step("nakedSingle", {
        placements: [{ cell, digit }],
        cells: [cell],
        digit,
      });
    }
  }
  return null;
}

function findHiddenSingle({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (const unit of geom.units) {
    for (let digit = 1; digit <= geom.size; digit++) {
      if (unitHasDigit(unit, values, digit)) continue;
      const cells = cellsWith(unit, candidates, digit);
      if (cells.length === 1) {
        return step("hiddenSingle", {
          placements: [{ cell: cells[0], digit }],
          cells,
          unitCells: unit,
          digit,
        });
      }
    }
  }
  return null;
}

function findPointing({ values, candidates, geom }: SearchContext): LogicalStep | null {
  // Box → line (pointing)
  for (const box of geom.boxes) {
    for (let digit = 1; digit <= geom.size; digit++) {
      if (unitHasDigit(box, values, digit)) continue;
      const cells = cellsWith(box, candidates, digit);
      if (cells.length < 2 || cells.length > 3) continue;
      const rows = new Set(cells.map((cell) => geom.rowOf[cell]));
      if (rows.size === 1) {
        const row = geom.rows[geom.rowOf[cells[0]]];
        const eliminations = row
          .filter((cell) => !box.includes(cell) && (candidates[cell] & digitMask(digit)) !== 0)
          .map((cell) => ({ cell, digits: [digit] }));
        if (eliminations.length) {
          return step("pointing", {
            eliminations,
            cells,
            unitCells: row,
            digit,
          });
        }
      }
      const cols = new Set(cells.map((cell) => geom.colOf[cell]));
      if (cols.size === 1) {
        const col = geom.cols[geom.colOf[cells[0]]];
        const eliminations = col
          .filter((cell) => !box.includes(cell) && (candidates[cell] & digitMask(digit)) !== 0)
          .map((cell) => ({ cell, digits: [digit] }));
        if (eliminations.length) {
          return step("pointing", {
            eliminations,
            cells,
            unitCells: col,
            digit,
          });
        }
      }
    }
  }

  // Line → box (claiming)
  for (const [lineIndex, line] of [...geom.rows, ...geom.cols].entries()) {
    const isRow = lineIndex < geom.rows.length;
    for (let digit = 1; digit <= geom.size; digit++) {
      if (unitHasDigit(line, values, digit)) continue;
      const cells = cellsWith(line, candidates, digit);
      if (cells.length < 2 || cells.length > 3) continue;
      const boxes = new Set(cells.map((cell) => geom.boxOf[cell]));
      if (boxes.size !== 1) continue;
      const box = geom.boxes[[...boxes][0]];
      const eliminations = box
        .filter((cell) => !line.includes(cell) && (candidates[cell] & digitMask(digit)) !== 0)
        .map((cell) => ({ cell, digits: [digit] }));
      if (eliminations.length) {
        return step("pointing", {
          eliminations,
          cells,
          unitCells: isRow ? line : line,
          digit,
        });
      }
    }
  }
  return null;
}

function findNakedPair({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (const unit of geom.units) {
    const byMask = new Map<number, number[]>();
    for (const cell of unit) {
      if (values[cell]) continue;
      const mask = candidates[cell];
      if (popcount(mask) !== 2) continue;
      const list = byMask.get(mask) ?? [];
      list.push(cell);
      byMask.set(mask, list);
    }
    for (const [mask, cells] of byMask) {
      if (cells.length < 2) continue;
      const pair = cells.slice(0, 2);
      const digits = maskToDigits(mask);
      const eliminations = unit
        .filter((cell) => !pair.includes(cell) && (candidates[cell] & mask) !== 0)
        .map((cell) => ({ cell, digits }));
      if (eliminations.length) {
        return step("nakedPair", {
          eliminations,
          cells: pair,
          unitCells: unit,
          digit: digits[0],
        });
      }
    }
  }
  return null;
}

function findHiddenPair({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (const unit of geom.units) {
    const digits = Array.from({ length: geom.size }, (_, i) => i + 1).filter(
      (digit) => !unitHasDigit(unit, values, digit),
    );
    for (let i = 0; i < digits.length; i++) {
      for (let j = i + 1; j < digits.length; j++) {
        const d1 = digits[i];
        const d2 = digits[j];
        const cells1 = cellsWith(unit, candidates, d1);
        const cells2 = cellsWith(unit, candidates, d2);
        if (cells1.length !== 2 || cells2.length !== 2) continue;
        if (cells1[0] !== cells2[0] || cells1[1] !== cells2[1]) continue;
        const keep = digitMask(d1) | digitMask(d2);
        const eliminations: Elimination[] = [];
        for (const cell of cells1) {
          const removed = maskToDigits(candidates[cell] & ~keep);
          if (removed.length) eliminations.push({ cell, digits: removed });
        }
        if (eliminations.length) {
          return step("hiddenPair", {
            eliminations,
            cells: cells1,
            unitCells: unit,
            digit: d1,
          });
        }
      }
    }
  }
  return null;
}

function findNakedTriple({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (const unit of geom.units) {
    const cells = unit.filter((cell) => !values[cell] && popcount(candidates[cell]) <= 3);
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        for (let k = j + 1; k < cells.length; k++) {
          const trio = [cells[i], cells[j], cells[k]];
          const union =
            candidates[trio[0]] | candidates[trio[1]] | candidates[trio[2]];
          if (popcount(union) !== 3) continue;
          const eliminations = unit
            .filter((cell) => !trio.includes(cell) && (candidates[cell] & union) !== 0)
            .map((cell) => ({ cell, digits: maskToDigits(candidates[cell] & union) }));
          if (eliminations.length) {
            return step("nakedTriple", {
              eliminations,
              cells: trio,
              unitCells: unit,
            });
          }
        }
      }
    }
  }
  return null;
}

function findXWing({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (let digit = 1; digit <= geom.size; digit++) {
    const bit = digitMask(digit);
    // Row based
    const rowPositions = geom.rows.map((row) =>
      row.filter((cell) => !values[cell] && (candidates[cell] & bit) !== 0),
    );
    for (let r1 = 0; r1 < rowPositions.length; r1++) {
      if (rowPositions[r1].length !== 2) continue;
      for (let r2 = r1 + 1; r2 < rowPositions.length; r2++) {
        if (rowPositions[r2].length !== 2) continue;
        const cols1 = rowPositions[r1].map((cell) => geom.colOf[cell]).sort();
        const cols2 = rowPositions[r2].map((cell) => geom.colOf[cell]).sort();
        if (cols1[0] !== cols2[0] || cols1[1] !== cols2[1]) continue;
        const eliminations: Elimination[] = [];
        for (const colIndex of cols1) {
          for (const cell of geom.cols[colIndex]) {
            if (geom.rowOf[cell] === r1 || geom.rowOf[cell] === r2) continue;
            if (values[cell]) continue;
            if (candidates[cell] & bit) eliminations.push({ cell, digits: [digit] });
          }
        }
        if (eliminations.length) {
          return step("xWing", {
            eliminations,
            cells: [...rowPositions[r1], ...rowPositions[r2]],
            unitCells: [
              ...geom.rows[r1],
              ...geom.rows[r2],
              ...geom.cols[cols1[0]],
              ...geom.cols[cols1[1]],
            ],
            digit,
          });
        }
      }
    }
    // Column based
    const colPositions = geom.cols.map((col) =>
      col.filter((cell) => !values[cell] && (candidates[cell] & bit) !== 0),
    );
    for (let c1 = 0; c1 < colPositions.length; c1++) {
      if (colPositions[c1].length !== 2) continue;
      for (let c2 = c1 + 1; c2 < colPositions.length; c2++) {
        if (colPositions[c2].length !== 2) continue;
        const rows1 = colPositions[c1].map((cell) => geom.rowOf[cell]).sort();
        const rows2 = colPositions[c2].map((cell) => geom.rowOf[cell]).sort();
        if (rows1[0] !== rows2[0] || rows1[1] !== rows2[1]) continue;
        const eliminations: Elimination[] = [];
        for (const rowIndex of rows1) {
          for (const cell of geom.rows[rowIndex]) {
            if (geom.colOf[cell] === c1 || geom.colOf[cell] === c2) continue;
            if (values[cell]) continue;
            if (candidates[cell] & bit) eliminations.push({ cell, digits: [digit] });
          }
        }
        if (eliminations.length) {
          return step("xWing", {
            eliminations,
            cells: [...colPositions[c1], ...colPositions[c2]],
            unitCells: [
              ...geom.cols[c1],
              ...geom.cols[c2],
              ...geom.rows[rows1[0]],
              ...geom.rows[rows1[1]],
            ],
            digit,
          });
        }
      }
    }
  }
  return null;
}

function findXYWing({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (let pivot = 0; pivot < geom.cellCount; pivot++) {
    if (values[pivot]) continue;
    const pivotMask = candidates[pivot];
    if (popcount(pivotMask) !== 2) continue;
    const [a, b] = maskToDigits(pivotMask);
    const peers = geom.peers[pivot].filter(
      (cell) => !values[cell] && popcount(candidates[cell]) === 2,
    );
    for (const wingA of peers) {
      const maskA = candidates[wingA];
      if (!(maskA & digitMask(a)) || maskA & digitMask(b)) continue;
      const zA = maskToDigits(maskA & ~digitMask(a))[0];
      if (!zA || zA === a || zA === b) continue;
      for (const wingB of peers) {
        if (wingB === wingA) continue;
        const maskB = candidates[wingB];
        if (!(maskB & digitMask(b)) || maskB & digitMask(a)) continue;
        const zB = maskToDigits(maskB & ~digitMask(b))[0];
        if (zB !== zA) continue;
        const z = zA;
        const eliminations: Elimination[] = [];
        for (let cell = 0; cell < geom.cellCount; cell++) {
          if (values[cell] || cell === pivot) continue;
          if (!(candidates[cell] & digitMask(z))) continue;
          if (!geom.peers[wingA].includes(cell) || !geom.peers[wingB].includes(cell)) continue;
          eliminations.push({ cell, digits: [z] });
        }
        if (eliminations.length) {
          return step("xyWing", {
            eliminations,
            cells: [pivot, wingA, wingB],
            unitCells: [pivot, wingA, wingB],
            digit: z,
          });
        }
      }
    }
  }
  return null;
}

function findSwordfish({ values, candidates, geom }: SearchContext): LogicalStep | null {
  for (let digit = 1; digit <= geom.size; digit++) {
    const bit = digitMask(digit);
    const rowPositions = geom.rows.map((row) =>
      row.filter((cell) => !values[cell] && (candidates[cell] & bit) !== 0),
    );
    for (let r1 = 0; r1 < rowPositions.length; r1++) {
      if (rowPositions[r1].length < 2 || rowPositions[r1].length > 3) continue;
      for (let r2 = r1 + 1; r2 < rowPositions.length; r2++) {
        if (rowPositions[r2].length < 2 || rowPositions[r2].length > 3) continue;
        for (let r3 = r2 + 1; r3 < rowPositions.length; r3++) {
          if (rowPositions[r3].length < 2 || rowPositions[r3].length > 3) continue;
          const rows = [r1, r2, r3];
          const cols = new Set<number>();
          for (const row of rows) {
            for (const cell of rowPositions[row]) cols.add(geom.colOf[cell]);
          }
          if (cols.size !== 3) continue;
          const eliminations: Elimination[] = [];
          for (const colIndex of cols) {
            for (const cell of geom.cols[colIndex]) {
              if (rows.includes(geom.rowOf[cell])) continue;
              if (values[cell]) continue;
              if (candidates[cell] & bit) eliminations.push({ cell, digits: [digit] });
            }
          }
          if (eliminations.length) {
            return step("swordfish", {
              eliminations,
              cells: rows.flatMap((row) => rowPositions[row]),
              unitCells: rows.flatMap((row) => geom.rows[row]),
              digit,
            });
          }
        }
      }
    }
  }
  return null;
}

const ORDERED_SEARCHES = [
  findNakedSingle,
  findHiddenSingle,
  findPointing,
  findNakedPair,
  findHiddenPair,
  findNakedTriple,
  findXWing,
  findXYWing,
  findSwordfish,
];

export interface TechniqueState {
  values: number[];
  candidates: Uint16Array;
}

export function stateFromValues(values: readonly number[], geom: Geometry): TechniqueState {
  const copy = [...values];
  return { values: copy, candidates: buildCandidates(copy, geom) };
}

export function findStep(state: TechniqueState, geom: Geometry): LogicalStep | null {
  const context: SearchContext = { ...state, geom };
  for (const search of ORDERED_SEARCHES) {
    const found = search(context);
    if (found) return found;
  }
  return null;
}

/** Applies a step in place. Returns false if the step changed nothing. */
export function applyStep(state: TechniqueState, step: LogicalStep, geom: Geometry): boolean {
  let changed = false;
  for (const { cell, digit } of step.placements) {
    if (state.values[cell]) continue;
    const bit = digitMask(digit);
    state.values[cell] = digit;
    state.candidates[cell] = 0;
    changed = true;
    for (const peer of geom.peers[cell]) {
      if (!state.values[peer]) state.candidates[peer] &= ~bit;
    }
  }
  for (const { cell, digits } of step.eliminations) {
    if (state.values[cell]) continue;
    let mask = state.candidates[cell];
    for (const digit of digits) mask &= ~digitMask(digit);
    if (mask !== state.candidates[cell]) {
      state.candidates[cell] = mask;
      changed = true;
    }
  }
  return changed;
}

export interface GradeResult {
  solved: boolean;
  score: number;
  clues: number;
  techniques: Partial<Record<TechniqueId, number>>;
  hardest: TechniqueId | null;
  hardestTier: Tier;
  /** true when the logical solver needed no more than singles */
  singlesOnly: boolean;
}

const TIER_RANK = new Map<Tier, number>(TIERS.map((tier, index) => [tier, index]));

export function gradePuzzle(values: readonly number[], spec: BoardSpec): GradeResult {
  const geom = getGeometry(spec);
  const state = stateFromValues(values, geom);
  const techniques: Partial<Record<TechniqueId, number>> = {};
  let score = 0;
  let hardest: TechniqueId | null = null;
  let guard = 0;

  while (state.values.some((value) => value === 0) && guard++ < 1000) {
    const step = findStep(state, geom);
    if (!step) break;
    if (!applyStep(state, step, geom)) break;
    techniques[step.technique] = (techniques[step.technique] ?? 0) + 1;
    score += step.weight;
    if (!hardest || TECHNIQUE_WEIGHTS[step.technique] > TECHNIQUE_WEIGHTS[hardest]) {
      hardest = step.technique;
    }
  }

  const solved = state.values.every((value) => value > 0);
  const hardestTier = hardest ? TECHNIQUE_TIER[hardest] : "cozy";
  return {
    solved,
    score,
    clues: values.filter((value) => value > 0).length,
    techniques,
    hardest,
    hardestTier,
    singlesOnly: !hardest || hardest === "nakedSingle" || hardest === "hiddenSingle",
  };
}

export function tierDistance(a: Tier, b: Tier): number {
  return Math.abs((TIER_RANK.get(a) ?? 0) - (TIER_RANK.get(b) ?? 0));
}

export function describeUnit(unitCells: readonly number[], geom: Geometry): string {
  if (unitCells.length === geom.size) {
    const first = unitCells[0];
    const row = geom.rowOf[first];
    const col = geom.colOf[first];
    const isRow = unitCells.every((cell) => geom.rowOf[cell] === row);
    const isCol = unitCells.every((cell) => geom.colOf[cell] === col);
    if (isRow) return `row ${row + 1}`;
    if (isCol) return `column ${col + 1}`;
  }
  const boxes = new Set(unitCells.map((cell) => geom.boxOf[cell]));
  if (boxes.size === 1) return `box ${[...boxes][0] + 1}`;
  return "the grid";
}
