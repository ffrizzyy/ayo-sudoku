import { useEffect, useMemo, useState } from "react";
import { useData, dateKey } from "../app/data";
import { DAILY_EPOCH, dailyTier } from "../app/daily";
import { dailySaveKey, readSaves, type SavedGame } from "../app/storage";
import { useI18n, formatCountdown } from "../i18n";
import { Icon, StarIcon } from "../ui/Icon";
import { Button, Pill } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";

interface DailyProps {
  onPlay: (date?: string) => void;
  onResume: (save: SavedGame) => void;
  onNavigate: (route: string) => void;
}

interface DayCell {
  key: string;
  day: number;
  stars: number;
  solved: boolean;
  inProgress: boolean;
  available: boolean;
  today: boolean;
  future: boolean;
}

function monthMatrix(
  solved: Record<string, { stars: number }>,
  saves: Record<string, SavedGame>,
  today: string,
  year: number,
  month: number,
): Array<DayCell | null> {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: Array<DayCell | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= days; day++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const save = saves[dailySaveKey(key)];
    const future = key > today;
    cells.push({
      key,
      day,
      stars: solved[key]?.stars ?? 0,
      solved: Boolean(solved[key]),
      inProgress: Boolean(save && (save.status === "playing" || save.status === "paused")),
      available: !future && key >= DAILY_EPOCH,
      today: key === today,
      future,
    });
  }
  return cells;
}

function offsetFor(now: Date, year: number, month: number): number {
  return (year - now.getUTCFullYear()) * 12 + (month - now.getUTCMonth());
}

export function Daily({ onPlay, onResume, onNavigate }: DailyProps) {
  const { t, locale } = useI18n();
  const data = useData();
  const [now, setNow] = useState(Date.now());
  const [monthOffset, setMonthOffset] = useState(0);
  const today = dateKey(now);
  const saves = useMemo(() => readSaves(), []);
  const todaySave = saves[dailySaveKey(today)] ?? null;
  const canResume = Boolean(todaySave && todaySave.status !== "won" && todaySave.status !== "lost");
  const solved = Boolean(data.daily[today]);
  const record = data.daily[today];

  const nowDate = new Date(now);
  const viewDate = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth() + monthOffset, 1));
  const viewYear = viewDate.getUTCFullYear();
  const viewMonth = viewDate.getUTCMonth();
  const minOffset = offsetFor(nowDate, ...epochMonth());
  const canPrev = monthOffset > minOffset;
  const canNext = monthOffset < 0;

  const calendar = useMemo(
    () => monthMatrix(data.daily, saves, today, viewYear, viewMonth),
    [data.daily, saves, today, viewYear, viewMonth],
  );
  const monthSolved = calendar.filter((cell) => cell?.solved).length;
  const monthInProgress = calendar.filter((cell) => cell?.inProgress).length;

  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(
          new Date(Date.UTC(2024, 0, 1 + index)),
        ),
      ),
    [locale],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = 86400000 - (now % 86400000);

  const playDay = (cell: DayCell) => {
    if (!cell.available) return;
    const save = saves[dailySaveKey(cell.key)];
    if (save && (save.status === "playing" || save.status === "paused")) {
      onResume(save);
      return;
    }
    onPlay(cell.key);
  };

  const dayLabel = (cell: DayCell): string => {
    const date = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(Date.parse(`${cell.key}T00:00:00Z`));
    if (cell.solved) return t("daily.daySolved", { date });
    if (cell.inProgress) return t("daily.dayInProgress", { date });
    if (!cell.available) {
      return cell.future ? t("daily.dayFuture", { date }) : t("daily.dayUnavailable", { date });
    }
    if (cell.today) return t("daily.dayToday", { date });
    return t("daily.dayPlay", { date });
  };

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
              }).format(now)}
            </Pill>
            <Pill tone="neutral">{t(`tier.${dailyTier(now)}`)}</Pill>
            {solved ? <Pill tone="green">{t("daily.solvedToday")}</Pill> : null}
          </div>
          <h2>
            {new Intl.DateTimeFormat(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            }).format(now)}
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
            icon={canResume ? "play" : solved ? "undo" : "calendar"}
            onClick={() => {
              if (canResume && todaySave) onResume(todaySave);
              else onPlay();
            }}
          >
            {canResume
              ? t("daily.continueToday")
              : solved
                ? t("daily.replayToday")
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
            <div className="calendar-nav">
              <button
                type="button"
                className="calendar-nav-button"
                aria-label={t("daily.prevMonth")}
                disabled={!canPrev}
                onClick={() => setMonthOffset((value) => Math.max(minOffset, value - 1))}
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <span>
                {new Intl.DateTimeFormat(locale, {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(Date.UTC(viewYear, viewMonth, 1))}
              </span>
              <button
                type="button"
                className="calendar-nav-button"
                aria-label={t("daily.nextMonth")}
                disabled={!canNext}
                onClick={() => setMonthOffset((value) => Math.min(0, value + 1))}
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>
          </div>
          <div className="calendar-grid" role="grid" aria-label={t("daily.calendar")}>
            {weekdays.map((day) => (
              <span key={day} className="calendar-weekday" role="columnheader">
                {day}
              </span>
            ))}
            {calendar.map((cell, index) =>
              cell ? (
                <span key={cell.key} role="gridcell" className="calendar-slot">
                  <button
                    type="button"
                    className={`calendar-day ${cell.solved ? "is-solved" : ""} ${
                      cell.inProgress ? "is-in-progress" : ""
                    } ${cell.today ? "is-today" : ""} ${cell.future ? "is-future" : ""} ${
                      !cell.available && !cell.future ? "is-unavailable" : ""
                    }`}
                    aria-label={dayLabel(cell)}
                    aria-current={cell.today ? "date" : undefined}
                    disabled={!cell.available}
                    onClick={() => playDay(cell)}
                  >
                    {cell.solved ? <StarIcon size={12} filled /> : cell.day}
                    {cell.inProgress ? <span className="calendar-dot" aria-hidden="true" /> : null}
                  </button>
                </span>
              ) : (
                <span key={`blank-${index}`} className="calendar-day is-blank" aria-hidden="true" />
              ),
            )}
          </div>
          <p className="calendar-note">
            {monthSolved ? t("daily.monthSolved", { count: monthSolved }) : t("daily.noRecord")}
          </p>
          {monthInProgress ? (
            <p className="calendar-legend">
              <span className="calendar-dot" aria-hidden="true" /> {t("daily.inProgress")}
            </p>
          ) : null}
          <p className="calendar-archive-note">{t("daily.archiveNote")}</p>
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

function epochMonth(): [number, number] {
  const date = new Date(`${DAILY_EPOCH}T00:00:00Z`);
  return [date.getUTCFullYear(), date.getUTCMonth()];
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
