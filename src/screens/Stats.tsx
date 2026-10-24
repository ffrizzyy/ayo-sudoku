import { useMemo } from "react";
import { useData } from "../app/data";
import { useI18n, formatDuration, formatDate } from "../i18n";
import { Icon, StarIcon } from "../ui/Icon";
import { Pill, ProgressRing, StarRow } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";
import type { Tier } from "../engine/types";

const TIERS: Tier[] = ["cozy", "easy", "medium", "hard", "expert", "master"];

const ACHIEVEMENTS = [
  "firstWin",
  "tenWins",
  "hundredWins",
  "noHints",
  "noMistakes",
  "hardWin",
  "masterWin",
  "streak7",
  "streak30",
  "packComplete",
  "cozyFast",
  "allModes",
  "learnComplete",
  "shared",
  "threeLanguages",
  "challengePerfect",
] as const;

export function Stats() {
  const { t, locale } = useI18n();
  const data = useData();

  const won = useMemo(() => data.results.filter((result) => result.won), [data.results]);
  const bestTime = won.length ? Math.min(...won.map((result) => result.timeMs)) : 0;
  const averageTime = won.length
    ? won.reduce((sum, result) => sum + result.timeMs, 0) / won.length
    : 0;
  const hints = data.results.reduce((sum, result) => sum + result.hints, 0);
  const winRate = data.results.length ? Math.round((won.length / data.results.length) * 100) : 0;
  const lastSeven = data.results.slice(0, 7).reverse();
  const maxTime = Math.max(1, ...lastSeven.map((result) => result.timeMs));

  const perTier = TIERS.map((tier) => {
    const games = data.results.filter((result) => result.tier === tier);
    const tierWins = games.filter((result) => result.won);
    return {
      tier,
      games: games.length,
      wins: tierWins.length,
      best: tierWins.length ? Math.min(...tierWins.map((result) => result.timeMs)) : 0,
    };
  });

  return (
    <div className="stats-screen">
      <BubbleBackdrop />
      <header className="screen-header">
        <div>
          <p className="screen-eyebrow">{t("nav.stats")}</p>
          <h1>{t("stats.title")}</h1>
          <p>{t("stats.subtitle")}</p>
        </div>
        <div className="stats-overview">
          <span>
            <StarIcon size={18} /> {data.totalStars}
          </span>
          <span>
            <Icon name="flame" size={18} /> {data.currentStreak}
          </span>
        </div>
      </header>

      <main className="stats-main">
        <section className="stat-tiles">
          <StatTile icon="grid" label={t("stats.games")} value={data.games} />
          <StatTile icon="trophy" label={t("stats.wins")} value={data.wins} />
          <StatTile icon="chart" label={t("stats.winRate")} value={`${winRate}%`} />
          <StatTile
            icon="clock"
            label={t("stats.bestTime")}
            value={bestTime ? formatDuration(bestTime) : "—"}
          />
          <StatTile
            icon="clock"
            label={t("stats.averageTime")}
            value={averageTime ? formatDuration(averageTime) : "—"}
          />
          <StatTile icon="bulb" label={t("stats.hintsUsed")} value={hints} />
        </section>

        <section className="stats-chart-card">
          <div className="card-head">
            <h2>{t("stats.chart")}</h2>
            <Pill tone="neutral">{t("stats.filtered")}</Pill>
          </div>
          {lastSeven.length ? (
            <div className="game-chart" role="img" aria-label={t("stats.chart")}>
              {lastSeven.map((result) => (
                <div key={result.id + result.finishedAt} className="chart-column">
                  <div className="chart-bar-track">
                    <div
                      className={`chart-bar ${result.won ? "is-won" : "is-lost"}`}
                      style={{ height: `${Math.max(8, (result.timeMs / maxTime) * 100)}%` }}
                      title={`${result.won ? t("stats.won") : t("stats.lost")} · ${formatDuration(result.timeMs)}`}
                    >
                      <span>{formatDuration(result.timeMs, "short")}</span>
                    </div>
                  </div>
                  <small>
                    {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
                      result.finishedAt,
                    )}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-note">{t("stats.noData")}</p>
          )}
        </section>

        <section className="stats-tier-card">
          <div className="card-head">
            <h2>{t("stats.perTier")}</h2>
          </div>
          <div className="tier-stats">
            {perTier.map((row) => (
              <div key={row.tier} className="tier-stat-row">
                <span className="tier-stat-name">{t(`tier.${row.tier}`)}</span>
                <span className="tier-stat-track">
                  <span style={{ width: `${row.games ? (row.wins / row.games) * 100 : 0}%` }} />
                </span>
                <span className="tier-stat-value">
                  {row.games
                    ? t("stats.tierSummary", {
                        games: row.games,
                        time: row.best ? formatDuration(row.best) : "—",
                      })
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="achievement-card">
          <div className="card-head">
            <h2>{t("stats.achievements")}</h2>
            <span className="achievement-count">
              {t("stats.achievementCount", {
                count: Object.keys(data.achievements).length,
                total: ACHIEVEMENTS.length,
              })}
            </span>
          </div>
          <div className="achievement-grid">
            {ACHIEVEMENTS.map((id) => {
              const unlockedAt = data.achievements[id];
              return (
                <div key={id} className={`achievement ${unlockedAt ? "is-unlocked" : ""}`}>
                  <span className="achievement-icon">
                    {unlockedAt ? <Icon name="trophy" size={20} /> : <Icon name="lock" size={18} />}
                  </span>
                  <span className="achievement-copy">
                    <strong>{t(`achievements.${id}.name`)}</strong>
                    <small>{t(`achievements.${id}.description`)}</small>
                    {unlockedAt ? (
                      <span className="achievement-date">{formatDate(unlockedAt, locale)}</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="recent-card">
          <div className="card-head">
            <h2>{t("stats.recent")}</h2>
          </div>
          {data.results.length ? (
            <ul className="recent-list">
              {data.results.slice(0, 8).map((result) => (
                <li key={result.id + result.finishedAt} className={result.won ? "is-won" : "is-lost"}>
                  <span className="recent-icon">
                    {result.won ? <StarIcon size={18} /> : <Icon name="alert" size={18} />}
                  </span>
                  <span className="recent-copy">
                    <strong>
                      {t(`mode.${result.mode}`)} · {t(`tier.${result.tier}`)}
                    </strong>
                    <small>{formatDate(result.finishedAt, locale)}</small>
                  </span>
                  <span className="recent-time tabular">{formatDuration(result.timeMs)}</span>
                  <span className="recent-stars">
                    <StarRow count={result.stars} size={13} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">{t("stats.noGames")}</p>
          )}
        </section>

        <section className="streak-card">
          <ProgressRing value={Math.min(1, data.bestStreak / 30)} size={64} stroke={6}>
            <Icon name="flame" size={22} />
          </ProgressRing>
          <div>
            <span>{t("stats.bestStreak")}</span>
            <strong>{data.bestStreak}</strong>
          </div>
          <div>
            <span>{t("stats.currentStreak")}</span>
            <strong>{data.currentStreak}</strong>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: "grid" | "trophy" | "chart" | "clock" | "bulb";
  label: string;
  value: string | number;
}) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-icon">
        <Icon name={icon} size={18} />
      </span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
