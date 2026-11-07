import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, newlyUnlocked, resultVariant } from "../src/app/achievements";
import { VARIANTS } from "../src/app/variants";
import type { GameResult, Meta, Totals } from "../src/app/storage";
import type { Variant } from "../src/engine/types";

const META: Meta = {
  schemaVersion: 1,
  installId: "test",
  shared: false,
  languagesPlayed: ["en"],
  lessonsLearned: [],
};

function totals(wins: number): Totals {
  return { schemaVersion: 1, games: wins, wins, best: {} };
}

function win(index: number, patch: Partial<GameResult> = {}): GameResult {
  return {
    id: `result-${index}`,
    puzzleId: `puzzle-${index}`,
    mode: "classic",
    tier: "easy",
    size: 9,
    timeMs: 90_000,
    mistakes: 0,
    hints: 0,
    stars: 3,
    finishedAt: index,
    won: true,
    ...patch,
  };
}

const VARIANT_ACHIEVEMENTS: Array<[Variant, string]> = [
  ["diagonal", "diagonalWin"],
  ["windoku", "windokuWin"],
  ["killer", "killerWin"],
  ["thermo", "thermoWin"],
];

describe("variant achievements", () => {
  it("lists every achievement exactly once", () => {
    expect(new Set(ACHIEVEMENTS).size).toBe(ACHIEVEMENTS.length);
  });

  it("treats results without a variant as classic", () => {
    const legacy = win(1);
    expect(legacy.variant).toBeUndefined();
    expect(resultVariant(legacy)).toBe("classic");
    const ids = newlyUnlocked([legacy], {}, META, totals(1), 0);
    expect(ids).toContain("firstWin");
    expect(ids).not.toContain("diagonalWin");
    expect(ids).not.toContain("allVariants");
  });

  it("unlocks one achievement per puzzle type", () => {
    VARIANT_ACHIEVEMENTS.forEach(([variant, id], index) => {
      const ids = newlyUnlocked(
        [win(index, { variant })],
        {},
        META,
        totals(1),
        0,
      );
      expect(ids).toContain(id);
    });
  });

  it("unlocks every flavour only after all five types are won", () => {
    const four = VARIANTS.slice(0, 4).map((variant, index) => win(index, { variant }));
    expect(newlyUnlocked(four, {}, META, totals(4), 0)).not.toContain("allVariants");

    const five = VARIANTS.map((variant, index) => win(index, { variant }));
    expect(newlyUnlocked(five, {}, META, totals(5), 0)).toContain("allVariants");
  });

  it("does not unlock a variant achievement for a loss", () => {
    const ids = newlyUnlocked(
      [win(1, { variant: "killer", won: false, stars: 0 })],
      {},
      META,
      totals(0),
      0,
    );
    expect(ids).not.toContain("killerWin");
    expect(ids).not.toContain("allVariants");
  });

  it("unlocks the mini board achievement on 4×4 and 6×6 wins", () => {
    for (const size of [4, 6]) {
      const ids = newlyUnlocked([win(1, { size })], {}, META, totals(1), 0);
      expect(ids).toContain("miniWin");
    }
    const full = newlyUnlocked([win(1, { size: 9 })], {}, META, totals(1), 0);
    expect(full).not.toContain("miniWin");
  });
});
