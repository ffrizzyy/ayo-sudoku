import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  readAchievements,
  readDaily,
  readMeta,
  readPackProgress,
  readResults,
  readTotals,
  writeAchievements,
  writeDaily,
  writeMeta,
  writePackProgress,
  writeResults,
  writeTotals,
  type DailyRecord,
  type GameResult,
  type Meta,
  type PackProgress,
  type PuzzleBest,
  type Totals,
} from "./storage";
import { newlyUnlocked } from "./achievements";
import { LESSONS } from "./lessons";

interface DataValue {
  results: GameResult[];
  daily: Record<string, DailyRecord>;
  packs: PackProgress;
  achievements: Record<string, number>;
  meta: Meta;
  totalStars: number;
  currentStreak: number;
  bestStreak: number;
  wins: number;
  games: number;
  recordResult: (result: GameResult) => string[];
  markShared: () => void;
  noteInputMode: (mode: string) => void;
  noteLanguage: (locale: string) => void;
  markLessonLearned: (id: string) => void;
  unlockAchievement: (id: string) => boolean;
  reloadData: () => void;
}

const DataContext = createContext<DataValue | null>(null);

export function dateKey(timestamp = Date.now()): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function computeStreaks(daily: Record<string, DailyRecord>): { current: number; best: number } {
  const keys = Object.keys(daily).sort();
  if (!keys.length) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const previous = Date.parse(`${keys[i - 1]}T00:00:00Z`);
    const current = Date.parse(`${keys[i]}T00:00:00Z`);
    if (current - previous === 86400000) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  const today = Date.parse(`${dateKey()}T00:00:00Z`);
  let cursor = today;
  if (!daily[dateKey()]) cursor = today - 86400000;
  let current = 0;
  while (daily[dateKey(cursor)]) {
    current++;
    cursor -= 86400000;
  }
  return { current, best };
}

export function bestStarsByPuzzle(
  totals: Totals,
  results: GameResult[],
  packs: PackProgress,
): Record<string, number> {
  const best: Record<string, number> = {};
  const consider = (puzzleId: string, stars: number) => {
    best[puzzleId] = Math.max(best[puzzleId] ?? 0, stars);
  };
  for (const [puzzleId, entry] of Object.entries(totals.best)) consider(puzzleId, entry.stars);
  for (const [puzzleId, progress] of Object.entries(packs)) consider(puzzleId, progress.stars);
  for (const result of results) {
    if (result.won) consider(result.puzzleId, result.stars);
  }
  return best;
}


export function DataProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<GameResult[]>(readResults);
  const [daily, setDaily] = useState<Record<string, DailyRecord>>(readDaily);
  const [packs, setPacks] = useState<PackProgress>(readPackProgress);
  const [achievements, setAchievements] = useState<Record<string, number>>(readAchievements);
  const [meta, setMeta] = useState<Meta>(readMeta);
  const [totals, setTotals] = useState<Totals>(readTotals);
  const backfilled = useRef(false);

  const commitAchievements = useCallback(
    (current: Record<string, number>, candidates: string[]): { next: Record<string, number>; added: string[] } => {
      const added = candidates.filter((id) => !current[id]);
      if (!added.length) return { next: current, added };
      const next = { ...current };
      const now = Date.now();
      for (const id of added) next[id] = now;
      writeAchievements(next);
      return { next, added };
    },
    [],
  );

  // Earlier releases could not evaluate the variant and mini achievements.
  // Grant whatever the stored results already prove, once per launch.
  useEffect(() => {
    if (backfilled.current) return;
    backfilled.current = true;
    const candidates = newlyUnlocked(
      results,
      packs,
      meta,
      totals,
      computeStreaks(daily).best,
    );
    const { next, added } = commitAchievements(achievements, candidates);
    if (added.length) setAchievements(next);
    // Mount only: the goal is to catch up with data that predates the rules.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordResult = useCallback(
    (result: GameResult): string[] => {
      const nextResults = [result, ...results].slice(0, 600);
      writeResults(nextResults);
      setResults(nextResults);

      let nextDaily = daily;
      if (result.won && result.mode === "daily" && result.dailyDate) {
        const existing = daily[result.dailyDate];
        const better =
          !existing ||
          result.stars > existing.stars ||
          (result.stars === existing.stars && result.timeMs < existing.timeMs);
        if (better) {
          nextDaily = {
            ...daily,
            [result.dailyDate]: {
              date: result.dailyDate,
              puzzleId: result.puzzleId,
              timeMs: result.timeMs,
              stars: result.stars,
              finishedAt: result.finishedAt,
            },
          };
          writeDaily(nextDaily);
          setDaily(nextDaily);
        }
      }

      let nextPacks = packs;
      if (result.won && result.mode === "pack") {
        const existing = packs[result.puzzleId];
        if (!existing || result.stars > existing.stars) {
          nextPacks = {
            ...packs,
            [result.puzzleId]: {
              stars: result.stars,
              timeMs: result.timeMs,
              solvedAt: result.finishedAt,
            },
          };
          writePackProgress(nextPacks);
          setPacks(nextPacks);
        }
      }

      let nextMeta = meta;
      const languages = new Set(meta.languagesPlayed);
      const lessons = new Set(meta.lessonsLearned);
      if (result.lessonId) lessons.add(result.lessonId);
      if (languages.size !== meta.languagesPlayed.length || lessons.size !== meta.lessonsLearned.length) {
        nextMeta = { ...meta, languagesPlayed: [...languages], lessonsLearned: [...lessons] };
        writeMeta(nextMeta);
        setMeta(nextMeta);
      }

      // Lifetime totals stay correct even after old results fall off the cap.
      let nextTotals: Totals = {
        ...totals,
        games: totals.games + 1,
        wins: totals.wins + (result.won ? 1 : 0),
        best: { ...totals.best },
      };
      if (result.won) {
        const next: PuzzleBest = { stars: result.stars, timeMs: result.timeMs };
        const existing = nextTotals.best[result.puzzleId];
        if (!existing || next.stars > existing.stars || (next.stars === existing.stars && next.timeMs < existing.timeMs)) {
          nextTotals = { ...nextTotals, best: { ...nextTotals.best, [result.puzzleId]: next } };
        }
      }
      writeTotals(nextTotals);
      setTotals(nextTotals);

      const candidates = newlyUnlocked(
        nextResults,
        nextPacks,
        nextMeta,
        nextTotals,
        computeStreaks(nextDaily).best,
      );
      const { next: nextAchievements, added } = commitAchievements(achievements, candidates);
      if (added.length) setAchievements(nextAchievements);
      return added;
    },
    [results, daily, packs, meta, totals, achievements, commitAchievements],
  );

  const unlockAchievement = useCallback(
    (id: string): boolean => {
      if (achievements[id]) return false;
      const next = { ...achievements, [id]: Date.now() };
      writeAchievements(next);
      setAchievements(next);
      return true;
    },
    [achievements],
  );

  const markShared = useCallback(() => {
    if (!meta.shared) {
      const next = { ...meta, shared: true };
      writeMeta(next);
      setMeta(next);
      unlockAchievement("shared");
    }
  }, [meta, unlockAchievement]);

  const noteInputMode = useCallback(
    (mode: string) => {
      const modes = new Set(meta.modesUsed ?? []);
      if (modes.has(mode)) return;
      modes.add(mode);
      const next = { ...meta, modesUsed: [...modes] };
      writeMeta(next);
      setMeta(next);
      if (modes.size >= 4) unlockAchievement("allModes");
    },
    [meta, unlockAchievement],
  );

  const noteLanguage = useCallback(
    (locale: string) => {
      const languages = new Set(meta.languagesPlayed);
      if (languages.has(locale)) return;
      languages.add(locale);
      const next = { ...meta, languagesPlayed: [...languages] };
      writeMeta(next);
      setMeta(next);
      if (languages.size >= 2) unlockAchievement("threeLanguages");
    },
    [meta, unlockAchievement],
  );

  const reloadData = useCallback(() => {
    setResults(readResults());
    setDaily(readDaily());
    setPacks(readPackProgress());
    setAchievements(readAchievements());
    setMeta(readMeta());
    setTotals(readTotals());
  }, []);

  const markLessonLearned = useCallback(
    (id: string) => {
      const lessons = new Set(meta.lessonsLearned);
      if (lessons.has(id)) return;
      lessons.add(id);
      const next = { ...meta, lessonsLearned: [...lessons] };
      writeMeta(next);
      setMeta(next);
      if (lessons.size >= LESSONS.length) unlockAchievement("learnComplete");
    },
    [meta, unlockAchievement],
  );

  const value = useMemo<DataValue>(() => {
    const stars = Object.values(bestStarsByPuzzle(totals, results, packs)).reduce((sum, entry) => sum + entry, 0);
    const streaks = computeStreaks(daily);
    return {
      results,
      daily,
      packs,
      achievements,
      meta,
      totalStars: stars,
      currentStreak: streaks.current,
      bestStreak: streaks.best,
      wins: totals.wins,
      games: totals.games,
      recordResult,
      markShared,
      noteInputMode,
      noteLanguage,
      markLessonLearned,
      unlockAchievement,
      reloadData,
    };
  }, [
    results,
    daily,
    packs,
    achievements,
    meta,
    totals,
    recordResult,
    markShared,
    noteInputMode,
    noteLanguage,
    markLessonLearned,
    unlockAchievement,
    reloadData,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
