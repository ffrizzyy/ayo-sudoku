import { useI18n } from "../i18n";
import { CREDITS } from "../config/credits";
import { Icon } from "../ui/Icon";
import { Button, Pill } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";

export function About({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { t } = useI18n();

  return (
    <div className="about-screen">
      <BubbleBackdrop />
      <header className="about-hero">
        <span className="about-mark" aria-hidden="true">
          <span className="brand-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} className={index === 2 ? "is-lit" : ""} />
            ))}
          </span>
        </span>
        <h1>{CREDITS.appName}</h1>
        <p>{t("about.tagline")}</p>
        <Pill tone="accent">{t("about.version", { version: CREDITS.version })}</Pill>
      </header>

      <main className="about-main">
        <section className="about-card author-card">
          <span className="author-avatar" aria-hidden="true">
            {CREDITS.author.slice(0, 1).toUpperCase()}
          </span>
          <div className="author-copy">
            <p className="screen-eyebrow">{t("about.createdBy", { name: CREDITS.author })}</p>
            <h2>{CREDITS.author}</h2>
            <p>{t("about.authorNote")}</p>
            <a href={CREDITS.authorUrl} target="_blank" rel="noreferrer noopener" className="author-link">
              {CREDITS.authorUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <Icon name="arrow-right" size={15} />
            </a>
          </div>
        </section>

        <section className="about-card">
          <h2>
            <Icon name="bulb" size={19} /> {t("about.inspirations")}
          </h2>
          <ul className="inspiration-list">
            {CREDITS.inspirations.map((item) => (
              <li key={item.name}>
                <a href={item.url} target="_blank" rel="noreferrer noopener">
                  <strong>{item.name}</strong>
                  <Icon name="arrow-right" size={15} />
                </a>
                <p>{item.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="about-card">
          <h2>
            <Icon name="lock" size={19} /> {t("about.privacyTitle")}
          </h2>
          <p>{t("about.privacyBody")}</p>
        </section>

        <section className="about-card">
          <h2>
            <Icon name="info" size={19} /> {t("about.disclaimers")}
          </h2>
          <p>{t("about.disclaimerBody")}</p>
          <p className="about-muted">{t("about.trademark")}</p>
        </section>

        <section className="about-card">
          <h2>
            <Icon name="book" size={19} /> {t("about.licenses")}
          </h2>
          <p>{t("about.licensesBody")}</p>
          <p>{t("about.license", { license: CREDITS.license })}</p>
          <p className="about-muted">{t("about.fontsBody")}</p>
          <div className="license-chips">
            <Pill tone="neutral">React · MIT</Pill>
            <Pill tone="neutral">Vite · MIT</Pill>
            <Pill tone="neutral">TypeScript · Apache-2.0</Pill>
            <Pill tone="neutral">Nunito · OFL-1.1</Pill>
          </div>
        </section>

        <section className="about-credit-block">
          <p>{t("common.creditLine", { name: CREDITS.author })}</p>
          <a href={CREDITS.authorUrl} target="_blank" rel="noreferrer noopener">
            {CREDITS.authorUrl}
          </a>
          <small>{t("about.madeWith")}</small>
        </section>

        <div className="about-actions">
          <Button variant="tinted" icon="home" onClick={() => onNavigate("/")}>
            {t("about.backHome")}
          </Button>
          <Button variant="plain" icon="settings" onClick={() => onNavigate("/settings")}>
            {t("common.settings")}
          </Button>
        </div>
      </main>
    </div>
  );
}
