import { useI18n, formatDuration } from "../i18n";
import { useData } from "../app/data";
import { PACKS, localize, isPackUnlocked, packStars, packPuzzleToPuzzle, type PackContent } from "../app/packs";
import type { PuzzleDef } from "../engine/types";
import { Icon, StarIcon } from "../ui/Icon";
import { Button, Pill, ProgressRing, StarRow } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";
import { CREDITS } from "../config/credits";
import { useToast } from "../app/toast";

interface PacksProps {
  onNavigate: (route: string) => void;
}

export function Packs({ onNavigate }: PacksProps) {
  const { t, locale } = useI18n();
  const data = useData();
  const { push } = useToast();

  return (
    <div className="packs-screen">
      <BubbleBackdrop />
      <header className="screen-header">
        <div>
          <p className="screen-eyebrow">{t("nav.packs")}</p>
          <h1>{t("packs.title")}</h1>
          <p>{t("packs.subtitle")}</p>
        </div>
        <div className="packs-stars">
          <StarIcon size={20} />
          <strong>{data.totalStars}</strong>
          <span>{t("common.stars")}</span>
        </div>
      </header>

      <main className="packs-list">
        {PACKS.map((pack, index) => {
          const unlocked = isPackUnlocked(pack, data.totalStars);
          const solved = pack.puzzles.filter((puzzle) => data.packs[puzzle.id]).length;
          const stars = packStars(pack, data.packs);
          const complete = solved === pack.puzzles.length;
          return (
            <button
              key={pack.id}
              type="button"
              className={`pack-card accent-${pack.accent} ${unlocked ? "" : "is-locked"}`}
              onClick={() => {
                if (unlocked) onNavigate(`/pack/${pack.id}`);
                else push(t("packs.unlockHint", { count: pack.unlockStars }));
              }}
              aria-describedby={`pack-${pack.id}-desc`}
            >
              <span className="pack-art" aria-hidden="true">
                <span className="pack-art-grid">
                  {Array.from({ length: 9 }, (_, cell) => (
                    <span key={cell} className={cell % 3 === 0 ? "is-lit" : ""} />
                  ))}
                </span>
                {complete ? (
                  <span className="pack-complete">
                    <Icon name="check" size={16} strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span className="pack-copy">
                <span className="pack-kicker">
                  {t("packs.packPuzzles")} {index + 1}
                </span>
                <strong className="pack-title">{localize(pack.title, locale)}</strong>
                <span className="pack-description" id={`pack-${pack.id}-desc`}>
                  {localize(pack.description, locale)}
                </span>
                <span className="pack-meta">
                  <span className="pack-stars-inline">
                    <StarIcon size={14} filled={stars > 0} /> {stars} / {pack.puzzles.length * 3}
                  </span>
                  <span className="pack-progress-text">
                    {t("packs.progress", { solved, total: pack.puzzles.length })}
                  </span>
                </span>
                <span className="pack-progress">
                  <span style={{ width: `${(solved / pack.puzzles.length) * 100}%` }} />
                </span>
              </span>
              <span className="pack-action">
                {unlocked ? (
                  <Icon name="chevron-right" size={20} />
                ) : (
                  <span className="pack-lock">
                    <Icon name="lock" size={16} />
                    {t("packs.unlockHint", { count: pack.unlockStars })}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </main>

      <footer className="packs-footer">
        <Icon name="heart" size={15} />
        {t("packs.by", { name: CREDITS.author })}
      </footer>
    </div>
  );
}

interface PackDetailProps {
  packId: string;
  onBack: () => void;
  onPlay: (puzzle: PuzzleDef) => void;
}

export function PackDetail({ packId, onBack, onPlay }: PackDetailProps) {
  const { t, locale } = useI18n();
  const data = useData();
  const pack: PackContent | undefined = PACKS.find((item) => item.id === packId);

  if (!pack) {
    return (
      <div className="packs-screen">
        <header className="screen-header">
          <button type="button" className="header-link" onClick={onBack}>
            <Icon name="arrow-left" size={18} /> {t("packs.backToPacks")}
          </button>
        </header>
        <p className="empty-note">{t("common.error")}</p>
      </div>
    );
  }

  const unlocked = isPackUnlocked(pack, data.totalStars);
  const solved = pack.puzzles.filter((puzzle) => data.packs[puzzle.id]).length;
  const stars = packStars(pack, data.packs);

  return (
    <div className={`pack-detail-screen accent-${pack.accent}`}>
      <BubbleBackdrop dense />
      <header className="pack-detail-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t("packs.backToPacks")}>
          <Icon name="arrow-left" size={22} />
        </button>
        <div className="pack-detail-copy">
          <p className="screen-eyebrow">{t("nav.packs")}</p>
          <h1>{localize(pack.title, locale)}</h1>
          <p>{localize(pack.description, locale)}</p>
          <div className="pack-detail-pills">
            <Pill tone="accent">
              <StarIcon size={13} /> {stars} / {pack.puzzles.length * 3}
            </Pill>
            <Pill tone="neutral">{t("packs.progress", { solved, total: pack.puzzles.length })}</Pill>
            {solved === pack.puzzles.length ? <Pill tone="green">{t("packs.completed")}</Pill> : null}
          </div>
        </div>
        <ProgressRing value={solved / pack.puzzles.length} size={58} stroke={5}>
          <span className="ring-percent">{Math.round((solved / pack.puzzles.length) * 100)}%</span>
        </ProgressRing>
      </header>

      {!unlocked ? (
        <section className="locked-pack">
          <span className="locked-icon">
            <Icon name="lock" size={28} />
          </span>
          <h2>{t("packs.locked")}</h2>
          <p>{t("packs.unlockHint", { count: pack.unlockStars })}</p>
          <p className="locked-progress">
            {data.totalStars} / {pack.unlockStars} <StarIcon size={14} />
          </p>
          <Button variant="tinted" onClick={onBack} icon="arrow-left">
            {t("packs.backToPacks")}
          </Button>
        </section>
      ) : (
        <main className="pack-puzzle-list">
          {pack.puzzles.map((content, index) => {
            const progress = data.packs[content.id];
            return (
              <button
                key={content.id}
                type="button"
                className={`pack-puzzle-row ${progress ? "is-solved" : ""}`}
                onClick={() => onPlay(packPuzzleToPuzzle(pack, content))}
              >
                <span className="puzzle-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="puzzle-copy">
                  <strong>{localize(content.title, locale)}</strong>
                  <small>
                    {t(`tier.${content.tier}`)} · {localize(content.notes, locale)}
                  </small>
                </span>
                <span className="puzzle-progress">
                  {progress ? (
                    <>
                      <StarRow count={progress.stars} size={16} />
                      <small>{formatDuration(progress.timeMs)}</small>
                    </>
                  ) : (
                    <Pill tone="neutral">{t("common.play")}</Pill>
                  )}
                </span>
                <Icon name="chevron-right" size={18} className="puzzle-chevron" />
              </button>
            );
          })}
          <p className="pack-author">{t("packs.by", { name: pack.author })}</p>
        </main>
      )}
    </div>
  );
}
