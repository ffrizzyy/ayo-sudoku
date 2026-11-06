import { getGeometry, parseGrid } from "./board";
import { cyrb128 } from "./prng";
import { countSolutions, solve } from "./solver";
import { gradePuzzle } from "./techniques";
import {
  TIERS,
  makeSpec,
  type BoardSpec,
  type Cage,
  type PuzzleDef,
  type Size,
  type Tier,
  type Variant,
} from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const SIZE_CODE: Record<Size, number> = { 4: 0, 6: 1, 9: 2 };
const CODE_SIZE: Record<number, Size> = { 0: 4, 1: 6, 2: 9 };
const VARIANT_BITS: Record<Variant, number> = {
  classic: 0,
  diagonal: 0b100,
  windoku: 0b1000,
  killer: 0b10000,
};
/** Killer codes carry one byte per cell, so they are longer than v1 codes. */
const MAX_CODE_LENGTH = 512;

function base64urlEncode(bytes: Uint8Array): string {
  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    output += ALPHABET[a >> 2];
    output += ALPHABET[((a & 0x03) << 4) | (b >> 4)];
    if (i + 1 < bytes.length) output += ALPHABET[((b & 0x0f) << 2) | (c >> 6)];
    if (i + 2 < bytes.length) output += ALPHABET[c & 0x3f];
  }
  return output;
}

function base64urlDecode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  for (const char of clean) {
    if (!ALPHABET.includes(char)) throw new Error("code.invalid");
  }
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    buffer = (buffer << 6) | ALPHABET.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

export function crc16(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

/**
 * Cage payload: the count, then one sum per cage, then one cage id per cell.
 * Cages are ordered by their first cell so the same puzzle always encodes to the
 * same string.
 */
function encodeCages(cages: readonly Cage[], cellCount: number): number[] {
  const ordered = [...cages].sort((a, b) => Math.min(...a.cells) - Math.min(...b.cells));
  const ids = new Array<number>(cellCount).fill(0);
  ordered.forEach((cage, index) => {
    for (const cell of cage.cells) ids[cell] = index;
  });
  return [ordered.length, ...ordered.map((cage) => cage.sum), ...ids];
}

export function encodeShareCode(puzzle: PuzzleDef): string {
  const size = puzzle.spec.size;
  const geom = getGeometry(puzzle.spec);
  const givens = parseGrid(puzzle.givens, geom);
  const cages = puzzle.spec.variant === "killer" ? puzzle.cages : undefined;
  const body: number[] = [];
  body.push(cages?.length ? 2 : 1);
  const variantBits = SIZE_CODE[size] | VARIANT_BITS[puzzle.spec.variant];
  body.push(variantBits);
  body.push(TIERS.indexOf(puzzle.tier));

  for (let i = 0; i < givens.length; i += 2) {
    const high = givens[i] ?? 0;
    const low = givens[i + 1] ?? 0;
    body.push(((high & 0x0f) << 4) | (low & 0x0f));
  }

  if (cages?.length) body.push(...encodeCages(cages, geom.cellCount));

  const withoutCrc = Uint8Array.from(body);
  const crc = crc16(withoutCrc);
  const bytes = new Uint8Array(withoutCrc.length + 2);
  bytes.set(withoutCrc);
  bytes[withoutCrc.length] = (crc >> 8) & 0xff;
  bytes[withoutCrc.length + 1] = crc & 0xff;
  return base64urlEncode(bytes);
}

export interface DecodedCode {
  spec: BoardSpec;
  tier: Tier;
  givens: string;
  values: number[];
  cages?: Cage[];
}

export function decodeShareCode(code: string): DecodedCode {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("code.empty");
  if (trimmed.length > MAX_CODE_LENGTH) throw new Error("code.tooLong");
  const bytes = base64urlDecode(trimmed);
  if (bytes.length < 6) throw new Error("code.tooShort");
  const version = bytes[0];
  if (version !== 1 && version !== 2) throw new Error("code.version");

  const variantBits = bytes[1];
  const size = CODE_SIZE[variantBits & 0b011];
  if (!size) throw new Error("code.variant");
  const windoku = (variantBits & 0b1000) !== 0;
  const diagonal = (variantBits & 0b100) !== 0;
  const killer = (variantBits & 0b10000) !== 0;
  // Each variant redefines the grid in a way the others cannot share, and
  // Windoku and Killer are 9x9 only.
  if ([windoku, diagonal, killer].filter(Boolean).length > 1) throw new Error("code.variant");
  if ((windoku || killer) && size !== 9) throw new Error("code.variant");
  if (killer && version === 1) throw new Error("code.variant");
  const variant: Variant = killer
    ? "killer"
    : windoku
      ? "windoku"
      : diagonal
        ? "diagonal"
        : "classic";
  const spec = makeSpec(size, variant);

  const tier = TIERS[bytes[2]];
  if (!tier) throw new Error("code.tier");

  const geom = getGeometry(spec);
  const packed = Math.ceil(geom.cellCount / 2);
  const withoutCrc = bytes.subarray(0, bytes.length - 2);
  const stored = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
  if (crc16(withoutCrc) !== stored) throw new Error("code.crc");

  const values: number[] = [];
  for (let i = 0; i < packed; i++) {
    const byte = bytes[3 + i];
    values.push((byte >> 4) & 0x0f);
    if (values.length < geom.cellCount) values.push(byte & 0x0f);
  }
  for (const value of values) {
    if (value > size) throw new Error("code.digit");
  }

  let cages: Cage[] | undefined;
  if (killer) {
    const start = 3 + packed;
    if (bytes.length < start + 1 + 2) throw new Error("code.length");
    const count = bytes[start];
    if (!count) throw new Error("code.cages");
    const expected = start + 1 + count + geom.cellCount + 2;
    if (bytes.length !== expected) throw new Error("code.length");
    const sums: number[] = [];
    for (let index = 0; index < count; index++) {
      const sum = bytes[start + 1 + index];
      if (!sum || sum > 45) throw new Error("code.cages");
      sums.push(sum);
    }
    const grouped: number[][] = Array.from({ length: count }, () => []);
    for (let cell = 0; cell < geom.cellCount; cell++) {
      const id = bytes[start + 1 + count + cell];
      if (id >= count) throw new Error("code.cages");
      grouped[id].push(cell);
    }
    if (grouped.some((cells) => !cells.length)) throw new Error("code.cages");
    cages = grouped.map((cells, index) => ({ cells, sum: sums[index] }));
  } else {
    const expected = 3 + packed + 2;
    if (bytes.length !== expected) throw new Error("code.length");
  }

  const givens = values.map((value) => (value ? String(value) : "0")).join("");
  return cages ? { spec, tier, givens, values, cages } : { spec, tier, givens, values };
}

export function puzzleFromValues(
  values: readonly number[],
  spec: BoardSpec,
  tier?: Tier,
  source: PuzzleDef["source"] = "imported",
  cages?: readonly Cage[],
): PuzzleDef {
  const geom = getGeometry(spec);
  if (values.length !== geom.cellCount) throw new Error("puzzle.size");
  const cageList = cages?.length ? cages : undefined;
  if (!!cageList !== (spec.variant === "killer")) throw new Error("puzzle.variant");
  const solutions = countSolutions(values, spec, 2, cageList);
  if (solutions !== 1) throw new Error(solutions === 0 ? "puzzle.invalid" : "puzzle.multiple");
  const solution = solve(values, spec, cageList);
  if (!solution) throw new Error("puzzle.invalid");
  const grade = gradePuzzle(values, spec);
  const resolvedTier = tier ?? grade.hardestTier;
  const givens = values.map((value) => (value ? String(value) : "0")).join("");
  const solutionString = solution.map((value) => String(value)).join("");
  const idHash = (cyrb128(`${spec.size}:${spec.variant}:${givens}`)[0] >>> 0).toString(36);
  return {
    id: `${source}:${idHash}`,
    spec,
    givens,
    solution: solutionString,
    tier: resolvedTier,
    // The technique grader does not know about cages, so Killer reports the
    // average cage size instead; it only feeds the par-time estimate.
    gradeScore: cageList
      ? cageList.reduce((total, cage) => total + cage.cells.length, 0) / cageList.length
      : grade.score,
    techniques: cageList
      ? {}
      : (Object.fromEntries(
          Object.entries(grade.techniques).filter(([, count]) => (count ?? 0) > 0),
        ) as Record<string, number>),
    ...(cageList ? { cages: cageList.map((cage) => ({ cells: [...cage.cells], sum: cage.sum })) } : {}),
    source,
  };
}

export function puzzleFromShareCode(code: string): PuzzleDef {
  const decoded = decodeShareCode(code);
  return puzzleFromValues(decoded.values, decoded.spec, decoded.tier, "imported", decoded.cages);
}

export type ImportResult =
  | { ok: true; puzzle: PuzzleDef; from: "code" | "grid" }
  | { ok: false; error: string };

export function parseImport(input: string, spec: BoardSpec = makeSpec(9)): ImportResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "code.empty" };
  if (text.length > MAX_CODE_LENGTH && text.replace(/[^0-9.]/g, "").length !== spec.size * spec.size) {
    return { ok: false, error: "code.tooLong" };
  }
  const compact = text.replace(/[\s|_-]/g, "");

  if (/^[0-9.]{16}$|^[0-9.]{36}$|^[0-9.]{81}$/.test(compact)) {
    const size = Math.sqrt(compact.length) as Size;
    const gridSpec = makeSpec(size);
    try {
  const values = parseGrid(compact, getGeometry(gridSpec));
      return { ok: true, puzzle: puzzleFromValues(values, gridSpec), from: "grid" };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "puzzle.invalid" };
    }
  }

  try {
    return { ok: true, puzzle: puzzleFromShareCode(text), from: "code" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "code.invalid" };
  }
}
