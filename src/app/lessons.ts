import type { Tier } from "../engine/types";
import { LESSON_STEPS, type LocalizedList } from "../i18n/copy";

export type { LocalizedList };

export interface LessonDefinition {
  id: string;
  index: number;
  tier: Tier;
  accent: string;
  /** technique key used for labels */
  technique: string;
  icon: "grid" | "eye" | "bulb" | "wand" | "check-circle";
  steps: LocalizedList;
}

export const LESSONS: LessonDefinition[] = [
  {
    id: "rules",
    index: 0,
    tier: "cozy",
    accent: "green",
    technique: "nakedSingle",
    icon: "grid",
    steps: LESSON_STEPS.rules,
  },
  {
    id: "nakedSingle",
    index: 1,
    tier: "cozy",
    accent: "green",
    technique: "nakedSingle",
    icon: "eye",
    steps: LESSON_STEPS.nakedSingle,
  },
  {
    id: "hiddenSingle",
    index: 2,
    tier: "easy",
    accent: "blue",
    technique: "hiddenSingle",
    icon: "bulb",
    steps: LESSON_STEPS.hiddenSingle,
  },
  {
    id: "pointing",
    index: 3,
    tier: "medium",
    accent: "blue",
    technique: "pointing",
    icon: "grid",
    steps: LESSON_STEPS.pointing,
  },
  {
    id: "nakedPair",
    index: 4,
    tier: "medium",
    accent: "teal",
    technique: "nakedPair",
    icon: "eye",
    steps: LESSON_STEPS.nakedPair,
  },
  {
    id: "hiddenPair",
    index: 5,
    tier: "hard",
    accent: "teal",
    technique: "hiddenPair",
    icon: "bulb",
    steps: LESSON_STEPS.hiddenPair,
  },
  {
    id: "xWing",
    index: 6,
    tier: "hard",
    accent: "orange",
    technique: "xWing",
    icon: "grid",
    steps: LESSON_STEPS.xWing,
  },
  {
    id: "skyscraper",
    index: 7,
    tier: "expert",
    accent: "orange",
    technique: "skyscraper",
    icon: "eye",
    steps: LESSON_STEPS.skyscraper,
  },
  {
    id: "xyWing",
    index: 8,
    tier: "expert",
    accent: "pink",
    technique: "xyWing",
    icon: "wand",
    steps: LESSON_STEPS.xyWing,
  },
  {
    id: "swordfish",
    index: 9,
    tier: "master",
    accent: "purple",
    technique: "swordfish",
    icon: "grid",
    steps: LESSON_STEPS.swordfish,
  },
];

export function getLesson(id: string): LessonDefinition | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

export function lessonSteps(lesson: LessonDefinition, locale: string): string[] {
  return lesson.steps[locale as keyof LocalizedList] ?? lesson.steps.en;
}
