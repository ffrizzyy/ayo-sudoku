import { en, id } from "../src/i18n";

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

if (failed) {
  console.error("i18n check failed.");
  process.exit(1);
}
console.log(`i18n check passed: ${Object.keys(english).length} keys in en and id.`);
