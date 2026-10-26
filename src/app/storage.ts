import { makeSpec, type PuzzleDef, type Tier } from "../engine/types";

export type GameMode = "classic" | "daily" | "zen" | "challenge" | "pack" | "learn" | "import";
export type SaveSlot = "classic" | "daily" | "zen" | "challenge" | "pack" | "learn" | "import";

export interface CellSnapshot {
  value: number;
  given: boolean;
  corner: number;
  center: number;
  color: number;
}

export interface CellChange {
  cell: number;
  before: CellSnapshot;
  after: CellSnapshot;
}

export interface Command {
  kind: string;
  changes: CellChange[];
}

export interface SavedGame {
  schemaVersion: 1;
  id: string;
  mode: GameMode;
  slot: SaveSlot;
  puzzle: PuzzleDef;
  cells: CellSnapshot[];
  history: Command[];
  cursor: number;
  elapsedMs: number;
  mistakes: number;
  hintsUsed: { nudge: number; pointer: number; reveal: number };
  livesLeft?: number;
  startedAt: number;
  updatedAt: number;
  status: "playing" | "paused" | "won" | "lost";
  lessonId?: string;
  dailyDate?: string;
}

export interface GameResult {
  id: string;
  puzzleId: string;
  mode: GameMode;
  tier: Tier;
  size: number;
  timeMs: number;
  mistakes: number;
  hints: number;
  stars: number;
  finishedAt: number;
  won: boolean;
  lessonId?: string;
  livesLeft?: number;
  dailyDate?: string;
}

export interface DailyRecord {
  date: string;
  puzzleId: string;
  timeMs: number;
  stars: number;
  finishedAt: number;
}

export interface PackProgress {
  [puzzleId: string]: {
    stars: number;
    timeMs: number;
    solvedAt: number;
  };
}

export interface Meta {
  schemaVersion: 1;
  installId: string;
  shared: boolean;
  languagesPlayed: string[];
  lessonsLearned: string[];
  modesUsed?: string[];
}

const KEYS = {
  settings: "ayo.settings.v1",
  saves: "ayo.saves.v1",
  results: "ayo.results.v1",
  daily: "ayo.daily.v1",
  packs: "ayo.packs.v1",
  achievements: "ayo.achievements.v1",
  meta: "ayo.meta.v1",
  theme: "ayo.theme",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the app keeps working in memory.
  }
}

export function readSaves(): Partial<Record<SaveSlot, SavedGame>> {
  return read<Partial<Record<SaveSlot, SavedGame>>>(KEYS.saves, {});
}

export function writeSave(game: SavedGame): void {
  const saves = readSaves();
  saves[game.slot] = game;
  write(KEYS.saves, saves);
}

export function removeSave(slot: SaveSlot): void {
  const saves = readSaves();
  delete saves[slot];
  write(KEYS.saves, saves);
}

export function mostRecentSave(exclude?: SaveSlot): SavedGame | null {
  const saves = readSaves();
  const list = Object.entries(saves)
    .filter(([slot, game]) => slot !== exclude && game && game.status !== "won" && game.status !== "lost")
    .map(([, game]) => game!);
  if (!list.length) return null;
  return list.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export function readResults(): GameResult[] {
  return read<GameResult[]>(KEYS.results, []);
}

export function writeResults(results: GameResult[]): void {
  write(KEYS.results, results.slice(0, 600));
}

export function readDaily(): Record<string, DailyRecord> {
  return read<Record<string, DailyRecord>>(KEYS.daily, {});
}

export function writeDaily(daily: Record<string, DailyRecord>): void {
  write(KEYS.daily, daily);
}

export function readPackProgress(): PackProgress {
  return read<PackProgress>(KEYS.packs, {});
}

export function writePackProgress(progress: PackProgress): void {
  write(KEYS.packs, progress);
}

export function readAchievements(): Record<string, number> {
  return read<Record<string, number>>(KEYS.achievements, {});
}

export function writeAchievements(value: Record<string, number>): void {
  write(KEYS.achievements, value);
}

export function readMeta(): Meta {
  const fallback: Meta = {
    schemaVersion: 1,
    installId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    shared: false,
    languagesPlayed: [],
    lessonsLearned: [],
  };
  const meta = read<Meta>(KEYS.meta, fallback);
  if (!meta.installId) meta.installId = fallback.installId;
  return meta;
}

export function writeMeta(meta: Meta): void {
  write(KEYS.meta, meta);
}

export function exportBackup(settings: unknown): string {
  const backup = {
    app: "ayo-sudoku",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    saves: readSaves(),
    results: readResults(),
    daily: readDaily(),
    packProgress: readPackProgress(),
    achievements: readAchievements(),
    meta: readMeta(),
  };
  return JSON.stringify(backup, null, 2);
}

export interface BackupSummary {
  saves: number;
  results: number;
  daily: number;
  packs: number;
  achievements: number;
}

export function inspectBackup(raw: string): { ok: true; data: Record<string, unknown>; summary: BackupSummary } | { ok: false; error: string } {
  if (raw.length > 2 * 1024 * 1024) return { ok: false, error: "tooBig" };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") return undefined;
      return value;
    }) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "invalidJson" };
  }
  if (!data || data.app !== "ayo-sudoku") return { ok: false, error: "notABackup" };
  const summary: BackupSummary = {
    saves: Object.keys((data.saves as object) ?? {}).length,
    results: Array.isArray(data.results) ? data.results.length : 0,
    daily: Object.keys((data.daily as object) ?? {}).length,
    packs: Object.keys((data.packProgress as object) ?? {}).length,
    achievements: Object.keys((data.achievements as object) ?? {}).length,
  };
  return { ok: true, data, summary };
}

export function applyBackup(data: Record<string, unknown>): void {
  if (data.saves) write(KEYS.saves, data.saves);
  if (Array.isArray(data.results)) writeResults(data.results as GameResult[]);
  if (data.daily) write(KEYS.daily, data.daily);
  if (data.packProgress) write(KEYS.packs, data.packProgress);
  if (data.achievements) write(KEYS.achievements, data.achievements);
  if (data.meta) write(KEYS.meta, data.meta);
}

export function resetAllData(): void {
  for (const key of Object.values(KEYS)) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function defaultPuzzle(size: 4 | 6 | 9 = 9): PuzzleDef {
  return {
    id: "empty",
    spec: makeSpec(size),
    givens: "0".repeat(size * size),
    solution: "0".repeat(size * size),
    tier: "easy",
    gradeScore: 0,
    techniques: {},
    source: "generated",
  };
}

export function makeSession(
  puzzle: PuzzleDef,
  mode: GameMode,
  slot: SaveSlot,
): SavedGame {
  const size = puzzle.spec.size;
  const givens = puzzle.givens.replace(/\./g, "0");
  const now = Date.now();
  return {
    schemaVersion: 1,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    mode,
    slot,
    puzzle,
    cells: Array.from({ length: size * size }, (_, index) => {
      const value = Number(givens[index] ?? 0);
      return { value, given: value > 0, corner: 0, center: 0, color: 0 };
    }),
    history: [],
    cursor: 0,
    elapsedMs: 0,
    mistakes: 0,
    hintsUsed: { nudge: 0, pointer: 0, reveal: 0 },
    livesLeft: mode === "challenge" ? 3 : undefined,
    startedAt: now,
    updatedAt: now,
    status: "playing",
  };
}
