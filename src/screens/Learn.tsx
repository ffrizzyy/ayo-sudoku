import { useI18n } from "../i18n";
import { LESSONS, getLesson, lessonSteps, type LessonDefinition } from "../app/lessons";
import { useData } from "../app/data";
import { Icon } from "../ui/Icon";
import { Button, Pill, ProgressRing } from "../ui/primitives";
import { BubbleBackdrop } from "../ui/BubbleBackdrop";
import { useToast } from "../app/toast";

interface LearnProps {
  onNavigate: (route: string) => void;
}

export function Learn({ onNavigate }: LearnProps) {
  const { t } = useI18n();
  const { meta } = useData();
  const learned = new Set(meta.lessonsLearned);

  return (
    <div className="learn-screen">
      <BubbleBackdrop />
      <header className="screen-header">
        <div>
          <p className="screen-eyebrow">{t("nav.learn")}</p>
          <h1>{t("learn.title")}</h1>
          <p>{t("learn.subtitle")}</p>
        </div>
        <div className="learn-progress">
          <ProgressRing value={learned.size / LESSONS.length} size={58} stroke={5}>
            <span className="ring-percent">
              {learned.size}/{LESSONS.length}
            </span>
          </ProgressRing>
        </div>
      </header>

      <main className="learn-list">
        <div className="learn-summary">
          <Pill tone="accent">{t("learn.lessonCount", { count: LESSONS.length })}</Pill>
          <Pill tone="neutral">{t("learn.learned", { count: learned.size })}</Pill>
          {learned.size === LESSONS.length ? <Pill tone="green">{t("learn.allDone")}</Pill> : null}
        </div>

        {LESSONS.map((lesson) => {
          const title = t(`learn.lessons.${lesson.id}.title`);
          const body = t(`learn.lessons.${lesson.id}.body`);
          const done = learned.has(lesson.id);
          return (
            <button
              key={lesson.id}
              type="button"
              className={`learn-card accent-${lesson.accent} ${done ? "is-done" : ""}`}
              onClick={() => onNavigate(`/lesson/${lesson.id}`)}
            >
              <span className="learn-icon">
                <Icon name={lesson.icon} size={22} />
              </span>
              <span className="learn-copy">
                <span className="learn-kicker">
                  {t("learn.lesson", { index: lesson.index + 1 })} · {t(`tier.${lesson.tier}`)}
                </span>
                <strong>{title}</strong>
                <small>{body}</small>
                <span className="learn-tags">
                  <Pill tone="neutral">{t(`tech.${lesson.technique}`)}</Pill>
                  {done ? (
                    <span className="learn-done">
                      <Icon name="check-circle" size={15} /> {t("learn.completed")}
                    </span>
                  ) : null}
                </span>
              </span>
              <Icon name="chevron-right" size={18} className="learn-chevron" />
            </button>
          );
        })}
      </main>
    </div>
  );
}

interface LessonProps {
  lessonId: string;
  onBack: () => void;
  onNavigate: (route: string) => void;
  onPractice: (lesson: LessonDefinition) => void;
}

export function Lesson({ lessonId, onBack, onNavigate, onPractice }: LessonProps) {
  const { t, locale } = useI18n();
  const { meta, markLessonLearned } = useData();
  const { push } = useToast();
  const lesson = getLesson(lessonId);
  const learned = lesson ? meta.lessonsLearned.includes(lesson.id) : false;

  if (!lesson) {
    return (
      <div className="lesson-screen">
        <header className="screen-header">
          <button type="button" className="header-link" onClick={onBack}>
            <Icon name="arrow-left" size={18} /> {t("learn.backToLearn")}
          </button>
        </header>
        <p className="empty-note">{t("common.error")}</p>
      </div>
    );
  }

  const title = t(`learn.lessons.${lesson.id}.title`);
  const body = t(`learn.lessons.${lesson.id}.body`);
  const tip = t(`learn.lessons.${lesson.id}.tip`);
  const steps = lessonSteps(lesson, locale);
  const previous = LESSONS[lesson.index - 1];
  const next = LESSONS[lesson.index + 1];

  return (
    <div className={`lesson-screen accent-${lesson.accent}`}>
      <BubbleBackdrop />
      <header className="lesson-top">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t("learn.backToLearn")}>
          <Icon name="arrow-left" size={22} />
        </button>
        <span className="lesson-progress-text">
          {t("learn.lesson", { index: lesson.index + 1 })} / {LESSONS.length}
        </span>
        <span className={`lesson-status ${learned ? "is-done" : ""}`}>
          {learned ? <Icon name="check-circle" size={18} /> : null}
          {learned ? t("learn.completed") : t(`tier.${lesson.tier}`)}
        </span>
      </header>

      <main className="lesson-main">
        <section className="lesson-hero">
          <span className="lesson-hero-icon">
            <Icon name={lesson.icon} size={30} />
          </span>
          <div>
            <p className="screen-eyebrow">{t(`tech.${lesson.technique}`)}</p>
            <h1>{title}</h1>
            <p>{body}</p>
          </div>
        </section>

        <section className="lesson-block">
          <h2>
            <span className="section-number">1</span> {t("learn.steps")}
          </h2>
          <ol className="lesson-steps">
            {steps.map((step, index) => (
              <li key={index}>
                <span className="lesson-step-number">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="lesson-tip">
          <Icon name="bulb" size={20} />
          <div>
            <strong>{t("learn.watchOut")}</strong>
            <p>{tip}</p>
          </div>
        </section>

        <section className="lesson-practice">
          <div className="lesson-practice-copy">
            <p className="screen-eyebrow">{t("learn.practiceStarts", { tier: t(`tier.${lesson.tier}`) })}</p>
            <h2>{t("learn.practice")}</h2>
            <p>{t("learn.practiceHint")}</p>
            <small>{t("learn.practiceNote")}</small>
          </div>
          <Button variant="primary" size="lg" icon="play" onClick={() => onPractice(lesson)}>
            {t("learn.startPractice")}
          </Button>
        </section>

        <div className="lesson-actions">
          <Button
            variant={learned ? "tinted" : "glass"}
            icon={learned ? "check-circle" : "book"}
            onClick={() => {
              if (!learned) {
                markLessonLearned(lesson.id);
                push(t("toast.lessonDone"), "success");
              }
            }}
            disabled={learned}
          >
            {learned ? t("learn.completed") : t("learn.markLearned")}
          </Button>
          <button type="button" className="text-button" onClick={() => onNavigate("/learn")}>
            {t("learn.backToLearn")}
          </button>
        </div>

        <nav className="lesson-nav">
          {previous ? (
            <button type="button" className="lesson-nav-card" onClick={() => onNavigate(`/lesson/${previous.id}`)}>
              <Icon name="chevron-left" size={18} />
              <span>
                <small>{t("learn.lesson", { index: previous.index + 1 })}</small>
                <strong>{t(`learn.lessons.${previous.id}.title`)}</strong>
              </span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button type="button" className="lesson-nav-card is-next" onClick={() => onNavigate(`/lesson/${next.id}`)}>
              <span>
                <small>{t("learn.lesson", { index: next.index + 1 })}</small>
                <strong>{t(`learn.lessons.${next.id}.title`)}</strong>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </div>
  );
}
