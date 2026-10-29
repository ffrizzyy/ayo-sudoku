import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyBackup,
  exportBackup,
  inspectBackup,
  readAchievements,
  readDaily,
  readMeta,
  readResults,
  readTotals,
  resetAllData,
  writeAchievements,
  writeDaily,
  writeMeta,
  writeResults,
  writeTotals,
  type GameResult,
} from "../src/app/storage";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

const META = {
  schemaVersion: 1 as const,
  installId: "test-install",
  shared: true,
  languagesPlayed: ["en", "id"],
  lessonsLearned: ["rules", "scanning"],
  modesUsed: ["classic", "daily"],
};

describe("backup round trip", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports and restores progress meta", () => {
    writeMeta(META);
    const raw = exportBackup({ theme: "dark" });
    const backup = JSON.parse(raw);

    expect(backup.app).toBe("ayo-sudoku");
    expect(backup.meta.lessonsLearned).toEqual(META.lessonsLearned);

    const inspected = inspectBackup(raw);
    expect(inspected.ok).toBe(true);

    resetAllData();
    expect(readMeta().lessonsLearned).toEqual([]);

    applyBackup(backup);
    expect(readMeta().lessonsLearned).toEqual(META.lessonsLearned);
    expect(readMeta().shared).toBe(true);
    expect(readMeta().modesUsed).toEqual(META.modesUsed);
  });

  it("rejects a page that is not a backup", () => {
    const result = inspectBackup("<!doctype html><h1>Ayo Sudoku!</h1>");
    expect(result.ok).toBe(false);
  });

  it("rejects a backup with a malformed section", () => {
    const raw = JSON.stringify({
      app: "ayo-sudoku",
      version: 1,
      meta: META,
      results: [{ id: "broken", mode: "classic" }],
    });
    const inspected = inspectBackup(raw);
    expect(inspected.ok).toBe(false);
    if (!inspected.ok) expect(inspected.error).toBe("invalidSection:results");
  });

  it("does not write corrupt data over saved progress", () => {
    writeMeta(META);
    applyBackup({
      app: "ayo-sudoku",
      meta: { schemaVersion: 1, installId: 42 },
      saves: { classic: { id: "not-a-save" } },
    });
    expect(readMeta().installId).toBe(META.installId);
    expect(readMeta().lessonsLearned).toEqual(META.lessonsLearned);
  });
});

const RESULT: GameResult = {
  id: "result-1",
  puzzleId: "classic-1",
  mode: "classic",
  tier: "easy",
  size: 9,
  timeMs: 120000,
  mistakes: 0,
  hints: 0,
  stars: 3,
  finishedAt: 1_700_000_000_000,
  won: true,
};

describe("lifetime totals", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rebuilds totals from history that already exists", () => {
    writeResults([RESULT]);
    const totals = readTotals();
    expect(totals.games).toBe(1);
    expect(totals.wins).toBe(1);
    expect(totals.best["classic-1"]).toEqual({ stars: 3, timeMs: 120000 });
  });

  it("keeps stars after the result they came from is gone", () => {
    writeResults([RESULT]);
    readTotals();
    writeResults([]);
    expect(readTotals().best["classic-1"].stars).toBe(3);
    expect(readTotals().wins).toBe(1);
  });

  it("rejects a backup with a malformed totals section", () => {
    const inspected = inspectBackup(
      JSON.stringify({ app: "ayo-sudoku", version: 2, totals: { best: { "classic-1": { stars: "3" } } } }),
    );
    expect(inspected.ok).toBe(false);
    if (!inspected.ok) expect(inspected.error).toBe("invalidSection:totals");
  });

  it("exports totals and still accepts a version 1 backup", () => {
    writeTotals({ schemaVersion: 1, games: 4, wins: 3, best: { "classic-1": { stars: 3, timeMs: 1000 } } });
    const backup = JSON.parse(exportBackup({}));
    expect(backup.version).toBe(2);
    expect(backup.totals.best["classic-1"].stars).toBe(3);

    const legacy = inspectBackup(JSON.stringify({ app: "ayo-sudoku", version: 1, meta: META }));
    expect(legacy.ok).toBe(true);
  });
});

describe("backup import modes", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges without losing the better local record", () => {
    writeDaily({
      "2026-10-01": { date: "2026-10-01", puzzleId: "daily-1", timeMs: 90000, stars: 3, finishedAt: 1 },
    });
    writeAchievements({ firstWin: 111, noHints: 111 });
    writeMeta(META);

    applyBackup(
      {
        app: "ayo-sudoku",
        daily: {
          "2026-10-01": { date: "2026-10-01", puzzleId: "daily-1", timeMs: 60000, stars: 1, finishedAt: 2 },
          "2026-10-02": { date: "2026-10-02", puzzleId: "daily-2", timeMs: 60000, stars: 2, finishedAt: 3 },
        },
        achievements: { firstWin: 999, tenWins: 500 },
        meta: { ...META, installId: "other-device", languagesPlayed: ["id"], lessonsLearned: [] },
      },
      "merge",
    );

    const daily = readDaily();
    expect(daily["2026-10-01"].stars).toBe(3);
    expect(daily["2026-10-02"].stars).toBe(2);

    const achievements = readAchievements();
    expect(achievements.firstWin).toBe(111);
    expect(achievements.tenWins).toBe(500);

    const meta = readMeta();
    expect(meta.installId).toBe(META.installId);
    expect(meta.languagesPlayed).toEqual(["en", "id"]);
    expect(meta.lessonsLearned).toEqual(META.lessonsLearned);
  });

  it("replace clears sections the backup does not carry", () => {
    writeResults([RESULT]);
    writeAchievements({ firstWin: 1 });
    writeDaily({
      "2026-10-01": { date: "2026-10-01", puzzleId: "daily-1", timeMs: 90000, stars: 3, finishedAt: 1 },
    });
    readTotals();

    applyBackup({ app: "ayo-sudoku", totals: { schemaVersion: 1, games: 2, wins: 2, best: {} } }, "replace");

    expect(readResults()).toEqual([]);
    expect(readAchievements()).toEqual({});
    expect(readDaily()).toEqual({});
    expect(readTotals()).toEqual({ schemaVersion: 1, games: 2, wins: 2, best: {} });
  });
});
