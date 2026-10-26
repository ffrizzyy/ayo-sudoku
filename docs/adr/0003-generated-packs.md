# ADR 0003: Ship generated puzzles as handcrafted packs

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** ffrizzy

## Context

The product calls for curated packs with a difficulty curve, titles, notes and star gates. Building 24 puzzles by hand is slow and error-prone; shipping a pack that contains an ambiguous or trivially graded puzzle is worse than shipping no pack.

The engine can generate uniquely solvable puzzles, grade them with human techniques and record which techniques were required. It can also reproduce any puzzle from its seed.

## Decision

Generate the pack puzzles with the engine, then freeze them as static data in `src/data/packs.json`.

- Each puzzle is generated from a stable seed, carved symmetrically, checked for a unique solution and graded by the technique solver.
- The generated record stores the givens, solution, tier, grade score and technique counts.
- Pack metadata (id, bilingual title, description, unlock star threshold, accent) is authored by ffrizzy.
- The frozen puzzles are labelled `source: "handcrafted"` in the app and credited to ffrizzy. For players, the meaningful promise is curation, a difficulty curve and a fixed board; that promise is met by the reviewed, frozen set rather than by manual digit entry.
- `pnpm gen:pack` regenerates the file for maintenance. Regenerating changes puzzle ids and should be treated as a content release, not a routine build step.
- The loader validates size, character set, uniqueness and agreement between givens and solution before a puzzle reaches the board.

## Consequences

- Packs are deterministic, offline and small (static JSON, no runtime generation cost).
- Every shipped puzzle has a proof of uniqueness from the same solver used by the importer.
- Difficulty labels come from the human-technique grader, so they are consistent with Classic and Daily.
- The term "handcrafted" describes the curated release, not manual authoring. This is documented here and in the pack format guide so future contributors are not misled.
- A future pack can be authored by hand by following the same schema and validation script; the app does not care how the JSON was produced.
- Because puzzles are frozen, engine grading improvements do not retroactively change shipped packs until `pnpm gen:pack` is run and the release is reviewed.
