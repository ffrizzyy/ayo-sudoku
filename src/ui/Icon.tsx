import type { CSSProperties, ReactNode } from "react";

export type IconName =
  | "home"
  | "calendar"
  | "book"
  | "chart"
  | "settings"
  | "arrow-left"
  | "arrow-right"
  | "chevron-right"
  | "chevron-left"
  | "pause"
  | "play"
  | "undo"
  | "redo"
  | "eraser"
  | "bulb"
  | "wand"
  | "check"
  | "close"
  | "share"
  | "copy"
  | "download"
  | "upload"
  | "lock"
  | "star"
  | "flame"
  | "grid"
  | "plus"
  | "globe"
  | "sun"
  | "moon"
  | "auto"
  | "palette"
  | "type"
  | "eye"
  | "accessibility"
  | "trash"
  | "info"
  | "heart"
  | "trophy"
  | "clock"
  | "alert"
  | "volume"
  | "volume-off"
  | "vibrate"
  | "wifi-off"
  | "clipboard"
  | "import"
  | "check-circle"
  | "refresh"
  | "dots";

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3.5 10.4 12 3.5l8.5 6.9V20a1 1 0 0 1-1 1h-5.2v-5.6H9.7V21H4.5a1 1 0 0 1-1-1Z" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21Zm0 0v15.5M8 7.5h8M8 11h6" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.1a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.1.6Z" />
    </>
  ),
  "arrow-left": <path d="M20 12H4m6-6-6 6 6 6" />,
  "arrow-right": <path d="M4 12h16m-6-6 6 6-6 6" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  pause: (
    <>
      <rect x="6" y="4.5" width="4" height="15" rx="1.5" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.5" />
    </>
  ),
  play: <path d="M7 4.8v14.4a1 1 0 0 0 1.53.85l11-7.2a1 1 0 0 0 0-1.7l-11-7.2A1 1 0 0 0 7 4.8Z" />,
  undo: <path d="M9 7 4 12l5 5M4 12h9a6 6 0 0 1 6 6v1" />,
  redo: <path d="m15 7 5 5-5 5m5-5h-9a6 6 0 0 0-6 6v1" />,
  eraser: (
    <>
      <path d="m4 15.5 7.9-7.9a3 3 0 0 1 4.2 0l2.3 2.3a3 3 0 0 1 0 4.2L14 18.5H8.5Z" />
      <path d="M10 8 16.5 14.5M6 21h14" />
    </>
  ),
  bulb: <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3Z" />,
  wand: <path d="m4 20 11-11M14.5 3.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM19 11l.6 1.4 1.4.6-1.4.6L19 15l-.6-1.4L17 13l1.4-.6Z" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  share: (
    <>
      <path d="M12 15V3m0 0L8 7m4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h1" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 20h16" />,
  refresh: <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" />,
  upload: <path d="M12 21V9m0 0 4.5 4.5M12 9l-4.5 4.5M4 4h16" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  star: <path d="m12 3 2.7 5.7 6.3.9-4.6 4.4 1.1 6.2-5.5-3-5.5 3 1.1-6.2L3 9.6l6.3-.9Z" />,
  flame: <path d="M12 22c4 0 7-2.7 7-6.6 0-2.8-1.5-5.4-4-7.4.2 1.8-.7 3.2-2 3.7.4-3.8-1.5-6.6-4-8.7.3 3.4-4 6.4-4 12.4C5 19.3 8 22 12 22Z" />,
  grid: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.6 5.6 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.6-3.6-9S9.6 5.5 12 3Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  auto: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" stroke="none" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18h1.5a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
      <circle cx="10.5" cy="6.5" r="1" fill="currentColor" />
      <circle cx="15" cy="7" r="1" fill="currentColor" />
    </>
  ),
  type: <path d="M4 6V4h16v2M9 20h6M12 4v16" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  accessibility: (
    <>
      <circle cx="12" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M5 8h14M12 8v5m0 0-4 8m4-8 4 8M8.5 12.5h7" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.8 13a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7m4 4v7m4-7v7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.1" />
    </>
  ),
  heart: <path d="M12 20.5S3.5 15.2 3.5 9.2A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.5 2.8c0 6-8.5 11.3-8.5 11.3Z" />,
  trophy: <path d="M8 3h8v5a4 4 0 0 1-8 0Zm0 1H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 0v4m-3 3h6m-5 0-.5 2h5l-.5-2" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 3v.1" />
    </>
  ),
  volume: <path d="M4 9v6h4l5 4V5L8 9Zm12-2.5a6 6 0 0 1 0 11M18.5 4a9 9 0 0 1 0 16" />,
  "volume-off": <path d="M4 9v6h4l5 4V5L8 9Zm12.5 1.5 5 5m0-5-5 5" />,
  vibrate: <path d="M9 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm-4 3v10m14-10v10" />,
  "wifi-off": <path d="M3 3l18 18M8.5 8.5A11 11 0 0 1 21 9.5M3 9.5a11 11 0 0 1 5.2-2.3M6 13a7 7 0 0 1 4-1.4M18 13a7 7 0 0 0-2.4-1.2M9.5 16.5a3.5 3.5 0 0 1 5 0M12 20h.01" />,
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  import: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.7 2.7L16.5 9" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({
  name,
  size = 22,
  className,
  style,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export function StarIcon({ size = 20, filled = true, className }: { size?: number; filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2.8 2.9 6 6.6 1-4.8 4.6 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6L2.5 9.8l6.6-1Z" />
    </svg>
  );
}
