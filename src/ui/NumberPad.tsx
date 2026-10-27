import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import { displayDigit } from "./Board";
import { useI18n } from "../i18n";

export function NumberPad({
  size,
  counts,
  digitStyle,
  colorMode,
  onDigit,
  disabled,
}: {
  size: number;
  counts: number[];
  digitStyle: string;
  colorMode?: boolean;
  onDigit: (digit: number) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`number-pad ${colorMode ? "is-colors" : ""}`}
      role="group"
      aria-label={t("game.valueEntry")}
      style={{ ["--pad-count" as string]: size }}
    >
      {Array.from({ length: size }, (_, index) => {
        const digit = index + 1;
        const placed = counts[digit] ?? 0;
        const remaining = Math.max(0, size - placed);
        const finished = remaining === 0;
        if (colorMode) {
          return (
            <button
              key={digit}
              type="button"
              className="pad-key pad-color"
              onClick={() => onDigit(digit)}
              disabled={disabled}
              aria-label={t("game.markColor", { index: digit })}
            >
              <span className="color-dot" style={{ ["--cell-color" as string]: `var(--mark-${digit})` } as CSSProperties} />
            </button>
          );
        }
        return (
          <button
            key={digit}
            type="button"
            className={`pad-key ${finished ? "is-finished" : ""}`}
            onClick={() => onDigit(digit)}
            disabled={disabled}
            aria-label={`${digit}${finished ? `, ${t("common.done")}` : `, ${remaining}`}`}
          >
            <span className="pad-digit">{displayDigit(digit, digitStyle)}</span>
            <span className="pad-count" aria-hidden="true">
              {finished ? <Icon name="check" size={13} strokeWidth={3} /> : remaining}
            </span>
          </button>
        );
      })}
    </div>
  );
}
