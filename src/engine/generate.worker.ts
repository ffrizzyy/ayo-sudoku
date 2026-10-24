/// <reference lib="webworker" />
import { generatePuzzle } from "./generator";
import { makeSpec, type Size, type Tier, type Variant } from "./types";

interface GenerateRequest {
  id: number;
  tier: Tier;
  size: Size;
  variant: Variant;
  seed?: string;
  budgetMs?: number;
  maxAttempts?: number;
}

self.addEventListener("message", (event: MessageEvent<GenerateRequest>) => {
  const request = event.data;
  try {
    const result = generatePuzzle({
      tier: request.tier,
      spec: makeSpec(request.size, request.variant),
      seed: request.seed,
      budgetMs: request.budgetMs,
      maxAttempts: request.maxAttempts,
    });
    self.postMessage({ id: request.id, ok: true, puzzle: result.puzzle, elapsedMs: result.elapsedMs });
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : "generation failed",
    });
  }
});
