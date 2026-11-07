import { useCallback, useMemo, useState } from "react";
import { encodeShareCode } from "../engine/share";
import { getGeometry } from "../engine/board";
import type { PuzzleDef } from "../engine/types";
import { useI18n } from "../i18n";
import { useData } from "../app/data";
import { useToast } from "../app/toast";
import { CREDITS, creditLine } from "../config/credits";
import { Button, Sheet } from "./primitives";
import { Icon } from "./Icon";

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    textarea.remove();
  }
  return Promise.resolve();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function accentColor(): string {
  if (typeof window === "undefined") return "#0A84FF";
  const value = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return value || "#0A84FF";
}

async function drawCard(puzzle: PuzzleDef, tierLabel: string, timeLabel: string, dark: boolean): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1500;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const accent = accentColor();
  const bg = dark ? "#0B0B0F" : "#F2F2F7";
  const card = dark ? "#1C1C1E" : "#FFFFFF";
  const ink = dark ? "#FFFFFF" : "#111114";
  const muted = dark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)";
  const line = dark ? "rgba(235,235,245,0.22)" : "rgba(60,60,67,0.22)";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 1500);

  // Soft accent bubbles.
  const bubbles = [
    { x: 130, y: 180, r: 210, alpha: 0.18 },
    { x: 1090, y: 340, r: 280, alpha: 0.14 },
    { x: 1020, y: 1320, r: 240, alpha: 0.16 },
  ];
  for (const bubble of bubbles) {
    ctx.save();
    ctx.globalAlpha = bubble.alpha;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Card
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, 72, 78, 1056, 1344, 64);
  ctx.fillStyle = card;
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = ink;
  ctx.font = "800 74px ui-rounded, 'Nunito', system-ui, sans-serif";
  ctx.fillText(CREDITS.appName, 132, 210);

  ctx.fillStyle = muted;
  ctx.font = "600 34px ui-rounded, 'Nunito', system-ui, sans-serif";
  ctx.fillText(`${tierLabel} · ${timeLabel}`, 134, 265);

  // Board
  const boardX = 160;
  const boardY = 340;
  const boardSize = 880;
  const geom = getGeometry(puzzle.spec);
  const size = geom.size;
  const cell = boardSize / size;
  ctx.save();
  roundRect(ctx, boardX - 22, boardY - 22, boardSize + 44, boardSize + 44, 40);
  ctx.fillStyle = dark ? "#2C2C2E" : "#F7F7FA";
  ctx.fill();
  ctx.restore();

  const givens = puzzle.givens.replace(/\./g, "0");
  for (let index = 0; index < geom.cellCount; index++) {
    const row = geom.rowOf[index];
    const col = geom.colOf[index];
    const x = boardX + col * cell;
    const y = boardY + row * cell;
    ctx.fillStyle = dark ? "#1C1C1E" : "#FFFFFF";
    roundRect(ctx, x + 2, y + 2, cell - 4, cell - 4, Math.max(4, 10 - size));
    ctx.fill();
  }

  // Cell lines, with heavier lines around each box.
  for (let i = 0; i <= size; i++) {
    const strong = i % geom.boxCols === 0;
    ctx.strokeStyle = strong ? line : dark ? "rgba(235,235,245,0.1)" : "rgba(60,60,67,0.09)";
    ctx.lineWidth = strong ? 4 : 1.5;
    const x = boardX + i * cell;
    const y = boardY + i * cell;
    ctx.beginPath();
    ctx.moveTo(x, boardY);
    ctx.lineTo(x, boardY + boardSize);
    ctx.stroke();
    if (i % geom.boxRows === 0) {
      ctx.beginPath();
      ctx.moveTo(boardX, y);
      ctx.lineTo(boardX + boardSize, y);
      ctx.stroke();
    }
  }

  // Thermo: rising paths drawn before the digits so the numbers stay on top.
  const thermos = puzzle.spec.variant === "thermo" ? puzzle.thermos : undefined;
  if (thermos?.length) {
    ctx.save();
    ctx.strokeStyle = dark ? "rgba(235,235,245,0.4)" : "rgba(60,60,67,0.34)";
    ctx.fillStyle = dark ? "rgba(235,235,245,0.28)" : "rgba(60,60,67,0.22)";
    ctx.lineWidth = Math.max(2, cell * 0.085);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const centre = (index: number) => ({
      x: boardX + (geom.colOf[index] + 0.5) * cell,
      y: boardY + (geom.rowOf[index] + 0.5) * cell,
    });
    for (const line of thermos) {
      if (line.length < 2) continue;
      const bulb = centre(line[0]);
      ctx.beginPath();
      ctx.arc(bulb.x, bulb.y, cell * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      line.forEach((index, position) => {
        const point = centre(index);
        if (position === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  // Killer: cage walls in the gutters and one sum per cage.
  const cages = puzzle.spec.variant === "killer" ? puzzle.cages : undefined;
  if (cages?.length) {
    const owner = new Int16Array(geom.cellCount).fill(-1);
    const sums = new Map<number, number>();
    cages.forEach((cage, index) => {
      for (const cellIndex of cage.cells) owner[cellIndex] = index;
      sums.set(Math.min(...cage.cells), cage.sum);
    });
    ctx.strokeStyle = dark ? "#6A6A80" : "#8A8AA3";
    ctx.lineWidth = 2.5;
    for (let index = 0; index < geom.cellCount; index++) {
      const row = geom.rowOf[index];
      const col = geom.colOf[index];
      if (col < size - 1 && owner[index + 1] !== owner[index]) {
        const x = boardX + (col + 1) * cell;
        const y = boardY + row * cell;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + cell);
        ctx.stroke();
      }
      if (row < size - 1 && owner[index + size] !== owner[index]) {
        const x = boardX + col * cell;
        const y = boardY + (row + 1) * cell;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell, y);
        ctx.stroke();
      }
    }
    ctx.fillStyle = muted;
    ctx.font = `800 ${Math.round(cell * 0.2)}px ui-rounded, 'Nunito', system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    for (const [cellIndex, sum] of sums) {
      const row = geom.rowOf[cellIndex];
      const col = geom.colOf[cellIndex];
      ctx.fillText(String(sum), boardX + col * cell + cell * 0.08, boardY + row * cell + cell * 0.26);
    }
  }

  ctx.fillStyle = ink;
  for (let index = 0; index < geom.cellCount; index++) {
    const value = Number(givens[index] ?? 0);
    if (!value) continue;
    const x = boardX + geom.colOf[index] * cell;
    const y = boardY + geom.rowOf[index] * cell;
    ctx.font = `700 ${Math.round(cell * 0.52)}px ui-rounded, 'Nunito', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(value), x + cell / 2, y + cell / 2 + 3);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ink;
  ctx.font = "700 34px ui-rounded, 'Nunito', system-ui, sans-serif";
  ctx.fillText(creditLine(), 132, 1330);
  ctx.fillStyle = muted;
  ctx.font = "500 26px ui-rounded, 'Nunito', system-ui, sans-serif";
  ctx.fillText(CREDITS.authorUrl.replace(/^https?:\/\//, ""), 132, 1372);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png", 0.95));
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function MiniBoard({ puzzle }: { puzzle: PuzzleDef }) {
  const givens = puzzle.givens.replace(/\./g, "0");
  const size = puzzle.spec.size;
  const cells = size * size;
  const cages = puzzle.spec.variant === "killer" ? puzzle.cages : undefined;
  const thermos = puzzle.spec.variant === "thermo" ? puzzle.thermos : undefined;
  const thermoInfo = useMemo(() => {
    if (!thermos?.length) return null;
    const geom = getGeometry(puzzle.spec);
    const marks = new Map<number, Array<{ d: string; bulb: boolean }>>();
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
    }
    return marks;
  }, [thermos, puzzle.spec]);
  const cageInfo = useMemo(() => {
    if (!cages?.length) return null;
    const owner = new Int16Array(cells).fill(-1);
    const sums = new Map<number, number>();
    cages.forEach((cage, index) => {
      for (const cell of cage.cells) owner[cell] = index;
      sums.set(Math.min(...cage.cells), cage.sum);
    });
    return { owner, sums };
  }, [cages, cells]);
  return (
    <div
      className="share-mini"
      aria-hidden="true"
      style={{ ["--mini-size" as string]: size }}
    >
      {Array.from({ length: cells }, (_, index) => {
        const value = Number(givens[index] ?? 0);
        const owner = cageInfo ? cageInfo.owner[index] : -1;
        const col = index % size;
        const row = Math.floor(index / size);
        const cageRight = Boolean(cageInfo) && col < size - 1 && cageInfo!.owner[index + 1] !== owner;
        const cageDown = Boolean(cageInfo) && row < size - 1 && cageInfo!.owner[index + size] !== owner;
        const sum = cageInfo?.sums.get(index);
        return (
          <span
            key={index}
            className={`share-mini-cell ${value ? "has-value" : ""} ${
              row % puzzle.spec.boxRows === 0 && index >= size ? "box-top" : ""
            } ${col % puzzle.spec.boxCols === 0 && col !== 0 ? "box-left" : ""} ${
              sum === undefined ? "" : "has-sum"
            } ${cageRight ? "cage-right" : ""} ${cageDown ? "cage-down" : ""}`}
          >
            {thermoInfo?.get(index)?.map((mark, markIndex) => (
              <svg
                key={`thermo-${markIndex}`}
                className="share-mini-thermo"
                viewBox="0 0 100 100"
                aria-hidden="true"
                focusable="false"
              >
                {mark.bulb ? <circle className="thermo-bulb" cx="50" cy="50" r="22" /> : null}
                <path className="thermo-line" d={mark.d} />
              </svg>
            ))}
            {sum === undefined ? null : <span className="share-mini-sum">{sum}</span>}
            <span className="share-mini-value">{value || ""}</span>
          </span>
        );
      })}
    </div>
  );
}

export function ShareSheet({
  open,
  onClose,
  puzzle,
  tierLabel,
  timeLabel,
}: {
  open: boolean;
  onClose: () => void;
  puzzle: PuzzleDef;
  tierLabel: string;
  timeLabel: string;
}) {
  const { t } = useI18n();
  const { markShared } = useData();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const code = useMemo(() => encodeShareCode(puzzle), [puzzle]);
  const link = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${window.location.pathname}#/import/${code}`;
  }, [code]);
  const dark = document.documentElement.dataset.theme === "dark";
  const label = useMemo(() => {
    const variant =
      puzzle.spec.variant === "classic" ? "" : t(`variant.${puzzle.spec.variant}` as const);
    return [variant, tierLabel].filter(Boolean).join(" · ");
  }, [puzzle.spec.variant, t, tierLabel]);

  const copy = useCallback(
    async (value: string, message: string) => {
      try {
        await copyText(value);
        push(message, "success");
        markShared();
      } catch {
        push(t("share.failed"));
      }
    },
    [markShared, push, t],
  );

  const shareImage = useCallback(async () => {
    setBusy(true);
    try {
      const blob = await drawCard(puzzle, label, timeLabel, dark);
      if (!blob) throw new Error("no blob");
      const file = new File([blob], "ayo-sudoku.png", { type: "image/png" });
      markShared();
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: CREDITS.appName, text: creditLine() });
          return;
        } catch {
          // Fall through to download.
        }
      }
      downloadBlob(blob, `ayo-sudoku-${puzzle.tier}.png`);
      push(t("share.imageSaved"), "success");
    } catch {
      push(t("share.failed"));
    } finally {
      setBusy(false);
    }
  }, [dark, label, markShared, puzzle, push, t, timeLabel]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("share.title")}
      subtitle={t("share.subtitle")}
      size="md"
    >
      <div className="share-preview-card">
        <div className="share-preview-head">
          <span className="share-logo">{CREDITS.appName}</span>
          <span className="share-tier">{label}</span>
        </div>
        <MiniBoard puzzle={puzzle} />
        <div className="share-preview-foot">
          <span>{timeLabel}</span>
          <span>{t("share.credit", { name: CREDITS.author })}</span>
        </div>
      </div>

      <div className="share-code-block">
        <span className="share-code-label">{t("import.codeLabel")}</span>
        <code className="share-code">{code}</code>
      </div>

      <div className="share-actions">
        <Button icon="share" variant="primary" onClick={shareImage} disabled={busy} full>
          {t("share.image")}
        </Button>
        <div className="share-actions-row">
          <Button icon="copy" variant="tinted" onClick={() => copy(link, t("share.linkCopied"))}>
            {t("share.link")}
          </Button>
          <Button icon="import" variant="tinted" onClick={() => copy(code, t("share.codeCopied"))}>
            {t("share.code")}
          </Button>
        </div>
      </div>
      <p className="share-note">
        <Icon name="info" size={15} /> {t("share.note")}
      </p>
    </Sheet>
  );
}
