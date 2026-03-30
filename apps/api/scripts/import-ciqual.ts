import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const COL_CODE = "alim_code";
const COL_NAME = "alim_nom_fr";
const COL_KCAL = "Energie,\r\nRèglement\r\nUE N°\r\n1169\r\n2011 (kcal\r\n100 g)";
const COL_PROT = "Protéines,\r\nN x\r\nfacteur de\r\nJones (g\r\n100 g)";
const COL_CARBS = "Glucides\r\n(g\r\n100 g)";
const COL_FATS = "Lipides\r\n(g\r\n100 g)";
const COL_FIBER = "Fibres\r\nalimentaires\r\n(g\r\n100 g)";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNum(val: unknown): number | null {
  if (val == null || val === "" || val === "-" || val === "traces") return null;
  const s = String(val).replace(",", ".").replace("<", "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function main() {
  const filePath = join(__dirname, "..", "data", "data_ciqual.xlsx");
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

  console.log(`CIQUAL: ${rows.length} entries`);

  let updated = 0;
  let created = 0;
  const BATCH = 100;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);

    await prisma.$transaction(
      chunk.map((row) => {
        const code = String(row[COL_CODE] ?? "").trim();
        const name = String(row[COL_NAME] ?? "").trim();
        if (!code || !name) return prisma.ingredient.count();

        const id = `ciqual:${code}`;
        const data = {
          code,
          name,
          normalized: normalize(name),
          calories: parseNum(row[COL_KCAL]),
          proteins: parseNum(row[COL_PROT]),
          carbs: parseNum(row[COL_CARBS]),
          fats: parseNum(row[COL_FATS]),
          fiber: parseNum(row[COL_FIBER]),
        };

        return prisma.ingredient.upsert({
          where: { id },
          update: data,
          create: { id, ...data },
        });
      }),
    );

    const progress = Math.min(i + BATCH, rows.length);
    console.log(`  ${progress} / ${rows.length}`);
  }

  const total = await prisma.ingredient.count();
  const withNutrition = await prisma.ingredient.count({
    where: { calories: { not: null } },
  });
  console.log(`Done. Total ingredients: ${total}, with nutrition: ${withNutrition}`);
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
