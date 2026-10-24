import { useEffect, useMemo, useState } from "react";
import { useData, dateKey } from "../app/data";
import { dailyTier } from "../app/daily";
import { readSaves, type SavedGame } from "../app/storage";
import { useI18n, formatCountdown } from "../i18n";
import { Icon, StarIcon } from "../ui/Icon";
import { Button, Pill } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";

interface DailyProps {
  onPlay: () => void;
  onResume: (save: SavedGame) => void;
  onNavigate: (route: string) => void;
}

function monthMatrix(locale: string, solved: Record<string, { stars: number }>, today: string) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: Array<{ key: string; day: number; solved: boolean; today: boolean; future: boolean } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= days; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      key,
      day,
      solved: Boolean(solved[key]),
      today: key === today,
      future: key > today,
    });
  }
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 1 + index)),
    ),
  );
  return { year, month, cells, weekdays };
}

export function Daily({ onPlay, onResume, onNavigate }: DailyProps) {
  const { t, locale } = useI18n();
  const data = useData();
  const [now, setNow] = useState(Date.now());
  const today = dateKey();
  const saves = useMemo(() => readSaves(), []);
  const todaySave = saves.daily && saves.daily.dailyDate === today ? saves.daily : null;
  const canResume = todaySave && todaySave.status !== "won" && todaySave.status !== "lost";
  const solved = Boolean(data.daily[today]);
  const record = data.daily[today];

  const calendar = useMemo(() => monthMatrix(locale, data.daily, today), [locale, data.daily, today]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const monthSolved = calendar.cells.filter((cell) => cell?.solved).length;
  const remaining = 86400000 - (now % 86400000);

  return (
    <div className="daily-screen">
      <BubbleBackdrop />
      <header className="screen-header">
        <div>
          <p className="screen-eyebrow">{t("nav.daily")}</p>
          <h1>{t("daily.title")}</h1>
          <p>{t("daily.subtitle")}</p>
        </div>
        <button type="button" className="header-link" onClick={() => onNavigate("/stats")}>
          <Icon name="chart" size={18} />
          {t("daily.viewStats")}
        </button>
      </header>

      <main className="daily-main">
        <section className="daily-hero">
          <div className="daily-hero-top">
            <Pill tone="accent">
              {new Intl.DateTimeFormat(locale, {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              }).format(Date.now())}
            </Pill>
            <Pill tone="neutral">{t(`tier.${dailyTier()}`)}</Pill>
            {solved ? <Pill tone="green">{t("daily.solvedToday")}</Pill> : null}
          </div>
          <h2>
            {new Intl.DateTimeFormat(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }).format(Date.now())}
          </h2>
          <p>{solved ? t("daily.comeBack") : t("mode.dailyDesc")}</p>
          {record ? (
            <div className="daily-result-row">
              <span>
                <StarRowInline count={record.stars} />
              </span>
              <span>{new Intl.NumberFormat(locale).format(Math.round(record.timeMs / 1000))}s</span>
            </div>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            full
            icon={canResume ? "play" : solved ? "check" : "calendar"}
            onClick={() => {
              if (canResume && todaySave) onResume(todaySave);
              else onPlay();
            }}
          >
            {canResume
              ? t("daily.continueToday")
              : solved
                ? t("daily.solvedToday")
                : t("daily.playToday")}
          </Button>
          <p className="daily-reset">
            <Icon name="clock" size={14} /> {t("daily.resets", { time: formatCountdown(remaining) })}
          </p>
        </section>

        <section className="daily-streak-card">
          <div className="streak-flame">
            <Icon name="flame" size={30} />
            <strong>{data.currentStreak}</strong>
          </div>
          <div className="streak-copy">
            <span>{t("daily.streak")}</span>
            <small>{t("daily.days", { count: data.currentStreak })}</small>
          </div>
          <div className="streak-best">
            <span>{t("daily.bestStreak")}</span>
            <strong>{data.bestStreak}</strong>
          </div>
        </section>

        <section className="daily-calendar">
          <div className="calendar-head">
            <h2>{t("daily.calendar")}</h2>
            <span>
              {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
                Date.UTC(calendar.year, calendar.month, 1),
              )}
            </span>
          </div>
          <div className="calendar-grid" role="grid" aria-label={t("daily.calendar")}>
            {calendar.weekdays.map((day) => (
              <span key={day} className="calendar-weekday" role="columnheader">
                {day}
              </span>
            ))}
            {calendar.cells.map((cell, index) =>
              cell ? (
                <span
                  key={cell.key}
                  role="gridcell"
                  className={`calendar-day ${cell.solved ? "is-solved" : ""} ${cell.today ? "is-today" : ""} ${
                    cell.future ? "is-future" : ""
                  }`}
                  aria-label={`${cell.key}${cell.solved ? `, ${t("daily.solved")}` : ""}`}
                >
                  {cell.solved ? <StarIcon size={12} filled /> : cell.day}
                </span>
              ) : (
                <span key={`blank-${index}`} className="calendar-day is-blank" aria-hidden="true" />
              ),
            )}
          </div>
          <p className="calendar-note">
            {monthSolved ? t("daily.monthSolved", { count: monthSolved }) : t("daily.noRecord")}
          </p>
        </section>

        <button type="button" className="daily-learn-link" onClick={() => onNavigate("/learn")}>
          <Icon name="book" size={19} />
          <span>
            <strong>{t("learn.title")}</strong>
            <small>{t("learn.subtitle")}</small>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
      </main>
    </div>
  );
}

function StarRowInline({ count }: { count: number }) {
  return (
    <span className="star-inline" aria-label={`${count} / 3`}>
      {Array.from({ length: 3 }, (_, index) => (
        <StarIcon key={index} size={14} filled={index < count} />
      ))}
    </span>
  );
}
