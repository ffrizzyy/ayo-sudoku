import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CREDITS } from "./config/credits";
import { useI18n } from "./i18n";
import { useSettings } from "./app/settings";
import { useToast } from "./app/toast";
import { useGenerator } from "./app/useGenerator";
import { dateKey, useData } from "./app/data";
import { dailyDate, dailySeed, dailyTier } from "./app/daily";
import { LESSONS, type LessonDefinition } from "./app/lessons";
import { PACKS, packPuzzleToPuzzle } from "./app/packs";
import { makeSession, mostRecentSave, type GameMode, type SavedGame } from "./app/storage";
import type { PuzzleDef, Size, Tier } from "./engine/types";
import { Home } from "./screens/Home";
import { Daily } from "./screens/Daily";
import { Packs, PackDetail } from "./screens/Packs";
import { Learn, Lesson } from "./screens/Learn";
import { Stats } from "./screens/Stats";
import { SettingsScreen } from "./screens/Settings";
import { About } from "./screens/About";
import { Import } from "./screens/Import";
import { Onboarding } from "./screens/Onboarding";
import { GameScreen } from "./screens/Game";
import { Icon, type IconName } from "./ui/Icon";
import { Button } from "./ui/primitives";

const TABS: Array<{ path: string; icon: IconName; key: string }> = [
  { path: "/", icon: "home", key: "nav.home" },
  { path: "/daily", icon: "calendar", key: "nav.daily" },
  { path: "/packs", icon: "grid", key: "nav.packs" },
  { path: "/learn", icon: "book", key: "nav.learn" },
  { path: "/stats", icon: "chart", key: "nav.stats" },
];

function readRoute(): string {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return "/";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return clean || "/";
}

function useHashRoute(): [string, (path: string) => void] {
  const [path, setPath] = useState(readRoute);

  useEffect(() => {
    const onHash = () => setPath(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((next: string) => {
    const target = next.startsWith("/") ? next : `/${next}`;
    if (readRoute() === target) {
      setPath(target);
      return;
    }
    window.location.hash = target;
  }, []);

  return [path, navigate];
}

function routeForSession(session: SavedGame): string {
  if (session.mode === "pack") {
    const pack = PACKS.find((item) => item.puzzles.some((puzzle) => puzzle.id === session.puzzle.id));
    if (pack) return `/pack/${pack.id}`;
    return "/packs";
  }
  if (session.mode === "daily") return "/daily";
  if (session.mode === "learn" && session.lessonId) return `/lesson/${session.lessonId}`;
  if (session.mode === "import") return "/import";
  return "/";
}

function nextPackPuzzle(session: SavedGame): { puzzle: PuzzleDef; packId: string } | null {
  const pack = PACKS.find((item) => item.puzzles.some((puzzle) => puzzle.id === session.puzzle.id));
  if (!pack) return null;
  const index = pack.puzzles.findIndex((puzzle) => puzzle.id === session.puzzle.id);
  const next = pack.puzzles[index + 1];
  if (!next) return null;
  return { puzzle: packPuzzleToPuzzle(pack, next), packId: pack.id };
}

function canGoNext(session: SavedGame): boolean {
  if (session.mode === "pack") return nextPackPuzzle(session) !== null;
  if (session.mode === "learn") {
    const lesson = LESSONS.find((item) => item.id === session.lessonId);
    return Boolean(lesson && LESSONS[lesson.index + 1]);
  }
  return session.mode === "classic" || session.mode === "zen" || session.mode === "challenge";
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

interface LoadingState {
  mode: GameMode;
  tier: Tier;
}

export function App() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { push } = useToast();
  const data = useData();
  const generate = useGenerator();
  const [path, navigate] = useHashRoute();
  const [activeSession, setActiveSession] = useState<SavedGame | null>(null);
  const [returnRoute, setReturnRoute] = useState("/");
  const [loading, setLoading] = useState<LoadingState | null>(null);
  const [replayOnboarding, setReplayOnboarding] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [installDismissed, setInstallDismissed] = useState(() => {
    try {
      return localStorage.getItem("ayo.install.dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration | null>(null);
  const generationId = useRef(0);

  const showOnboarding = replayOnboarding || !settings.onboardingDone;

  // Keep the tab title useful without any routing dependency.
  useEffect(() => {
    const key =
      path === "/daily" ? "nav.daily"
        : path === "/packs" || path.startsWith("/pack/") ? "nav.packs"
          : path === "/learn" || path.startsWith("/lesson/") ? "nav.learn"
            : path === "/stats" ? "nav.stats"
              : path === "/settings" ? "nav.settings"
                : path === "/about" ? "about.title"
                  : path === "/import" || path.startsWith("/import/") ? "import.title"
                    : path === "/game" ? "common.newGame"
                      : "nav.home";
    document.title = `${t(key)} · ${CREDITS.appName}`;
  }, [path, t]);

  // Install prompt and service worker lifecycle.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
      push(t("pwa.installed"), "success");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [push, t]);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let disposed = false;
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        if (disposed) return;
        if (registration.waiting) setUpdateReady(registration);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(registration);
            }
          });
        });
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, []);

  const launch = useCallback(
    (session: SavedGame, back: string) => {
      setActiveSession(session);
      setReturnRoute(back);
      navigate("/game");
    },
    [navigate],
  );

  const startGenerated = useCallback(
    async (options: {
      mode: "classic" | "zen" | "challenge" | "learn";
      tier: Tier;
      size?: Size;
      lessonId?: string;
      returnRoute: string;
    }) => {
      const id = ++generationId.current;
      setLoading({ mode: options.mode, tier: options.tier });
      try {
        const puzzle = await generate({
          tier: options.tier,
          size: options.size ?? 9,
        });
        if (id !== generationId.current) return;
        const session = makeSession(puzzle, options.mode, options.mode);
        session.lessonId = options.lessonId;
        launch(session, options.returnRoute);
      } catch {
        push(t("toast.noPuzzle"));
      } finally {
        if (id === generationId.current) setLoading(null);
      }
    },
    [generate, launch, push, t],
  );

  const startDaily = useCallback(async (date?: string) => {
    const id = ++generationId.current;
    const stamp = date ? Date.parse(`${date}T00:00:00Z`) : Date.now();
    setLoading({ mode: "daily", tier: dailyTier(stamp) });
    try {
      const puzzle = await generate({
        tier: dailyTier(stamp),
        seed: dailySeed(stamp),
        size: 9,
      });
      if (id !== generationId.current) return;
      const session = makeSession(puzzle, "daily", "daily");
      session.dailyDate = dailyDate(stamp);
      launch(session, "/daily");
    } catch {
      push(t("toast.noPuzzle"));
    } finally {
      if (id === generationId.current) setLoading(null);
    }
  }, [generate, launch, push, t]);

  const startPack = useCallback(
    (puzzle: PuzzleDef) => {
      const pack = PACKS.find((item) => item.puzzles.some((entry) => entry.id === puzzle.id));
      const session = makeSession(puzzle, "pack", "pack");
      launch(session, pack ? `/pack/${pack.id}` : "/packs");
    },
    [launch],
  );

  const startImported = useCallback(
    (puzzle: PuzzleDef) => {
      const session = makeSession(puzzle, "import", "import");
      launch(session, "/");
    },
    [launch],
  );

  const startLesson = useCallback(
    (lesson: LessonDefinition) => {
      void startGenerated({
        mode: "learn",
        tier: lesson.tier,
        lessonId: lesson.id,
        returnRoute: `/lesson/${lesson.id}`,
      });
    },
    [startGenerated],
  );

  const resumeSession = useCallback(
    (session: SavedGame) => {
      launch(session, routeForSession(session));
    },
    [launch],
  );

  const quitGame = useCallback(() => {
    setActiveSession(null);
    navigate(returnRoute || "/");
  }, [navigate, returnRoute]);

  const goNext = useCallback(
    (session: SavedGame) => {
      if (session.mode === "pack") {
        const next = nextPackPuzzle(session);
        if (next) {
          launch(makeSession(next.puzzle, "pack", "pack"), `/pack/${next.packId}`);
        }
        return;
      }
      if (session.mode === "learn") {
        const lesson = LESSONS.find((item) => item.id === session.lessonId);
        const next = lesson ? LESSONS[lesson.index + 1] : undefined;
        if (next) void startLesson(next);
        return;
      }
      if (session.mode === "classic" || session.mode === "zen" || session.mode === "challenge") {
        void startGenerated({
          mode: session.mode,
          tier: session.puzzle.tier,
          size: session.puzzle.spec.size,
          returnRoute: routeForSession(session),
        });
      }
    },
    [launch, startGenerated, startLesson],
  );

  const gameSession = useMemo(() => {
    if (path !== "/game") return null;
    if (activeSession) return activeSession;
    return mostRecentSave();
  }, [path, activeSession]);

  const applyUpdate = () => {
    const waiting = updateReady?.waiting;
    if (!waiting) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  const dismissInstall = () => {
    setInstallDismissed(true);
    try {
      localStorage.setItem("ayo.install.dismissed", "1");
    } catch {
      // ignore
    }
  };

  const requestInstall = async () => {
    if (installed || isStandalone()) {
      push(t("pwa.alreadyInstalled"));
      return;
    }
    if (!installPrompt) {
      push(t("pwa.installUnavailable"));
      return;
    }
    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") push(t("pwa.installed"), "success");
    } catch {
      // The browser may withdraw the prompt; show the manual path instead.
      push(t("pwa.installUnavailable"));
    }
  };

  if (showOnboarding) {
    return <Onboarding onDone={() => setReplayOnboarding(false)} />;
  }

  let content: ReactNode;
  if (path === "/game") {
    content = gameSession ? (
      <GameScreen
        key={gameSession.id}
        initial={gameSession}
        onQuitHome={quitGame}
        exitLabel={returnRoute === "/" ? undefined : t("common.done")}
        onNextPuzzle={canGoNext(gameSession) ? () => goNext(gameSession) : undefined}
      />
    ) : (
      <div className="empty-screen">
        <span className="empty-mark">!</span>
        <h1>{t("errors.title")}</h1>
        <p>{t("home.noContinue")}</p>
        <Button variant="primary" icon="home" onClick={() => navigate("/")}>
          {t("common.home")}
        </Button>
      </div>
    );
  } else if (path === "/daily") {
    content = (
      <Daily
        onPlay={(date) => void startDaily(date)}
        onResume={resumeSession}
        onNavigate={navigate}
      />
    );
  } else if (path === "/packs") {
    content = <Packs onNavigate={navigate} />;
  } else if (path.startsWith("/pack/")) {
    const packId = decodeURIComponent(path.slice("/pack/".length));
    content = (
      <PackDetail
        packId={packId}
        onBack={() => navigate("/packs")}
        onPlay={(puzzle) => startPack(puzzle)}
      />
    );
  } else if (path === "/learn") {
    content = <Learn onNavigate={navigate} />;
  } else if (path.startsWith("/lesson/")) {
    const lessonId = decodeURIComponent(path.slice("/lesson/".length));
    content = (
      <Lesson
        lessonId={lessonId}
        onBack={() => navigate("/learn")}
        onNavigate={navigate}
        onPractice={startLesson}
      />
    );
  } else if (path === "/stats") {
    content = <Stats />;
  } else if (path === "/settings") {
    content = (
      <SettingsScreen
        onNavigate={navigate}
        onReplayOnboarding={() => setReplayOnboarding(true)}
        installed={installed}
        canInstall={Boolean(installPrompt)}
        onInstall={() => void requestInstall()}
      />
    );
  } else if (path === "/about") {
    content = <About onNavigate={navigate} />;
  } else if (path === "/import" || path.startsWith("/import/")) {
    const code = path.startsWith("/import/")
      ? decodeURIComponent(path.slice("/import/".length))
      : undefined;
    content = <Import initialCode={code} onPlay={startImported} onBack={() => navigate("/")} />;
  } else {
    content = (
      <Home
        onPlay={(mode, tier, size) => {
          if (mode === "classic" || mode === "zen" || mode === "challenge") {
            void startGenerated({ mode, tier, size, returnRoute: "/" });
          }
        }}
        onDaily={() => void startDaily()}
        onResume={resumeSession}
        onNavigate={navigate}
        installed={installed}
        onInstall={() => void requestInstall()}
      />
    );
  }

  const showTabs = path !== "/game";
  const dailyDone = Boolean(data.daily[dateKey()]);

  return (
    <div className={`app-shell ${showTabs ? "has-tabs" : ""}`}>
      {content}

      {loading ? (
        <div className="generation-overlay" role="dialog" aria-modal="true" aria-label={t("home.generating")}>
          <div className="generation-card">
            <div className="generation-orbit" aria-hidden="true">
              <span className="generation-grid">
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index} className={index % 4 === 0 ? "is-lit" : ""} />
                ))}
              </span>
              <span className="orbit-dot" />
            </div>
            <h2>{t("home.generating")}</h2>
            <p>
              {t(`mode.${loading.mode}`)} · {t(`tier.${loading.tier}`)}
            </p>
            <div className="generation-bars" aria-hidden="true">
              <span /><span /><span />
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                generationId.current++;
                setLoading(null);
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {showTabs && updateReady ? (
        <div className="app-banner update-banner">
          <Icon name="refresh" size={18} />
          <span>{t("pwa.update")}</span>
          <button type="button" onClick={applyUpdate}>
            {t("pwa.updateNow")}
          </button>
          <button type="button" className="app-banner-close" onClick={() => setUpdateReady(null)} aria-label={t("common.close")}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}

      {showTabs && !updateReady && installPrompt && !installDismissed && !installed ? (
        <div className="app-banner install-banner">
          <Icon name="download" size={18} />
          <span>{t("pwa.install")}</span>
          <button type="button" onClick={() => void requestInstall()}>
            {t("home.install")}
          </button>
          <button type="button" className="app-banner-close" onClick={dismissInstall} aria-label={t("common.close")}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}

      {showTabs ? (
        <nav className="tab-bar" aria-label={t("nav.home")}>
          {TABS.map((tab) => {
            const active =
              tab.path === "/"
                ? path === "/"
                : path === tab.path ||
                  (tab.path === "/packs" && path.startsWith("/pack/")) ||
                  (tab.path === "/learn" && path.startsWith("/lesson/"));
            const showDailyDot = tab.path === "/daily" && !dailyDone;
            return (
              <button
                key={tab.path}
                type="button"
                className={`tab-item ${active ? "is-active" : ""}`}
                onClick={() => navigate(tab.path)}
                aria-current={active ? "page" : undefined}
                aria-label={t(tab.key)}
                title={t(tab.key)}
              >
                <span className="tab-icon">
                  <Icon name={tab.icon} size={24} />
                  {showDailyDot ? <span className="tab-dot" aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
