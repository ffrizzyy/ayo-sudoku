import { useEffect, useMemo, useRef } from "react";
import { getGeometry, type BoardSpec } from "../engine";
import type { CellSnapshot } from "../app/storage";
import { useI18n } from "../i18n";
import { maskToDigits } from "../engine/bitset";

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
  highlightSame,
  highlightPeers,
  highlightCandidates,
  onSelect,
  onDragSelect,
  onLongPress,
}: BoardProps) {
  const { t } = useI18n();
  const geom = useMemo(() => getGeometry(spec), [spec]);
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
      className={`board ${dimmed ? "is-dimmed" : ""}`}
      role="grid"
      aria-label={t("a11y.board", { size: spec.size })}
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
            return (
              <button
                type="button"
                key={cell}
                role="gridcell"
                aria-label={`${cellLabel(cell)}${isConflict ? `, ${t("a11y.cellConflict")}` : ""}${
                  isSelected ? `, ${t("a11y.cellSelected")}` : ""
                }`}
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
                {isConflict ? <span className="conflict-badge" aria-hidden="true" /> : null}
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
                            <span key={digit} className="mark-slot">
                              {cornerDigits.includes(digit) ? displayDigit(digit, digitStyle) : ""}
                            </span>
                          );
                        })}
                      </span>
                    ) : null}
                    {centerDigits.length ? (
                      <span className="center-marks" aria-hidden="true">
                        {centerDigits.map((digit) => (
                          <span key={digit} className="mark">
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
    </div>
  );
}
