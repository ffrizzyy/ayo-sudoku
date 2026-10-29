/**
 * Single source of truth for owner credit.
 * Do not duplicate the author name anywhere else: import from here.
 */
export const CREDITS = {
  appName: "Ayo Sudoku!",
  appNameShort: "Ayo Sudoku",
  author: "ffrizzy",
  authorUrl: "https://ffrizzy.vercel.app/",
  version: "1.0.2",
  license: "MIT",
  tagline: "Ayo means let's go.",
  inspirations: [
    {
      name: "Classic Sudoku by Cracking the Cryptic",
      url: "https://www.crackingthecryptic.com/",
      note: "Handcrafted puzzles, star progression and a solver friendly interface.",
    },
    {
      name: "Apple Human Interface Guidelines",
      url: "https://developer.apple.com/design/human-interface-guidelines/",
      note: "The visual language: clarity, materials and rounded shapes.",
    },
    {
      name: "Emil Kowalski",
      url: "https://animations.dev/",
      note: "Motion principles: fast, purposeful and interruptible.",
    },
  ],
} as const;

export function creditLine(): string {
  return `${CREDITS.appNameShort} by ${CREDITS.author}`;
}
