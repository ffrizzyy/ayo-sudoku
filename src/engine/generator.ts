import { getGeometry } from "./board";
import { cyrb128, sfc32, shuffle, type Rng } from "./prng";
import { countSolutions, randomSolution } from "./solver";
import { gradePuzzle, tierDistance, type GradeResult } from "./techniques";
import {
  TIERS,
  type BoardSpec,
  type PuzzleDef,
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
 * Generates a uniquely solvable, logic-solvable puzzle. Attempts are made until
 * the computed difficulty matches the request, the attempt budget runs out, or
 * the time budget expires. The closest attempt is returned as a fallback.
 */
export function generatePuzzle(options: GenerateOptions): GenerateResult {
  const { tier, spec } = options;
  const requestedIndex = TIERS.indexOf(tier);
  const seed = options.seed ?? `ayo-${tier}-${Date.now().toString(36)}`;
  const started = Date.now();
  const target = TARGET_CLUES[tier];
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
    const carved = carve(solution, spec, Math.min(TARGET_CLUES.easy + 6, spec.size * spec.size - 1), rng);
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

/** Deterministic daily generation: no wall-clock budget so every player gets the same puzzle. */
export function generateDaily(seed: string, spec: BoardSpec, tier: Tier = "medium"): PuzzleDef {
  return generatePuzzle({
    tier,
    spec,
    seed: `ayo-daily-${seed}`,
    maxAttempts: 14,
  }).puzzle;
}
