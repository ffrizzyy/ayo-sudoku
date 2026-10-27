import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName, StarIcon } from "./Icon";
import { useI18n } from "../i18n";

type ButtonVariant = "primary" | "tinted" | "plain" | "ghost" | "danger" | "glass";

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  full,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  trailingIcon?: IconName;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${full ? "btn-full" : ""} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "lg" ? 22 : 19} /> : null}
      <span className="btn-label">{children}</span>
      {trailingIcon ? <Icon name={trailingIcon} size={18} /> : null}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className = "",
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? "is-active" : ""} ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  compact,
  className = "",
}: {
  options: Array<{ value: T; label: ReactNode; ariaLabel?: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return (
    <div
      className={`segmented ${compact ? "segmented-compact" : ""} ${className}`}
      role="tablist"
      aria-label={label}
      style={{ ["--seg-count" as string]: options.length, ["--seg-index" as string]: index }}
    >
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          aria-label={option.ariaLabel}
          className={`segmented-item ${option.value === value ? "is-active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={`switch-row ${disabled ? "is-disabled" : ""}`}>
      <label className="switch-copy" htmlFor={id}>
        <span className="switch-label">{label}</span>
        {description ? <span className="switch-description">{description}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function SettingRow({
  label,
  description,
  children,
  icon,
  stacked,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  icon?: IconName;
  stacked?: boolean;
}) {
  return (
    <div className={`setting-row ${stacked ? "is-stacked" : ""}`}>
      <div className="setting-copy">
        <span className="setting-label">
          {icon ? <Icon name={icon} size={19} /> : null}
          {label}
        </span>
        {description ? <span className="setting-description">{description}</span> : null}
      </div>
      {children ? <div className="setting-control">{children}</div> : null}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  tone = "default",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "celebration";
  dismissible?: boolean;
}) {
  const titleId = useId();
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      body.style.overflow = previous;
      window.clearTimeout(timer);
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return createPortal(
    <div className={`sheet-overlay ${tone === "celebration" ? "is-celebration" : ""}`}>
      <div
        className="sheet-scrim"
        aria-hidden="true"
        onClick={() => {
          if (dismissible) onClose();
        }}
      />
      <div
        ref={panelRef}
        className={`sheet sheet-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="sheet-grabber" aria-hidden="true" />
        <header className="sheet-header">
          <div>
            <h2 id={titleId} className="sheet-title">
              {title}
            </h2>
            {subtitle ? <p className="sheet-subtitle">{subtitle}</p> : null}
          </div>
          {dismissible ? (
            <IconButton icon="close" label={t("common.close")} onClick={onClose} className="sheet-close" />
          ) : null}
        </header>
        <div className="sheet-body">{children}</div>
        {footer ? <footer className="sheet-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export function StarRow({
  count,
  max = 3,
  size = 22,
  animate,
}: {
  count: number;
  max?: number;
  size?: number;
  animate?: boolean;
}) {
  return (
    <span className={`star-row ${animate ? "is-animated" : ""}`} aria-label={`${count} / ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <StarIcon
          key={index}
          size={size}
          filled={index < count}
          className={`star ${index < count ? "is-filled" : "is-empty"}`}
        />
      ))}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 46,
  stroke = 4,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <span className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="progress-ring-label">{children}</span>
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "green" | "orange" | "red" | "purple";
  className?: string;
}) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>;
}
