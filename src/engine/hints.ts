import { findConflicts, getGeometry, type Geometry } from "./board";
import {
  applyStep,
  findStep,
  stateFromValues,
  type Placement,
  type TechniqueId,
} from "./techniques";
import type { BoardSpec } from "./types";

export type HintKind = "wrong" | "conflict" | "step" | "solution";

export interface UnitDescriptor {
  type: "row" | "column" | "box" | "grid";
  index: number;
}

export interface HintPlan {
  kind: HintKind;
  technique: TechniqueId | null;
  /** cells to point at */
  cells: number[];
  /** whole unit to shade */
  unitCells: number[];
  digit?: number;
  placement?: Placement;
  unit?: UnitDescriptor;
  wrongCells: number[];
}

function describeUnit(unitCells: readonly number[], geom: Geometry): UnitDescriptor {
  if (!unitCells.length) return { type: "grid", index: 0 };
  const first = unitCells[0];
  const row = geom.rowOf[first];
  const col = geom.colOf[first];
  if (unitCells.every((cell) => geom.rowOf[cell] === row)) {
    return { type: "row", index: row + 1 };
  }
  if (unitCells.every((cell) => geom.colOf[cell] === col)) {
    return { type: "column", index: col + 1 };
  }
  const boxes = new Set(unitCells.map((cell) => geom.boxOf[cell]));
  if (boxes.size === 1) return { type: "box", index: [...boxes][0] + 1 };
  return { type: "grid", index: 0 };
}

function wrongEntries(values: readonly number[], solution: readonly number[]): number[] {
  const wrong: number[] = [];
  for (let cell = 0; cell < values.length; cell++) {
    if (values[cell] && values[cell] !== solution[cell]) wrong.push(cell);
  }
  return wrong;
}

/**
 * Plans a three step hint. The caller decides how much to reveal:
 * nudge shows the unit, pointer shows the cells, reveal shows the placement.
 */
export function planHint(
  values: readonly number[],
  solution: readonly number[],
  spec: BoardSpec,
): HintPlan {
  const geom = getGeometry(spec);
  const wrong = wrongEntries(values, solution);
  const conflictCells = [...findConflicts(values, geom)];
  if (wrong.length) {
    return {
      kind: conflictCells.length ? "conflict" : "wrong",
      technique: null,
      cells: wrong.slice(0, 3),
      unitCells: [],
      wrongCells: wrong,
    };
  }

  let state = stateFromValues(values, geom);
  const first = findStep(state, geom);
  let placement: Placement | undefined = first?.placements[0];

  if (!placement && first) {
    let guard = 0;
    let walk = state;
    while (guard++ < 80) {
      const next = findStep(walk, geom);
      if (!next) break;
      applyStep(walk, next, geom);
      if (next.placements.length) {
        placement = next.placements[0];
        break;
      }
    }
    state = walk;
  }

  if (!first && !placement) {
    // Logical solver is stuck; reveal the next cell from the solution.
    const empty = state.values
      .map((value, cell) => (value === 0 ? cell : -1))
      .filter((cell) => cell >= 0);
    if (empty.length) {
      const cell = empty[0];
      placement = { cell, digit: solution[cell] };
    }
  }

  return {
    kind: first ? "step" : "solution",
    technique: first?.technique ?? null,
    cells: first?.cells ?? (placement ? [placement.cell] : []),
    unitCells: first?.unitCells ?? [],
    digit: first?.digit ?? placement?.digit,
    placement,
    unit: first?.unitCells.length ? describeUnit(first.unitCells, geom) : undefined,
    wrongCells: [],
  };
}
