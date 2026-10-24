import { useState } from "react";
import { useSettings, type Settings } from "../app/settings";
import { useI18n } from "../i18n";
import { Board } from "../ui/Board";
import { NumberPad } from "../ui/NumberPad";
import { Button, Pill } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { CREDITS } from "../config/credits";
import type { CellSnapshot } from "../app/storage";
import { makeSpec } from "../engine/types";

const TOTAL_STEPS = 6;

const TUTORIAL_GRID = ["0", "1", "2", "3", "3", "2", "1", "4", "1", "4", "3", "2", "2", "3", "4", "1"];

function tutorialCells(placed: boolean): CellSnapshot[] {
  return TUTORIAL_GRID.map((character, index) => {
    const value = index === 0 && placed ? 4 : Number(character);
    return { value, given: index !== 0 && value > 0, corner: 0, center: 0, color: 0 };
  });
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, locale } = useI18n();
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [soundChoice, setSoundChoice] = useState<"on" | "off" | null>(null);

  const finish = (patch: Partial<Settings> = {}) => {
    update({ ...patch, onboardingDone: true });
    onDone();
  };

  const next = () => {
    if (step >= TOTAL_STEPS - 1) {
      finish();
      return;
    }
    setStep((current) => current + 1);
  };

  const back = () => {
    if (step === 0) return;
    setStep((current) => current - 1);
  };

  const cells = tutorialCells(placed);
  const counts = [0, 0, 0, 0, 0];
  for (const cell of cells) if (cell.value) counts[cell.value]++;

  const chooseSound = (on: boolean) => {
    setSoundChoice(on ? "on" : "off");
    update({ sound: { ...settings.sound, on } });
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-bubbles" aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <header className="onboarding-top">
        <div className="onboarding-progress" aria-label={t("onboarding.step", { current: step + 1, total: TOTAL_STEPS })}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <span key={index} className={index <= step ? "is-on" : ""} />
          ))}
        </div>
        <button
          type="button"
          className="text-button onboarding-skip"
          onClick={() => finish()}
        >
          {t("onboarding.skip")}
        </button>
      </header>

      <main className="onboarding-main" key={step}>
        {step === 0 ? (
          <section className="onboarding-step welcome-step">
            <span className="welcome-mark" aria-hidden="true">
              <span className="brand-grid">
                {Array.from({ length: 4 }, (_, index) => (
                  <span key={index} className={index === 2 ? "is-lit" : ""} />
                ))}
              </span>
            </span>
            <p className="screen-eyebrow">{t("common.appTagline")}</p>
            <h1>{t("onboarding.welcomeTitle")}</h1>
            <p className="onboarding-lead">{t("onboarding.welcomeBody")}</p>
            <div className="welcome-chips">
              <Pill tone="accent">{t("home.tagline")}</Pill>
            </div>
            <p className="welcome-credit">{t("common.madeBy", { name: CREDITS.author })}</p>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="onboarding-step">
            <p className="screen-eyebrow">{t("settings.language")}</p>
            <h1>{t("onboarding.languageTitle")}</h1>
            <p className="onboarding-lead">{t("onboarding.languageSubtitle")}</p>
            <div className="language-cards" role="radiogroup" aria-label={t("settings.language")}>
              <button
                type="button"
                role="radio"
                aria-checked={locale === "en"}
                className={`language-card ${locale === "en" ? "is-active" : ""}`}
                onClick={() => update({ locale: "en" })}
              >
                <span className="language-code">EN</span>
                <span className="language-name">{t("settings.english")}</span>
                <span className="language-sample">Ayo, mulai!</span>
                {locale === "en" ? <Icon name="check-circle" size={20} /> : null}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={locale === "id"}
                className={`language-card ${locale === "id" ? "is-active" : ""}`}
                onClick={() => update({ locale: "id" })}
              >
                <span className="language-code">ID</span>
                <span className="language-name">{t("settings.indonesian")}</span>
                <span className="language-sample">Ayo, mulai!</span>
                {locale === "id" ? <Icon name="check-circle" size={20} /> : null}
              </button>
            </div>
            <p className="onboarding-footnote">{t("settings.languageNote")}</p>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="onboarding-step tutorial-step">
            <p className="screen-eyebrow">{t("onboarding.tryIt")}</p>
            <h1>{t("onboarding.tutorialTitle")}</h1>
            <p className="onboarding-lead">
              {placed
                ? t("onboarding.tutorialGood")
                : wrong
                  ? t("onboarding.tutorialPlaceHint")
                  : t("onboarding.tutorialBody")}
            </p>
            <div className={`tutorial-board ${wrong ? "is-wrong" : ""} ${placed ? "is-done" : ""}`}>
              <Board
                spec={makeSpec(4)}
                cells={cells}
                selected={placed ? new Set() : new Set([0])}
                wrong={new Set()}
                highlightDigit={placed ? 4 : undefined}
                highlightSame
                highlightPeers
                highlightCandidates
                completedCells={placed ? new Set([0]) : new Set()}
                onSelect={() => undefined}
              />
            </div>
            <p className="tutorial-hint">
              <Icon name="bulb" size={15} />
              {placed ? t("onboarding.tutorialGood") : t("onboarding.tutorialPlaceHint")}
            </p>
            <div className="tutorial-pad">
              <NumberPad
                size={4}
                counts={counts}
                digitStyle="numerals"
                disabled={placed}
                onDigit={(digit) => {
                  if (digit === 4) {
                    setPlaced(true);
                    setWrong(false);
                  } else {
                    setWrong(true);
                    window.setTimeout(() => setWrong(false), 550);
                  }
                }}
              />
            </div>
            <p className="tutorial-caption">{t("onboarding.tutorialPlace")}</p>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="onboarding-step">
            <p className="screen-eyebrow">{t("game.draftMarks")}</p>
            <h1>{t("onboarding.marksTitle")}</h1>
            <p className="onboarding-lead">{t("onboarding.marksBody")}</p>
            <div className="marks-demo" aria-hidden="true">
              {[
                ["1", "3"],
                ["2", ""],
                ["", "4"],
                ["2", ""],
                ["1", "4"],
                ["3", ""],
                ["", "3"],
                ["1", "2"],
                ["4", ""],
              ].map((marks, index) => (
                <span key={index} className={index === 4 ? "is-focus" : ""}>
                  {marks.filter(Boolean).map((mark) => (
                    <small key={mark}>{mark}</small>
                  ))}
                </span>
              ))}
            </div>
            <div className="mode-chips">
              <Pill tone="accent">{t("game.valueEntry")}</Pill>
              <Pill tone="neutral">{t("game.draftMarks")}</Pill>
              <Pill tone="neutral">{t("game.colorPalette")}</Pill>
            </div>
            <p className="onboarding-footnote">{t("settings.autoCandidatesNote")}</p>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="onboarding-step">
            <p className="screen-eyebrow">{t("game.hint")}</p>
            <h1>{t("onboarding.toolsTitle")}</h1>
            <p className="onboarding-lead">{t("onboarding.toolsBody")}</p>
            <div className="tool-demo">
              <span className="tool-demo-item">
                <Icon name="undo" size={24} />
                <small>{t("game.undo")}</small>
              </span>
              <span className="tool-demo-item is-accent">
                <Icon name="bulb" size={24} />
                <small>{t("game.hint")}</small>
              </span>
              <span className="tool-demo-item">
                <Icon name="pause" size={24} />
                <small>{t("common.pause")}</small>
              </span>
              <span className="tool-demo-item">
                <Icon name="eraser" size={24} />
                <small>{t("game.erase")}</small>
              </span>
            </div>
            <div className="onboarding-callout">
              <Icon name="bulb" size={18} />
              <p>{t("game.hintNoMove")}</p>
            </div>
            <p className="onboarding-footnote">{t("game.keyboardHint")}</p>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="onboarding-step">
            <p className="screen-eyebrow">{t("settings.privacy")}</p>
            <h1>{t("onboarding.privacyTitle")}</h1>
            <p className="onboarding-lead">{t("onboarding.privacyBody")}</p>
            <div className="privacy-points">
              <span>
                <Icon name="lock" size={18} /> {t("settings.privacyNote")}
              </span>
              <span>
                <Icon name="download" size={18} /> {t("settings.exportNote")}
              </span>
              <span>
                <Icon name="wifi-off" size={18} /> {t("pwa.offline")}
              </span>
            </div>
            <div className="sound-choice">
              <p>{t("onboarding.soundPrompt")}</p>
              <div>
                <button
                  type="button"
                  className={`sound-option ${soundChoice === "on" ? "is-active" : ""}`}
                  onClick={() => chooseSound(true)}
                >
                  <Icon name="volume" size={20} />
                  <span>{t("onboarding.soundOn")}</span>
                </button>
                <button
                  type="button"
                  className={`sound-option ${soundChoice === "off" ? "is-active" : ""}`}
                  onClick={() => chooseSound(false)}
                >
                  <Icon name="volume-off" size={20} />
                  <span>{t("onboarding.soundOff")}</span>
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="onboarding-footer">
        <div className="onboarding-footer-row">
          {step > 0 ? (
            <Button variant="plain" icon="arrow-left" onClick={back}>
              {t("onboarding.back")}
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="primary"
            size="lg"
            icon={step === TOTAL_STEPS - 1 ? "sparkles" : "arrow-right"}
            onClick={next}
            disabled={step === 2 && !placed}
          >
            {step === TOTAL_STEPS - 1 ? t("onboarding.finish") : t("onboarding.next")}
          </Button>
        </div>
        <p className="onboarding-step-label">
          {t("onboarding.step", { current: step + 1, total: TOTAL_STEPS })}
        </p>
      </footer>
    </div>
  );
}
