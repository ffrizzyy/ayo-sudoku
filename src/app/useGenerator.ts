import { useCallback, useEffect, useRef } from "react";
import { generatePuzzle } from "../engine/generator";
import { makeSpec, type PuzzleDef, type Size, type Tier, type Variant } from "../engine/types";

interface GenerateOptions {
  tier: Tier;
  size?: Size;
  variant?: Variant;
  seed?: string;
  /** Deterministic runs (daily) omit the time budget. */
  budgetMs?: number;
  maxAttempts?: number;
}

type WorkerResponse =
  | { id: number; ok: true; puzzle: PuzzleDef; elapsedMs: number }
  | { id: number; ok: false; error: string };

export function useGenerator() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, { resolve: (p: PuzzleDef) => void; reject: (e: Error) => void }>());
  const nextId = useRef(1);

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("../engine/generate.worker.ts", import.meta.url), { type: "module" });
      worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        const entry = pending.current.get(data.id);
        if (!entry) return;
        pending.current.delete(data.id);
        if (data.ok) entry.resolve(data.puzzle);
        else entry.reject(new Error(data.error));
      });
      worker.addEventListener("error", () => {
        for (const entry of pending.current.values()) entry.reject(new Error("worker"));
        pending.current.clear();
      });
      workerRef.current = worker;
    } catch {
      workerRef.current = null;
    }
    return () => {
      worker?.terminate();
      workerRef.current = null;
      pending.current.clear();
    };
  }, []);

  return useCallback((options: GenerateOptions): Promise<PuzzleDef> => {
    const worker = workerRef.current;
    const request = {
      id: nextId.current++,
      tier: options.tier,
      size: options.size ?? 9,
      variant: options.variant ?? "classic",
      seed: options.seed,
      budgetMs: options.seed ? undefined : (options.budgetMs ?? 6000),
      maxAttempts: options.maxAttempts,
    };

    if (worker) {
      return new Promise<PuzzleDef>((resolve, reject) => {
        pending.current.set(request.id, { resolve, reject });
        worker.postMessage(request);
        window.setTimeout(() => {
          if (pending.current.has(request.id)) {
            pending.current.delete(request.id);
            reject(new Error("timeout"));
          }
        }, 15000);
      }).catch(() => {
        // Fall back to the main thread if the worker is unavailable.
        return generatePuzzle({
          tier: options.tier,
          spec: makeSpec(options.size ?? 9, options.variant ?? "classic"),
          seed: options.seed,
          budgetMs: options.seed ? undefined : (options.budgetMs ?? 6000),
          maxAttempts: options.maxAttempts,
        }).puzzle;
      });
    }

    return Promise.resolve().then(
      () =>
        generatePuzzle({
          tier: options.tier,
          spec: makeSpec(options.size ?? 9, options.variant ?? "classic"),
          seed: options.seed,
          budgetMs: options.seed ? undefined : (options.budgetMs ?? 6000),
          maxAttempts: options.maxAttempts,
        }).puzzle,
    );
  }, []);
}
