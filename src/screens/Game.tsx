import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  buildCandidates,
  findConflicts,
  getGeometry,
  parTimeMs,
  planHint,
  type HintPlan,
} from "../engine";
import type { BoardHint } from "../ui/Board";
import { Board } from "../ui/Board";
import { Icon } from "../ui/Icon";
import { NumberPad } from "../ui/NumberPad";
import { Button, IconButton, Segmented, Sheet, StarRow, Pill } from "../ui/primitives";
import { ShareSheet } from "../ui/ShareSheet";
import { Confetti } from "../ui/Confetti";
import { useI18n, formatDuration } from "../i18n";
import { useSettings } from "../app/settings";
import { useData, dateKey } from "../app/data";
import { useToast } from "../app/toast";
import { playSound, haptic } from "../app/audio";
import {
  makeSession,
  writeSave,
  type CellChange,
  type CellSnapshot,
  type GameResult,
  type SavedGame,
} from "../app/storage";
import { CREDITS } from "../config/credits";

type InputMode = "value" | "corner" | "center" | "color";

function snapshot(cell: CellSnapshot): CellSnapshot {
  return { ...cell };
}

function mergeChanges(changes: CellChange[]): CellChange[] {
  const map = new Map<number, CellChange>();
  for (const change of changes) {
    const existing = map.get(change.cell);
    if (existing) {
      map.set(change.cell, { cell: change.cell, before: existing.before, after: change.after });
    } else {
      map.set(change.cell, { cell: change.cell, before: change.before, after: change.after });
    }
  }
  return [...map.values()];
}

function unitComplete(values: number[], cells: number[], size: number): boolean {
  const seen = new Set<number>();
  for (const cell of cells) {
    const value = values[cell];
    if (!value) return false;
    seen.add(value);
  }
  return seen.size === size;
}

function starCount(session: SavedGame, par: number): number {
  let stars = 1;
  if (session.mistakes <= 2 && session.hintsUsed.reveal === 0) stars = 2;
  if (stars === 2 && session.elapsedMs <= par) stars = 3;
  return stars;
}

interface GameScreenProps {
  initial: SavedGame;
  onQuitHome: () => void;
  onNextPuzzle?: () => void;
}

export function GameScreen({ initial, onQuitHome, onNextPuzzle }: GameScreenProps) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const { recordResult, noteInputMode, noteLanguage } = useData();
  const { push } = useToast();

  const [session, setSession] = useState<SavedGame>(initial);
  const sessionRef = useRef<SavedGame>(initial);
  const recordedRef = useRef(false);
  const warnedRef = useRef(false);

  const geom = useMemo(() => getGeometry(session.puzzle.spec), [session.puzzle.spec]);
  const solutionValues = useMemo(
    () => session.puzzle.solution.split("").map((value) => Number(value)),
    [session.puzzle.solution],
  );

  const [selected, setSelected] = useState<Set<number>>(() => {
    const empty = initial.cells.findIndex((cell) => !cell.value);
    return new Set([empty >= 0 ? empty : 0]);
  });
  const [inputMode, setInputMode] = useState<InputMode>("value");
  const [highlightDigit, setHighlightDigit] = useState<number | undefined>();
  const [boardHint, setBoardHint] = useState<BoardHint | null>(null);
  const [completedCells, setCompletedCells] = useState<Set<number>>(new Set());
  const completedTimer = useRef<number | null>(null);
  const [wrongCells, setWrongCells] = useState<Set<number>>(() => {
    if (initial.mode !== "challenge" && settings.mistakeCheck !== "onEntry") return new Set();
    return new Set(
      initial.cells
        .map((cell, index) =>
          cell.value && cell.value !== Number(initial.puzzle.solution[index]) ? index : -1,
        )
        .filter((index) => index >= 0),
    );
  });
  const wrongRef = useRef(wrongCells);
  wrongRef.current = wrongCells;

  const [paused, setPaused] = useState(initial.status === "paused");
  const [hintOpen, setHintOpen] = useState(false);
  const [hintPlan, setHintPlan] = useState<HintPlan | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [cellMenu, setCellMenu] = useState<number | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"restart" | "quit" | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const updateSession = useCallback((next: SavedGame, save = true) => {
    sessionRef.current = next;
    setSession(next);
    if (save) writeSave(next);
  }, []);

  useEffect(() => {
    noteLanguage(locale);
    // Language at the start of a game counts toward the bilingual badge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const par = useMemo(
    () => parTimeMs(session.puzzle.tier, session.puzzle.gradeScore),
    [session.puzzle.tier, session.puzzle.gradeScore],
  );

  // First paint: make sure a paused save stays paused and playing saves are saved.
  useEffect(() => {
    writeSave(sessionRef.current);
    return () => {
      writeSave(sessionRef.current);
    };
  }, []);

  // Timer: 250 ms ticks keep the display smooth; autosave is separate.
  useEffect(() => {
    if (session.status !== "playing") return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      const current = sessionRef.current;
      if (current.status !== "playing") return;
      const next = { ...current, elapsedMs: current.elapsedMs + delta };
      sessionRef.current = next;
      setSession(next);
    }, 250);
    return () => window.clearInterval(timer);
  }, [session.status]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (sessionRef.current.status === "playing") writeSave(sessionRef.current);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const pauseGame = useCallback(() => {
    const current = sessionRef.current;
    if (current.status !== "playing") return;
    const next = { ...current, status: "paused" as const, updatedAt: Date.now() };
    updateSession(next);
    setPaused(true);
    setStatusOpen(false);
  }, [updateSession]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (sessionRef.current.status === "playing") pauseGame();
        else writeSave(sessionRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
    };
  }, [pauseGame]);

  useEffect(() => {
    if (!settings.keepAwake) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    if (nav.wakeLock && session.status === "playing") {
      nav.wakeLock
        .request("screen")
        .then((lock) => {
          sentinel = lock;
        })
        .catch(() => undefined);
    }
    return () => {
      void sentinel?.release();
    };
  }, [settings.keepAwake, session.status]);

  useEffect(() => {
    return () => {
      if (completedTimer.current) window.clearTimeout(completedTimer.current);
    };
  }, []);

  const sound = useCallback(
    (name: Parameters<typeof playSound>[0]) => {
      if (settings.sound.on) playSound(name, settings.sound.volume);
      if (settings.haptics) haptic(name === "error" ? "error" : name === "win" ? "win" : "tap");
    },
    [settings.sound.on, settings.sound.volume, settings.haptics],
  );

  const commit = useCallback(
    (changes: CellChange[], patch: Partial<SavedGame> = {}, kind = "cells") => {
      const current = sessionRef.current;
      const merged = mergeChanges(changes).filter(
        (change) =>
          change.before.value !== change.after.value ||
          change.before.corner !== change.after.corner ||
          change.before.center !== change.after.center ||
          change.before.color !== change.after.color,
      );
      if (!merged.length) {
        const next = { ...current, ...patch, updatedAt: Date.now() };
        updateSession(next);
        return;
      }
      const byCell = new Map(merged.map((change) => [change.cell, change.after]));
      const cells = current.cells.map((cell, index) => byCell.get(index) ?? cell);
      const command = { kind, changes: merged };
      const history = [...current.history.slice(0, current.cursor), command];
      const next: SavedGame = {
        ...current,
        ...patch,
        cells,
        history,
        cursor: history.length,
        updatedAt: Date.now(),
      };
      updateSession(next);
    },
    [updateSession],
  );

  const markCompleted = useCallback((cells: Set<number>) => {
    if (!cells.size) return;
    setCompletedCells(cells);
    if (completedTimer.current) window.clearTimeout(completedTimer.current);
    completedTimer.current = window.setTimeout(() => setCompletedCells(new Set()), 760);
  }, []);

  const applyDigit = useCallback(
    (digit: number, options: { force?: boolean; hint?: boolean } = {}) => {
      const current = sessionRef.current;
      if (current.status !== "playing") return;
      const targets = [...selected].filter((cell) => !current.cells[cell]?.given);
      if (!targets.length) {
        setHighlightDigit((value) => (value === digit ? undefined : digit));
        sound("tap");
        return;
      }
      setHighlightDigit(undefined);
      setBoardHint(null);

      const mode = current.mode;
      const checkOnEntry =
        mode !== "zen" && (mode === "challenge" || settings.mistakeCheck === "onEntry");
      const nextWrong = new Set(wrongRef.current);
      const changes: CellChange[] = [];
      let mistakes = current.mistakes;
      let lives = current.livesLeft ?? 3;
      let madeMistake = false;
      let placements = 0;

      if (inputMode === "value" || options.force) {
        for (const cell of targets) {
          const before = snapshot(current.cells[cell]);
          if (before.given) continue;
          const correct = digit === solutionValues[cell];
          if (!options.force && before.value === digit) {
            const after = { ...before, value: 0 };
            changes.push({ cell, before, after });
            nextWrong.delete(cell);
            continue;
          }
          const after: CellSnapshot = {
            ...before,
            value: digit,
            corner: 0,
            center: 0,
          };
          changes.push({ cell, before, after });
          placements++;
          if (correct) {
            nextWrong.delete(cell);
            if (settings.smartCleanup) {
              for (const peer of geom.peers[cell]) {
                const peerCell = current.cells[peer];
                if (
                  peerCell &&
                  !peerCell.value &&
                  ((peerCell.corner & (1 << (digit - 1))) || (peerCell.center & (1 << (digit - 1))))
                ) {
                  const peerBefore = snapshot(peerCell);
                  const peerAfter = {
                    ...peerBefore,
                    corner: peerBefore.corner & ~(1 << (digit - 1)),
                    center: peerBefore.center & ~(1 << (digit - 1)),
                  };
                  changes.push({ cell: peer, before: peerBefore, after: peerAfter });
                }
              }
            }
          } else {
            if (checkOnEntry) {
              madeMistake = true;
              nextWrong.add(cell);
              mistakes++;
              if (mode === "challenge") lives = Math.max(0, lives - 1);
            } else {
              nextWrong.delete(cell);
            }
          }
        }
      } else if (inputMode === "corner" || inputMode === "center") {
        const bit = 1 << (digit - 1);
        for (const cell of targets) {
          const before = snapshot(current.cells[cell]);
          if (before.value) continue;
          const key = inputMode;
          const after = { ...before, [key]: before[key] ^ bit } as CellSnapshot;
          if (after.corner === before.corner && after.center === before.center) continue;
          changes.push({ cell, before, after });
        }
      } else if (inputMode === "color") {
        for (const cell of targets) {
          const before = snapshot(current.cells[cell]);
          const after = { ...before, color: before.color === digit ? 0 : digit };
          changes.push({ cell, before, after });
        }
      }

      const patch: Partial<SavedGame> = {};
      if (mistakes !== current.mistakes) patch.mistakes = mistakes;
      if (mode === "challenge") patch.livesLeft = lives;
      if (lives <= 0 && mode === "challenge") patch.status = "lost";

      const beforeValues = current.cells.map((cell) => cell.value);
      const afterValues = current.cells.map((cell) => cell.value);
      for (const change of changes) afterValues[change.cell] = change.after.value;

      const completed = new Set<number>();
      for (const change of changes) {
        if (change.before.value === change.after.value) continue;
        for (const unitIndex of geom.cellUnits[change.cell]) {
          const unit = geom.units[unitIndex];
          const wasComplete = unitComplete(beforeValues, unit, session.puzzle.spec.size);
          const isComplete = unitComplete(afterValues, unit, session.puzzle.spec.size);
          if (!wasComplete && isComplete) for (const cell of unit) completed.add(cell);
        }
      }

      wrongRef.current = nextWrong;
      setWrongCells(nextWrong);
      commit(changes, patch, options.force ? "hint" : "value");

      if (patch.status === "lost") {
        sound("lose");
        setHintOpen(false);
      } else if (completed.size) {
        markCompleted(completed);
        sound("complete");
        setAnnouncement(t("a11y.liveUnit"));
      } else if (madeMistake) {
        sound("error");
      } else if (placements) {
        sound("place");
      } else {
        sound("tap");
      }

      if (placements) {
        const cell = targets[0];
        setAnnouncement(
          t("a11y.livePlaced", {
            value: digit,
            row: geom.rowOf[cell] + 1,
            col: geom.colOf[cell] + 1,
          }),
        );
      }
      warnedRef.current = false;
    },
    [
      selected,
      settings.mistakeCheck,
      settings.smartCleanup,
      inputMode,
      geom,
      solutionValues,
      session.puzzle.spec.size,
      commit,
      markCompleted,
      sound,
      t,
    ],
  );

  const erase = useCallback(() => {
    const current = sessionRef.current;
    if (current.status !== "playing") return;
    const changes: CellChange[] = [];
    const nextWrong = new Set(wrongRef.current);
    for (const cell of selected) {
      const before = current.cells[cell];
      if (!before || before.given) continue;
      if (!before.value && !before.corner && !before.center && !before.color) continue;
      changes.push({
        cell,
        before: snapshot(before),
        after: { ...before, value: 0, corner: 0, center: 0, color: 0 },
      });
      nextWrong.delete(cell);
    }
    if (!changes.length) return;
    wrongRef.current = nextWrong;
    setWrongCells(nextWrong);
    commit(changes, {}, "erase");
    setBoardHint(null);
    sound("erase");
  }, [selected, commit, sound]);

  const undo = useCallback(() => {
    const current = sessionRef.current;
    if (current.status !== "playing" || current.cursor <= 0) return;
    const command = current.history[current.cursor - 1];
    if (!command) return;
    const byCell = new Map(command.changes.map((change) => [change.cell, change.before]));
    const cells = current.cells.map((cell, index) => byCell.get(index) ?? cell);
    updateSession({
      ...current,
      cells,
      cursor: current.cursor - 1,
      updatedAt: Date.now(),
    });
    setWrongCells(new Set());
    setBoardHint(null);
    sound("tap");
  }, [updateSession, sound]);

  const redo = useCallback(() => {
    const current = sessionRef.current;
    if (current.status !== "playing" || current.cursor >= current.history.length) return;
    const command = current.history[current.cursor];
    if (!command) return;
    const byCell = new Map(command.changes.map((change) => [change.cell, change.after]));
    const cells = current.cells.map((cell, index) => byCell.get(index) ?? cell);
    updateSession({
      ...current,
      cells,
      cursor: current.cursor + 1,
      updatedAt: Date.now(),
    });
    setWrongCells(new Set());
    setBoardHint(null);
    sound("tap");
  }, [updateSession, sound]);

  const autoCandidates = useCallback(() => {
    const current = sessionRef.current;
    if (current.status !== "playing") return;
    const values = current.cells.map((cell) => cell.value);
    const candidates = buildCandidates(values, geom);
    const changes: CellChange[] = [];
    for (let cell = 0; cell < current.cells.length; cell++) {
      const before = current.cells[cell];
      if (before.given || before.value) continue;
      const mask = candidates[cell];
      if (!mask && !before.corner && !before.center) continue;
      if (before.center === mask && !before.corner) continue;
      changes.push({
        cell,
        before: snapshot(before),
        after: { ...before, corner: 0, center: mask },
      });
    }
    if (!changes.length) {
      push(t("game.noAutoCandidates"));
      return;
    }
    commit(changes, {}, "autoCandidates");
    push(t("game.autoCandidatesDone"), "success");
    sound("hint");
  }, [geom, commit, push, sound, t]);

  const openHint = useCallback(() => {
    const current = sessionRef.current;
    if (current.status !== "playing") return;
    const values = current.cells.map((cell) => cell.value);
    const plan = planHint(values, solutionValues, current.puzzle.spec);
    setHintPlan(plan);
    setHintMessage(null);
    setHintOpen(true);
    setStatusOpen(false);
    sound("tap");
  }, [solutionValues, sound]);

  const unitLabel = useCallback(
    (plan: HintPlan): string => {
      if (!plan.unit) return t("game.unitGrid");
      const map = {
        row: "game.unitRow",
        column: "game.unitColumn",
        box: "game.unitBox",
        grid: "game.unitGrid",
      } as const;
      return t(map[plan.unit.type], { index: plan.unit.index });
    },
    [t],
  );

  const takeHint = useCallback(
    (level: "nudge" | "pointer" | "reveal") => {
      const current = sessionRef.current;
      if (!hintPlan || current.status !== "playing") return;
      setHintOpen(false);
      const hints = {
        ...current.hintsUsed,
        [level]: current.hintsUsed[level] + 1,
      };
      const technique = hintPlan.technique
        ? t(`tech.${hintPlan.technique}`)
        : t("tech.solution");

      if (hintPlan.kind === "conflict" || hintPlan.kind === "wrong") {
        setBoardHint({ cells: hintPlan.wrongCells, unitCells: [], wrongCells: hintPlan.wrongCells });
        setHintMessage(t("game.hintConflict"));
        updateSession({ ...current, hintsUsed: hints, updatedAt: Date.now() });
        sound("error");
        setAnnouncement(t("game.hintConflict"));
        return;
      }

      if (level === "nudge") {
        setBoardHint({ cells: [], unitCells: hintPlan.unitCells });
        setHintMessage(
          t("game.hintNudgeBody", { unit: unitLabel(hintPlan), technique }),
        );
      } else if (level === "pointer") {
        setBoardHint({ cells: hintPlan.cells, unitCells: hintPlan.unitCells });
        setHintMessage(t("game.hintPointerBody", { technique }));
      } else if (hintPlan.placement) {
        const { cell, digit } = hintPlan.placement;
        setBoardHint({ cells: [cell], unitCells: [] });
        setHintMessage(
          t("game.hintRevealBody", {
            digit,
            row: geom.rowOf[cell] + 1,
            col: geom.colOf[cell] + 1,
          }),
        );
        setSelected(new Set([cell]));
        const before = current.cells[cell];
        commit(
          [
            {
              cell,
              before: snapshot(before),
              after: { ...before, value: digit, corner: 0, center: 0 },
            },
          ],
          { hintsUsed: hints },
          "hintReveal",
        );
        setWrongCells((wrong) => {
          const next = new Set(wrong);
          next.delete(cell);
          wrongRef.current = next;
          return next;
        });
        sound("place");
        setAnnouncement(t("game.revealPlaced", { digit }));
        return;
      }
      updateSession({ ...current, hintsUsed: hints, updatedAt: Date.now() });
      sound("hint");
      setAnnouncement(t("a11y.hintReady"));
    },
    [hintPlan, updateSession, commit, geom, sound, t, unitLabel],
  );

  const checkBoard = useCallback(() => {
    const current = sessionRef.current;
    const nextWrong = new Set<number>();
    current.cells.forEach((cell, index) => {
      if (cell.value && cell.value !== solutionValues[index]) nextWrong.add(index);
    });
    wrongRef.current = nextWrong;
    setWrongCells(nextWrong);
    if (nextWrong.size) {
      push(t("game.checkProblems", { count: nextWrong.size }));
      sound("error");
    } else {
      push(t("game.checkAllGood"), "success");
      sound("hint");
    }
  }, [solutionValues, push, sound, t]);

  // Completion detection.
  useEffect(() => {
    if (session.status !== "playing") return;
    const filled = session.cells.every((cell) => cell.value > 0);
    if (!filled) {
      warnedRef.current = false;
      return;
    }
    const correct = session.cells.every(
      (cell, index) => cell.value === solutionValues[index],
    );
    if (correct) {
      const next = { ...session, status: "won" as const, updatedAt: Date.now() };
      updateSession(next);
      sound("win");
      setAnnouncement(t("a11y.liveWin"));
      setHintOpen(false);
      setShareOpen(false);
    } else if (!warnedRef.current) {
      warnedRef.current = true;
      push(t("game.wrongEntry"));
      setAnnouncement(t("a11y.liveConflict", { row: 1, col: 1 }));
    }
  }, [session, solutionValues, updateSession, sound, push, t]);

  // Persist the result exactly once per session.
  useEffect(() => {
    if (recordedRef.current) return;
    if (session.status !== "won" && session.status !== "lost") return;
    recordedRef.current = true;
    const won = session.status === "won";
    const stars = won ? starCount(session, par) : 0;
    const result: GameResult = {
      id: session.id,
      puzzleId: session.puzzle.id,
      mode: session.mode,
      tier: session.puzzle.tier,
      size: session.puzzle.spec.size,
      timeMs: Math.round(session.elapsedMs),
      mistakes: session.mistakes,
      hints:
        session.hintsUsed.nudge + session.hintsUsed.pointer + session.hintsUsed.reveal,
      stars,
      finishedAt: Date.now(),
      won,
      lessonId: session.lessonId,
      livesLeft: session.livesLeft,
      dailyDate: session.dailyDate ?? (session.mode === "daily" ? dateKey() : undefined),
    };
    const unlocked = recordResult(result);
    if (unlocked.length) {
      for (const id of unlocked) {
        push(t("toast.newAchievement", { name: t(`achievements.${id}.name`) }), "achievement");
      }
    }
    if (session.mode === "learn" && won) push(t("toast.lessonDone"), "success");
    if (session.mode === "daily" && won) push(t("daily.solvedToday"), "success");
  }, [session, par, recordResult, push, t]);

  // Clear completion ripple.
  useEffect(() => {
    if (!completedCells.size) return;
    return () => {
      if (completedTimer.current) window.clearTimeout(completedTimer.current);
    };
  }, [completedCells]);

  const selectCell = useCallback(
    (cell: number, extend: boolean) => {
      if (sessionRef.current.status !== "playing") return;
      setSelected((current) => {
        if (extend) {
          const next = new Set(current);
          if (next.has(cell) && next.size > 1) next.delete(cell);
          else next.add(cell);
          return next;
        }
        return new Set([cell]);
      });
      setHighlightDigit(undefined);
      sound("tap");
      setStatusOpen(false);
    },
    [sound],
  );

  const dragSelect = useCallback((cell: number) => {
    if (sessionRef.current.status !== "playing") return;
    setSelected((current) => {
      if (current.has(cell)) return current;
      const next = new Set(current);
      next.add(cell);
      return next;
    });
  }, []);

  const changeInputMode = useCallback(
    (mode: InputMode) => {
      setInputMode(mode);
      noteInputMode(mode);
      sound("tap");
    },
    [noteInputMode, sound],
  );

  const moveSelection = useCallback(
    (dr: number, dc: number, extend: boolean) => {
      const current = sessionRef.current;
      if (current.status !== "playing") return;
      const focus = selected.size ? Math.max(...selected) : 0;
      const row = Math.min(session.puzzle.spec.size - 1, Math.max(0, geom.rowOf[focus] + dr));
      const col = Math.min(session.puzzle.spec.size - 1, Math.max(0, geom.colOf[focus] + dc));
      const cell = row * session.puzzle.spec.size + col;
      if (extend) {
        setSelected((existing) => new Set([...existing, cell]));
      } else {
        setSelected(new Set([cell]));
      }
      setHighlightDigit(undefined);
      setStatusOpen(false);
    },
    [selected, geom, session.puzzle.spec.size],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const modalOpen =
      hintOpen || shareOpen || cellMenu !== null || paused || statusOpen ||
      session.status === "won" || session.status === "lost";
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (modalOpen) return;
      const key = event.key;
      if (event.ctrlKey || event.metaKey) {
        if (key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
        } else if (key.toLowerCase() === "y") {
          event.preventDefault();
          redo();
        }
        return;
      }
      const movement: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
        w: [-1, 0],
        s: [1, 0],
        a: [0, -1],
        d: [0, 1],
      };
      if (movement[key]) {
        event.preventDefault();
        moveSelection(movement[key][0], movement[key][1], event.shiftKey);
        return;
      }
      if (/^[1-9]$/.test(key)) {
        event.preventDefault();
        applyDigit(Number(key));
        return;
      }
      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        erase();
        return;
      }
      if (key.toLowerCase() === "v") changeInputMode("value");
      else if (key.toLowerCase() === "c") changeInputMode("corner");
      else if (key.toLowerCase() === "x") changeInputMode("center");
      else if (key.toLowerCase() === "b") changeInputMode("color");
      else if (key === " ") {
        event.preventDefault();
        const order: InputMode[] = ["value", "corner", "center", "color"];
        changeInputMode(order[(order.indexOf(inputMode) + 1) % order.length]);
      } else if (key.toLowerCase() === "h") openHint();
      else if (key.toLowerCase() === "p" || key === "Escape") pauseGame();
      else if (key === "?") push(t("game.keyboardHint"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    hintOpen,
    shareOpen,
    cellMenu,
    paused,
    statusOpen,
    session.status,
    inputMode,
    selected,
    applyDigit,
    erase,
    undo,
    redo,
    moveSelection,
    changeInputMode,
    openHint,
    pauseGame,
    push,
    t,
  ]);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (current.status !== "paused") return;
    updateSession({ ...current, status: "playing", updatedAt: Date.now() });
    setPaused(false);
    setConfirmAction(null);
    setAnnouncement(t("a11y.resume"));
    writeSave(sessionRef.current);
  }, [updateSession, t]);

  const restart = useCallback(() => {
    const current = sessionRef.current;
    const fresh = makeSession(current.puzzle, current.mode, current.slot);
    fresh.lessonId = current.lessonId;
    fresh.dailyDate = current.dailyDate;
    updateSession(fresh);
    recordedRef.current = false;
    warnedRef.current = false;
    wrongRef.current = new Set();
    setWrongCells(new Set());
    const firstEmpty = fresh.cells.findIndex((cell) => !cell.value);
    setSelected(new Set([firstEmpty >= 0 ? firstEmpty : 0]));
    setPaused(false);
    setConfirmAction(null);
    setCompletedCells(new Set());
    setBoardHint(null);
    setHintOpen(false);
    setStatusOpen(false);
    setAnnouncement(t("a11y.resume"));
  }, [updateSession, t]);

  const leaveGame = useCallback(() => {
    const current = sessionRef.current;
    writeSave({ ...current, updatedAt: Date.now() });
    onQuitHome();
  }, [onQuitHome]);

  const counts = useMemo(() => {
    const result = new Array(session.puzzle.spec.size + 1).fill(0);
    for (const cell of session.cells) {
      if (cell.value >= 1 && cell.value <= session.puzzle.spec.size) result[cell.value]++;
    }
    return result;
  }, [session.cells, session.puzzle.spec.size]);

  const conflicts = useMemo(() => {
    const values = session.cells.map((cell) => cell.value);
    const set = findConflicts(values, geom);
    for (const cell of wrongCells) set.add(cell);
    return set;
  }, [session.cells, geom, wrongCells]);

  const hintsTotal =
    session.hintsUsed.nudge + session.hintsUsed.pointer + session.hintsUsed.reveal;
  const stars = session.status === "won" ? starCount(session, par) : 0;
  const isZen = session.mode === "zen";
  const displayTime = formatDuration(session.elapsedMs);
  const tierLabel = t(`tier.${session.puzzle.tier}`);
  const modeLabel = t(`mode.${session.mode}`);
  const lives = session.livesLeft ?? 3;
  const hintCount = hintsTotal;

  const cellMenuCell = cellMenu !== null ? session.cells[cellMenu] : null;

  const applyCellColor = (color: number) => {
    if (cellMenu === null) return;
    const current = sessionRef.current;
    const before = current.cells[cellMenu];
    commit(
      [
        {
          cell: cellMenu,
          before: snapshot(before),
          after: { ...before, color: before.color === color ? 0 : color },
        },
      ],
      {},
      "color",
    );
    sound("tap");
    setCellMenu(null);
  };

  const clearCellMarks = () => {
    if (cellMenu === null) return;
    const current = sessionRef.current;
    const before = current.cells[cellMenu];
    commit(
      [
        {
          cell: cellMenu,
          before: snapshot(before),
          after: { ...before, corner: 0, center: 0 },
        },
      ],
      {},
      "clearMarks",
    );
    sound("erase");
    setCellMenu(null);
  };

  const clearCellColor = () => {
    if (cellMenu === null) return;
    const current = sessionRef.current;
    const before = current.cells[cellMenu];
    commit(
      [
        {
          cell: cellMenu,
          before: snapshot(before),
          after: { ...before, color: 0 },
        },
      ],
      {},
      "clearColor",
    );
    sound("erase");
    setCellMenu(null);
  };

  const inputOptions = [
    { value: "value" as const, label: t("game.inputValue") },
    { value: "corner" as const, label: t("game.inputCorner") },
    { value: "center" as const, label: t("game.inputCenter") },
    { value: "color" as const, label: t("game.inputColor") },
  ];

  return (
    <div className="game-screen">
      <Confetti active={session.status === "won"} />
      <h1 className="sr-only">{t("game.heading", { mode: modeLabel, tier: tierLabel })}</h1>
      <div className="sr-only" aria-live="polite">{announcement}</div>

      <header className="game-top">
        <IconButton
          icon="arrow-left"
          label={t("common.back")}
          onClick={() => {
            pauseGame();
            setConfirmAction("quit");
          }}
        />
        <button
          type="button"
          className={`status-pill ${statusOpen ? "is-open" : ""}`}
          onClick={() => setStatusOpen((open) => !open)}
          aria-expanded={statusOpen}
          aria-label={`${modeLabel}, ${displayTime}`}
        >
          {settings.showTimer && !isZen ? (
            <span className="status-item status-time">
              <Icon name="clock" size={16} />
              <span className="tabular">{displayTime}</span>
            </span>
          ) : (
            <span className="status-item">{isZen ? t("mode.zen") : modeLabel}</span>
          )}
          {!isZen ? (
            <>
              <span className="status-divider" aria-hidden="true" />
              <span className={`status-item ${session.mistakes ? "has-mistakes" : ""}`}>
                {session.mode === "challenge" ? (
                  <>
                    <Icon name="heart" size={15} />
                    <span className="tabular">{lives}</span>
                  </>
                ) : (
                  <>
                    <Icon name="alert" size={15} />
                    <span className="tabular">{session.mistakes}</span>
                  </>
                )}
              </span>
            </>
          ) : null}
          <Icon name="dots" size={16} className="status-dots" />
        </button>
        <IconButton
          icon="pause"
          label={t("common.pause")}
          onClick={pauseGame}
          disabled={session.status !== "playing"}
        />
      </header>

      {statusOpen ? (
        <div className="status-panel" role="status">
          <div className="status-panel-row">
            <span>{t("common.difficulty")}</span>
            <strong>{tierLabel}</strong>
          </div>
          <div className="status-panel-row">
            <span>{t("common.hints")}</span>
            <strong>{hintCount}</strong>
          </div>
          <div className="status-panel-row">
            <span>{t("game.parTime", { time: formatDuration(par) })}</span>
            <strong>
              <StarRow count={stars || (session.mistakes <= 2 && session.hintsUsed.reveal === 0 ? 2 : 1)} size={15} />
            </strong>
          </div>
          {session.mode === "daily" ? (
            <p className="status-panel-note">
              {t("game.dailyNote", {
                time: new Date(Date.now() + (86400000 - (Date.now() % 86400000))).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          ) : null}
          {session.mode === "challenge" ? <p className="status-panel-note">{t("game.challengeLives")}</p> : null}
          {isZen ? <p className="status-panel-note">{t("game.zenNote")}</p> : null}
        </div>
      ) : null}

      {!hintOpen && hintMessage && boardHint ? (
        <div
          className={`hint-banner ${boardHint.wrongCells?.length ? "is-warning" : ""}`}
          role="status"
        >
          <Icon name={boardHint.wrongCells?.length ? "alert" : "bulb"} size={16} />
          <span>{hintMessage}</span>
          <IconButton
            icon="close"
            label={t("common.close")}
            className="hint-banner-close"
            onClick={() => {
              setHintMessage(null);
              setBoardHint(null);
            }}
          />
        </div>
      ) : null}

      <div className="game-layout">
        <div className="game-board-wrap">
          <Board
            spec={session.puzzle.spec}
            cells={session.cells}
            selected={selected}
            wrong={conflicts}
            hint={boardHint}
            highlightDigit={highlightDigit}
            digitStyle={settings.digitStyle}
            largeMarks={settings.largeText}
            completedCells={completedCells}
            dimmed={paused}
            highlightSame={settings.highlight.sameDigit}
            highlightPeers={settings.highlight.peers}
            highlightCandidates={settings.highlight.candidates}
            onSelect={selectCell}
            onDragSelect={dragSelect}
            onLongPress={(cell) => {
              setCellMenu(cell);
              setSelected(new Set([cell]));
            }}
          />
          <div className="game-subline">
            <span>
              {selected.size > 1
                ? t("game.multiSelect", { count: selected.size })
                : `${tierLabel} · ${modeLabel}`}
            </span>
            <span className="game-subline-note">{t("game.parTime", { time: formatDuration(par) })}</span>
          </div>
        </div>

        <div className="game-controls">
          <Segmented
            options={inputOptions}
            value={inputMode}
            onChange={changeInputMode}
            label={t("game.valueEntry")}
            compact
            className="input-segmented"
          />
          <div className={`tool-row ${settings.mistakeCheck === "onRequest" ? "has-check" : ""}`}>
            <ToolButton icon="undo" label={t("game.undo")} onClick={undo} disabled={session.cursor === 0 || session.status !== "playing"} />
            <ToolButton icon="redo" label={t("game.redo")} onClick={redo} disabled={session.cursor >= session.history.length || session.status !== "playing"} />
            <ToolButton icon="eraser" label={t("game.erase")} onClick={erase} disabled={session.status !== "playing"} />
            <ToolButton icon="bulb" label={t("game.hint")} onClick={openHint} disabled={session.status !== "playing"} highlight={Boolean(boardHint)} />
            <ToolButton icon="wand" label={t("game.auto")} onClick={autoCandidates} disabled={session.status !== "playing"} />
            {settings.mistakeCheck === "onRequest" && session.mode !== "challenge" ? (
              <ToolButton icon="check-circle" label={t("game.check")} onClick={checkBoard} disabled={session.status !== "playing"} />
            ) : null}
          </div>
          <NumberPad
            size={session.puzzle.spec.size}
            counts={counts}
            digitStyle={settings.digitStyle}
            colorMode={inputMode === "color"}
            onDigit={(digit) => applyDigit(digit)}
            disabled={session.status !== "playing"}
          />
          <p className="game-note">
            <Icon name={inputMode === "value" ? "type" : inputMode === "color" ? "palette" : "eye"} size={14} />
            {selected.size === 0
              ? t("game.selectCell")
              : inputMode === "value"
                ? t("game.selectCell")
                : t("game.draftMarks")}
          </p>
        </div>
      </div>

      <Sheet
        open={paused}
        onClose={resume}
        title={t("game.pauseTitle")}
        subtitle={t("game.pauseSubtitle")}
        size="md"
        dismissible={false}
      >
        {confirmAction ? (
          <div className="confirm-panel">
            <p>{confirmAction === "restart" ? t("game.restartConfirm") : t("game.quitConfirm")}</p>
            <div className="confirm-actions">
              <Button variant="tinted" onClick={() => setConfirmAction(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant={confirmAction === "restart" ? "primary" : "danger"}
                onClick={() => {
                  if (confirmAction === "restart") restart();
                  else leaveGame();
                }}
              >
                {confirmAction === "restart" ? t("game.restart") : t("game.saveQuit")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="pause-stats">
              <div>
                <span>{t("common.time")}</span>
                <strong className="tabular">{formatDuration(session.elapsedMs)}</strong>
              </div>
              <div>
                <span>{t("common.mistakes")}</span>
                <strong>{session.mode === "challenge" ? lives : session.mistakes}</strong>
              </div>
              <div>
                <span>{t("common.hints")}</span>
                <strong>{hintCount}</strong>
              </div>
            </div>
            <div className="pause-actions">
              <Button variant="primary" size="lg" full icon="play" onClick={resume}>
                {t("game.resumeGame")}
              </Button>
              <div className="pause-grid">
                <Button variant="tinted" icon="share" onClick={() => setShareOpen(true)}>
                  {t("common.share")}
                </Button>
                {settings.mistakeCheck === "onRequest" ? (
                  <Button variant="tinted" icon="check-circle" onClick={checkBoard}>
                    {t("game.checkBoard")}
                  </Button>
                ) : null}
                <Button variant="tinted" icon="undo" onClick={() => setConfirmAction("restart")}>
                  {t("game.restart")}
                </Button>
                <Button variant="tinted" icon="home" onClick={() => setConfirmAction("quit")}>
                  {t("game.backHome")}
                </Button>
              </div>
              <p className="pause-note">{t("game.pauseInfo")}</p>
            </div>
          </>
        )}
      </Sheet>

      <Sheet
        open={hintOpen}
        onClose={() => setHintOpen(false)}
        title={t("game.hintTitle")}
        subtitle={t("game.hintSubtitle")}
        size="md"
      >
        {hintPlan ? (
          <>
            {hintPlan.kind === "conflict" || hintPlan.kind === "wrong" ? (
              <div className="hint-message is-warning">
                <Icon name="alert" size={18} />
                <span>{t("game.hintConflict")}</span>
              </div>
            ) : (
              <>
                <div className="hint-plan-meta">
                  <Pill tone="accent">{tierLabel}</Pill>
                  {hintPlan.technique ? <Pill tone="neutral">{t(`tech.${hintPlan.technique}`)}</Pill> : null}
                  {hintPlan.unit ? <Pill tone="neutral">{unitLabel(hintPlan)}</Pill> : null}
                </div>
                {hintMessage ? (
                  <div className="hint-message">
                    <Icon name="bulb" size={18} />
                    <span>{hintMessage}</span>
                  </div>
                ) : null}
                <div className="hint-options">
                  <button type="button" className="hint-option" onClick={() => takeHint("nudge")}>
                    <span className="hint-step">1</span>
                    <span>
                      <strong>{t("game.hintNudge")}</strong>
                      <small>{t("game.hintNudge")} · {t(`tech.${hintPlan.technique ?? "solution"}`)}</small>
                    </span>
                  </button>
                  <button type="button" className="hint-option" onClick={() => takeHint("pointer")}>
                    <span className="hint-step">2</span>
                    <span>
                      <strong>{t("game.hintPointer")}</strong>
                      <small>{t("game.hintPointerBody", { technique: t(`tech.${hintPlan.technique ?? "solution"}`) })}</small>
                    </span>
                  </button>
                  <button type="button" className="hint-option" onClick={() => takeHint("reveal")}>
                    <span className="hint-step">3</span>
                    <span>
                      <strong>{t("game.hintReveal")}</strong>
                      <small>{t("game.hintReveal")} · {t(`tech.${hintPlan.technique ?? "solution"}`)}</small>
                    </span>
                  </button>
                </div>
                <p className="hint-count">
                  {t("game.hintTechnique")}: {t(`tech.${hintPlan.technique ?? "solution"}`)} · {t("common.hints")}: {hintCount}
                </p>
              </>
            )}
            <Button variant="primary" full onClick={() => setHintOpen(false)}>
              {t("game.hintClose")}
            </Button>
          </>
        ) : null}
      </Sheet>

      <Sheet
        open={cellMenu !== null}
        onClose={() => setCellMenu(null)}
        title={t("game.cellOptions")}
        size="sm"
      >
        {cellMenuCell ? (
          <div className="cell-menu">
            <div className="cell-menu-preview">
              {cellMenuCell.value ? (
                <span className="cell-menu-value">{cellMenuCell.value}</span>
              ) : (
                <span className="cell-menu-empty">{t("a11y.cellEmpty", {
                  row: cellMenu !== null ? geom.rowOf[cellMenu] + 1 : 1,
                  col: cellMenu !== null ? geom.colOf[cellMenu] + 1 : 1,
                })}</span>
              )}
            </div>
            <div className="color-palette" role="group" aria-label={t("game.colorPalette")}>
              {Array.from({ length: 9 }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`color-swatch ${cellMenuCell.color === index + 1 ? "is-selected" : ""}`}
                  style={{ ["--cell-color" as string]: `var(--mark-${index + 1})` } as CSSProperties}
                  onClick={() => applyCellColor(index + 1)}
                  aria-label={t("game.markColor", { index: index + 1 })}
                />
              ))}
            </div>
            <div className="cell-menu-actions">
              <Button variant="tinted" icon="eraser" onClick={clearCellMarks} disabled={cellMenuCell.given}>
                {t("game.clearMarks")}
              </Button>
              <Button variant="tinted" icon="close" onClick={clearCellColor} disabled={!cellMenuCell.color}>
                {t("game.clearColor")}
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={session.status === "won"}
        onClose={leaveGame}
        title={t("game.winTitle")}
        subtitle={t("game.winSubtitle")}
        size="md"
        tone="celebration"
        dismissible={false}
      >
        <div className="win-panel">
          <StarRow count={stars} size={42} animate />
          <p className="win-stars">{t("game.starsEarned", { count: stars })}</p>
          <div className="win-stats">
            <div>
              <span>{t("common.time")}</span>
              <strong className="tabular">{formatDuration(session.elapsedMs)}</strong>
            </div>
            <div>
              <span>{t("common.mistakes")}</span>
              <strong>{session.mistakes}</strong>
            </div>
            <div>
              <span>{t("common.hints")}</span>
              <strong>{hintCount}</strong>
            </div>
          </div>
          {session.elapsedMs <= par ? <Pill tone="green">{t("game.newBest")}</Pill> : null}
          <div className="win-actions">
            {onNextPuzzle ? (
              <Button variant="primary" size="lg" full icon="play" onClick={onNextPuzzle}>
                {t("game.nextPuzzle")}
              </Button>
            ) : null}
            <Button variant="tinted" icon="share" onClick={() => setShareOpen(true)} full={!onNextPuzzle}>
              {t("game.share")}
            </Button>
            <Button variant="plain" icon="home" onClick={leaveGame}>
              {t("game.backHome")}
            </Button>
          </div>
          <p className="win-credit">{t("common.madeBy", { name: CREDITS.author })}</p>
        </div>
      </Sheet>

      <Sheet
        open={session.status === "lost"}
        onClose={leaveGame}
        title={t("game.loseTitle")}
        subtitle={t("game.loseSubtitle")}
        size="sm"
        dismissible={false}
      >
        <div className="win-panel">
          <div className="lose-bubbles" aria-hidden="true">
            <span /><span /><span />
          </div>
          <div className="win-stats">
            <div>
              <span>{t("common.time")}</span>
              <strong className="tabular">{formatDuration(session.elapsedMs)}</strong>
            </div>
            <div>
              <span>{t("common.mistakes")}</span>
              <strong>{session.mistakes}</strong>
            </div>
            <div>
              <span>{t("common.hints")}</span>
              <strong>{hintCount}</strong>
            </div>
          </div>
          <div className="win-actions">
            <Button variant="primary" size="lg" full icon="undo" onClick={restart}>
              {t("game.tryAgain")}
            </Button>
            <Button variant="plain" icon="home" onClick={leaveGame}>
              {t("game.backHome")}
            </Button>
          </div>
          <p className="win-credit">{t("common.madeBy", { name: CREDITS.author })}</p>
        </div>
      </Sheet>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        puzzle={session.puzzle}
        tierLabel={tierLabel}
        timeLabel={formatDuration(session.elapsedMs)}
      />
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  highlight,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tool-button ${highlight ? "is-highlighted" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </button>
  );
}
