import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeSetting = "auto" | "light" | "dark";
export type Accent = "blue" | "pink" | "green" | "orange" | "purple" | "teal";
export type DigitStyle = "numerals" | "letters" | "shapes" | "emoji";
export type MistakeCheck = "off" | "onEntry" | "onRequest";
export type ColorVision = "none" | "deuteranopia" | "protanopia" | "tritanopia";
export type ReducedMotion = "system" | "on" | "off";

export interface Settings {
  schemaVersion: 1;
  locale: string;
  theme: ThemeSetting;
  accent: Accent;
  digitStyle: DigitStyle;
  mistakeCheck: MistakeCheck;
  autoCandidates: boolean;
  smartCleanup: boolean;
  highlight: { sameDigit: boolean; peers: boolean; candidates: boolean };
  showTimer: boolean;
  sound: { on: boolean; volume: number };
  haptics: boolean;
  reducedMotion: ReducedMotion;
  highContrast: boolean;
  colorVision: ColorVision;
  largeText: boolean;
  leftHanded: boolean;
  keepAwake: boolean;
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  locale: "en",
  theme: "auto",
  accent: "blue",
  digitStyle: "numerals",
  mistakeCheck: "onEntry",
  autoCandidates: false,
  smartCleanup: true,
  highlight: { sameDigit: true, peers: true, candidates: true },
  showTimer: true,
  sound: { on: false, volume: 0.6 },
  haptics: true,
  reducedMotion: "system",
  highContrast: false,
  colorVision: "none",
  largeText: false,
  leftHanded: false,
  keepAwake: false,
  onboardingDone: false,
};

const STORAGE_KEY = "ayo.settings.v1";

function detectLocale(): string {
  const candidates = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.toLowerCase().startsWith("id")) return "id";
  }
  return "en";
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, locale: detectLocale() };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      highlight: { ...DEFAULT_SETTINGS.highlight, ...(parsed.highlight ?? {}) },
      sound: { ...DEFAULT_SETTINGS.sound, ...(parsed.sound ?? {}) },
      schemaVersion: 1,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, locale: detectLocale() };
  }
}

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function prefersDark(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;
}

function applySettings(settings: Settings): void {
  const root = document.documentElement;
  const resolved =
    settings.theme === "auto" ? (prefersDark() ? "dark" : "light") : settings.theme;
  root.dataset.theme = resolved;
  root.dataset.themeSetting = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.digitStyle = settings.digitStyle;
  root.dataset.largeText = String(settings.largeText);
  root.dataset.contrast = settings.highContrast ? "high" : "normal";
  root.dataset.cvd = settings.colorVision;
  root.dataset.handed = settings.leftHanded ? "left" : "right";
  const reduced =
    settings.reducedMotion === "on" ||
    (settings.reducedMotion === "system" &&
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches);
  root.dataset.reducedMotion = reduced ? "true" : "false";
  root.style.colorScheme = resolved;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute("content", resolved === "dark" ? "#000000" : "#F2F2F7");
  try {
    localStorage.setItem("ayo.theme", resolved);
  } catch {
    // ignore
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const update = useCallback(
    (patch: Partial<Settings> | ((current: Settings) => Partial<Settings>)) => {
      setSettings((current) => {
        const next = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    const next = { ...DEFAULT_SETTINGS, locale: settings.locale, onboardingDone: true };
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [settings.locale]);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applySettings(settings);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings]);

  const value = useMemo(() => ({ settings, update, resetSettings }), [settings, update, resetSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
