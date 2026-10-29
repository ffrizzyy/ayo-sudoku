import type { BoardSpec } from "./types";

export interface Geometry {
  spec: BoardSpec;
  size: number;
  cellCount: number;
  boxRows: number;
  boxCols: number;
  /** all units: rows, columns, boxes, then diagonals */
  units: number[][];
  /** indexes into units for each cell */
  cellUnits: number[][];
  peers: number[][];
  rows: number[][];
  cols: number[][];
  boxes: number[][];
  diagonals: number[][];
  /** indexes into diagonals for each cell */
  cellDiags: number[][];
  rowOf: number[];
  colOf: number[];
  boxOf: number[];
}

const cache = new Map<string, Geometry>();

function build(spec: BoardSpec): Geometry {
  const { size, boxRows, boxCols, variant } = spec;
  const cellCount = size * size;
  const rows: number[][] = [];
  const cols: number[][] = [];
  const boxes: number[][] = [];
  const diagonals: number[][] = [];
  const rowOf: number[] = [];
  const colOf: number[] = [];
  const boxOf: number[] = [];
  const boxRowsCount = size / boxRows;
  const boxColsCount = size / boxCols;

  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) row.push(r * size + c);
    rows.push(row);
  }
  for (let c = 0; c < size; c++) {
    const col: number[] = [];
    for (let r = 0; r < size; r++) col.push(r * size + c);
    cols.push(col);
  }
  for (let br = 0; br < boxRowsCount; br++) {
    for (let bc = 0; bc < boxColsCount; bc++) {
      const box: number[] = [];
      for (let r = 0; r < boxRows; r++) {
        for (let c = 0; c < boxCols; c++) {
          box.push((br * boxRows + r) * size + (bc * boxCols + c));
        }
      }
      boxes.push(box);
    }
  }
  for (let i = 0; i < cellCount; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    rowOf[i] = r;
    colOf[i] = c;
    boxOf[i] = Math.floor(r / boxRows) * boxColsCount + Math.floor(c / boxCols);
  }

  if (variant === "diagonal") {
    const main: number[] = [];
    const anti: number[] = [];
    for (let i = 0; i < size; i++) {
      main.push(i * size + i);
      anti.push(i * size + (size - 1 - i));
    }
    diagonals.push(main, anti);
  }

  const units = [...rows, ...cols, ...boxes, ...diagonals];
  const cellUnits: number[][] = Array.from({ length: cellCount }, () => []);
  units.forEach((unit, unitIndex) => {
    for (const cell of unit) cellUnits[cell].push(unitIndex);
  });

  const cellDiags: number[][] = Array.from({ length: cellCount }, () => []);
  diagonals.forEach((diag, diagIndex) => {
    for (const cell of diag) cellDiags[cell].push(diagIndex);
  });

  const peers: number[][] = [];
  for (let cell = 0; cell < cellCount; cell++) {
    const set = new Set<number>();
    for (const unitIndex of cellUnits[cell]) {
      for (const other of units[unitIndex]) if (other !== cell) set.add(other);
    }
    peers.push([...set]);
  }

  return {
    spec,
    size,
    cellCount,
    boxRows,
    boxCols,
    units,
    cellUnits,
    peers,
    rows,
    cols,
    boxes,
    diagonals,
    cellDiags,
    rowOf,
    colOf,
    boxOf,
  };
}

export function getGeometry(spec: BoardSpec): Geometry {
  const key = `${spec.size}:${spec.boxRows}:${spec.boxCols}:${spec.variant}`;
  let geom = cache.get(key);
  if (!geom) {
    geom = build(spec);
    cache.set(key, geom);
  }
  return geom;
}

export function parseGrid(input: string, geom: Geometry): number[] {
  const cleaned = input.replace(/[\s|_-]/g, "");
  if (cleaned.length !== geom.cellCount) {
    throw new Error(`Expected ${geom.cellCount} cells, received ${cleaned.length}`);
  }
  const values: number[] = [];
  for (const ch of cleaned) {
    if (ch === "." || ch === "0") {
      values.push(0);
      continue;
    }
    const digit = Number(ch);
    if (!Number.isInteger(digit) || digit < 1 || digit > geom.size) {
      throw new Error(`Invalid digit "${ch}"`);
    }
    values.push(digit);
  }
  return values;
}

export function formatGrid(values: readonly number[]): string {
  return values.map((value) => (value === 0 ? "." : String(value))).join("");
}

/** Cells that duplicate a digit in any unit. */
export function findConflicts(values: readonly number[], geom: Geometry): Set<number> {
  const conflicts = new Set<number>();
  for (const unit of geom.units) {
    const seen = new Map<number, number>();
    for (const cell of unit) {
      const value = values[cell];
      if (!value) continue;
      const previous = seen.get(value);
      if (previous !== undefined) {
        conflicts.add(previous);
        conflicts.add(cell);
      } else {
        seen.set(value, cell);
      }
    }
  }
  return conflicts;
}

export function isValidGrid(values: readonly number[], geom: Geometry): boolean {
  if (findConflicts(values, geom).size > 0) return false;
  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value > geom.size) return false;
  }
  return true;
}

export function isComplete(values: readonly number[], geom: Geometry): boolean {
  return values.every((value) => value > 0) && isValidGrid(values, geom);
}
