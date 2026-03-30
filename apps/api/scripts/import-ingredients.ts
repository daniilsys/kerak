import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const raw: [string, string][] = JSON.parse(
    readFileSync(join(__dirname, "..", "ingredients-index.json"), "utf-8"),
  );

  console.log(`Importing ${raw.length} ingredients...`);

  const BATCH = 500;
  for (let i = 0; i < raw.length; i += BATCH) {
    const chunk = raw.slice(i, i + BATCH);
    await prisma.$transaction(
      chunk.map(([id, name]) =>
        prisma.ingredient.upsert({
          where: { id },
          update: { name, normalized: normalize(name) },
          create: { id, name, normalized: normalize(name) },
        }),
      ),
    );
    console.log(`  ${Math.min(i + BATCH, raw.length)} / ${raw.length}`);
  }

  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
