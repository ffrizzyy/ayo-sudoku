import { useMemo, useState } from "react";
import type { GameMode, SavedGame } from "../app/storage";
import { dailySaveKey, readSaves } from "../app/storage";
import { useData, dateKey } from "../app/data";
import { useSettings } from "../app/settings";
import { useI18n } from "../i18n";
import { Icon, StarIcon } from "../ui/Icon";
import { Button, ProgressRing, Segmented, Sheet } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";
import { CREDITS } from "../config/credits";
import type { Size, Tier, Variant } from "../engine/types";

const TIERS: Tier[] = ["cozy", "easy", "medium", "hard", "expert", "master"];
const SIZES: Size[] = [9, 6, 4];
const VARIANTS: Variant[] = ["classic", "diagonal", "windoku"];
const MODES: Array<{ value: "classic" | "daily" | "zen" | "challenge"; icon: "grid" | "calendar" | "heart" | "flame" }> = [
  { value: "classic", icon: "grid" },
  { value: "daily", icon: "calendar" },
  { value: "zen", icon: "heart" },
  { value: "challenge", icon: "flame" },
];

type HomeMode = (typeof MODES)[number]["value"];

interface HomeProps {
  onPlay: (mode: GameMode, tier: Tier, size?: Size, variant?: Variant) => void;
  onDaily: () => void;
  onResume: (session: SavedGame) => void;
  onNavigate: (route: string) => void;
  installed: boolean;
  onInstall: () => void;
}

function progressOf(save: SavedGame): number {
  const filled = save.cells.filter((cell) => cell.value > 0).length;
  return filled / save.cells.length;
}

function suggestedTier(results: ReturnType<typeof useData>["results"]): Tier {
  const wins = results.filter((result) => result.won);
  if (!wins.length) return "easy";
  const order: Tier[] = ["cozy", "easy", "medium", "hard", "expert", "master"];
  const best = wins.reduce<Tier>((highest, result) => {
    return order.indexOf(result.tier) > order.indexOf(highest) ? result.tier : highest;
  }, "cozy");
  return order[Math.min(order.length - 1, order.indexOf(best) + 1)];
}

export function Home({ onPlay, onDaily, onResume, onNavigate, installed, onInstall }: HomeProps) {
  const { t, locale } = useI18n();
  const { update } = useSettings();
  const data = useData();
  const [mode, setMode] = useState<HomeMode>("classic");
  const [tier, setTier] = useState<Tier>(() => suggestedTier(data.results));
  const [variant, setVariant] = useState<Variant>("classic");
  const [size, setSize] = useState<Size>(9);
  const [setupOpen, setSetupOpen] = useState(false);

  const saves = useMemo(() => readSaves(), []);
  const latest = useMemo(() => {
    const list = Object.values(saves)
      .filter((save): save is SavedGame => Boolean(save))
      .filter((save) => save.status === "playing" || save.status === "paused")
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return list[0] ?? null;
  }, [saves]);

  const today = dateKey();
  const dailySave = saves[dailySaveKey(today)] ?? null;
  const dailyDone = Boolean(data.daily[today]);

  const startLabel =
    mode === "daily"
      ? dailySave && dailySave.status !== "won" && dailySave.status !== "lost"
        ? t("daily.continueToday")
        : t("daily.playToday")
      : t("home.start");

  /** One line that names exactly what the Play button will start. */
  const setupSummary = [
    t(`mode.${mode}`),
    mode !== "daily" && variant !== "classic" ? t(`variant.${variant}`) : "",
    mode !== "daily" && size !== 9 ? `${size}×${size}` : "",
    mode !== "daily" ? t(`tier.${tier}`) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const handlePrimary = () => {
    setSetupOpen(false);
    if (mode === "daily") {
      if (dailySave && dailySave.status !== "won" && dailySave.status !== "lost") onResume(dailySave);
      else onDaily();
      return;
    }
    onPlay(mode, tier, size, variant);
  };

  return (
    <div className="home-screen">
      <BubbleBackdrop />
      <header className="screen-header home-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-grid">
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} className={index === 2 ? "is-lit" : ""} />
              ))}
            </span>
          </span>
          <div className="brand-copy">
            <h1>{CREDITS.appName}</h1>
          </div>
        </div>
        <div className="home-header-actions">
          <button
            type="button"
            className="lang-chip"
            onClick={() => update({ locale: locale === "en" ? "id" : "en" })}
            aria-label={t("settings.language")}
          >
            <Icon name="globe" size={17} />
            {locale === "en" ? "EN" : "ID"}
          </button>
          {!installed ? (
            <button
              type="button"
              className="lang-chip icon-only"
              onClick={onInstall}
              aria-label={t("settings.installApp")}
              title={t("settings.installApp")}
            >
              <Icon name="download" size={18} />
            </button>
          ) : null}
          <button
            type="button"
            className="lang-chip icon-only"
            onClick={() => onNavigate("/settings")}
            aria-label={t("common.settings")}
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      </header>

      <main className="home-main">
        <section className="home-hero" aria-label={t("home.newGame")}>
          <button type="button" className="play-card" onClick={() => setSetupOpen(true)}>
            <span className="play-card-icon">
              <Icon name="play" size={26} />
            </span>
            <span className="play-card-copy">
              <strong>{t("home.play")}</strong>
              <span>{setupSummary}</span>
            </span>
            <span className="play-card-arrow">
              <Icon name="chevron-right" size={22} />
            </span>
          </button>

          {latest ? (
            <button type="button" className="continue-card" onClick={() => onResume(latest)}>
              <ProgressRing value={progressOf(latest)} size={52} stroke={5}>
                <span className="continue-progress">{Math.round(progressOf(latest) * 100)}%</span>
              </ProgressRing>
              <span className="continue-copy">
                <span className="continue-eyebrow">{t("home.continueTitle")}</span>
                <span className="continue-title">
                  {t("home.continueSubtitle", {
                    mode: t(`mode.${latest.mode}`),
                    tier: t(`tier.${latest.puzzle.tier}`),
                  })}
                </span>
                <span className="continue-meta">
                  {t("home.progress", {
                    filled: latest.cells.filter((cell) => cell.value > 0).length,
                    total: latest.cells.length,
                  })}
                </span>
              </span>
              <span className="continue-arrow">
                <Icon name="chevron-right" size={20} />
              </span>
            </button>
          ) : null}
        </section>

        <section className="home-links" aria-label={t("nav.home")}>
          <button type="button" className="quick-card quick-daily" onClick={() => (dailyDone ? onNavigate("/daily") : onDaily())}>
            <span className="quick-icon">
              <Icon name="calendar" size={22} />
            </span>
            <span className="quick-copy">
              <strong>{t("home.dailyCard")}</strong>
            </span>
            <Icon name="chevron-right" size={18} className="quick-chevron" />
          </button>

          <button type="button" className="quick-card quick-packs" onClick={() => onNavigate("/packs")}>
            <span className="quick-icon">
              <Icon name="grid" size={22} />
            </span>
            <span className="quick-copy">
              <strong>{t("home.packsCard")}</strong>
            </span>
            <Icon name="chevron-right" size={18} className="quick-chevron" />
          </button>

          <button type="button" className="quick-card" onClick={() => onPlay("classic", "easy", 6, "classic")}>
            <span className="quick-icon">
              <Icon name="grid" size={20} />
            </span>
            <span className="quick-copy">
              <strong>{t("home.miniTitle")}</strong>
            </span>
            <Icon name="chevron-right" size={18} className="quick-chevron" />
          </button>

          <button type="button" className="quick-card" onClick={() => onNavigate("/import")}>
            <span className="quick-icon">
              <Icon name="import" size={20} />
            </span>
            <span className="quick-copy">
              <strong>{t("import.title")}</strong>
            </span>
            <Icon name="chevron-right" size={18} className="quick-chevron" />
          </button>
        </section>
      </main>

      <footer className="home-footer">
        <span>{t("common.madeBy", { name: CREDITS.author })}</span>
        <a href={CREDITS.authorUrl} target="_blank" rel="noreferrer noopener">
          {CREDITS.authorUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      </footer>

      <Sheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        title={t("home.newGame")}
        subtitle={setupSummary}
        size="md"
        footer={
          <Button variant="primary" size="lg" full icon="play" onClick={handlePrimary} className="home-start">
            {startLabel}
          </Button>
        }
      >
        <div className="mode-section">
          <Segmented
            options={MODES.map((item) => ({
              value: item.value,
              label: (
                <span className="mode-option">
                  <Icon name={item.icon} size={16} />
                  {t(`mode.${item.value}`)}
                </span>
              ),
            }))}
            value={mode}
            onChange={(value) => setMode(value)}
            label={t("home.newGame")}
            className="mode-segmented"
          />
          {mode !== "daily" ? (
            <>
              <div className="play-setup">
                <Segmented
                  options={VARIANTS.map((option) => ({
                    value: option,
                    label: t(`variant.${option}`),
                  }))}
                  value={variant}
                  onChange={(value) => {
                    setVariant(value);
                    if (value === "windoku") setSize(9);
                  }}
                  label={t("home.chooseVariant")}
                  compact
                  className="setup-segmented setup-variant"
                />
                <Segmented
                  options={SIZES.map((option) => ({
                    value: `${option}`,
                    label: `${option}×${option}`,
                    ariaLabel: t("home.boardSize", { size: `${option}×${option}` }),
                    disabled: variant === "windoku" && option !== 9,
                  }))}
                  value={`${size}`}
                  onChange={(value) => setSize(Number(value) as Size)}
                  label={t("home.chooseSize")}
                  compact
                  className="setup-segmented setup-size"
                />
              </div>

              <div className="tier-picker" role="radiogroup" aria-label={t("home.chooseDifficulty")}>
                {TIERS.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={tier === option}
                    className={`tier-card ${tier === option ? "is-active" : ""}`}
                    onClick={() => setTier(option)}
                  >
                    <span className="tier-dots" aria-hidden="true">
                      {Array.from({ length: 6 }, (_, dot) => (
                        <span key={dot} className={dot <= index ? "is-on" : ""} />
                      ))}
                    </span>
                    <span className="tier-name">{t(`tier.${option}`)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="daily-strip">
              <div className="daily-strip-item">
                <Icon name="flame" size={20} />
                <span>
                  <strong>{data.currentStreak}</strong>
                  <small>{t("daily.streak")}</small>
                </span>
              </div>
              <div className="daily-strip-item">
                <Icon name="calendar" size={20} />
                <span>
                  <strong>{data.bestStreak}</strong>
                  <small>{t("daily.bestStreak")}</small>
                </span>
              </div>
              <div className="daily-strip-item">
                <StarIcon size={20} filled={dailyDone} />
                <span>
                  <strong>{dailyDone ? t("daily.solved") : t("common.today")}</strong>
                  <small>{new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(Date.now())}</small>
                </span>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
