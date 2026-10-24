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
