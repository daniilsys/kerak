import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = join(__dirname, "..", "ingredients.json");
const outPath = join(__dirname, "..", "ingredients-index.json");

interface RawEntry {
  name?: Record<string, string>;
}

const raw: Record<string, RawEntry> = JSON.parse(readFileSync(srcPath, "utf-8"));

const index: [string, string][] = [];
for (const [id, entry] of Object.entries(raw)) {
  const name = entry.name?.fr;
  if (name) index.push([id, name]);
}

index.sort((a, b) => a[1].length - b[1].length);

writeFileSync(outPath, JSON.stringify(index));
console.log(`Index built: ${index.length} ingredients → ${outPath}`);
