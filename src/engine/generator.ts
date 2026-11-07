import { getGeometry } from "./board";
import { cyrb128, sfc32, shuffle, type Rng } from "./prng";
import { countSolutions, findSolutions, randomSolution } from "./solver";
import { gradePuzzle, tierDistance, type GradeResult } from "./techniques";
import {
  TIERS,
  type BoardSpec,
  type Cage,
  type PuzzleDef,
  type Thermo,
  type Tier,
} from "./types";

export const TARGET_CLUES: Record<Tier, number> = {
  cozy: 44,
  easy: 38,
  medium: 32,
  hard: 28,
  expert: 25,
  master: 22,
};

/** Clue density for 9x9, scaled down for the smaller board sizes. */
const TARGET_CLUE_RATIO: Record<Tier, number> = {
  cozy: 44 / 81,
  easy: 38 / 81,
  medium: 32 / 81,
  hard: 28 / 81,
  expert: 25 / 81,
  master: 22 / 81,
};

/**
 * The 9x9 clue targets are absolute; 4x4 and 6x6 need the same density, not
 * more clues than the board has cells. Keep at least size + 1 clues so a small
 * board still has something to solve.
 */
export function targetCluesFor(tier: Tier, size: number): number {
  if (size === 9) return TARGET_CLUES[tier];
  const count = size * size;
  return Math.max(size + 1, Math.round(count * TARGET_CLUE_RATIO[tier]));
}

export const PAR_BASE_SECONDS: Record<Tier, number> = {
  cozy: 150,
  easy: 240,
  medium: 360,
  hard: 540,
  expert: 720,
  master: 900,
};

export function parTimeMs(tier: Tier, score: number): number {
  const seconds = PAR_BASE_SECONDS[tier] + score * 1.2;
  return Math.round(seconds * 1000);
}

interface CarveResult {
  values: number[];
  complete: boolean;
}

function carve(
  solution: readonly number[],
  spec: BoardSpec,
  targetClues: number,
  rng: Rng,
): CarveResult {
  const geom = getGeometry(spec);
  const values = [...solution];
  let clues = geom.cellCount;

  const pairOrder = shuffle(
    Array.from({ length: Math.ceil(geom.cellCount / 2) }, (_, i) => i),
    rng,
  );

  for (const index of pairOrder) {
    if (clues <= targetClues) break;
    const mirror = geom.cellCount - 1 - index;
    const pair = index === mirror ? [index] : [index, mirror];
    if (clues - pair.length < targetClues) continue;
    if (pair.some((cell) => values[cell] === 0)) continue;
    const saved = pair.map((cell) => values[cell]);
    for (const cell of pair) values[cell] = 0;
    if (countSolutions(values, spec, 2) !== 1) {
      pair.forEach((cell, i) => {
        values[cell] = saved[i];
      });
    } else {
      clues -= pair.length;
    }
  }

  if (clues > targetClues) {
    const singles = shuffle(
      Array.from({ length: geom.cellCount }, (_, i) => i),
      rng,
    );
    for (const cell of singles) {
      if (clues <= targetClues) break;
      if (!values[cell]) continue;
      const saved = values[cell];
      values[cell] = 0;
      if (countSolutions(values, spec, 2) !== 1) {
        values[cell] = saved;
      } else {
        clues--;
      }
    }
  }

  return { values, complete: clues <= targetClues };
}

function toPuzzle(
  values: readonly number[],
  solution: readonly number[],
  spec: BoardSpec,
  tier: Tier,
  grade: GradeResult,
  seed: string,
  idSeed: string,
): PuzzleDef {
  const givens = values.map((value) => (value ? String(value) : "0")).join("");
  const solutionString = solution.map((value) => String(value)).join("");
  return {
    id: `gen:${tier}:${idSeed}`,
    spec,
    givens,
    solution: solutionString,
    tier,
    gradeScore: grade.score,
    techniques: Object.fromEntries(
      Object.entries(grade.techniques).filter(([, count]) => (count ?? 0) > 0),
    ) as Record<string, number>,
    seed,
    source: "generated",
  };
}

export interface GenerateOptions {
  tier: Tier;
  spec: BoardSpec;
  seed?: string;
  /** Wall-clock guard for interactive generation. Omit for deterministic runs (daily). */
  budgetMs?: number;
  maxAttempts?: number;
}

export interface GenerateResult {
  puzzle: PuzzleDef;
  attempts: number;
  elapsedMs: number;
  exactTierMatch: boolean;
}

/**
 * Cage size range per difficulty. Five-cell cages are excluded on purpose: the
 * sum of a large cage barely constrains its cells, and the uniqueness search
 * then explodes into tens of seconds on a phone. Cages up to four cells keep
 * generation in the low hundreds of milliseconds.
 */
const KILLER_CAGE_SIZES: Record<Tier, { min: number; max: number }> = {
  cozy: { min: 2, max: 3 },
  easy: { min: 2, max: 3 },
  medium: { min: 2, max: 4 },
  hard: { min: 2, max: 4 },
  expert: { min: 2, max: 4 },
  master: { min: 3, max: 4 },
};

/**
 * Grows orthogonally connected cages over a finished solution. Every cell ends
 * up in exactly one cage, so the sums describe the whole grid.
 */
export function buildKillerCages(
  solution: readonly number[],
  spec: BoardSpec,
  tier: Tier,
  rng: Rng,
): Cage[] {
  const geom = getGeometry(spec);
  const size = spec.size;
  const { min, max } = KILLER_CAGE_SIZES[tier];
  const assigned = new Uint8Array(geom.cellCount);
  const order = shuffle(
    Array.from({ length: geom.cellCount }, (_, index) => index),
    rng,
  );
  const cages: Cage[] = [];

  for (const start of order) {
    if (assigned[start]) continue;
    const target = min + Math.floor(rng() * (max - min + 1));
    const cells = [start];
    assigned[start] = 1;

    while (cells.length < target) {
      const frontier: number[] = [];
      for (const cell of cells) {
        const row = geom.rowOf[cell];
        const col = geom.colOf[cell];
        if (row > 0) frontier.push(cell - size);
        if (row < size - 1) frontier.push(cell + size);
        if (col > 0) frontier.push(cell - 1);
        if (col < size - 1) frontier.push(cell + 1);
      }
      // Killer cages never repeat a digit, so a neighbour that would duplicate
      // one already in the cage cannot join it.
      const usedDigits = new Set(cells.map((cell) => solution[cell]));
      const open = frontier.filter((cell) => !assigned[cell] && !usedDigits.has(solution[cell]));
      if (!open.length) break;
      const next = open[Math.floor(rng() * open.length)];
      assigned[next] = 1;
      cells.push(next);
    }

    // Keep cages compact by sorting cells; the renderer and share codes rely
    // on a stable order.
    cells.sort((a, b) => a - b);
    const sum = cells.reduce((total, cell) => total + solution[cell], 0);
    cages.push({ cells, sum });
  }

  cages.sort((a, b) => a.cells[0] - b.cells[0]);
  return cages;
}

/**
 * Extra clues handed out on the gentler tiers. Cages alone usually leave the
 * grid nearly determined, so a few givens are what separates cozy from master.
 */
const KILLER_EXTRA_CLUES: Record<Tier, number> = {
  cozy: 12,
  easy: 9,
  medium: 7,
  hard: 5,
  expert: 3,
  master: 2,
};

/**
 * Killer generation starts from a full solution and derives cage sums, so the
 * solution is always valid. Cages rarely pin the grid down on their own, so the
 * two-solution comparison is repeated: compare the first two answers, take the
 * value of one cell they disagree on from the real solution, and try again.
 * Each given removes every answer that differs there, so this always reaches a
 * unique puzzle in a handful of steps.
 */
function generateKiller(options: GenerateOptions): GenerateResult {
  const { tier, spec } = options;
  const seed = options.seed ?? `ayo-killer-${tier}-${Date.now().toString(36)}`;
  const started = Date.now();
  const geom = getGeometry(spec);
  const maxAttempts = options.maxAttempts ?? 24;
  const extraClues = KILLER_EXTRA_CLUES[tier];

  let best: PuzzleDef | null = null;
  let attempt = 0;

  for (; attempt < maxAttempts; attempt++) {
    if (options.budgetMs && best && Date.now() - started > options.budgetMs) break;
    const attemptSeed = `${seed}:${attempt}`;
    const rng = sfc32(attemptSeed);
    const solution = randomSolution(spec, rng);
    if (!solution) continue;
    const cages = buildKillerCages(solution, spec, tier, rng);

    const givens = new Array<number>(geom.cellCount).fill(0);
    const order = shuffle(
      Array.from({ length: geom.cellCount }, (_, index) => index),
      rng,
    );
    for (const cell of order.slice(0, extraClues)) givens[cell] = solution[cell];

    // Peel ambiguity until the cages and the givens allow exactly one answer.
    let solved = false;
    for (let guard = 0; guard <= geom.cellCount; guard++) {
      const answers = findSolutions(givens, spec, 2, cages);
      if (answers.length === 0) break; // Cages contradict the solution: retry.
      if (answers.length === 1) {
        solved = true;
        break;
      }
      const [first, second] = answers;
      const differ: number[] = [];
      for (let cell = 0; cell < geom.cellCount; cell++) {
        if (first[cell] !== second[cell]) differ.push(cell);
      }
      if (!differ.length) break;
      const pick = differ[Math.floor(rng() * differ.length)];
      givens[pick] = solution[pick];
    }
    if (!solved) continue;

    const idSeed = (cyrb128(attemptSeed)[0] >>> 0).toString(36);
    best = {
      id: `gen:killer:${idSeed}`,
      spec,
      givens: givens.map((value) => (value ? String(value) : "0")).join(""),
      solution: solution.map((value) => String(value)).join(""),
      tier,
      // Cage count is the only stable hardness signal here: the technique
      // grader in techniques.ts does not know about cages.
      gradeScore: cages.reduce((total, cage) => total + cage.cells.length, 0) / cages.length,
      techniques: {},
      cages,
      seed,
      source: "generated",
    };
    break;
  }

  if (!best) {
    // Last resort: start from the fully revealed solution and take clues away
    // while the puzzle stays unique. Every check runs with plenty of givens, so
    // it is quick, and the result is guaranteed to have exactly one answer.
    const rng = sfc32(`${seed}:fallback`);
    const solution = randomSolution(spec, rng) ?? new Array<number>(geom.cellCount).fill(0);
    if (!solution.some(Boolean)) {
      // randomSolution is not expected to fail; this keeps the contract anyway.
      for (let cell = 0; cell < geom.cellCount; cell++) {
        const row = Math.floor(cell / 9);
        const col = cell % 9;
        solution[cell] = (3 * (row % 3) + Math.floor(row / 3) + col) % 9 + 1;
      }
    }
    const cages = buildKillerCages(solution, spec, "easy", rng);
    const givens = [...solution];
    const order = shuffle(
      Array.from({ length: geom.cellCount }, (_, index) => index),
      rng,
    );
    for (const cell of order) {
      const keep = givens[cell];
      givens[cell] = 0;
      if (countSolutions(givens, spec, 2, cages) !== 1) givens[cell] = keep;
    }
    best = {
      id: `gen:killer:${(cyrb128(`${seed}:fallback`)[0] >>> 0).toString(36)}`,
      spec,
      givens: givens.map((value) => (value ? String(value) : "0")).join(""),
      solution: solution.map((value) => String(value)).join(""),
      tier,
      gradeScore: cages.reduce((total, cage) => total + cage.cells.length, 0) / cages.length,
      techniques: {},
      cages,
      seed,
      source: "generated",
    };
  }

  return {
    puzzle: best,
    attempts: attempt + 1,
    elapsedMs: Date.now() - started,
    exactTierMatch: true,
  };
}

/**
 * Thermometer count and length per difficulty. Easier tiers get more (and
 * therefore shorter) thermometers, which leaves fewer digits unconstrained;
 * the given count below then separates the tiers further.
 */
const THERMO_SHAPES: Record<Tier, { count: number; min: number; max: number }> = {
  cozy: { count: 22, min: 2, max: 4 },
  easy: { count: 20, min: 3, max: 4 },
  medium: { count: 18, min: 3, max: 5 },
  hard: { count: 16, min: 3, max: 5 },
  expert: { count: 14, min: 4, max: 6 },
  master: { count: 12, min: 4, max: 6 },
};

/**
 * Extra clues handed out before the ambiguity peel. Thermometers pin down
 * order but not absolute values, so a handful of givens gives the peel a
 * starting point and keeps generation quick.
 */
const THERMO_EXTRA_CLUES: Record<Tier, number> = {
  cozy: 38,
  easy: 32,
  medium: 26,
  hard: 22,
  expert: 18,
  master: 14,
};

/**
 * Walks orthogonally over a finished solution and keeps every run whose digits
 * strictly increase. Cells carry at most one thermometer, which keeps the
 * drawn path readable and the share payload small.
 */
export function buildThermos(
  solution: readonly number[],
  spec: BoardSpec,
  tier: Tier,
  rng: Rng,
): Thermo[] {
  const geom = getGeometry(spec);
  const size = spec.size;
  const { count, min, max } = THERMO_SHAPES[tier];
  const used = new Uint8Array(geom.cellCount);
  const starts = shuffle(
    Array.from({ length: geom.cellCount }, (_, index) => index),
    rng,
  );
  const thermos: Thermo[] = [];

  // A single pass leaves usable cells behind whenever a walk dies early, which
  // is common on the longer, harder tiers. A few extra passes reclaim them.
  for (let pass = 0; pass < 4 && thermos.length < count; pass++) {
    let grew = false;
    for (const start of starts) {
      if (thermos.length >= count) break;
      if (used[start]) continue;
      const target = min + Math.floor(rng() * (max - min + 1));
      const line = [start];
      let cell = start;

      while (line.length < target) {
        const row = geom.rowOf[cell];
        const col = geom.colOf[cell];
        const neighbours: number[] = [];
        if (row > 0) neighbours.push(cell - size);
        if (row < size - 1) neighbours.push(cell + size);
        if (col > 0) neighbours.push(cell - 1);
        if (col < size - 1) neighbours.push(cell + 1);
        const open = neighbours.filter(
          (next) => !used[next] && solution[next] > solution[cell],
        );
        if (!open.length) break;
        cell = open[Math.floor(rng() * open.length)];
        line.push(cell);
      }

      if (line.length < min) continue;
      for (const member of line) used[member] = 1;
      thermos.push(line);
      grew = true;
    }
    if (!grew) break;
  }

  thermos.sort((a, b) => a[0] - b[0]);
  return thermos;
}

/**
 * Thermo generation starts from a full solution, grows thermometers along the
 * solution's rising runs, then adds givens until the grid is unique. The two
 * solution comparison names exactly one cell to fix per round, so the peel is
 * short and deterministic.
 */
function generateThermo(options: GenerateOptions): GenerateResult {
  const { tier, spec } = options;
  const seed = options.seed ?? `ayo-thermo-${tier}-${Date.now().toString(36)}`;
  const started = Date.now();
  const geom = getGeometry(spec);
  const maxAttempts = options.maxAttempts ?? 24;
  const extraClues = THERMO_EXTRA_CLUES[tier];

  let best: PuzzleDef | null = null;
  let attempt = 0;

  for (; attempt < maxAttempts; attempt++) {
    if (options.budgetMs && best && Date.now() - started > options.budgetMs) break;
    const attemptSeed = `${seed}:${attempt}`;
    const rng = sfc32(attemptSeed);
    const solution = randomSolution(spec, rng);
    if (!solution) continue;
    const thermos = buildThermos(solution, spec, tier, rng);
    if (thermos.length < 6) continue;

    const givens = new Array<number>(geom.cellCount).fill(0);
    const order = shuffle(
      Array.from({ length: geom.cellCount }, (_, index) => index),
      rng,
    );
    for (const cell of order.slice(0, extraClues)) givens[cell] = solution[cell];

    let solved = false;
    for (let guard = 0; guard <= geom.cellCount; guard++) {
      const answers = findSolutions(givens, spec, 2, undefined, thermos);
      if (answers.length === 0) break; // Thermometers contradict the solution: retry.
      if (answers.length === 1) {
        solved = true;
        break;
      }
      const [first, second] = answers;
      const differ: number[] = [];
      for (let cell = 0; cell < geom.cellCount; cell++) {
        if (first[cell] !== second[cell]) differ.push(cell);
      }
      if (!differ.length) break;
      const pick = differ[Math.floor(rng() * differ.length)];
      givens[pick] = solution[pick];
    }
    if (!solved) continue;

    const idSeed = (cyrb128(attemptSeed)[0] >>> 0).toString(36);
    best = {
      id: `gen:thermo:${idSeed}`,
      spec,
      givens: givens.map((value) => (value ? String(value) : "0")).join(""),
      solution: solution.map((value) => String(value)).join(""),
      tier,
      // Average thermometer length, mirroring Killer's use of average cage
      // size: it only feeds the par-time estimate.
      gradeScore:
        thermos.reduce((total, line) => total + line.length, 0) / thermos.length,
      techniques: {},
      thermos,
      seed,
      source: "generated",
    };
    break;
  }

  if (!best) {
    // Last resort: start from the fully revealed solution and take clues away
    // while the thermometers keep exactly one answer. Every check runs with
    // plenty of givens, so it is quick.
    const rng = sfc32(`${seed}:fallback`);
    const solution =
      randomSolution(spec, rng) ?? new Array<number>(geom.cellCount).fill(0);
    if (!solution.some(Boolean)) {
      for (let cell = 0; cell < geom.cellCount; cell++) {
        const row = Math.floor(cell / 9);
        const col = cell % 9;
        solution[cell] = (3 * (row % 3) + Math.floor(row / 3) + col) % 9 + 1;
      }
    }
    const thermos = buildThermos(solution, spec, tier, rng);
    const givens = [...solution];
    const order = shuffle(
      Array.from({ length: geom.cellCount }, (_, index) => index),
      rng,
    );
    for (const cell of order) {
      const keep = givens[cell];
      givens[cell] = 0;
      if (countSolutions(givens, spec, 2, undefined, thermos) !== 1) givens[cell] = keep;
    }
    best = {
      id: `gen:thermo:${(cyrb128(`${seed}:fallback`)[0] >>> 0).toString(36)}`,
      spec,
      givens: givens.map((value) => (value ? String(value) : "0")).join(""),
      solution: solution.map((value) => String(value)).join(""),
      tier,
      gradeScore:
        thermos.reduce((total, line) => total + line.length, 0) / thermos.length,
      techniques: {},
      thermos,
      seed,
      source: "generated",
    };
  }

  return {
    puzzle: best,
    attempts: attempt + 1,
    elapsedMs: Date.now() - started,
    exactTierMatch: true,
  };
}

/**
 * Generates a uniquely solvable, logic-solvable puzzle. Attempts are made until
 * the computed difficulty matches the request, the attempt budget runs out, or
 * the time budget expires. The closest attempt is returned as a fallback.
 */
export function generatePuzzle(options: GenerateOptions): GenerateResult {
  const { tier, spec } = options;
  // Killer and Thermo are generated from their clue payload rather than from
  // carved clues, so they have their own pipelines.
  if (spec.variant === "killer") return generateKiller(options);
  if (spec.variant === "thermo") return generateThermo(options);
  const requestedIndex = TIERS.indexOf(tier);
  const seed = options.seed ?? `ayo-${tier}-${Date.now().toString(36)}`;
  const started = Date.now();
  const target = targetCluesFor(tier, spec.size);
  const maxAttempts = options.maxAttempts ?? (tier === "expert" || tier === "master" ? 24 : 32);

  let best: {
    values: number[];
    solution: number[];
    grade: GradeResult;
    puzzle: PuzzleDef;
    distance: number;
    attempt: number;
  } | null = null;
  let attempt = 0;

  for (; attempt < maxAttempts; attempt++) {
    if (options.budgetMs && best && Date.now() - started > options.budgetMs) break;

    const attemptSeed = `${seed}:${attempt}`;
    const rng = sfc32(attemptSeed);
    const solution = randomSolution(spec, rng);
    if (!solution) continue;
    const carved = carve(solution, spec, target, rng);
    const grade = gradePuzzle(carved.values, spec);

    let distance: number;
    if (grade.solved) {
      distance = tierDistance(grade.hardestTier, tier);
      // Prefer puzzles that needed at least one non-single technique for hard+.
      if (requestedIndex >= 2 && grade.singlesOnly) distance += 0.5;
    } else {
      // A guess-dependent puzzle is less desirable, but a unique one is still playable.
      distance = tierDistance("medium", tier) + 2.5;
    }

    const puzzle = toPuzzle(
      carved.values,
      solution,
      spec,
      tier,
      grade,
      seed,
      (cyrb128(attemptSeed)[0] >>> 0).toString(36),
    );

    if (!best || distance < best.distance) {
      best = { values: carved.values, solution, grade, puzzle, distance, attempt };
    }
    if (grade.solved && grade.hardestTier === tier) break;
  }

  if (!best) {
    // Last-resort fallback: a lightly carved puzzle with a guaranteed solution.
    const rng = sfc32(`${seed}:fallback`);
    const solution = randomSolution(spec, rng) ?? [];
    const fallbackTarget = Math.min(
      targetCluesFor("easy", spec.size) + 6,
      spec.size * spec.size - 1,
    );
    const carved = carve(solution, spec, fallbackTarget, rng);
    const grade = gradePuzzle(carved.values, spec);
    best = {
      values: carved.values,
      solution,
      grade,
      puzzle: toPuzzle(carved.values, solution, spec, tier, grade, seed, "fallback"),
      distance: 5,
      attempt,
    };
  }

  return {
    puzzle: best.puzzle,
    attempts: attempt + 1,
    elapsedMs: Date.now() - started,
    exactTierMatch: best.puzzle.tier === tier && best.distance === 0,
  };
}
