/** Candidate bitmask helpers. Bit d-1 represents digit d. */

export function digitMask(digit: number): number {
  return 1 << (digit - 1);
}

export function allMask(size: number): number {
  return (1 << size) - 1;
}

export function popcount(mask: number): number {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count++;
  }
  return count;
}

export function isSingle(mask: number): boolean {
  return mask !== 0 && (mask & (mask - 1)) === 0;
}

export function lowestDigit(mask: number): number {
  return 32 - Math.clz32(mask & -mask);
}

export function maskToDigits(mask: number): number[] {
  const digits: number[] = [];
  let value = mask;
  while (value) {
    const bit = value & -value;
    digits.push(32 - Math.clz32(bit));
    value &= value - 1;
  }
  return digits;
}

export function hasDigit(mask: number, digit: number): boolean {
  return (mask & digitMask(digit)) !== 0;
}

export function removeDigits(mask: number, digits: readonly number[]): number {
  let next = mask;
  for (const digit of digits) next &= ~digitMask(digit);
  return next;
}

export function digitsToMask(digits: readonly number[]): number {
  let mask = 0;
  for (const digit of digits) mask |= digitMask(digit);
  return mask;
}
