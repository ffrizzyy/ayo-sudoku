import { generatePuzzle, makeSpec, getGeometry, parseGrid, gradePuzzle } from "../src/engine";

const spec = makeSpec(9);
for (const tier of ["cozy", "easy", "medium", "hard", "expert", "master"] as const) {
  const rows: string[] = [];
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const result = generatePuzzle({ tier, spec, seed: `bench-${tier}-${i}`, budgetMs: 8000 });
    total += result.elapsedMs;
    const grade = gradePuzzle(parseGrid(result.puzzle.givens, getGeometry(spec)), spec);
    rows.push(
      `${result.puzzle.givens.split("").filter((c) => c !== "0").length}c ${grade.hardest ?? "stuck"}/${grade.hardestTier} ${result.elapsedMs}ms`,
    );
  }
  console.log(tier.padEnd(8), `avg ${Math.round(total / 10)}ms`, rows.join(" | "));
}
