import type { Tier } from "../engine/types";

export interface LocalizedList {
  en: string[];
  id: string[];
}

export interface LessonDefinition {
  id: string;
  index: number;
  tier: Tier;
  accent: string;
  /** technique key used for labels */
  technique: string;
  icon: "grid" | "eye" | "bulb" | "wand" | "sparkles" | "check-circle";
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
    steps: {
      en: [
        "Every row, column and 3×3 box holds 1 to 9 exactly once.",
        "A given digit removes the same candidate from its row, column and box.",
        "If a cell has one candidate left, that is its digit.",
      ],
      id: [
        "Setiap baris, kolom, dan kotak 3×3 berisi 1 sampai 9 tepat sekali.",
        "Angka bawaan menghapus kandidat yang sama di baris, kolom, dan kotaknya.",
        "Jika satu kotak hanya punya satu kandidat, itulah angkanya.",
      ],
    },
  },
  {
    id: "nakedSingle",
    index: 1,
    tier: "cozy",
    accent: "green",
    technique: "nakedSingle",
    icon: "eye",
    steps: {
      en: [
        "Pick an empty cell in a busy area of the grid.",
        "List what its row, column and box already contain.",
        "If only one digit is missing from that list, place it.",
      ],
      id: [
        "Pilih kotak kosong di area papan yang sudah ramai.",
        "Catat angka yang sudah ada di baris, kolom, dan kotaknya.",
        "Jika hanya satu angka yang belum ada, letakkan di situ.",
      ],
    },
  },
  {
    id: "hiddenSingle",
    index: 2,
    tier: "easy",
    accent: "blue",
    technique: "hiddenSingle",
    icon: "bulb",
    steps: {
      en: [
        "Choose one digit and sweep a 3×3 box.",
        "Mark every cell where that digit is still possible.",
        "If only one cell remains, the digit belongs there.",
      ],
      id: [
        "Pilih satu angka lalu sapu satu kotak 3×3.",
        "Tandai setiap kotak yang masih mungkin berisi angka itu.",
        "Jika tersisa satu kotak, angka itu harus di sana.",
      ],
    },
  },
  {
    id: "pointing",
    index: 3,
    tier: "medium",
    accent: "blue",
    technique: "pointing",
    icon: "sparkles",
    steps: {
      en: [
        "Inside a box, find where one digit can still go.",
        "If all those spots sit in the same row or column, the digit is trapped there.",
        "Remove that digit from the rest of that row or column.",
      ],
      id: [
        "Di dalam satu kotak, temukan tempat angka tertentu masih bisa masuk.",
        "Jika semua tempat itu berada di baris atau kolom yang sama, angkanya terkurung.",
        "Hapus angka itu dari sisa baris atau kolom tersebut.",
      ],
    },
  },
  {
    id: "nakedPair",
    index: 4,
    tier: "medium",
    accent: "teal",
    technique: "nakedPair",
    icon: "eye",
    steps: {
      en: [
        "Look for two cells in one unit with the same two candidates.",
        "Those two digits must fill those two cells in some order.",
        "Remove both digits from every other cell in that unit.",
      ],
      id: [
        "Cari dua kotak dalam satu unit dengan dua kandidat yang sama.",
        "Kedua angka itu pasti mengisi kedua kotak tersebut.",
        "Hapus kedua angka dari semua kotak lain di unit itu.",
      ],
    },
  },
  {
    id: "hiddenPair",
    index: 5,
    tier: "hard",
    accent: "teal",
    technique: "hiddenPair",
    icon: "bulb",
    steps: {
      en: [
        "Follow two digits across a row, column or box.",
        "If both digits appear in only the same two cells, they are a pair.",
        "Everything else in those two cells can be removed.",
      ],
      id: [
        "Ikuti dua angka di satu baris, kolom, atau kotak.",
        "Jika kedua angka hanya muncul di dua kotak yang sama, itu pasangan.",
        "Kandidat lain di kedua kotak itu bisa dihapus.",
      ],
    },
  },
  {
    id: "xWing",
    index: 6,
    tier: "hard",
    accent: "orange",
    technique: "xWing",
    icon: "grid",
    steps: {
      en: [
        "Pick a digit with exactly two spots in one row.",
        "Find another row where that digit also has exactly two spots in the same columns.",
        "The four corners form an X. Remove the digit from those columns elsewhere.",
      ],
      id: [
        "Pilih angka yang hanya punya dua tempat di satu baris.",
        "Cari baris lain dengan dua tempat di kolom yang sama.",
        "Keempat sudutnya membentuk X. Hapus angka itu dari kolom tersebut di baris lain.",
      ],
    },
  },
  {
    id: "skyscraper",
    index: 7,
    tier: "expert",
    accent: "orange",
    technique: "pointing",
    icon: "sparkles",
    steps: {
      en: [
        "Find two parallel rows (or columns) that each hold a digit in two places.",
        "One of those places is shared, forming a base.",
        "The digit can be removed from cells that see both towers.",
      ],
      id: [
        "Cari dua baris (atau kolom) sejajar yang masing-masing punya angka di dua tempat.",
        "Salah satu tempatnya sama, membentuk dasar.",
        "Angka bisa dihapus dari kotak yang melihat kedua menara.",
      ],
    },
  },
  {
    id: "xyWing",
    index: 8,
    tier: "expert",
    accent: "pink",
    technique: "xyWing",
    icon: "sparkles",
    steps: {
      en: [
        "Find a pivot cell with exactly two candidates, say 3 and 7.",
        "Find two peers of the pivot: one with 3 and a shared digit, one with 7 and that same digit.",
        "Remove the shared digit from cells that see both wings.",
      ],
      id: [
        "Cari kotak poros dengan tepat dua kandidat, misalnya 3 dan 7.",
        "Cari dua tetangga poros: satu berisi 3 dan angka bersama, satu berisi 7 dan angka yang sama.",
        "Hapus angka bersama dari kotak yang melihat kedua sayap.",
      ],
    },
  },
  {
    id: "swordfish",
    index: 9,
    tier: "master",
    accent: "purple",
    technique: "swordfish",
    icon: "grid",
    steps: {
      en: [
        "Look for three rows where a digit has two or three spots each.",
        "If all those spots fall inside three columns, the pattern locks.",
        "Remove the digit from the rest of those three columns.",
      ],
      id: [
        "Cari tiga baris tempat sebuah angka punya dua atau tiga kemungkinan.",
        "Jika semua kemungkinan itu berada di tiga kolom saja, polanya terkunci.",
        "Hapus angka itu dari sisa ketiga kolom tersebut.",
      ],
    },
  },
];

export function getLesson(id: string): LessonDefinition | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

export function lessonSteps(lesson: LessonDefinition, locale: string): string[] {
  return lesson.steps[locale as keyof LocalizedList] ?? lesson.steps.en;
}
