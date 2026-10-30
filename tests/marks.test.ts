import { describe, expect, it } from "vitest";
import { isMarkHit } from "../src/ui/marks";

describe("pencil-mark highlighting", () => {
  it("lights a slot when the digit is selected and pencilled in", () => {
    expect(isMarkHit(4, [2, 4, 7], new Set([4]))).toBe(true);
  });

  it("leaves empty slots dark in a cell that holds other marks", () => {
    // Regression: every corner slot used to light up for the selected digit,
    // including the ones with no number in them.
    expect(isMarkHit(4, [2, 7], new Set([4]))).toBe(false);
    expect(isMarkHit(1, [2, 7], new Set([4]))).toBe(false);
  });

  it("leaves every slot dark when no digit is selected", () => {
    expect(isMarkHit(4, [2, 4, 7], new Set())).toBe(false);
  });
});
