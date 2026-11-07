import { describe, expect, it } from "vitest";
import {
  countSolutions,
  decodeShareCode,
  encodeShareCode,
  findStep,
  formatGrid,
  generatePuzzle,
  getGeometry,
  gradePuzzle,
  makeSpec,
  parseGrid,
  planHint,
  puzzleFromShareCode,
  solve,
  stateFromValues,
} from "../src/engine";

const PUZZLE =
  "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79";
const SOLUTION =
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179";

describe("board geometry", () => {
  it("builds rows, columns and boxes for every size", () => {
    for (const size of [4, 6, 9] as const) {
      const spec = makeSpec(size);
      const geom = getGeometry(spec);
      expect(geom.units.length).toBe(size * 3);
      expect(geom.rows.length).toBe(size);
      expect(geom.boxes.length).toBe(size);
      expect(new Set(geom.peers[0]).size).toBe(geom.peers[0].length);
      for (let cell = 0; cell < geom.cellCount; cell++) {
        for (const peer of geom.peers[cell]) {
          expect(geom.peers[peer]).toContain(cell);
        }
      }
    }
  });

  it("adds both diagonals for the diagonal variant", () => {
    const geom = getGeometry(makeSpec(9, "diagonal"));
    expect(geom.diagonals).toHaveLength(2);
    expect(geom.units).toHaveLength(29);
    expect(geom.peers[0]).toContain(80);
  });

  it("builds the four 3x3 windows for windoku", () => {
    const geom = getGeometry(makeSpec(9, "windoku"));
    expect(geom.windows).toHaveLength(4);
    expect(geom.units).toHaveLength(27 + 4);
    expect(geom.windows).toEqual([
      [10, 11, 12, 19, 20, 21, 28, 29, 30],
      [14, 15, 16, 23, 24, 25, 32, 33, 34],
      [46, 47, 48, 55, 56, 57, 64, 65, 66],
      [50, 51, 52, 59, 60, 61, 68, 69, 70],
    ]);
    // 10 (r1c1) and 30 (r3c3) share no row, column or box, only a window.
    expect(geom.peers[10]).toContain(30);
    // Classic boards and mini boards have no windows.
    expect(getGeometry(makeSpec(9)).windows).toHaveLength(0);
    expect(makeSpec(6, "windoku").variant).toBe("classic");
  });
});

describe("solver", () => {
  it("solves a known puzzle", () => {
    const spec = makeSpec(9);
    const values = parseGrid(PUZZLE, getGeometry(spec));
    const solution = solve(values, spec);
    expect(solution).not.toBeNull();
    expect(formatGrid(solution!)).toBe(SOLUTION);
  });

  it("counts uniqueness", () => {
    const spec = makeSpec(9);
    const values = parseGrid(PUZZLE, getGeometry(spec));
    expect(countSolutions(values, spec, 2)).toBe(1);
    expect(countSolutions(new Array(81).fill(0), spec, 2)).toBe(2);
  });

  it("rejects invalid grids", () => {
    const spec = makeSpec(9);
    const values = parseGrid(PUZZLE, getGeometry(spec));
    values[1] = 5;
    expect(solve(values, spec)).toBeNull();
    expect(countSolutions(values, spec, 2)).toBe(0);
  });
});

describe("grader", () => {
  it("solves the known puzzle with human techniques", () => {
    const spec = makeSpec(9);
    const values = parseGrid(PUZZLE, getGeometry(spec));
    const grade = gradePuzzle(values, spec);
    expect(grade.score).toBeGreaterThan(0);
    expect(grade.clues).toBe(30);
  });

  it("finds a first step", () => {
    const spec = makeSpec(9);
    const values = parseGrid(PUZZLE, getGeometry(spec));
    const step = findStep(stateFromValues(values, getGeometry(spec)), getGeometry(spec));
    expect(step).not.toBeNull();
    expect(step!.placements.length + step!.eliminations.length).toBeGreaterThan(0);
  });
});

describe("generator", () => {
  for (const tier of ["cozy", "medium", "hard", "master"] as const) {
    it(`generates a unique ${tier} puzzle`, () => {
      const spec = makeSpec(9);
      const result = generatePuzzle({ tier, spec, seed: `test-${tier}`, budgetMs: 8000 });
      const values = parseGrid(result.puzzle.givens, getGeometry(spec));
      expect(countSolutions(values, spec, 2)).toBe(1);
      const solved = solve(values, spec);
      expect(solved).not.toBeNull();
      expect(formatGrid(solved!)).toBe(result.puzzle.solution);
      expect(result.puzzle.tier).toBe(tier);
      expect(result.puzzle.source).toBe("generated");
    }, 20000);
  }

  it("is deterministic for daily puzzles", () => {
    const spec = makeSpec(9);
    const a = generatePuzzle({ tier: "medium", spec, seed: "ayo-daily-2026-10-23", maxAttempts: 12 });
    const b = generatePuzzle({ tier: "medium", spec, seed: "ayo-daily-2026-10-23", maxAttempts: 12 });
    expect(a.puzzle.givens).toBe(b.puzzle.givens);
    expect(a.puzzle.solution).toBe(b.puzzle.solution);
  }, 20000);

  it("generates 4x4 and diagonal puzzles", () => {
    const mini = generatePuzzle({ tier: "easy", spec: makeSpec(4), seed: "mini", budgetMs: 4000 });
    expect(mini.puzzle.givens).toHaveLength(16);
    expect(mini.puzzle.givens).toContain("0");
    const miniValues = parseGrid(mini.puzzle.givens, getGeometry(makeSpec(4)));
    expect(countSolutions(miniValues, makeSpec(4), 2)).toBe(1);
    expect(formatGrid(solve(miniValues, makeSpec(4))!)).toBe(mini.puzzle.solution);

    const diag = generatePuzzle({
      tier: "medium",
      spec: makeSpec(9, "diagonal"),
      seed: "diag",
      budgetMs: 6000,
      maxAttempts: 8,
    });
    const values = parseGrid(diag.puzzle.givens, getGeometry(makeSpec(9, "diagonal")));
    expect(countSolutions(values, makeSpec(9, "diagonal"), 2)).toBe(1);
  }, 20000);

  it("carves a solvable 6x6 puzzle instead of returning a full grid", () => {
    const spec = makeSpec(6);
    const result = generatePuzzle({ tier: "medium", spec, seed: "mini-6x6", budgetMs: 6000 });
    const givens = result.puzzle.givens;
    const clues = givens.split("").filter((char) => char !== "0").length;
    expect(givens).toHaveLength(36);
    expect(clues).toBeLessThan(36);
    expect(clues).toBeGreaterThanOrEqual(spec.size + 1);
    const values = parseGrid(givens, getGeometry(spec));
    expect(countSolutions(values, spec, 2)).toBe(1);
    const solution = solve(values, spec);
    expect(solution).not.toBeNull();
    expect(formatGrid(solution!)).toBe(result.puzzle.solution);
  }, 20000);

  it("generates a windoku puzzle whose solution fills every window", () => {
    const spec = makeSpec(9, "windoku");
    const geom = getGeometry(spec);
    const result = generatePuzzle({ tier: "easy", spec, seed: "windoku", budgetMs: 10000, maxAttempts: 12 });
    const values = parseGrid(result.puzzle.givens, geom);
    expect(countSolutions(values, spec, 2)).toBe(1);
    const solved = solve(values, spec);
    expect(solved).not.toBeNull();
    for (const window of geom.windows) {
      const digits = window.map((cell) => solved![cell]).sort((a, b) => a - b);
      expect(digits).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
    expect(result.puzzle.spec.variant).toBe("windoku");
  }, 30000);

  it("generates a killer puzzle that the cages solve uniquely", () => {
    const spec = makeSpec(9, "killer");
    const geom = getGeometry(spec);
    const result = generatePuzzle({ tier: "medium", spec, seed: "killer-medium" });
    const cages = result.puzzle.cages ?? [];
    expect(cages.length).toBeGreaterThan(10);

    // Cages cover every cell exactly once and repeat no digit.
    const seen = new Set<number>();
    for (const cage of cages) {
      expect(cage.cells.length).toBeGreaterThan(0);
      for (const cell of cage.cells) {
        expect(seen.has(cell)).toBe(false);
        seen.add(cell);
      }
      const digits = cage.cells.map((cell) => result.puzzle.solution[cell]);
      expect(new Set(digits).size).toBe(digits.length);
      expect(digits.reduce((sum, digit) => sum + Number(digit), 0)).toBe(cage.sum);
    }
    expect(seen.size).toBe(geom.cellCount);

    const values = parseGrid(result.puzzle.givens, geom);
    expect(countSolutions(values, spec, 2, cages)).toBe(1);
    const solved = solve(values, spec, cages);
    expect(formatGrid(solved!)).toBe(result.puzzle.solution);
  }, 60000);

  it("keeps killer cages in the share code", () => {
    const spec = makeSpec(9, "killer");
    const result = generatePuzzle({ tier: "easy", spec, seed: "killer-share" });
    const code = encodeShareCode(result.puzzle);
    const decoded = decodeShareCode(code);
    expect(decoded.spec.variant).toBe("killer");
    expect(decoded.cages?.length).toBe(result.puzzle.cages?.length);
    const puzzle = puzzleFromShareCode(code);
    expect(puzzle.solution).toBe(result.puzzle.solution);
    expect(puzzle.cages?.length).toBe(result.puzzle.cages?.length);
    // A killer code without its cages must not be accepted as a classic puzzle.
    expect(() =>
      puzzleFromShareCode(
        encodeShareCode({
          ...result.puzzle,
          spec: makeSpec(9),
          cages: undefined,
        }),
      ),
    ).toThrow();
  }, 60000);

  it("treats cages as real constraints", () => {
    const spec = makeSpec(9, "killer");
    const geom = getGeometry(spec);
    const values = parseGrid(PUZZLE, geom);
    // PUZZLE's own solution gives a consistent cage; a wrong sum must fail.
    const cage = { cells: [0, 1, 9], sum: Number(SOLUTION[0]) + Number(SOLUTION[1]) + Number(SOLUTION[9]) };
    expect(countSolutions(values, spec, 2, [cage])).toBe(1);
    expect(countSolutions(values, spec, 2, [{ ...cage, sum: cage.sum + 1 }])).toBe(0);
    // Repeating a digit inside one cage breaks the killer rule.
    expect(
      countSolutions(values, spec, 2, [{ cells: [0, 1], sum: Number(SOLUTION[0]) * 2 }]),
    ).toBe(0);
  });

  it("hints from the solution when cages make techniques unavailable", () => {
    const spec = makeSpec(9, "killer");
    const result = generatePuzzle({ tier: "medium", spec, seed: "killer-hint" });
    const values = parseGrid(result.puzzle.givens, getGeometry(spec));
    const solution = result.puzzle.solution.split("").map(Number);
    const plan = planHint(values, solution, spec, result.puzzle.cages);
    expect(plan.placement).toBeDefined();
    expect(solution[plan.placement!.cell]).toBe(plan.placement!.digit);
  }, 60000);

  it("generates a thermo puzzle with increasing thermometers", () => {
    const spec = makeSpec(9, "thermo");
    const geom = getGeometry(spec);
    const result = generatePuzzle({ tier: "medium", spec, seed: "thermo-medium" });
    const thermos = result.puzzle.thermos ?? [];
    expect(thermos.length).toBeGreaterThan(5);
    expect(result.puzzle.spec.variant).toBe("thermo");

    const seen = new Set<number>();
    for (const line of thermos) {
      expect(line.length).toBeGreaterThanOrEqual(2);
      line.forEach((cell, index) => {
        expect(seen.has(cell)).toBe(false);
        seen.add(cell);
        if (index === 0) return;
        const previous = line[index - 1];
        const rowGap = Math.abs(geom.rowOf[cell] - geom.rowOf[previous]);
        const colGap = Math.abs(geom.colOf[cell] - geom.colOf[previous]);
        expect(rowGap + colGap).toBe(1);
        expect(Number(result.puzzle.solution[cell])).toBeGreaterThan(
          Number(result.puzzle.solution[previous]),
        );
      });
    }
    expect(seen.size).toBe(thermos.reduce((total, line) => total + line.length, 0));

    const values = parseGrid(result.puzzle.givens, geom);
    expect(countSolutions(values, spec, 2, undefined, thermos)).toBe(1);
    const solved = solve(values, spec, undefined, thermos);
    expect(formatGrid(solved!)).toBe(result.puzzle.solution);
  }, 60000);

  it("keeps thermometers in the share code", () => {
    const spec = makeSpec(9, "thermo");
    const result = generatePuzzle({ tier: "easy", spec, seed: "thermo-share" });
    const code = encodeShareCode(result.puzzle);
    const decoded = decodeShareCode(code);
    expect(decoded.spec.variant).toBe("thermo");
    expect(decoded.spec.size).toBe(9);
    expect(decoded.thermos).toEqual(result.puzzle.thermos);
    const puzzle = puzzleFromShareCode(code);
    expect(puzzle.solution).toBe(result.puzzle.solution);
    expect(puzzle.thermos).toEqual(result.puzzle.thermos);
    // A thermo code must carry its lines, and a bare grid must not be read as
    // a thermometer puzzle.
    const classic = generatePuzzle({ tier: "easy", spec: makeSpec(9), seed: "thermo-classic" });
    expect(() =>
      decodeShareCode(
        encodeShareCode({
          ...classic.puzzle,
          spec: makeSpec(9, "thermo"),
          thermos: undefined,
        }),
      ),
    ).toThrow();
  }, 60000);

  it("treats thermometers as real ordering constraints", () => {
    const spec = makeSpec(9, "thermo");
    const values = parseGrid(PUZZLE, getGeometry(spec));
    // PUZZLE's solution rises along cells 1, 2, 3 (3, 4, 6).
    expect(countSolutions(values, spec, 2, undefined, [[1, 2, 3]])).toBe(1);
    expect(countSolutions(values, spec, 2, undefined, [[3, 2, 1]])).toBe(0);
    // A malformed line is rejected outright.
    expect(countSolutions(values, spec, 2, undefined, [[0, 0]])).toBe(0);
    // Thermo is a 9x9 variant; smaller boards fall back to classic.
    expect(makeSpec(6, "thermo").variant).toBe("classic");
  });

  it("hints from the solution when thermometers make techniques unavailable", () => {
    const spec = makeSpec(9, "thermo");
    const result = generatePuzzle({ tier: "medium", spec, seed: "thermo-hint" });
    const values = parseGrid(result.puzzle.givens, getGeometry(spec));
    const solution = result.puzzle.solution.split("").map(Number);
    const plan = planHint(values, solution, spec, undefined, result.puzzle.thermos);
    expect(plan.placement).toBeDefined();
    expect(solution[plan.placement!.cell]).toBe(plan.placement!.digit);
  }, 60000);
});

describe("share codes", () => {
  it("round trips a puzzle", () => {
    const spec = makeSpec(9);
    const tier = "medium" as const;
    const code = encodeShareCode({
      id: "test",
      spec,
      givens: PUZZLE,
      solution: SOLUTION,
      tier,
      gradeScore: 10,
      techniques: {},
      source: "generated",
    });
    expect(code.length).toBeLessThan(80);
    const decoded = decodeShareCode(code);
    expect(decoded.givens).toBe(PUZZLE.replace(/\./g, "0"));
    expect(decoded.tier).toBe(tier);
    const puzzle = puzzleFromShareCode(code);
    expect(puzzle.solution).toBe(SOLUTION);
  });

  it("rejects corrupted codes", () => {
    const code = encodeShareCode({
      id: "test",
      spec: makeSpec(9),
      givens: PUZZLE,
      solution: SOLUTION,
      tier: "easy",
      gradeScore: 1,
      techniques: {},
      source: "generated",
    });
    const corrupted = `${code.slice(0, 20)}${code[20] === "A" ? "B" : "A"}${code.slice(21)}`;
    expect(() => decodeShareCode(corrupted)).toThrow();
    expect(() => decodeShareCode("nope")).toThrow();
  });

  it("supports 4x4 and diagonal variants", () => {
    const spec = makeSpec(4);
    const values = parseGrid("1234341243212143", getGeometry(spec));
    const solution = solve(values, spec);
    expect(solution).not.toBeNull();
    const code = encodeShareCode({
      id: "mini",
      spec,
      givens: formatGrid(values),
      solution: formatGrid(solution!),
      tier: "cozy",
      gradeScore: 1,
      techniques: {},
      source: "generated",
    });
    expect(decodeShareCode(code).spec.size).toBe(4);
  });

  it("keeps the windoku variant across a share code", () => {
    const spec = makeSpec(9, "windoku");
    const result = generatePuzzle({ tier: "easy", spec, seed: "windoku-code", budgetMs: 10000, maxAttempts: 12 });
    const code = encodeShareCode(result.puzzle);
    const decoded = decodeShareCode(code);
    expect(decoded.spec.variant).toBe("windoku");
    expect(decoded.spec.size).toBe(9);
    expect(decoded.givens).toBe(result.puzzle.givens);
    expect(puzzleFromShareCode(code).solution).toBe(result.puzzle.solution);
  }, 30000);

  it("keeps the diagonal variant across a share code", () => {
    const spec = makeSpec(9, "diagonal");
    const result = generatePuzzle({ tier: "easy", spec, seed: "diag-code", budgetMs: 10000, maxAttempts: 12 });
    const decoded = decodeShareCode(encodeShareCode(result.puzzle));
    expect(decoded.spec.variant).toBe("diagonal");
    expect(decoded.givens).toBe(result.puzzle.givens);
  }, 30000);
});

describe("hints", () => {
  it("plans a step hint and a placement", () => {
    const spec = makeSpec(9);
    const values = parseGrid(PUZZLE, getGeometry(spec));
    const solution = parseGrid(SOLUTION, getGeometry(spec));
    const hint = planHint(values, solution, spec);
    expect(hint.kind).toBe("step");
    expect(hint.cells.length).toBeGreaterThan(0);
    expect(hint.placement).toBeDefined();
  });

  it("shades a unit for a naked single so the nudge has a region", () => {
    const spec = makeSpec(9);
    const solution = parseGrid(SOLUTION, getGeometry(spec));
    const values = [...solution];
    values[0] = 0;
    const hint = planHint(values, solution, spec);
    expect(hint.kind).toBe("step");
    expect(hint.technique).toBe("nakedSingle");
    expect(hint.cells).toEqual([0]);
    expect(hint.unitCells).toHaveLength(9);
    expect(hint.unit?.type).toBe("row");
    expect(hint.unit?.index).toBe(1);
  });

  it("points at wrong entries first", () => {
    const spec = makeSpec(9);
    const values = parseGrid(PUZZLE, getGeometry(spec));
    const solution = parseGrid(SOLUTION, getGeometry(spec));
    values[2] = 9;
    const hint = planHint(values, solution, spec);
    expect(hint.kind).toBe("conflict");
    expect(hint.cells).toContain(2);
  });
});
