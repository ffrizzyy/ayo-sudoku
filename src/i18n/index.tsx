import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { dictionaries, en, type Dictionary } from "./copy";

export { dictionaries, en, id } from "./copy";
export type { Dictionary } from "./copy";

export type TParams = Record<string, string | number>;
export type Translate = (key: string, params?: TParams) => string;

function lookup(dictionary: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = dictionary;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

interface I18nValue {
  locale: string;
  t: Translate;
  setLocale: (locale: string) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  onLocaleChange,
  children,
}: {
  locale: string;
  onLocaleChange: (locale: string) => void;
  children: ReactNode;
}) {
  const safeLocale = dictionaries[locale] ? locale : "en";
  useEffect(() => {
    document.documentElement.lang = safeLocale;
    document.documentElement.dir = safeLocale === "ar" ? "rtl" : "ltr";
  }, [safeLocale]);

  const t = useCallback<Translate>(
    (key, params) => {
      const dictionary = dictionaries[safeLocale] ?? en;
      const plural =
        params && typeof params.count === "number"
          ? lookup(dictionary, `${key}_${params.count === 1 ? "one" : "other"}`) ??
            lookup(en, `${key}_${params.count === 1 ? "one" : "other"}`)
          : undefined;
      const template = plural ?? lookup(dictionary, key) ?? lookup(en, key) ?? key;
      return interpolate(template, params);
    },
    [safeLocale],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale: safeLocale, t, setLocale: onLocaleChange }),
    [safeLocale, t, onLocaleChange],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export function formatDuration(ms: number, style: "clock" | "short" = "clock"): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  if (style === "short" && totalSeconds < 60) return `${totalSeconds}s`;
  return `${minutes}:${pad(seconds)}`;
}

export function formatDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(timestamp);
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
