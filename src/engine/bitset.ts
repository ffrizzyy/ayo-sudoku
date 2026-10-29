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
