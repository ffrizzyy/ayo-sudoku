import { FALLBACK_COPY, LESSON_STEPS, en, id } from "../src/i18n/copy";

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (!value || typeof value !== "object") return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

const english = flatten(en);
const indonesian = flatten(id);
let failed = false;

for (const key of Object.keys(english)) {
  if (!(key in indonesian)) {
    console.error(`Missing in id: ${key}`);
    failed = true;
    continue;
  }
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  if (placeholders(english[key]) !== placeholders(indonesian[key])) {
    console.error(`Placeholder mismatch: ${key}`);
    failed = true;
  }
}

for (const key of Object.keys(indonesian)) {
  if (!(key in english)) {
    console.error(`Extra in id: ${key}`);
    failed = true;
  }
}

// Lesson steps live in the same copy file; keep both languages in step.
for (const [lesson, steps] of Object.entries(LESSON_STEPS)) {
  if (!steps.en.length || !steps.id.length) {
    console.error(`Lesson steps missing: ${lesson}`);
    failed = true;
  } else if (steps.en.length !== steps.id.length) {
    console.error(`Lesson step count mismatch: ${lesson} (${steps.en.length} en, ${steps.id.length} id)`);
    failed = true;
  }
}

// Crash-screen copy renders before the i18n provider, so it is checked here.
for (const key of Object.keys(FALLBACK_COPY.en)) {
  if (!(key in FALLBACK_COPY.id)) {
    console.error(`Missing fallback copy in id: ${key}`);
    failed = true;
  }
}

if (failed) {
  console.error("i18n check failed.");
  process.exit(1);
}
console.log(
  `i18n check passed: ${Object.keys(english).length} keys in en and id, ${Object.keys(LESSON_STEPS).length} lessons in sync.`,
);
