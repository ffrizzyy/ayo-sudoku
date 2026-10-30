/**
 * Pencil-mark slots are laid out as a fixed 3x3 grid, so a cell that holds two
 * marks still renders seven empty slots. A slot may only light up when the
 * digit is both selected and actually pencilled into that cell.
 */
export function isMarkHit(
  slotDigit: number,
  cellDigits: readonly number[],
  activeDigits: ReadonlySet<number>,
): boolean {
  return activeDigits.has(slotDigit) && cellDigits.includes(slotDigit);
}
