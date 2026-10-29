import { type PuzzleDef, type Tier } from "../engine/types";

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

export type SaveKey = string;

/** Dailies are archived one per date, under `daily:YYYY-MM-DD`. */
export function dailySaveKey(date: string): SaveKey {
  return `daily:${date}`;
}

export function saveKeyFor(game: SavedGame): SaveKey {
  if (game.mode === "daily" && game.dailyDate) return dailySaveKey(game.dailyDate);
  return game.slot;
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

export interface PuzzleBest {
  stars: number;
  timeMs: number;
}

/** Lifetime counters, kept apart from the capped result history so totals never fall back. */
export interface Totals {
  schemaVersion: 1;
  games: number;
  wins: number;
  best: Record<string, PuzzleBest>;
}

export type BackupMode = "merge" | "replace";

export const RESULTS_LIMIT = 600;

const KEYS = {
  settings: "ayo.settings.v1",
  saves: "ayo.saves.v1",
  results: "ayo.results.v1",
  daily: "ayo.daily.v1",
  packs: "ayo.packs.v1",
  achievements: "ayo.achievements.v1",
  meta: "ayo.meta.v1",
  totals: "ayo.totals.v1",
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

export function readSaves(): Record<string, SavedGame> {
  const stored = read<Record<string, SavedGame>>(KEYS.saves, {});
  const saves: Record<string, SavedGame> = {};
  let migrated = false;
  for (const [key, game] of Object.entries(stored)) {
    if (!game || typeof game !== "object") continue;
    const target = key === "daily" && game.dailyDate ? dailySaveKey(game.dailyDate) : key;
    if (target !== key) migrated = true;
    const existing = saves[target];
    if (!existing || (game.updatedAt ?? 0) > (existing.updatedAt ?? 0)) saves[target] = game;
  }
  // Older versions kept a single daily slot; move it onto its date on first read.
  if (migrated) write(KEYS.saves, saves);
  return saves;
}

export function writeSave(game: SavedGame): void {
  const saves = readSaves();
  const key = saveKeyFor(game);
  // Finished dailies live in the daily record; drop the replay log so the
  // archive can keep one entry per day without hoarding whole games.
  if (game.mode === "daily" && game.status !== "playing" && game.status !== "paused") {
    if (key in saves) {
      delete saves[key];
      write(KEYS.saves, saves);
    }
    return;
  }
  saves[key] = game;
  write(KEYS.saves, saves);
}

export function mostRecentSave(exclude?: SaveSlot): SavedGame | null {
  const saves = readSaves();
  const list = Object.values(saves)
    .filter((game) => game && game.slot !== exclude && game.status !== "won" && game.status !== "lost")
    .sort((a, b) => b.updatedAt - a.updatedAt);
  if (!list.length) return null;
  return list[0];
}

export function readResults(): GameResult[] {
  return read<GameResult[]>(KEYS.results, []);
}

export function writeResults(results: GameResult[]): void {
  write(KEYS.results, results.slice(0, RESULTS_LIMIT));
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

function isBetterBest(current: PuzzleBest | undefined, next: PuzzleBest): boolean {
  if (!current) return true;
  if (next.stars !== current.stars) return next.stars > current.stars;
  return next.timeMs < current.timeMs;
}

/** Rebuilds the lifetime totals from the sections a backup carries. */
export function totalsFromSections(
  sections: {
    results?: GameResult[];
    packProgress?: PackProgress;
    totals?: Totals;
  },
  fallback?: Totals,
): Totals {
  const best: Record<string, PuzzleBest> = { ...(fallback?.best ?? {}) };
  for (const [puzzleId, entry] of Object.entries(sections.packProgress ?? {})) {
    const next = { stars: entry.stars, timeMs: entry.timeMs };
    if (isBetterBest(best[puzzleId], next)) best[puzzleId] = next;
  }
  for (const result of sections.results ?? []) {
    if (!result.won) continue;
    const next = { stars: result.stars, timeMs: result.timeMs };
    if (isBetterBest(best[result.puzzleId], next)) best[result.puzzleId] = next;
  }
  for (const [puzzleId, entry] of Object.entries(sections.totals?.best ?? {})) {
    if (isBetterBest(best[puzzleId], entry)) best[puzzleId] = entry;
  }

  const results = sections.results ?? [];
  const countedGames = fallback ? Math.max(fallback.games, results.length) : results.length;
  const countedWins = fallback
    ? Math.max(fallback.wins, results.filter((result) => result.won).length)
    : results.filter((result) => result.won).length;
  return {
    schemaVersion: 1,
    games: Math.max(countedGames, sections.totals?.games ?? 0),
    wins: Math.max(countedWins, sections.totals?.wins ?? 0),
    best,
  };
}

export function readTotals(): Totals {
  const stored = read<Totals | null>(KEYS.totals, null);
  if (stored && isRecord(stored) && isRecord(stored.best)) {
    return totalsFromSections({ totals: stored });
  }
  // First run on this version: rebuild once from the history that is still on the device.
  const rebuilt = totalsFromSections({
    results: readResults(),
    packProgress: readPackProgress(),
  });
  writeTotals(rebuilt);
  return rebuilt;
}

export function writeTotals(totals: Totals): void {
  write(KEYS.totals, totals);
}

export function exportBackup(settings: unknown): string {
  const backup = {
    app: "ayo-sudoku",
    version: 2,
    exportedAt: new Date().toISOString(),
    settings,
    saves: readSaves(),
    results: readResults(),
    daily: readDaily(),
    packProgress: readPackProgress(),
    achievements: readAchievements(),
    meta: readMeta(),
    totals: readTotals(),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSavedGame(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.mode === "string" &&
    isRecord(value.puzzle) &&
    isRecord(value.puzzle.spec) &&
    isNumber(value.puzzle.spec.size) &&
    Array.isArray(value.cells) &&
    value.cells.every((cell) => isRecord(cell) && isNumber(cell.value))
  );
}

function isResult(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.mode === "string" &&
    typeof value.tier === "string" &&
    isNumber(value.timeMs) &&
    isNumber(value.finishedAt) &&
    typeof value.won === "boolean"
  );
}

function isDaily(value: unknown): boolean {
  return isRecord(value) && typeof value.date === "string" && isNumber(value.timeMs) && isNumber(value.stars);
}

function isPackEntry(value: unknown): boolean {
  return isRecord(value) && isNumber(value.stars) && isNumber(value.timeMs);
}

function isMeta(value: unknown): boolean {
  return isRecord(value) && (!("schemaVersion" in value) || isNumber(value.schemaVersion));
}

function isTotals(value: unknown): boolean {
  return (
    isRecord(value) &&
    (!("games" in value) || isNumber(value.games)) &&
    (!("wins" in value) || isNumber(value.wins)) &&
    (!("best" in value) ||
      (isRecord(value.best) &&
        Object.values(value.best).every((entry) => isRecord(entry) && isNumber(entry.stars) && isNumber(entry.timeMs))))
  );
}

/** Returns the first section whose shape does not match a backup we wrote, if any. */
function badBackupSection(data: Record<string, unknown>): string | null {
  if ("saves" in data) {
    const saves = data.saves;
    if (!isRecord(saves)) return "saves";
    if (!Object.values(saves).every(isSavedGame)) return "saves";
  }
  if ("results" in data) {
    if (!Array.isArray(data.results)) return "results";
    if (!data.results.every(isResult)) return "results";
  }
  if ("daily" in data) {
    if (!isRecord(data.daily) || !Object.values(data.daily).every(isDaily)) return "daily";
  }
  if ("packProgress" in data) {
    if (!isRecord(data.packProgress) || !Object.values(data.packProgress).every(isPackEntry)) return "packProgress";
  }
  if ("achievements" in data) {
    if (!isRecord(data.achievements) || !Object.values(data.achievements).every(isNumber)) return "achievements";
  }
  if ("meta" in data && !isMeta(data.meta)) return "meta";
  if ("totals" in data && !isTotals(data.totals)) return "totals";
  return null;
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
  if (!isRecord(data) || data.app !== "ayo-sudoku") return { ok: false, error: "notABackup" };
  const badSection = badBackupSection(data);
  if (badSection) return { ok: false, error: `invalidSection:${badSection}` };
  const summary: BackupSummary = {
    saves: Object.keys((data.saves as object) ?? {}).length,
    results: Array.isArray(data.results) ? data.results.length : 0,
    daily: Object.keys((data.daily as object) ?? {}).length,
    packs: Object.keys((data.packProgress as object) ?? {}).length,
    achievements: Object.keys((data.achievements as object) ?? {}).length,
  };
  return { ok: true, data, summary };
}

function mergeBest<T extends PuzzleBest>(
  current: Record<string, T>,
  incoming: Record<string, T>,
): Record<string, T> {
  const next = { ...current };
  for (const [puzzleId, entry] of Object.entries(incoming)) {
    if (isBetterBest(next[puzzleId], entry)) next[puzzleId] = entry;
  }
  return next;
}

function mergeResults(current: GameResult[], incoming: GameResult[]): GameResult[] {
  const byId = new Map<string, GameResult>();
  for (const result of [...current, ...incoming]) {
    const existing = byId.get(result.id);
    if (!existing || result.finishedAt > existing.finishedAt) byId.set(result.id, result);
  }
  return [...byId.values()].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, RESULTS_LIMIT);
}

function mergeDaily(
  current: Record<string, DailyRecord>,
  incoming: Record<string, DailyRecord>,
): Record<string, DailyRecord> {
  const next = { ...current };
  for (const [date, record] of Object.entries(incoming)) {
    const existing = next[date];
    if (!existing || record.stars > existing.stars || (record.stars === existing.stars && record.timeMs < existing.timeMs)) {
      next[date] = record;
    }
  }
  return next;
}

function mergeSaves(
  current: Record<string, SavedGame>,
  incoming: Record<string, SavedGame>,
): Record<string, SavedGame> {
  const next = { ...current };
  for (const game of Object.values(incoming)) {
    if (!game || typeof game !== "object") continue;
    const key = saveKeyFor(game);
    const existing = next[key];
    if (!existing || (game.updatedAt ?? 0) > (existing.updatedAt ?? 0)) next[key] = game;
  }
  return next;
}

function mergeAchievements(
  current: Record<string, number>,
  incoming: Record<string, number>,
): Record<string, number> {
  const next = { ...current };
  for (const [id, unlockedAt] of Object.entries(incoming)) {
    next[id] = next[id] ? Math.min(next[id], unlockedAt) : unlockedAt;
  }
  return next;
}

function union(current: string[] | undefined, incoming: string[] | undefined): string[] {
  return [...new Set([...(current ?? []), ...(incoming ?? [])])];
}

function mergeMeta(current: Meta, incoming: Meta | null): Meta {
  if (!incoming) return current;
  return {
    ...current,
    ...incoming,
    schemaVersion: 1,
    // The install id identifies this device, not the backup it came from.
    installId: current.installId,
    shared: current.shared || Boolean(incoming.shared),
    languagesPlayed: union(current.languagesPlayed, incoming.languagesPlayed),
    lessonsLearned: union(current.lessonsLearned, incoming.lessonsLearned),
    modesUsed: union(current.modesUsed, incoming.modesUsed),
  };
}

/**
 * Restores a backup. `merge` keeps both histories and picks the better entry where they
 * overlap; `replace` makes the backup the whole truth and clears sections it omits.
 */
export function applyBackup(data: Record<string, unknown>, mode: BackupMode = "merge"): void {
  if (!isRecord(data) || data.app !== "ayo-sudoku") return;
  // Never write a section that would break the screens on the next load.
  if (badBackupSection(data)) return;

  const saves = (data.saves as Record<string, SavedGame> | undefined) ?? {};
  const results = (data.results as GameResult[] | undefined) ?? [];
  const daily = (data.daily as Record<string, DailyRecord> | undefined) ?? {};
  const packs = (data.packProgress as PackProgress | undefined) ?? {};
  const achievements = (data.achievements as Record<string, number> | undefined) ?? {};
  const meta = (data.meta as Meta | undefined) ?? null;
  const incomingTotals = (data.totals as Totals | undefined) ?? null;

  if (mode === "replace") {
    write(KEYS.saves, mergeSaves({}, saves));
    writeResults(results);
    write(KEYS.daily, daily);
    write(KEYS.packs, packs);
    write(KEYS.achievements, achievements);
    if (meta) write(KEYS.meta, meta);
    writeTotals(
      totalsFromSections({
        results,
        packProgress: packs,
        totals: incomingTotals ?? undefined,
      }),
    );
    return;
  }

  const nextResults = mergeResults(readResults(), results);
  const nextDaily = mergeDaily(readDaily(), daily);
  const nextPacks = mergeBest(readPackProgress(), packs);
  const nextAchievements = mergeAchievements(readAchievements(), achievements);
  const currentTotals = readTotals();
  const nextTotals = totalsFromSections(
    {
      results: nextResults,
      packProgress: nextPacks,
      totals: incomingTotals ? { ...incomingTotals, best: mergeBest(currentTotals.best, incomingTotals.best) } : undefined,
    },
    currentTotals,
  );

  write(KEYS.saves, mergeSaves(readSaves(), saves));
  writeResults(nextResults);
  write(KEYS.daily, nextDaily);
  write(KEYS.packs, nextPacks);
  write(KEYS.achievements, nextAchievements);
  write(KEYS.meta, mergeMeta(readMeta(), meta));
  writeTotals(nextTotals);
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
