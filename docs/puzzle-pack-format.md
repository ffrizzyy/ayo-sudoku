# Puzzle pack format

Packs are static JSON in `src/data/packs.json`. The file is imported at build time, so packs work offline and add no network request. The type definitions live in `src/app/packs.ts`.

## Shape

```json
[
  {
    "schemaVersion": 1,
    "id": "starter",
    "title": { "en": "First Steps", "id": "Langkah Pertama" },
    "author": "ffrizzy",
    "unlockStars": 0,
    "accent": "blue",
    "description": {
      "en": "Gentle 9x9 puzzles to settle in.",
      "id": "Teka-teki 9x9 ringan untuk pemanasan."
    },
    "puzzles": [
      {
        "id": "pack:starter:01",
        "title": { "en": "Warm Up", "id": "Pemanasan" },
        "givens": "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
        "solution": "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
        "tier": "cozy",
        "gradeScore": 12,
        "techniques": { "nakedSingle": 24, "hiddenSingle": 9 },
        "notes": {
          "en": "Start with the 3x3 boxes.",
          "id": "Mulai dari kotak 3x3."
        }
      }
    ]
  }
]
```

## Field rules

| Field | Rule |
| --- | --- |
| `schemaVersion` | `1` for the current format. |
| `id` | Stable, lowercase, URL-safe. Used in routes and pack progress. |
| `title`, `description` | Bilingual objects with at least `en` and `id`. |
| `author` | Must be `ffrizzy` for first-party packs. |
| `unlockStars` | Total stars required across all packs before this pack unlocks. Current gates: 0, 10, 30. |
| `accent` | One of the app accents; used for the pack card. |
| `puzzles[].id` | Stable and globally unique. Recommended form `pack:<packId>:<NN>`. |
| `puzzles[].givens` | Exactly 81 characters for 9x9; digits `1`–`9`, with `0` or `.` for empty. |
| `puzzles[].solution` | Exactly 81 digits, no zeros. Must agree with every given. |
| `puzzles[].tier` | `cozy`, `easy`, `medium`, `hard`, `expert` or `master`. |
| `puzzles[].gradeScore` | Number from the technique grader. |
| `puzzles[].techniques` | Counts keyed by technique id. Used for display and filtering. |
| `puzzles[].notes` | Optional bilingual hint about the puzzle's theme. |

## Validation checklist

A pack is shippable only when every puzzle:

- has a unique solution (the importer and tests enforce this);
- matches its stated solution for every given;
- is graded by the engine rather than labelled by hand;
- has both English and Indonesian title and notes;
- has an id that does not collide with another pack or a daily/classic id.

`pnpm gen:pack` generates the current set from seeded puzzles. It prints a summary and rewrites the JSON. Treat a regeneration as a content change: review the diff, play the affected puzzles and update `CHANGELOG.md`.

## Adding a pack by hand

1. Add a pack object with the fields above.
2. Give every puzzle a stable id and an 81-character grid.
3. Run `pnpm test` and `pnpm check`.
4. Open `#/packs`, unlock or temporarily lower the gate, and play each puzzle once.
5. Check the pack and puzzle titles at 320 px width in Indonesian, which is usually the longer locale.

## Credit

Packs are part of Ayo Sudoku! and are credited to **ffrizzy**. Do not import puzzles from another app or website; copyright in a puzzle grid does not make copying the presentation acceptable, and attribution does not cure it.
