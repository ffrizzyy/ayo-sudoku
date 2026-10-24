import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generatePuzzle, makeSpec } from "../src/engine";
import type { Tier } from "../src/engine/types";

const spec = makeSpec(9);

interface PackPuzzle {
  id: string;
  title: { en: string; id: string };
  givens: string;
  solution: string;
  tier: Tier;
  gradeScore: number;
  techniques: Record<string, number>;
  notes: { en: string; id: string };
}

interface Pack {
  schemaVersion: 1;
  id: string;
  title: { en: string; id: string };
  author: string;
  unlockStars: number;
  accent: string;
  description: { en: string; id: string };
  puzzles: PackPuzzle[];
}

const definitions: Array<{
  id: string;
  title: { en: string; id: string };
  description: { en: string; id: string };
  unlockStars: number;
  accent: string;
  tiers: Tier[];
  names: Array<{ en: string; id: string }>;
}> = [
  {
    id: "starter",
    title: { en: "Starter pack", id: "Paket pemula" },
    description: {
      en: "Gentle singles and friendly shapes. A good place to breathe.",
      id: "Angka tunggal yang lembut. Tempat yang baik untuk bernapas.",
    },
    unlockStars: 0,
    accent: "green",
    tiers: ["cozy", "cozy", "easy", "easy", "easy", "cozy", "easy", "cozy"],
    names: [
      { en: "First steps", id: "Langkah pertama" },
      { en: "Warm light", id: "Cahaya hangat" },
      { en: "Slow morning", id: "Pagi pelan" },
      { en: "Little puzzle", id: "Teka-teki kecil" },
      { en: "Soft landing", id: "Pendaratan lembut" },
      { en: "Bubble bath", id: "Mandi gelembung" },
      { en: "Window seat", id: "Duduk di jendela" },
      { en: "Easy does it", id: "Pelan-pelan" },
    ],
  },
  {
    id: "focus",
    title: { en: "Focus pack", id: "Paket fokus" },
    description: {
      en: "Pairs and pointing. The grid asks you to lean in a little.",
      id: "Pasangan dan penunjuk. Papan meminta perhatian sedikit lebih.",
    },
    unlockStars: 10,
    accent: "blue",
    tiers: ["medium", "medium", "medium", "hard", "medium", "hard", "medium", "hard"],
    names: [
      { en: "Sharp pencil", id: "Pensil tajam" },
      { en: "Quiet focus", id: "Fokus tenang" },
      { en: "Pointing north", id: "Menunjuk utara" },
      { en: "Small deduction", id: "Deduksi kecil" },
      { en: "Steady hands", id: "Tangan mantap" },
      { en: "Lined paper", id: "Kertas bergaris" },
      { en: "Tea break", id: "Jeda teh" },
      { en: "Think twice", id: "Pikir dua kali" },
    ],
  },
  {
    id: "masterclass",
    title: { en: "Masterclass", id: "Kelas master" },
    description: {
      en: "Wings, triples and a wide-open grid. For the patient solver.",
      id: "Sayap, trio, dan papan lapang. Untuk pemecah yang sabar.",
    },
    unlockStars: 30,
    accent: "purple",
    tiers: ["expert", "expert", "master", "expert", "master", "expert", "master", "master"],
    names: [
      { en: "X marks the spot", id: "Tanda X" },
      { en: "Wing and a prayer", id: "Sayap dan doa" },
      { en: "Swordfish", id: "Ikan pedang" },
      { en: "Skyscraper view", id: "Pemandangan menara" },
      { en: "Master class", id: "Kelas master" },
      { en: "Deep water", id: "Air dalam" },
      { en: "Final boss", id: "Bos terakhir" },
      { en: "Quiet mastery", id: "Penguasaan tenang" },
    ],
  },
];

const packs: Pack[] = [];

for (const definition of definitions) {
  const puzzles: PackPuzzle[] = definition.tiers.map((tier, index) => {
    const seed = `ayo-pack-${definition.id}-${index}`;
    const result = generatePuzzle({ tier, spec, seed, budgetMs: 12000, maxAttempts: 60 });
    const techniqueCount = Object.values(result.puzzle.techniques).reduce((a, b) => a + b, 0);
    const hardest = Object.entries(result.puzzle.techniques).sort((a, b) => b[1] - a[1])[0]?.[0];
    console.log(
      `${definition.id} ${index + 1}: ${result.puzzle.givens.split("").filter((c) => c !== "0").length} clues, ${result.attempts} attempts, ${result.elapsedMs}ms, ${hardest} (${techniqueCount} steps)`,
    );
    return {
      id: `pack:${definition.id}:${String(index + 1).padStart(2, "0")}`,
      title: definition.names[index],
      givens: result.puzzle.givens,
      solution: result.puzzle.solution,
      tier: result.puzzle.tier,
      gradeScore: result.puzzle.gradeScore,
      techniques: result.puzzle.techniques,
      notes: {
        en: `${result.puzzle.tier[0].toUpperCase()}${result.puzzle.tier.slice(1)} logic, hand-checked for a single solution.`,
        id: `Logika ${result.puzzle.tier}, diperiksa untuk satu solusi.`,
      },
    };
  });
  packs.push({
    schemaVersion: 1,
    id: definition.id,
    title: definition.title,
    author: "ffrizzy",
    unlockStars: definition.unlockStars,
    accent: definition.accent,
    description: definition.description,
    puzzles,
  });
}

const directory = join(process.cwd(), "src", "data");
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "packs.json"), `${JSON.stringify(packs, null, 2)}\n`, "utf8");
console.log(`Wrote ${packs.length} packs with ${packs.reduce((sum, pack) => sum + pack.puzzles.length, 0)} puzzles.`);
