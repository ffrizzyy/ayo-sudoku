import { useEffect, useMemo, useRef } from "react";
import { getGeometry, type BoardSpec, type Cage, type Thermo } from "../engine";
import type { CellSnapshot } from "../app/storage";
import { useI18n } from "../i18n";
import { maskToDigits } from "../engine/bitset";
import { isMarkHit } from "./marks";

export interface BoardHint {
  cells: number[];
  unitCells: number[];
  digit?: number;
  wrongCells?: number[];
}

export function displayDigit(digit: number, style: string): string {
  if (style === "letters") return String.fromCharCode(64 + digit);
  if (style === "shapes") {
    const shapes = ["●", "▲", "■", "◆", "★", "✚", "✖", "▼", "◗"];
    return shapes[digit - 1] ?? String(digit);
  }
  if (style === "emoji") {
    const fruit = ["🍎", "🍋", "🫐", "🍇", "🍑", "🍊", "🥝", "🍒", "🍐"];
    return fruit[digit - 1] ?? String(digit);
  }
  return String(digit);
}

/** CSS expressions for a cell's position and the gutter beside it. */
function makeCellGeometry(spec: BoardSpec) {
  const cellLeft = (col: number) =>
    `calc(var(--board-box-gap) + ${Math.floor(col / spec.boxCols)} * var(--box-pitch) + ${
      col % spec.boxCols
    } * var(--cell-pitch))`;
  const cellTop = (row: number) =>
    `calc(var(--board-box-gap) + ${Math.floor(row / spec.boxRows)} * var(--box-pitch) + ${
      row % spec.boxRows
    } * var(--cell-pitch))`;
  const gapH = (col: number) =>
    `var(${col % spec.boxCols === spec.boxCols - 1 ? "--board-box-gap" : "--board-cell-gap"})`;
  const gapV = (row: number) =>
    `var(${row % spec.boxRows === spec.boxRows - 1 ? "--board-box-gap" : "--board-cell-gap"})`;
  /** The gap before a column/row (after the previous one). */
  const gapHBefore = (col: number) => gapH(col > 0 ? col - 1 : 0);
  const gapVBefore = (row: number) => gapV(row > 0 ? row - 1 : 0);
  return { cellLeft, cellTop, gapH, gapV, gapHBefore, gapVBefore };
}

interface BoardProps {
  spec: BoardSpec;
  cells: CellSnapshot[];
  selected: Set<number>;
  wrong: Set<number>;
  hint?: BoardHint | null;
  highlightDigit?: number;
  digitStyle?: string;
  largeMarks?: boolean;
  completedCells?: Set<number>;
  dimmed?: boolean;
  /** Killer only: the cages drawn over the grid. */
  cages?: readonly Cage[];
  /** Thermo only: the thermometers, bulb first. */
  thermos?: readonly Thermo[];
  highlightSame: boolean;
  highlightPeers: boolean;
  highlightCandidates: boolean;
  onSelect: (cell: number, extend: boolean) => void;
  onDragSelect?: (cell: number) => void;
  onLongPress?: (cell: number) => void;
}

export function Board({
  spec,
  cells,
  selected,
  wrong,
  hint,
  highlightDigit,
  digitStyle = "numerals",
  largeMarks,
  completedCells,
  dimmed,
  cages,
  thermos,
  highlightSame,
  highlightPeers,
  highlightCandidates,
  onSelect,
  onDragSelect,
  onLongPress,
}: BoardProps) {
  const { t } = useI18n();
  const geom = useMemo(() => getGeometry(spec), [spec]);
  const cellGeo = useMemo(() => makeCellGeometry(spec), [spec]);
  const diagonalCells = useMemo(
    () => (spec.variant === "diagonal" ? new Set(geom.diagonals.flat()) : null),
    [spec.variant, geom],
  );
  // Killer: which cage owns each cell, the sum shown in its first cell, and the
  // wall segments between cages. Walls are drawn in the gaps and centred there,
  // so a cage outline reads as one continuous line.
  const cageInfo = useMemo(() => {
    if (!cages?.length) return null;
    const owner = new Int16Array(geom.cellCount).fill(-1);
    const sums = new Map<number, number>();
    cages.forEach((cage, index) => {
      for (const cell of cage.cells) owner[cell] = index;
      sums.set(Math.min(...cage.cells), cage.sum);
    });

    const { cellLeft, cellTop, gapH, gapV, gapHBefore, gapVBefore } = cellGeo;

    const walls: React.CSSProperties[] = [];
    const edge = (gap: string, hasNeighbour: boolean) => (hasNeighbour ? `${gap} / 2` : "0px");
    for (let cell = 0; cell < geom.cellCount; cell++) {
      const row = geom.rowOf[cell];
      const col = geom.colOf[cell];
      const rightCell = col < spec.size - 1 ? cell + 1 : -1;
      if (rightCell >= 0 && owner[rightCell] !== owner[cell]) {
        // Vertical wall centred in the gap to the right. It reaches half a gap
        // past the cell on both ends so it meets the horizontal walls exactly,
        // but stops at the board edge.
        walls.push({
          left: `calc(${cellLeft(col)} + var(--cell-w) + ${gapH(col)} / 2 - 1px)`,
          top: `calc(${cellTop(row)} - ${edge(gapVBefore(row), row > 0)})`,
          width: "2px",
          height: `calc(var(--cell-w) + ${edge(gapVBefore(row), row > 0)} + ${edge(
            gapV(row),
            row < spec.size - 1,
          )})`,
        });
      }
      const downCell = row < spec.size - 1 ? cell + spec.size : -1;
      if (downCell >= 0 && owner[downCell] !== owner[cell]) {
        walls.push({
          top: `calc(${cellTop(row)} + var(--cell-w) + ${gapV(row)} / 2 - 1px)`,
          left: `calc(${cellLeft(col)} - ${edge(gapHBefore(col), col > 0)})`,
          height: "2px",
          width: `calc(var(--cell-w) + ${edge(gapHBefore(col), col > 0)} + ${edge(
            gapH(col),
            col < spec.size - 1,
          )})`,
        });
      }
    }
    return { owner, sums, walls };
  }, [cages, geom, spec, cellGeo]);
  // Thermo: each cell draws the slice of every thermometer that passes through
  // it, and the gutter between two cells gets a connector so the line reads as
  // one path. Both pieces stay outside the digits' space: the cell slice is
  // painted under the digit and marks, the connector sits in the gap.
  const thermoInfo = useMemo(() => {
    if (!thermos?.length) return null;
    const { cellLeft, cellTop, gapH, gapV } = cellGeo;
    const marks = new Map<number, Array<{ d: string; bulb: boolean }>>();
    const links: React.CSSProperties[] = [];
    const edge = (cell: number, other: number): string => {
      if (geom.rowOf[other] < geom.rowOf[cell]) return "50 0";
      if (geom.rowOf[other] > geom.rowOf[cell]) return "50 100";
      return geom.colOf[other] < geom.colOf[cell] ? "0 50" : "100 50";
    };
    for (const line of thermos) {
      line.forEach((cell, index) => {
        const entry = index > 0 ? edge(cell, line[index - 1]) : null;
        const exit = index < line.length - 1 ? edge(cell, line[index + 1]) : null;
        const d = entry
          ? exit
            ? `M ${entry} L 50 50 L ${exit}`
            : `M ${entry} L 50 50`
          : `M 50 50 L ${exit}`;
        const list = marks.get(cell) ?? [];
        list.push({ d, bulb: index === 0 });
        marks.set(cell, list);
      });
      for (let index = 0; index < line.length - 1; index++) {
        const from = line[index];
        const to = line[index + 1];
        const row = geom.rowOf[from];
        const col = geom.colOf[from];
        if (geom.rowOf[to] === row) {
          const boundary = Math.min(col, geom.colOf[to]);
          // Overlap each cell by 1px so rounding at the cell edge cannot leave a
          // hairline seam; the link keeps the line colour, so the overlap is
          // invisible and stays out of the digit's area.
          links.push({
            left: `calc(${cellLeft(boundary)} + var(--cell-w) - 1px)`,
            top: `calc(${cellTop(row)} + (var(--cell-w) - var(--thermo-w)) / 2)`,
            width: `calc(${gapH(boundary)} + 2px)`,
            height: "var(--thermo-w)",
          });
        } else {
          const boundary = Math.min(row, geom.rowOf[to]);
          links.push({
            left: `calc(${cellLeft(col)} + (var(--cell-w) - var(--thermo-w)) / 2)`,
            top: `calc(${cellTop(boundary)} + var(--cell-w) - 1px)`,
            width: "var(--thermo-w)",
            height: `calc(${gapV(boundary)} + 2px)`,
          });
        }
      }
    }
    return { marks, links };
  }, [thermos, geom, cellGeo]);
  const dragging = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const selectedValues = useMemo(() => {
    const values = new Set<number>();
    for (const cell of selected) {
      const value = cells[cell]?.value;
      if (value) values.add(value);
    }
    if (highlightDigit) values.add(highlightDigit);
    return values;
  }, [selected, cells, highlightDigit]);

  // A selected digit (or one tapped on the pad) also emphasises the matching
  // pencil marks in other cells, in both corner and center layouts.
  const markDigits = useMemo(() => {
    if (!highlightCandidates) return new Set<number>();
    return selectedValues;
  }, [highlightCandidates, selectedValues]);

  const peers = useMemo(() => {
    if (!highlightPeers) return new Set<number>();
    const set = new Set<number>();
    for (const cell of selected) {
      for (const peer of geom.peers[cell]) set.add(peer);
    }
    for (const cell of selected) set.delete(cell);
    return set;
  }, [selected, geom, highlightPeers]);

  const hintCells = useMemo(() => new Set(hint?.cells ?? []), [hint]);
  const hintUnit = useMemo(() => new Set(hint?.unitCells ?? []), [hint]);
  const hintWrong = useMemo(() => new Set(hint?.wrongCells ?? []), [hint]);

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const focusCell = selected.size ? Math.max(...selected) : 0;

  const cellLabel = (cell: number): string => {
    const data = cells[cell];
    const row = geom.rowOf[cell] + 1;
    const col = geom.colOf[cell] + 1;
    if (!data.value) {
      const candidates = maskToDigits(data.center || data.corner);
      if (candidates.length && highlightCandidates) {
        return t("a11y.cellEmptyCandidates", {
          row,
          col,
          candidates: candidates.join(" "),
        });
      }
      return t("a11y.cellEmpty", { row, col });
    }
    const key = data.given ? "a11y.cellGiven" : "a11y.cellValue";
    return t(key, { row, col, value: data.value });
  };

  const startPress = (cell: number, event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    longPressFired.current = false;
    if (onLongPress) {
      longPressTimer.current = window.setTimeout(() => {
        longPressFired.current = true;
        onLongPress(cell);
      }, 520);
    }
    if (event.pointerType !== "mouse") {
      // Touch selection is handled on tap; drag select still works where supported.
      dragging.current = true;
    } else {
      dragging.current = true;
    }
    onSelect(cell, event.shiftKey);
  };

  const enterCell = (cell: number, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (event.buttons === 0 && event.pointerType === "mouse") {
      dragging.current = false;
      return;
    }
    onDragSelect?.(cell);
  };

  return (
    <div
      className={`board variant-${spec.variant} ${dimmed ? "is-dimmed" : ""}`}
      role="grid"
      aria-label={`${t("a11y.board", { size: spec.size })}${
        thermos?.length ? `, ${t("a11y.thermoCount", { count: thermos.length })}` : ""
      }`}
      aria-rowcount={spec.size}
      aria-colcount={spec.size}
      style={{
        ["--box-cols" as string]: spec.size / spec.boxCols,
        ["--cell-cols" as string]: spec.boxCols,
        ["--mark-cols" as string]: spec.size <= 4 ? 2 : 3,
        ["--board-size" as string]: spec.size,
      }}
    >
      {geom.boxes.map((box, boxIndex) => (
        <div className="board-box" role="presentation" key={boxIndex}>
          {box.map((cell) => {
            const data = cells[cell];
            const isSelected = selected.has(cell);
            const isPeer = peers.has(cell);
            const isSame = highlightSame && data.value > 0 && selectedValues.has(data.value);
            const isCandidate =
              highlightCandidates &&
              highlightDigit !== undefined &&
              !data.value &&
              ((data.center | data.corner) & (1 << (highlightDigit - 1))) !== 0;
            const isConflict = wrong.has(cell) || hintWrong.has(cell);
            const cornerDigits = maskToDigits(data.corner);
            const centerDigits = maskToDigits(data.center);
            const cageSum = cageInfo?.sums.get(cell);
            const cageLabel = cageSum === undefined ? "" : `, ${t("a11y.cageSum", { sum: cageSum })}`;
            return (
              <button
                type="button"
                key={cell}
                role="gridcell"
                aria-label={`${cellLabel(cell)}${cageLabel}${
                  isConflict ? `, ${t("a11y.cellConflict")}` : ""
                }${isSelected ? `, ${t("a11y.cellSelected")}` : ""}`}
                aria-selected={isSelected}
                aria-invalid={isConflict || undefined}
                aria-readonly={data.given || undefined}
                aria-rowindex={geom.rowOf[cell] + 1}
                aria-colindex={geom.colOf[cell] + 1}
                tabIndex={cell === focusCell ? 0 : -1}
                className={[
                  "cell",
                  data.given ? "is-given" : "",
                  data.value && !data.given ? "is-entry" : "",
                  isSelected ? "is-selected" : "",
                  isPeer ? "is-peer" : "",
                  isSame ? "is-same" : "",
                  isCandidate ? "is-candidate" : "",
                  isConflict ? "is-conflict" : "",
                  hintCells.has(cell) ? "is-hint" : "",
                  hintUnit.has(cell) ? "is-hint-unit" : "",
                  completedCells?.has(cell) ? "is-complete" : "",
                  data.color ? "has-color" : "",
                  diagonalCells?.has(cell) ? "is-diagonal" : "",
                  largeMarks ? "large-marks" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  data.color
                    ? ({ ["--cell-color" as string]: `var(--mark-${data.color})` } as React.CSSProperties)
                    : undefined
                }
                onPointerDown={(event) => startPress(cell, event)}
                onPointerEnter={(event) => enterCell(cell, event)}
                onPointerLeave={() => {
                  if (longPressTimer.current) {
                    window.clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onLongPress?.(cell);
                }}
                onClick={(event) => {
                  if (event.detail === 0) onSelect(cell, event.shiftKey);
                }}
                data-cell={cell}
              >
                {thermoInfo?.marks.get(cell)?.map((mark, index) => (
                  <svg
                    key={`thermo-${index}`}
                    className="cell-thermo"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                    focusable="false"
                  >
                    {mark.bulb ? <circle className="thermo-bulb" cx="50" cy="50" r="22" /> : null}
                    <path className="thermo-line" d={mark.d} />
                  </svg>
                ))}
                {isConflict ? <span className="conflict-badge" aria-hidden="true" /> : null}
                {cageSum === undefined ? null : (
                  <span className="cage-sum" aria-hidden="true">
                    {cageSum}
                  </span>
                )}
                {data.value ? (
                  <span className="cell-value" key={data.value}>
                    {displayDigit(data.value, digitStyle)}
                  </span>
                ) : (
                  <>
                    {cornerDigits.length ? (
                      <span className="corner-marks" aria-hidden="true">
                        {Array.from({ length: spec.size }, (_, index) => {
                          const digit = index + 1;
                          return (
                            <span
                              key={digit}
                              className={`mark-slot ${
                                isMarkHit(digit, cornerDigits, markDigits) ? "is-mark-hit" : ""
                              }`}
                            >
                              {cornerDigits.includes(digit) ? displayDigit(digit, digitStyle) : ""}
                            </span>
                          );
                        })}
                      </span>
                    ) : null}
                    {centerDigits.length ? (
                      <span className="center-marks" aria-hidden="true">
                        {centerDigits.map((digit) => (
                          <span
                            key={digit}
                            className={`mark ${isMarkHit(digit, centerDigits, markDigits) ? "is-mark-hit" : ""}`}
                          >
                            {displayDigit(digit, digitStyle)}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            );
          })}
        </div>
      ))}
      {spec.variant === "windoku" && geom.windows.length ? (
        <span className="board-windows" aria-hidden="true">
          {geom.windows.map((window, index) => (
            <span
              key={index}
              className="board-window"
              style={
                {
                  ["--w-box-x" as string]: Math.floor(geom.colOf[window[0]] / spec.boxCols),
                  ["--w-cell-x" as string]: geom.colOf[window[0]] % spec.boxCols,
                  ["--w-box-y" as string]: Math.floor(geom.rowOf[window[0]] / spec.boxRows),
                  ["--w-cell-y" as string]: geom.rowOf[window[0]] % spec.boxRows,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      ) : null}
      {cageInfo?.walls.length ? (
        <span className="board-cages" aria-hidden="true">
          {cageInfo.walls.map((wall, index) => (
            <span key={index} className="cage-wall" style={wall} />
          ))}
        </span>
      ) : null}
      {thermoInfo?.links.length ? (
        <span className="board-thermo-links" aria-hidden="true">
          {thermoInfo.links.map((link, index) => (
            <span key={index} className="thermo-link" style={link} />
          ))}
        </span>
      ) : null}
    </div>
  );
}
