const packs = JSON.parse(require("fs").readFileSync("src/data/packs.json", "utf8"));
console.log(JSON.stringify(packs.map((p) => ({ id: p.id, unlockStars: p.unlockStars, puzzles: p.puzzles.length })), null, 2));
