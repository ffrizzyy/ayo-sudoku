import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyBackup,
  exportBackup,
  inspectBackup,
  readMeta,
  resetAllData,
  writeMeta,
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
